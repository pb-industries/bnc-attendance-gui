import { ActionFunction, json, LoaderFunction, useLoaderData } from "remix";
import { requireUser } from "~/session.server";
import { getLootForRaid } from "~/models/loot.server";
import { useOptionalUser } from "~/utils";
import { prisma } from "~/db.server";
import { useState } from "react";
import LootTable from "~/components/lootTable";
import { getMains } from "~/models/roster.server";
import { AUDIT_LOOT_CATEGORISED, AUDIT_LOOT_CHANGED, AUDIT_LOOT_DELETED, createAuditLog } from "~/models/admin.server";

type LoaderData = { loot: Awaited<ReturnType<typeof getLootForRaid>>, mains: Awaited<ReturnType<typeof getMains>> };

export const loader: LoaderFunction = async ({ request, params }) => {
  const loot = await getLootForRaid(
    [BigInt(params.raidId ?? 0)],
    undefined,
    []
  );
  const mains = await getMains(true);

  return json<LoaderData>({ loot, mains });
};

export const action: ActionFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const formData = await request.formData();

  const itemId = BigInt(`${formData.get("item_id") ?? 0}`);
  const category = formData.get("category");
  if (category === "delete") {
    const lootId = BigInt(`${formData.get("line_id") ?? 0}`);
    if (!lootId) {
      return null;
    }
    await createAuditLog({
      userId: user.id,
      type: AUDIT_LOOT_DELETED,
      loot_id: lootId,
    })
    await prisma.loot_history.delete({
      where: {
        id: lootId,
      },
    });
    return null;
  }

  console.log('cat is', category)
  if (category === 'change_player') {
    const lootId   = BigInt(`${formData.get("line_id") ?? 0}`);
    const playerId = BigInt(`${formData.get("player_id") ?? 0}`);
    console.log('changing player')

    if (!lootId || !playerId) {
      return null
    }

    await createAuditLog({
      userId: user.id,
      type: AUDIT_LOOT_CHANGED,
      loot_id: lootId,
      to_player_id: playerId
    })

    await prisma.loot_history.update({
      where: { id: lootId },
      data: {
        looted_by_id: playerId
      },
    });
  }

  if (!itemId || typeof category !== "string") {
    return null;
  }

  if (!user) {
    return null;
  }

  await createAuditLog({
    userId: user.id,
    type: AUDIT_LOOT_CATEGORISED,
    item_id: itemId,
    newCategory: category
  })

  await prisma.item.update({
    where: { id: itemId },
    data: {
      category,
    },
  });

  const loot = await getLootForRaid(
    [BigInt(params.raidId ?? 0)],
    undefined,
    []
  );

  return json<LoaderData>({ loot });
};

export default function () {
  const user = useOptionalUser();
  const [searchTerm, setSearchTerm] = useState("");
  const { loot: lootRaw, mains } = useLoaderData<LoaderData>();

  return (
    <div className="grid min-h-[500px] grid-cols-12 gap-8">
      <div className="col-span-12">
        <LootTable
          {...{
            lootRaw,
            filterTerm: searchTerm,
            user,
            hideEmpty: true,
            includePasses: true,
            withRaid: false,
            mains
          }}
        />
      </div>
    </div>
  );
}
