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
