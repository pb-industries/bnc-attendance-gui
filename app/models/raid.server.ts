import type { player, player_alt, raid } from "@prisma/client";

import { prisma } from "~/db.server";
import { calculateAttendance } from "./api.server";
import { getBoxes } from "./roster.server";

export type { raid } from "@prisma/client";

export async function getRaid({ id }: Pick<raid, "id">) {
  const details = await prisma.raid.findFirst({
    where: { id: BigInt(id) as unknown as number },
    include: {
      player_raid: {
        include: {
          player: {
            include: {
              player_alt_playerToplayer_alt_alt_id: {
                include: {
                  player_playerToplayer_alt_player_id: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const latestRaid = await prisma.raid.findFirst({
    orderBy: { created_at: "desc" },
  });

  const { player_raid, ...raid } = details ?? { id: null };
  let maxTick = 0;
  details?.player_raid.forEach(({ raid_hour }) => {
    maxTick = Math.max(parseInt(`${raid_hour}`), maxTick);
  });

  const attendees: {
    [id: string]: player & { ticks: { [id: string]: Set<string> } };
  } = {};

  details?.player_raid.forEach((player_raid) => {
    let { player, raid_hour } = player_raid;
    // Get the optional name/id of the main
    const { name: mainName, id: mainId } = player
      ?.player_alt_playerToplayer_alt_alt_id?.[0]
      ?.player_playerToplayer_alt_player_id ?? { name: null, id: null };

    player.player_alt_playerToplayer_alt_alt_id = [];

    const playerId = `${mainId ?? player.id}` as unknown as string;

    if (!attendees?.[playerId]) {
      const blankTicks: { [key: string]: Set<string> } = {};
      for (let i = 0; i <= maxTick; i++) {
        blankTicks[`${i}`] = new Set<string>();
      }
      attendees[playerId] = {
        ...player,
        name: mainName ?? player.name,
        ticks: blankTicks,
      };
    }

    if (mainName !== null) {
      // @ts-ignore
      attendees[playerId].ticks?.[raid_hour]?.add(mainName);
    }

    if (player?.name) {
      // @ts-ignore
      attendees[playerId].ticks?.[raid_hour]?.add(player.name);
    }
  });

  const parsedAttendees = Object.values(attendees).map(
    ({ ticks, ...attendee }) => {
      const newTicks: { [key: string]: string[] } = {};
      Object.keys(ticks).forEach((key) => {
        newTicks[key] = Array.from(ticks[key]);
      });
      return {
        ...attendee,
        ticks: newTicks,
      };
    }
  );

  return {
    isLive: latestRaid?.id === raid?.id,
    total_ticks: maxTick + 1, // ticks are 0 indexed
    attendees: parsedAttendees,
    ...raid,
  };
}

export async function getCurrencySplitMeta(raidId: bigint) {
  const mainIds = (await getMainIds(raidId)).join(",");
  const data = await prisma.$queryRawUnsafe(
    `
    SELECT
      DISTINCT
      p.name,
      p.class,
      pr.main_id AS player_id,
      p.base_tickets AS total_tickets,
      rt.total_ticks,
      pr.attended_ticks,
      floor((p.base_tickets / total_ticks) * attended_ticks) as awarded_tickets
    FROM (
      SELECT
      		if (pa.alt_id = pr.player_id, pa.player_id, pr.player_id) AS main_id,
      		COUNT(DISTINCT pr.raid_hour) AS attended_ticks,
          pr.raid_id
      	FROM player_raid pr
      	LEFT JOIN player_alt pa ON pa.alt_id = pr.player_id
        LEFT JOIN player p ON pa.player_id = p.id OR pr.player_id = p.id
      	WHERE p.id IN (${mainIds})
        AND pr.raid_id = ${BigInt(raidId).toString()}
      	GROUP BY pr.raid_id, main_id
    ) pr
    INNER JOIN (
      SELECT pr.raid_id, COUNT(DISTINCT pr.raid_hour) AS total_ticks
      FROM player_raid pr
      WHERE pr.raid_id = ${BigInt(raidId).toString()}
      GROUP BY pr.raid_id
    ) rt ON rt.raid_id = ${BigInt(raidId).toString()}
    INNER JOIN player p ON pr.main_id = p.id
    WHERE pr.raid_id = ${BigInt(raidId).toString()}
  `
  );

  const total_tickets = data.reduce((c, d) => c + d.awarded_tickets, 0);
  const split_info = data.map((d) => {
    return ({ player_id, name, awarded_tickets, class: d.class } = d);
  });

  return { total_tickets, split_info };
}

export async function getRaidTicks(raidId: bigint) {
  const ticks = (await prisma.$queryRawUnsafe(
    `
    SELECT
      pr.raid_hour,
        min(pr.created_at) AS created_at
    FROM player_raid pr
    WHERE pr.raid_id = ${BigInt(raidId).toString()}
    GROUP BY pr.raid_hour
    ORDER BY pr.raid_hour ASC
  `
  )) as { raid_hour: string; created_at: string }[];

  return ticks.map((t) => new Date(t.created_at));
}

export const stringifyBigInt = (_: any, value: any) =>
  typeof value === "bigint" ? value.toString() : value; // return everything else unchanged

interface RaidWithTotals extends raid {
  total_ticks: number;
  total_mains: number;
  attended_ticks: number;
}

async function getMainIds(raidId: bigint) {
  const attendees = await prisma.player_raid.findMany({
    where: {
      AND: [{ raid_id: BigInt(raidId) }],
    },
    include: {
      player: {
        include: {
          player_alt_playerToplayer_alt_alt_id: true,
        },
      },
    },
  });

  return Array.from(
    new Set(
      attendees.map((raidTick) => {
        // Get the optional name/id of the main
        const mainId =
          raidTick.player.player_alt_playerToplayer_alt_alt_id?.[0]?.player_id;
        const playerId = raidTick.player_id;

        if (!mainId) {
          return playerId;
        }

        return mainId;
      })
    )
  );
}

export async function getRaids({
  page = 0,
  pageSize = 10,
  playerId,
}: {
  page?: number;
  pageSize?: number;
  playerId?: bigint;
}) {
  const raids = await prisma.$queryRawUnsafe<RaidWithTotals[]>(
    `
    SELECT
      r.id::STRING,
      r.name,
      r.created_at,
      r.is_official,
      greatest(0, max(att.attended_ticks)) as attended_ticks,
      COUNT(DISTINCT pr.raid_hour) AS total_ticks,
      greatest(0, max(mi.total_mains)) AS total_mains
    FROM raid r
    LEFT JOIN player_raid pr ON pr.raid_id = r.id
    INNER JOIN (
    	SELECT
      		pr.raid_id,
      		COUNT(DISTINCT (IF(pr.player_id IS NOT NULL AND pa.player_id <> pr.player_id, pa.player_id, pr.player_id))) AS total_mains
     	FROM player_raid pr
      	LEFT JOIN player_alt pa ON pa.alt_id = pr.player_id
      	GROUP BY pr.raid_id
    ) AS mi ON mi.raid_id = r.id
    LEFT JOIN (
    	SELECT
            pr.raid_id,
      		if (pa.alt_id = pr.player_id, pa.player_id, pr.player_id) AS main_id,
      		COUNT(DISTINCT pr.raid_hour) AS attended_ticks
      	FROM player_raid pr
      	LEFT JOIN player_alt pa ON pa.alt_id = pr.player_id
        LEFT JOIN player p ON pa.player_id = p.id OR pr.player_id = p.id
      	WHERE p.id = ${BigInt(playerId ?? 0).toString()}
      	GROUP BY pr.raid_id, main_id
    ) att ON att.raid_id = r.id
    GROUP BY r.id
    ORDER BY r.created_at DESC
    LIMIT ${parseInt(`${pageSize}`)}
    OFFSET ${parseInt(`${page * pageSize}`)}
  `
  );

  return { raids, totalResults: await prisma.raid.count() };
}

export function deleteRaid({ id }: Pick<raid, "id">) {
  return prisma.raid.deleteMany({
    where: { id },
  });
}

export async function deleteRaidTicks(
  playerId: bigint,
  raidId: bigint,
  raidHours: bigint[]
): Promise<boolean> {
  if (!playerId || !raidId || raidHours.length === 0) {
    return false;
  }

  const boxes = await getBoxes(playerId);
  let playerIds = boxes?.map((box) => box.id!) ?? [];
  playerIds.push(playerId);

  if (playerIds.length === 0) {
    return false;
  }

  try {
    await prisma.player_raid.deleteMany({
      where: {
        player_id: { in: playerIds },
        raid_id: raidId,
        raid_hour: { in: raidHours },
      },
    });
  } catch {
    console.log("nope!");
  }

  await calculateAttendance();

  return true;
}

export async function createRaidTickRequest(
  playerId: bigint,
  raidId: bigint,
  raidHours: bigint[]
) {
  if (!playerId || !raidId || raidHours.length === 0) {
    return false;
  }

  try {
    raidHours.map(async (raidHour) => {
      await prisma.request_tick.upsert({
        where: {
          player_id_raid_id_raid_hour: {
            player_id: BigInt(playerId),
            raid_id: BigInt(raidId),
            raid_hour: BigInt(raidHour),
          },
        },
        update: {
          approved_at: null,
          approved_by: null,
          rejected_by: null,
          rejected_at: null,
        },
        create: {
          player_id: BigInt(playerId),
          raid_id: BigInt(raidId),
          raid_hour: BigInt(raidHour),
        },
      });
    });
  } catch (e) {
    return null;
  }
}
