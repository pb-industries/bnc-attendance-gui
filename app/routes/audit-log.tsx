import { Link, useLoaderData } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { ChevronRightIcon } from "@heroicons/react/outline";
import { getUser } from "~/session.server";
import { getAuditLog } from "~/models/admin.server";
import { audit } from "@prisma/client";
import { useEffect } from "react";

type LoaderData = {
  auditLog: Awaited<ReturnType<typeof getAuditLog>>;
  page: number;
  pageSize: number;
  totalResults: number;
};

const format = (log: audit) => {
    const components = [];
    const regex = /(un|fn|tn|rn|in)\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match;

    if (!log.message) {
        return []
    }

    while ((match = regex.exec(log.message)) !== null) {
      const prefix = match[1];
      const content = match[2];
      const startIndex = match.index;
      const endIndex = regex.lastIndex - match[0].length;

      // Add the text before the component
      if (startIndex > lastIndex) {
        const text = log.message.substring(lastIndex, startIndex);
        components.push(<span>{text}</span>);
      }

      // Add the component based on the prefix
      switch (prefix) {
        case 'un':
          components.push(<a className='capitalize text-blue-500' href={`/players/${log.user.player_id}`}>{content}</a>);
          break;
        case 'fn':
          components.push(<a className='capitalize text-blue-500' href={`/players/${log.from_player_id}`}>{content}</a>);
          break;
        case 'tn':
          components.push(<a className='capitalize text-blue-500' href={`/players/${log.to_player_id}`}>{content}</a>);
          break;
        case 'rn':
          components.push(<a className='capitalize text-blue-500' href={`/raids/${log.raid_id}`}>{content}</a>);
          break;
        case 'in':
          components.push(
            <a className='capitalize text-purple-500' href={`https://everquest.allakhazam.com/db/item.html?item=${log.item.lucy_id};source=lucy`}>{content}</a>
          );
          break;
        default:
          break;
      }

      lastIndex = endIndex + match[0].length;
    }

    // Add the remaining text after the last component
    if (lastIndex < log.message.length) {
      const text = log.message.substring(lastIndex);
      components.push(<span>{text}</span>);
    }

    return components;
}


export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  if (!["admin", "officer"].includes(user?.role ?? "guest")) {
    return redirect("/");
  }

  const url = new URL(request.url);
  const page = parseInt(url?.searchParams.get("page") ?? "0");
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "10");

  const { auditLog, totalResults } = await getAuditLog({
    page,
    pageSize,
    playerId: user?.player_id,
  });
  return json<LoaderData>({
    auditLog,
    page,
    pageSize,
    totalResults,
  });
};

export default function logIndexPage() {
  const { auditLog, page, pageSize, totalResults } = useLoaderData<LoaderData>();

    useEffect(() => {
        let times = 100;
        const clearTimer = setInterval(() => {
            const nodes = document.querySelectorAll('.zam-icon')
            for (let node of nodes) {
                node.remove()
            }
            if (nodes.length > 0) {
                clearInterval(clearTimer)
                return
            }
            times--
            if (times === 0) {
                clearInterval(clearTimer)
            }
        }, 2)
    }, [page])

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
                  to="/audit-log"
                  className="ml-4 text-sm font-medium text-blue-500 hover:text-gray-700"
                >
                    Audit Log
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
                className="font-semibolds hidden px-3 py-3.5 text-left text-sm text-gray-900 sm:table-cell"
              >
                Message
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
            {auditLog.map((log) => {
              const date = new Date(
                Date.parse(log?.created_at as unknown as string)
              ).toISOString();
              return (
                <tr key={log.id}>
                  <td className="hidden whitespace-nowrap py-4 pr-3 text-sm font-medium text-gray-900 sm:table-cell">
                    {format(log)}
                  </td>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 ">
                    {new Date(date).toString()}
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
              Showing <span className="font-medium">{page + 1}</span> to{" "}
              <span className="font-medium">{pageSize}</span> of{" "}
              <span className="font-medium">{totalResults}</span> results
            </p>
          </div>
          <div className="flex flex-1 justify-between gap-2 sm:justify-end">
            <Link
              to={`/auditLog?page=${Math.max(0, page - 1)}`}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
                page === 0 ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              Previous
            </Link>
            <Link
              to={"/auditLog?page=" + (page + 1)}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
                auditLog.length < pageSize ? "cursor-not-allowed opacity-50" : ""
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
