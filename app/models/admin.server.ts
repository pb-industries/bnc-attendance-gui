import { prisma } from "~/db.server";

export async function getPendingAccounts() {
  return await prisma.user.findMany({
    where: { approved: false },
    include: { player: true },
  });
}

export async function getTickApprovals() {
  return await prisma.request_tick.findMany({ where: { approved_by: null } });
}

export async function getRecentApprovals() {
  return await prisma.request_tick.findMany({
    where: { approved_by: { not: null } },
    orderBy: { created_at: "desc" },
    take: 10,
    include: {
      player_playerTorequest_tick_approved_by: true,
    },
  });
}
