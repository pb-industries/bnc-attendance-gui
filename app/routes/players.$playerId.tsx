import { Link, useLoaderData } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getRaids } from "~/models/raid.server";
import {
  ArrowSmDownIcon,
  ArrowSmUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/outline";
import { useOptionalUser, useUser } from "~/utils";
import { requireUserId } from "~/session.server";
import { getBoxes, getPlayer } from "~/models/roster.server";
import {
  getPlayerByUserId,
  getUserByPlayerId,
  getUserByPlayerName,
} from "~/models/user.server";

type LoaderData = {
  boxes: Awaited<ReturnType<typeof getBoxes>>;
  user: Awaited<ReturnType<typeof getUserByPlayerId>>;
};

export const loader: LoaderFunction = async ({ params }) => {
  const playerId = params.playerId ?? 0;
  const user = await getUserByPlayerId(BigInt(playerId));
  if (!user) {
    redirect("/");
  }
  const boxes = await getBoxes(BigInt(playerId));
  return json<LoaderData>({ user, boxes });
};

const badgeStyles = {
  member:
    "inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800",
  officer:
    "inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800",
  admin:
    "inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800",
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function RaidIndexPage() {
  const sessionUser = useOptionalUser();
  const { boxes, user } = useLoaderData<LoaderData>();

  //   const { raids } = useLoaderData<LoaderData>();
  const stats = [
    {
      name: "30 day attendance",
      stat: `${user?.player?.attendance_30 ?? 0}%`,
    },
    {
      name: "60 day attendance",
      stat: `${user?.player?.attendance_60 ?? 0}%`,
      classNames: "hidden sm:block",
    },
    {
      name: "90 day attendance",
      stat: `${user?.player?.attendance_90 ?? 0}%`,
      classNames: "hidden sm:block",
    },
    {
      name: "Lifetime attendance",
      stat: `${user?.player?.attendance_life ?? 0}%`,
    },
  ];
  return (
    <div className="w-full py-4">
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
                  to="/profile"
                  className="ml-4 text-sm font-medium text-blue-500 hover:text-gray-700"
                >
                  Profile
                </Link>
              </div>
            </li>
          </ol>
        </nav>
      </div>
      <div className="mt-4">
        <div className="flex items-center gap-2 border-b border-gray-200 py-4">
          <h1 className="text-3xl font-medium capitalize leading-6 text-gray-900">
            {user?.player?.name}
          </h1>
          <span className={badgeStyles?.[user?.role ?? "member"]}>
            {user?.role}
          </span>
        </div>
        <dl className="mt-5 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow md:grid-cols-5 md:divide-y-0 md:divide-x">
          {stats.map((item) => (
            <div
              key={item.name}
              className={classNames("px-4 py-5 sm:p-6", item?.classNames)}
            >
              <dt className="text-base font-normal text-gray-900">
                {item.name}
              </dt>
              <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
                <div className="flex items-baseline text-2xl font-semibold text-indigo-600">
                  {item.stat}
                </div>
              </dd>
            </div>
          ))}
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-base font-normal text-gray-900">Total boxes</dt>
            <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div className="flex items-baseline text-2xl font-semibold text-indigo-600">
                {boxes?.length}
              </div>

              <div
                className={classNames(
                  "bg-green-100 text-green-800",
                  "inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0"
                )}
              >
                Ticket bonus: 20
              </div>
            </dd>
          </div>
        </dl>
      </div>
      <div className="mt-6">
        <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
          <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-between sm:flex-nowrap">
            <div className="ml-4 mt-2">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Box Management
              </h3>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-6 gap-2 py-4">
          {boxes?.map((box) => (
            <div className="flex gap-2 rounded-sm border border-gray-500 py-3 px-2">
              <img
                className="inline-block h-10 w-10 rounded-full"
                src={`/images/${box.class}.png`}
              />
              <div className="flex flex-col">
                <h2 className="text-md font-medium capitalize ">{box.name}</h2>
                <p className="text-xs text-gray-500">Level: {box.level}</p>
              </div>
            </div>
          ))}
          <div className="ml-4 mt-2 flex-shrink-0">
            <button
              type="button"
              className="relative inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Add box
            </button>
          </div>
        </dl>
      </div>
    </div>
  );
}
