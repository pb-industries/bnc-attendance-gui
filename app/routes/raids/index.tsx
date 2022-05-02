import { Link, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getRaids } from "~/models/raid.server";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/outline";

type LoaderData = {
  raids: Awaited<ReturnType<typeof getRaids>>;
  page: number;
  pageSize: number;
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const page = parseInt(url?.searchParams.get("page") ?? "0");
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "10");

  const raids = await getRaids({
    page,
    pageSize,
  });
  return json<LoaderData>({ raids, page, pageSize });
};

export default function RaidIndexPage() {
  const { raids, page, pageSize } = useLoaderData<LoaderData>();
  return (
    <div className="w-full">
      <div>
        <nav className="hidden sm:flex" aria-label="Breadcrumb">
          <ol role="list" className="flex items-center space-x-4">
            <li>
              <div className="flex">
                <Link
                  to="/"
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Dashboard
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon
                  className="h-5 w-5 flex-shrink-0 text-gray-400"
                  aria-hidden="true"
                />
                <Link
                  to="/raids"
                  className="ml-4 text-sm font-medium text-blue-500 hover:text-gray-700"
                >
                  Raids
                </Link>
              </div>
            </li>
          </ol>
        </nav>
      </div>
      <div className="space-between flex min-h-full flex-col justify-between">
        <table className="mt-4 min-h-full min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="font-semibolds px-3 py-3.5 text-left text-sm text-gray-900"
              >
                Raid
              </th>
              <th
                scope="col"
                className="font-semibolds hidden px-3 py-3.5 text-left text-sm text-gray-900 sm:table-cell"
              >
                Split
              </th>
              <th
                scope="col"
                className="font-semibolds hidden px-3 py-3.5 text-left text-sm text-gray-900 lg:table-cell"
              >
                Total mains
              </th>
              <th
                scope="col"
                className="font-semibolds px-3 py-3.5 text-left text-sm text-gray-900"
              >
                Total ticks
              </th>
              <th
                scope="col"
                className="font-semibolds px-3 py-3.5 text-left text-sm text-gray-900"
              >
                Created at
              </th>
            </tr>
          </thead>
          <tbody>
            {raids.map((raid) => {
              const date = new Date(
                Date.parse(raid?.created_at as unknown as string)
              ).toISOString();
              return (
                <tr>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 ">
                    <Link className="text-blue-500" to={`/raids/${raid.id}`}>
                      {raid.name}
                    </Link>
                  </td>
                  <td className="hidden whitespace-nowrap py-4 pr-3 text-sm font-medium text-gray-900 sm:table-cell">
                    {raid.split}
                  </td>
                  <td className="hidden whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 lg:table-cell">
                    {raid.total_mains}
                  </td>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                    {raid.total_ticks}
                  </td>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 ">
                    {date?.substring(0, date?.indexOf("T"))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <nav
          className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
          aria-label="Pagination"
        >
          <div className="hidden sm:block">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to{" "}
              <span className="font-medium">10</span> of{" "}
              <span className="font-medium">20</span> results
            </p>
          </div>
          <div className="flex flex-1 justify-between gap-2 sm:justify-end">
            <Link
              to={`/raids?page=${Math.max(0, page - 1)}`}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
                page === 0 ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              Previous
            </Link>
            <Link
              to={"/raids?page=" + (page + 1)}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
                raids.length < pageSize ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              Next
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
