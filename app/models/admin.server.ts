import { prisma } from "~/db.server";
import { calculateAttendance } from "./api.server";

export const AUDIT_TICK_REMOVED = 0
export const AUDIT_TICK_APPROVED = 1
export const AUDIT_LOOT_CHANGED = 2
export const AUDIT_LOOT_DELETED = 3
export const AUDIT_LOOT_CATEGORISED = 4
export const AUDIT_TICK_REJECTED = 5
export const AUDIT_TICK_REQUESTED = 6

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
    await fixTickTimes();
    await calculateAttendance();
  }
}

async function fixTickTimes() {
  await prisma.$queryRaw`
    update player_raid AS pr
    set created_at = tb.first_created
    from (
      select *, (tmp.last_created - tmp.first_created)::int AS diff
      from (
        select
          raid_id,
          raid_hour,
          min(created_at) AS first_created,
          max(created_at) AS last_created
        from player_raid
        group by raid_id, raid_hour
      ) tmp
      where (tmp.last_created - tmp.first_created)::int >= (60 * 60)
    ) AS tb
    where pr.created_at = tb.last_created
    and pr.raid_id = tb.raid_id
    and pr.raid_hour = tb.raid_hour
  `;
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
  calculateAttendance();
}

type props = {
  userId: bigint,
  type: number,
  to_player_id?: bigint,
  from_player_id?: bigint,
  raid_id?: bigint,
  ticks?: number[],
  item_id?: bigint,
  loot_id?: bigint,
  newCategory?: string,
  itemName?: string
}

export async function createAuditLog({
  userId, type, to_player_id, from_player_id, raid_id, ticks, loot_id, newCategory, item_id
}: props) {
  let from_player;
  let to_player;
  let raid;
  let message;
  let user;
  let loot;
  let item;

  if (userId) {
    user = await prisma.user.findFirst({ where: { id: userId }, include: { player: true }})
    user = user?.player
  }

  if (item_id) {
    item = await prisma.item.findFirst({ where: { id: item_id }})
  }

  if (loot_id) {
    loot = await prisma.loot_history.findFirst({ where: { id: loot_id }, include: { item: true, player: true }})
  }

  if (to_player_id) {
    to_player = await prisma.player.findFirst({ where: { id: to_player_id }})
  }

  if (from_player_id) {
    from_player = await prisma.player.findFirst({ where: { id: from_player_id }})
  }

  if (raid_id) {
    raid = await prisma.raid.findFirst({ where: { id: raid_id }})
  }

  switch (type) {
    case AUDIT_TICK_REMOVED:
      message = `un[${user?.name}] removed ticks [${ticks?.join(', ')}] from fn[${from_player?.name}] for raid rn[${raid?.name}]`
    break;
    case AUDIT_TICK_APPROVED:
      message = `un[${user?.name}] approved a request for tick ${ticks?.join(', ')} from fn[${from_player?.name}] for raid rn[${raid?.name}]`
    break;
    case AUDIT_TICK_REJECTED:
      message = `un[${user?.name}] rejected a request for tick ${ticks?.join(', ')} from fn[${from_player?.name}] for raid rn[${raid?.name}]`
    break;
    case AUDIT_TICK_REQUESTED:
      const behalfOf = user?.id !== from_player?.id ? ` on behalf of fn[${from_player?.name}] ` : ' '
      message = `un[${user?.name}] requested ticks ${ticks?.join(', ')}${behalfOf}for raid rn[${raid?.name}]`
    break;
    case AUDIT_LOOT_CATEGORISED:
      message = `un[${user?.name}] re-categorised item in[${item?.name}] from ${item?.category ?? 'unknown'} to ${newCategory}`
    break;
    case AUDIT_LOOT_CHANGED:
      message = `un[${user?.name}] moved the assignment of ${loot?.item?.name} from fn[${loot?.player?.name}] to tn[${to_player?.name}]`
    break;
    case AUDIT_LOOT_DELETED:
      message = `un[${user?.name}] deleted a loot line of ${loot?.item?.name} which was assigned to fn[${loot?.player?.name}]`
    break;
  }


  let payload: any = {
    user_id: userId,
    type,
    message,
    created_at: new Date(),
    updated_at: new Date()
  }

  if (loot) {
    payload.item_id = loot.item_id
  }

  if (item_id) {
    payload.item_id = item_id
  }

  if (from_player) {
    payload.from_player_id = from_player.id
  }

  if (raid) {
    payload.raid_id = raid.id
  }

  if (to_player) {
    payload.to_player_id = to_player.id
  }

  await prisma.audit.create({
    data: payload
  })
}

export async function getAuditLog({
  page = 0,
  pageSize = 10,
  type = undefined
}: {
  page?: number;
  pageSize?: number;
  type?: number[];
}) {
  let query = {}
  if (type !== undefined) {
    query = {
      type: {
        in: type
      }
    }
  }
  const auditLog = await prisma.audit.findMany({
    take: pageSize,
    skip: page * pageSize,
    where: query,
    include: {
      user: {
        include: {
          player: true
        }
      },
      item: true,
      raid: true,
      player_audit_from_player_idToplayer: true,
      player_audit_to_player_idToplayer: true
    },
    orderBy: {
      id: 'desc'
    }
  })

  return { auditLog, totalResults: await prisma.audit.count({ where: query }) };
}
