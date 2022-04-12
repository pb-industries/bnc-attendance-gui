import type { raid } from "@prisma/client";

import { prisma } from "~/db.server";

export type { raid } from "@prisma/client";

export function getRaid({ id }: Pick<raid, "id">) {
  return prisma.raid.findFirst({
    where: { id },
  });
}

export function getRaidDetails({ id }: Pick<raid, "id">) {
  return prisma.raid.findFirst({
    where: { id },
    include: {
      player_raid: {
        include: {
          player: true,
        },
      },
    },
  });
}

export function getRaids({ skip, take }: { skip: number; take: number }) {
  return prisma.raid.findMany({
    skip,
    take,
    orderBy: { created_at: "desc" },
  });
}

export function deleteRaid({ id }: Pick<raid, "id">) {
  return prisma.raid.deleteMany({
    where: { id },
  });
}
