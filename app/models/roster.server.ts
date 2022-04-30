import { player } from "@prisma/client";
import { prisma } from "~/db.server";
import { requireUser } from "~/session.server";

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

export async function deletePlayer(request: Request, playerId?: bigint) {
  if (!playerId) {
    return null;
  }

  const user = await requireUser(request);
  if (!user) {
    return null;
  }

  user.role = "guest";

  if (
    ["admin", "officer"].includes(user.role ?? "guest") ||
    user.player_id === playerId ||
    isBoxAssociatedWith(user.player_id, playerId)
  ) {
    return await prisma.player.delete({ where: { id: BigInt(playerId) } });
  }

  return null;
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

export async function isBoxAssociatedWith(playerId: bigint, altId: bigint) {
  const res = await prisma.player_alt.findFirst({
    where: {
      player_id: playerId,
      alt_id: altId,
    },
  });

  return !!res;
}

export async function createBox(
  player: player,
  mainId: bigint,
  playerId?: bigint
) {
  let existingPlayer;
  let boxId = null;
  if (playerId) {
    existingPlayer = await prisma.player.findFirst({
      where: { id: BigInt(playerId) },
    });
  }
  if (!existingPlayer) {
    existingPlayer = await prisma.player.findFirst({
      where: { name: player.name.trim().toLowerCase() },
    });
  }

  if (!existingPlayer) {
    const addedPlayer = await prisma.player.create({
      data: {
        name: player.name?.trim().toLowerCase(),
        class: player.class?.trim().toLowerCase(),
        level: player.level,
      },
    });
    boxId = addedPlayer.id;
  } else {
    existingPlayer.name = player.name?.trim().toLowerCase();
    existingPlayer.level = player.level;
    existingPlayer.class = player.class;
    await prisma.player.update({
      data: { class: player.class, level: player.level, name: player.name },
      where: { id: existingPlayer.id },
    });
    boxId = existingPlayer.id;
  }

  try {
    if (boxId && mainId && boxId != mainId) {
      await prisma.$queryRaw`
        DELETE FROM player_alt
        WHERE alt_id = ${boxId}
      `;
      await prisma.player_alt.create({
        data: {
          player_id: mainId,
          alt_id: boxId,
        },
      });
    }
  } catch {
    console.info("box already belongs to this user");
  }

  return existingPlayer;
}
