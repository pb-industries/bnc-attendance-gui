import { Link, useLoaderData } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { requireUser } from "~/session.server";
import {
  getPendingAccounts,
  getRecentApprovals,
  getTickApprovals,
} from "~/models/admin.server";
import { ChevronRightIcon } from "@heroicons/react/outline";

type LoaderData = {
  pendingAccounts: Awaited<ReturnType<typeof getPendingAccounts>>;
  tickApprovals: Awaited<ReturnType<typeof getTickApprovals>>;
  recentApprovals: Awaited<ReturnType<typeof getRecentApprovals>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireUser(request);
  if (!["admin", "officer"].includes(user?.role ?? "guest")) {
    return redirect("/");
  }

  const pendingAccounts = await getPendingAccounts();
  const tickApprovals = await getTickApprovals();
  const recentApprovals = await getRecentApprovals();

  return json<LoaderData>({ pendingAccounts, tickApprovals, recentApprovals });
};

export default function RaidIndexPage() {
  const { pendingAccounts, tickApprovals, recentApprovals } =
    useLoaderData<LoaderData>();
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
                  to="/admin"
                  className="ml-4 text-sm font-medium text-blue-500 hover:text-gray-700"
                >
                  Admin Console
                </Link>
              </div>
            </li>
          </ol>
        </nav>
      </div>
    </div>
  );
}
