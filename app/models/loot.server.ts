import { Prisma } from "@prisma/client";
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

export async function getLootForRaid(
  raidIds?: bigint[],
  playerId?: bigint,
  categories?: Category[]
) {
  let where: Prisma.loot_historyWhereInput[] = [];

  if (!categories) {
    categories = ["bis"];
  }

  where.push({ item: { category: { in: categories } } });

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
