import { json, Link, LoaderFunction, useLoaderData } from "remix";
import { requireUser } from "~/session.server";
import { getLootForRaid } from "~/models/loot.server";

type LoaderData = { loot: Awaited<ReturnType<typeof getLootForRaid>> };

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const loot = await getLootForRaid(BigInt(params.raidId ?? 0));

  return json<LoaderData>({ loot });
};

export default function () {
  const { loot } = useLoaderData<LoaderData>();
  return (
    <div className="grid grid-cols-12 gap-8">
      <div className="col-span-12">
        <h1 className="text-2xl font-medium">Items looted</h1>
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
            </tr>
          </thead>
          <tbody>
            {loot.map((lh) => {
              const date = new Date(
                Date.parse(lh?.created_at as unknown as string)
              ).toISOString();
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
                    {lh.item.category || "uncategorized"}
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* <div className="col-span-4">
        <h1 className="text-2xl font-medium">Loot distribution</h1>
      </div> */}
    </div>
  );
}
