import type { password, player, Prisma, user } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "~/db.server";

export type { user } from "@prisma/client";

export async function getUserById(id: user["id"]) {
  if (!id) {
    return null;
  }

  return prisma.user.findFirst({ where: { id }, include: { player: true } });
}

export async function getUserByEmail(email: user["email"]) {
  if (!email) {
    return null;
  }

  return prisma.user.findFirst({ where: { email }, include: { player: true } });
}

export async function getPlayerByUserId(userId: user["id"]) {
  if (!userId) {
    return null;
  }

  return prisma.player.findFirst({
    where: { user: { some: { id: userId } } },
  });
}

export async function getUserByPlayerName(playerName: player["name"]) {
  if (!playerName) {
    return null;
  }

  return prisma.user.findFirst({
    where: { player: { name: playerName } },
    include: { player: true },
  });
}

export async function getUserByPlayerId(playerId: player["id"]) {
  if (!playerId) {
    return null;
  }

  return prisma.user.findFirst({
    where: { player: { id: playerId } },
    include: {
      player: { include: { player_alt_playerToplayer_alt_alt_id: true } },
    },
  });
}

export async function createUser(
  email: user["email"],
  password: string,
  player: player
) {
  const existingMain = await getUserByPlayerName(player.name);
  if (existingMain) {
    return null;
  }

  let existingPlayer = await prisma.player.findFirst({
    where: { name: player.name.trim().toLowerCase() },
  });

  if (!existingPlayer) {
    existingPlayer = await prisma.player.create({
      data: {
        name: player.name?.trim().toLowerCase(),
        class: player.class?.trim().toLowerCase(),
        level: player.level,
      },
    });
  } else {
    existingPlayer.level = player.level;
    existingPlayer.class = player.class;
    await prisma.player.update({
      data: { class: player.class, level: player.level },
      where: { name: player.name.trim().toLowerCase() },
    });
  }

  if (!existingPlayer) {
    return null;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const data: Prisma.userCreateInput = {
    // @ts-ignore
    player_id: existingPlayer.id as unknown as number,
    password: {
      create: {
        hash: hashedPassword,
      },
    },
  };

  if (email && email.includes("@")) {
    data.email = email?.includes("@") ? email : null;
  }

  return prisma.user.create({
    data,
  });
}

export async function deleteUserById(id: user["id"]) {
  return prisma.user.delete({ where: { id } });
}

export async function verifyLogin(
  emailOrUsername: user["email"],
  password: password["hash"]
) {
  let userWithPassword = await prisma.user.findFirst({
    where: { email: emailOrUsername?.toLowerCase().trim() },
    include: {
      password: true,
    },
  });

  if (!userWithPassword && emailOrUsername && !emailOrUsername.includes("@")) {
    userWithPassword = await prisma.user.findFirst({
      where: { player: { name: emailOrUsername?.toLowerCase().trim() } },
      include: {
        password: true,
      },
    });
  }

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(
    password,
    userWithPassword.password.hash
  );

  if (!isValid) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}
