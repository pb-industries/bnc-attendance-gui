import { prisma } from "~/db.server";

export type LootLine = {
  raid_name: string;
  player_name: string;
  player_id: string;
  item_id: string;
};

export async function getLootForRaid(raidId?: bigint) {
  const raid = await prisma.raid.findFirst({
    where: { id: raidId },
  });

  if (!raid) {
    return [];
  }

  const loot = await prisma.loot_history.findMany({
    where: { raid_id: raid.id },
    include: {
      player: {
        include: {
          player_alt_playerToplayer_alt_player_id: true,
        },
      },
      item: true,
      raid: true,
    },
    orderBy: [{ item: { category: "desc" } }, { created_at: "desc" }],
  });

  return loot;
}
