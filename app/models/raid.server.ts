import type { player, player_alt, raid } from "@prisma/client";

import { prisma } from "~/db.server";

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

  const { player_raid, ...raid } = details ?? {};
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
      .player_alt_playerToplayer_alt_alt_id?.[0]
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
      if (attendee.name == "karadin") {
        console.log("Got ticks", ticks);
      }
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

  const res = {
    ...raid,
    total_ticks: maxTick + 1, // ticks are 0 indexed
    attendees: parsedAttendees,
  };

  return res;
}

interface RaidWithTotals extends raid {
  total_ticks: number;
  total_mains: number;
}

export async function getRaids({
  page = 0,
  pageSize = 10,
}: {
  page?: number;
  pageSize?: number;
}) {
  const raids = await prisma.$queryRaw<RaidWithTotals[]>`
    SELECT
      r.id::STRING,
      r.name,
      r.created_at,
      COUNT(DISTINCT pr.raid_hour) AS total_ticks,
      COUNT(DISTINCT (IF(pr.player_id IS NOT NULL AND pa.player_id <> pr.player_id, pr.player_id, null))) AS total_mains
    FROM raid r
    LEFT JOIN player_raid pr ON pr.raid_id = r.id
    LEFT JOIN player_alt pa ON pa.alt_id = pr.player_id
    LEFT JOIN player p on pr.player_id = p.id
    GROUP BY r.id
    ORDER BY r.created_at DESC
    LIMIT ${parseInt(`${pageSize}`)}
    OFFSET ${parseInt(`${page * pageSize}`)}
  `;

  return raids;
}

export function deleteRaid({ id }: Pick<raid, "id">) {
  return prisma.raid.deleteMany({
    where: { id },
  });
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
    return await prisma.request_tick.createMany({
      data: raidHours.map((raidHour) => ({
        player_id: BigInt(playerId),
        raid_id: BigInt(raidId),
        raid_hour: BigInt(raidHour),
      })),
    });
  } catch (e) {
    return null;
  }
}
