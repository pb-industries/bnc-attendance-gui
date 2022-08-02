import { ActionFunction, json, LoaderFunction, useLoaderData } from "remix";
import { requireUser } from "~/session.server";
import { getLootForRaid } from "~/models/loot.server";
import { useOptionalUser } from "~/utils";
import { prisma } from "~/db.server";
import { useState } from "react";
import LootTable from "~/components/lootTable";

type LoaderData = { loot: Awaited<ReturnType<typeof getLootForRaid>> };

export const loader: LoaderFunction = async ({ request, params }) => {
  const loot = await getLootForRaid(
    [BigInt(params.raidId ?? 0)],
    undefined,
    []
  );

  return json<LoaderData>({ loot });
};

export const action: ActionFunction = async ({ request, params }) => {
  const user = requireUser(request);
  const formData = await request.formData();

  const itemId = BigInt(`${formData.get("item_id") ?? 0}`);
  const category = formData.get("category");

  if (!itemId || typeof category !== "string") {
    return null;
  }

  if (!user) {
    return null;
  }

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
  const { loot: lootRaw } = useLoaderData<LoaderData>();

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
          }}
        />
      </div>
    </div>
  );
}
