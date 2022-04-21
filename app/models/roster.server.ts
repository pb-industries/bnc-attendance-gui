import { player } from "@prisma/client";
import { prisma } from "~/db.server";

export type { raid } from "@prisma/client";

export async function getMains() {
  const players = await prisma.player.findMany({
    include: {
      player_alt_playerToplayer_alt_alt_id: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return players.filter((player) => {
    // Get the optional name/id of the main
    const mainId = player.player_alt_playerToplayer_alt_alt_id?.[0]?.player_id;

    return !mainId || mainId === player.id;
  });
}

export async function getPlayer(playerId?: bigint) {
  if (!playerId) {
    return null;
  }

  return await prisma.player.findFirst({ where: { id: playerId } });
}

export async function getBoxes(playerId?: bigint) {
  if (!playerId) {
    return null;
  }

  const boxes: Partial<player>[] | null = (
    await prisma.player_alt.findMany({
      where: {
        player_id: playerId,
      },
      include: {
        player_playerToplayer_alt_alt_id: true,
      },
    })
  )?.map((pb) => {
    const {
      id,
      name,
      level,
      class: className,
    } = pb.player_playerToplayer_alt_alt_id;
    return { id, name, level, class: className };
  });

  return boxes;
}
