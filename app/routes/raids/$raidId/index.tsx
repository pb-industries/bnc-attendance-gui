import {
  ActionFunction,
  Form,
  json,
  Link,
  LoaderFunction,
  useLoaderData,
} from "remix";
import { requireUser } from "~/session.server";
import { getLootForRaid } from "~/models/loot.server";
import { useOptionalUser } from "~/utils";
import {
  CurrencyDollarIcon,
  ShieldCheckIcon,
  StarIcon,
  TrashIcon,
  XIcon,
} from "@heroicons/react/outline";
import { prisma } from "~/db.server";
import { useState } from "react";

type LoaderData = { loot: Awaited<ReturnType<typeof getLootForRaid>> };

export const loader: LoaderFunction = async ({ request, params }) => {
  const loot = await getLootForRaid(BigInt(params.raidId ?? 0));

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

  const loot = await getLootForRaid(BigInt(params.raidId ?? 0));

  return json<LoaderData>({ loot });
};

type Category = "bis" | "cash" | "trash";

export default function () {
  const user = useOptionalUser();
  const [categories] = useState<Category[]>(["bis", "cash", "trash"]);
  const { loot } = useLoaderData<LoaderData>();
  const [activeCategory, setActiveCategory] = useState<Category>("bis");
  return (
    <div className="grid grid-cols-12 gap-8">
      <div className="col-span-12">
        <h1 className="text-2xl font-medium">Items looted</h1>
        <div className="flex gap-1 pt-4">
          {categories.map((c) => (
            <div
              className="rounded-lg border border-gray-200 px-4 py-2 uppercase shadow hover:cursor-pointer hover:bg-gray-100"
              onClick={() => setActiveCategory(c)}
              key={c}
            >
              {c}
            </div>
          ))}
        </div>
        <table className="mt-4 min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="font-semibolds px-3 py-3.5 text-left text-sm text-gray-900"
              >
                Item
              </th>
              <th
                scope="col"
                className="font-semibolds px-3 py-3.5 text-left text-sm text-gray-900"
              >
                Quantity
              </th>
              <th
                scope="col"
                className="font-semibolds hidden px-3 py-3.5 text-left text-sm text-gray-900 sm:table-cell"
              >
                Category
              </th>
              <th
                scope="col"
                className="font-semibolds hidden px-3 py-3.5 text-left text-sm text-gray-900 sm:table-cell"
              >
                Looted by
              </th>
              <th
                scope="col"
                className="font-semibolds hidden px-3 py-3.5 text-left text-sm text-gray-900 lg:table-cell"
              >
                Acquired via
              </th>
              <th
                scope="col"
                className="font-semibolds px-3 py-3.5 text-left text-sm text-gray-900"
              >
                Looted at
              </th>
              {["admin", "officer"].includes(user?.role ?? "guest") ? (
                <th
                  scope="col"
                  className="font-semibolds px-3 py-3.5 text-left text-sm text-gray-900"
                >
                  Action
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loot
              .map((lh) => {
                const date = new Date(
                  Date.parse(lh?.created_at as unknown as string)
                ).toISOString();
                if (activeCategory !== lh.item.category) {
                  return null;
                }
                return (
                  <tr key={`${lh.id}`}>
                    <td className="flex items-center gap-4 whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                      <a
                        className="capitalize text-blue-500"
                        href={`https://everquest.allakhazam.com/db/item.html?item=${lh.item.lucy_id};source=lucy`}
                      >
                        {lh.item.name}
                      </a>
                    </td>
                    <td className="hidden whitespace-nowrap py-4 pr-3 text-sm font-medium capitalize text-gray-900 sm:table-cell">
                      {lh.quantity}
                    </td>
                    <td className="hidden whitespace-nowrap py-4 pr-3 text-sm font-medium capitalize text-gray-900 sm:table-cell">
                      <span className="rounded-lg bg-gray-200 px-4 py-1">
                        {lh.item.category || "uncategorized"}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap py-4 pr-3 text-sm font-medium capitalize text-gray-900 sm:table-cell">
                      <Link
                        className="text-blue-500"
                        to={`/players/${lh.player.id}`}
                      >
                        {lh.player.name}
                      </Link>
                    </td>
                    <td className="hidden whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 lg:table-cell">
                      {lh.was_assigned ? "Assigned" : "Rolled for"}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 ">
                      {date?.substring(0, date?.indexOf("T"))}
                    </td>
                    {["admin", "officer"].includes(user?.role ?? "guest") ? (
                      <td className="flex gap-1 whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                        <Form method="post">
                          <input type="hidden" name="category" value="bis" />
                          <input
                            type="hidden"
                            name="item_id"
                            value={`${lh.item.id}`}
                          />
                          <button
                            type="submit"
                            className="h-8 w-8 rounded-sm bg-green-500 p-1 text-white hover:bg-green-600"
                          >
                            <ShieldCheckIcon />
                          </button>
                        </Form>
                        <Form method="post">
                          <input type="hidden" name="category" value="cash" />
                          <input
                            type="hidden"
                            name="item_id"
                            value={`${lh.item.id}`}
                          />
                          <button
                            type="submit"
                            className="h-8 w-8 rounded-sm bg-orange-500 p-1 text-white hover:bg-orange-600"
                          >
                            <CurrencyDollarIcon />
                          </button>
                        </Form>
                        <Form method="post">
                          <input type="hidden" name="category" value="trash" />
                          <input
                            type="hidden"
                            name="item_id"
                            value={`${lh.item.id}`}
                          />
                          <button
                            type="submit"
                            className="h-8 w-8 rounded-sm bg-red-500 p-1 text-white hover:bg-red-600"
                          >
                            <TrashIcon />
                          </button>
                        </Form>
                      </td>
                    ) : null}
                  </tr>
                );
              })
              .filter((n) => n !== null)}
          </tbody>
        </table>
      </div>
      {/* <div className="col-span-4">
        <h1 className="text-2xl font-medium">Loot distribution</h1>
      </div> */}
    </div>
  );
}
