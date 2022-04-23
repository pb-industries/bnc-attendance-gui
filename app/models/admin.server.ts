import { prisma } from "~/db.server";

export async function getPendingAccounts() {
  return await prisma.user.findMany({
    where: { approved: false },
    include: { player: true },
  });
}

export async function getTickApprovals() {
  return await prisma.request_tick.findMany({
    where: { AND: [{ approved_by: null }, { rejected_by: null }] },
    include: { player_playerTorequest_tick_player_id: true, raid: true },
  });
}

export async function getRecentActivity(skip: number = 0, take: number = 10) {
  return await prisma.request_tick.findMany({
    where: {
      OR: [{ approved_by: { not: null } }, { rejected_by: { not: null } }],
    },
    orderBy: { created_at: "desc" },
    skip: skip,
    take: take,
    include: {
      player_playerTorequest_tick_player_id: true,
      player_playerTorequest_tick_approved_by: true,
      player_playerTorequest_tick_rejected_by: true,
      raid: true,
    },
  });
}

export async function rejectAccount(userId: bigint) {
  return await prisma.user.delete({
    where: { id: userId },
  });
}

export async function approveAccount(userId: bigint) {
  return await prisma.user.update({
    where: { id: userId },
    data: { approved: true },
  });
}

export async function approveRaidTick(
  approvedById: bigint,
  playerId: bigint,
  raidId: bigint,
  raidHour: bigint
) {
  const res = await prisma.request_tick.update({
    where: {
      player_id_raid_id_raid_hour: {
        player_id: playerId,
        raid_id: raidId,
        raid_hour: raidHour,
      },
    },
    data: { approved_by: approvedById, approved_at: new Date() },
  });

  if (res) {
    await prisma.player_raid.create({
      data: {
        player_id: playerId,
        raid_id: raidId,
        raid_hour: raidHour,
      },
    });
  }
}

export async function rejectRaidTick(
  rejectedById: bigint,
  playerId: bigint,
  raidId: bigint,
  raidHour: bigint
) {
  const res = await prisma.request_tick.update({
    where: {
      player_id_raid_id_raid_hour: {
        player_id: playerId,
        raid_id: raidId,
        raid_hour: raidHour,
      },
    },
    data: { rejected_by: rejectedById, rejected_at: new Date() },
  });
  await deleteRaidTick(playerId, raidId, raidHour);
}

export async function deleteRaidTick(
  playerId: bigint,
  raidId: bigint,
  raidHour: bigint
) {
  await prisma.player_raid.delete({
    where: {
      player_id_raid_id_raid_hour: {
        player_id: playerId,
        raid_id: raidId,
        raid_hour: raidHour,
      },
    },
  });
}
