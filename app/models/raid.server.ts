import type { raid } from "@prisma/client";

import { prisma } from "~/db.server";

export type { raid } from "@prisma/client";

export async function getRaid({ id }: Pick<raid, "id">) {
  const details = await prisma.raid.findFirst({
    where: { id: BigInt(id) as unknown as number },
    include: {
      player_raid: {
        include: {
          player: true,
        },
      },
    },
  });
  console.log(details);
  return details;
}

export async function getRaids({ skip, take }: { skip: number; take: number }) {
  return await prisma.raid.findMany({
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
