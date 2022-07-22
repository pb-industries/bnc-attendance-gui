import { Prisma, raid } from "@prisma/client";
import { prisma } from "~/db.server";

export type LootLine = {
  raid_name: string;
  player_name: string;
  player_id: string;
  item_id: string;
};
type Category = "bis" | "rolled" | "trash" | "uncategorized";

export async function getLatestRaidId() {
  const history = await prisma.loot_history.findFirst({
    where: {
      raid_id: {
        not: null,
      },
    },
    orderBy: { raid: { created_at: "desc" } },
  });

  return history?.raid_id;
}

export async function getRaidList() {
  const lootHistory = (await prisma.$queryRaw`
    SELECT
      r.name,
      r.created_at,
      r.id::string
    FROM loot_history lh
    INNER JOIN raid r ON lh.raid_id = r.id
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `) as raid[];

  return lootHistory.map((raid) => {
    return { name: raid.name, created_at: raid.created_at, id: `${raid.id}` };
  });
}

export async function getLootForRaid(
  raidIds?: bigint[],
  playerId?: bigint,
  categories?: Category[]
) {
  let where: Prisma.loot_historyWhereInput[] = [];

  if (!categories) {
    categories = ["bis"];
  }

  if (categories.length) {
    where.push({ item: { category: { in: categories } } });
  }

  if (playerId) {
    where.push({ looted_by_id: playerId });
  }

  if (raidIds?.length ?? 0 > 0) {
    where.push({ raid_id: { in: raidIds } });
  }

  const loot = await prisma.loot_history.findMany({
    where: {
      AND: [...where],
    },
    include: {
      player: {
        include: {
          player_alt_playerToplayer_alt_alt_id: {
            include: { player_playerToplayer_alt_player_id: true },
          },
        },
      },
      item: true,
      raid: true,
    },
    orderBy: [{ item: { category: "desc" } }, { created_at: "desc" }],
  });

  return loot;
}

export async function getLootForPeriod(
  from: Date,
  to: Date,
  categories?: Category[]
) {
  let where: Prisma.loot_historyWhereInput[] = [];
  
  // Ensure our range is between start and end of day
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  if (!categories) {
    categories = ["bis"];
  }

  if (categories.length) {
    where.push({ item: { category: { in: categories } } });
  }

  where.push({
    created_at: {
      gte: from,
      lte: to,
    },
  });

  const loot = await prisma.loot_history.findMany({
    where: {
      AND: [...where],
    },
    include: {
      player: {
        include: {
          player_alt_playerToplayer_alt_alt_id: {
            include: { player_playerToplayer_alt_player_id: true },
          },
        },
      },
      item: true,
      raid: true,
    },
    orderBy: [{ item: { category: "desc" } }, { created_at: "desc" }],
  });

  return loot;
}
