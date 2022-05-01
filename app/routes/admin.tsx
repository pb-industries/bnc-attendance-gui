import { Link, useLoaderData, Form } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { LoaderFunction, ActionFunction, json } from "@remix-run/node";
import { requireUser } from "~/session.server";
import {
  approveAccount,
  approveRaidTick,
  rejectRaidTick,
  getPendingAccounts,
  getRecentActivity,
  getTickApprovals,
  rejectAccount,
} from "~/models/admin.server";
import {
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  TableIcon,
  UsersIcon,
  XIcon,
} from "@heroicons/react/outline";
import { getBadgeStyle } from "~/utils";
import { useEffect, useRef } from "react";

type LoaderData = {
  pendingAccounts: Awaited<ReturnType<typeof getPendingAccounts>>;
  tickApprovals: Awaited<ReturnType<typeof getTickApprovals>>;
  recentApprovals: Awaited<ReturnType<typeof getRecentActivity>>;
};

type ActionData = {
  alert: {
    type: "success" | "error" | "info";
    message: string;
  };
  status: number;
};

export const action: ActionFunction = async ({ request }) => {
  const refreshRef = useRef<HTMLButtonElement>();
  const formData = await request.formData();
  const user = await requireUser(request);

  useEffect(() => {
    let interval = setInterval(() => refreshRef?.current?.click(), 20000);
    return () => clearInterval(interval);
  }, [user]);

  const method = request.method;
  if (method.toUpperCase() === "POST") {
    if (!["admin", "officer"].includes(user?.role ?? "guest")) {
      return json<ActionData>({
        alert: {
          type: "error",
          message:
            "You must be an admin or officer before you can reject an account",
        },
        status: 400,
      });
    }
    const rejectPlayerId = formData.get("account.reject") ?? null;
    if (typeof rejectPlayerId === "string") {
      try {
        await rejectAccount(BigInt(rejectPlayerId));
        return json<ActionData>({
          alert: {
            type: "success",
            message: "Successfully rejected account",
          },
          status: 200,
        });
      } catch (e) {
        return json<ActionData>({
          alert: {
            type: "error",
            message:
              "There was an error rejecting the account. Please try again.",
          },
          status: 400,
        });
      }
    }
  }
  const approvePlayerId = formData.get("account.approve") ?? null;
  if (typeof approvePlayerId === "string") {
    try {
      await approveAccount(BigInt(approvePlayerId));
      return json<ActionData>({
        alert: {
          type: "success",
          message: "The account has been approved.",
        },
        status: 200,
      });
    } catch (e) {
      return json<ActionData>({
        alert: {
          type: "error",
          message:
            "There was an error approving the account. Please try again.",
        },
        status: 400,
      });
    }
  }
  const approveTickDetails = formData.get("tick.approve") ?? null;
  if (typeof approveTickDetails === "string") {
    try {
      const [playerId, raidId, raidHour] = approveTickDetails.split(":");
      await approveRaidTick(
        user.player_id,
        BigInt(playerId),
        BigInt(raidId),
        BigInt(raidHour)
      );
      return json<ActionData>({
        alert: {
          type: "success",
          message: "The tick has been approved.",
        },
        status: 200,
      });
    } catch (e) {
      return json<ActionData>({
        alert: {
          type: "error",
          message: "There was an error approving the tick. Please try again.",
        },
        status: 400,
      });
    }
  }
  const rejectTickDetails = formData.get("tick.reject") ?? null;
  if (typeof rejectTickDetails === "string") {
    try {
      const [playerId, raidId, raidHour] = rejectTickDetails.split(":");
      await rejectRaidTick(
        user.player_id,
        BigInt(playerId),
        BigInt(raidId),
        BigInt(raidHour)
      );
      return json<ActionData>({
        alert: {
          type: "success",
          message: "The tick has been rejected.",
        },
        status: 200,
      });
    } catch (e) {
      return json<ActionData>({
        alert: {
          type: "error",
          message: "There was an error rejecting the tick. Please try again.",
        },
        status: 400,
      });
    }
  }

  return json<ActionData>({
    alert: {
      type: "error",
      message: "Unknown action",
    },
    status: 400,
  });
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireUser(request);
  if (!["admin", "officer"].includes(user?.role ?? "guest")) {
    return redirect("/");
  }

  const pendingAccounts = await getPendingAccounts();
  const tickApprovals = await getTickApprovals();
  const recentApprovals = await getRecentActivity();

  return json<LoaderData>({ pendingAccounts, tickApprovals, recentApprovals });
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

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
      <div className="grid grid-cols-12 gap-4 py-4">
        <div className="col-span-12 shadow lg:col-span-6 xl:col-span-4">
          <h2 className="p-4 text-lg font-medium">Approve accounts</h2>
          <div className="px-4">
            {pendingAccounts?.length === 0 ? (
              <div className="flex flex-col items-center rounded border-2 border-dashed border-gray-200 py-12 px-4 text-center">
                <UsersIcon
                  className="mb-2 h-8 w-8 text-gray-400"
                  aria-hidden="true"
                />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No pending accounts
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  It looks like everyone is registered and set up, nice work!
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Role
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {pendingAccounts.map((account) => (
                    // @ts-ignore
                    <tr key={account.player.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img
                              className="h-8 w-8 rounded-full"
                              src={`/images/${
                                account.player.class ?? "warrior"
                              }.png`}
                              alt=""
                            />
                          </div>
                          <div className="ml-4">
                            <div className="font-medium capitalize text-gray-900">
                              {account.player.name}
                            </div>
                            <div className="capitalize text-gray-500">
                              {account.player.class}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span
                          className={getBadgeStyle(account.role ?? "guest")}
                        >
                          {account.role}
                        </span>
                      </td>
                      <td className="txt-sm whitespace-nowrap px-3 py-4 text-gray-500">
                        <div className="flex items-center justify-center gap-2 ">
                          <Form method="post">
                            <input
                              type="hidden"
                              name="account.approve"
                              value={`${account.id}`}
                            />
                            <button
                              className="rounded-full bg-green-600 p-1 hover:bg-green-500"
                              type="submit"
                            >
                              <CheckIcon
                                className="h-5 w-5 text-white"
                                aria-hidden="true"
                              />
                            </button>
                          </Form>
                          <Form method="post">
                            <input
                              type="hidden"
                              name="account.reject"
                              value={`${account.id}`}
                            />
                            <button
                              className="rounded-full bg-red-600 p-1 hover:bg-red-500"
                              type="submit"
                            >
                              <XIcon
                                className="h-5 w-5 text-white"
                                aria-hidden="true"
                              />
                            </button>
                          </Form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="col-span-12 shadow lg:col-span-6 xl:col-span-4">
          <h2 className="p-4 text-lg font-medium">Approve ticks</h2>
          <div className="px-4">
            {tickApprovals?.length === 0 ? (
              <div className="flex flex-col items-center rounded border-2 border-dashed border-gray-200 py-12 px-4 text-center">
                <ClockIcon
                  className="mb-2 h-8 w-8 text-gray-400"
                  aria-hidden="true"
                />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No pending raid ticks
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  There are no pending raid ticks to approve, noice!
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Raid
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Tick #
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {tickApprovals.map((approval, approvalIdx) => (
                    // @ts-ignore
                    <tr key={approvalIdx}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img
                              className="h-8 w-8 rounded-full"
                              src={`/images/${
                                approval.player_playerTorequest_tick_player_id
                                  .class ?? "warrior"
                              }.png`}
                              alt=""
                            />
                          </div>
                          <div className="ml-4">
                            <div className="font-medium capitalize text-gray-900">
                              {
                                approval.player_playerTorequest_tick_player_id
                                  .name
                              }
                            </div>
                            <div className="capitalize text-gray-500">
                              {
                                approval.player_playerTorequest_tick_player_id
                                  .class
                              }
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <Link to={`/raids/${approval.raid_id}`}>
                          {approval.raid.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {approval.raid_hour}
                      </td>
                      <td className="txt-sm whitespace-nowrap px-3 py-4 text-gray-500">
                        <div className="flex items-center justify-center gap-2 ">
                          <Form method="post">
                            <input
                              type="hidden"
                              name="tick.approve"
                              value={[
                                approval.player_id,
                                approval.raid_id,
                                approval.raid_hour,
                              ].join(":")}
                            />
                            <button
                              className="rounded-full bg-green-600 p-1 hover:bg-green-500"
                              type="submit"
                            >
                              <CheckIcon
                                className="h-5 w-5 text-white"
                                aria-hidden="true"
                              />
                            </button>
                          </Form>
                          <Form method="post">
                            <input
                              type="hidden"
                              name="tick.reject"
                              value={[
                                approval.player_id,
                                approval.raid_id,
                                approval.raid_hour,
                              ].join(":")}
                            />
                            <button
                              className="rounded-full bg-red-600 p-1 hover:bg-red-500"
                              type="submit"
                            >
                              <XIcon
                                className="h-5 w-5 text-white"
                                aria-hidden="true"
                              />
                            </button>
                          </Form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="col-span-12 rounded shadow xl:col-span-4">
          <h2 className="p-4 text-lg font-medium">Tick approval activity</h2>
          <ul role="list" className="divide-y divide-gray-200 p-2 px-6">
            {recentApprovals.length === 0 ? (
              <div className="flex flex-col items-center rounded border-2 border-dashed border-gray-200 py-12 px-4 text-center">
                <TableIcon
                  className="mb-2 h-8 w-8 text-gray-400"
                  aria-hidden="true"
                />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No activity
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  It doesn't look like anything has happened here yet.
                </p>
              </div>
            ) : null}
            {recentApprovals.map((activity, activityIdx) => (
              <li key={activityIdx}>
                <div className="relative pb-8">
                  {activityIdx !== recentApprovals.length - 1 ? (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span
                        className={classNames(
                          activity?.approved_by ? "bg-green-500" : "bg-red-600",
                          "flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white"
                        )}
                      >
                        {activity?.approved_by ? (
                          <CheckIcon
                            className="h-5 w-5 text-white"
                            aria-hidden="true"
                          />
                        ) : (
                          <XIcon
                            className="h-5 w-5 text-white"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className="text-sm text-gray-500">
                          <Link
                            className="capitalize text-blue-500"
                            to={`/players/${
                              activity?.approved_by
                                ? activity
                                    .player_playerTorequest_tick_approved_by.id
                                : activity
                                    .player_playerTorequest_tick_rejected_by.id
                            }`}
                          >
                            {activity.approved_by
                              ? activity.player_playerTorequest_tick_approved_by
                                  .name
                              : activity.player_playerTorequest_tick_rejected_by
                                  .name}
                          </Link>
                          {activity.approved_by ? " approved " : " rejected "}
                          <Link
                            className="capitalize text-blue-500"
                            to={`/player/${activity.player_playerTorequest_tick_player_id.id}`}
                          >
                            {
                              activity.player_playerTorequest_tick_player_id
                                .name
                            }
                            's
                          </Link>{" "}
                          request for{" "}
                          <Link
                            to={`/raids/${activity?.raid_id}`}
                            className="font-medium text-blue-500"
                          >
                            {activity.raid.name} (tick #{activity.raid_hour})
                          </Link>
                        </p>
                      </div>
                      <div className="whitespace-nowrap text-right text-sm text-gray-500">
                        <time
                          dateTime={new Date(
                            (activity.approved_by
                              ? activity.approved_at
                              : activity.rejected_at) ?? ""
                          ).toISOString()}
                        >
                          {activity.approved_by
                            ? activity.approved_at
                            : activity.rejected_at}
                        </time>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Form className="hidden" method="get">
        <button ref={refreshRef} type="submit">
          Reload
        </button>
      </Form>
    </div>
  );
}
