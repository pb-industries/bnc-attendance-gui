import { Link, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
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
import { getPlayerByUserId } from "~/models/user.server";

type LoaderData = {
  boxes: Awaited<ReturnType<typeof getBoxes>>;
  player: Awaited<ReturnType<typeof getPlayer>>;
};

export const loader: LoaderFunction = async ({ params }) => {
  const playerId = params.playerId ?? 0;
  const player = await getPlayer(BigInt(playerId));
  const boxes = await getBoxes(BigInt(playerId));
  return json<LoaderData>({ player, boxes });
};

const badgeStyles = {
  member: "bg-green-500 text-white",
  officer: "bg-blue-500 text-white",
  admin: "bg-orange-500 text-white",
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function RaidIndexPage() {
  const user = useOptionalUser();
  const { boxes, player } = useLoaderData<LoaderData>();

  //   const { raids } = useLoaderData<LoaderData>();
  const stats = [
    {
      name: "30 day attendance",
      stat: `${player?.attendance_30}%`,
    },
    {
      name: "60 day attendance",
      stat: `${player?.attendance_60}%`,
      classNames: "hidden sm:block",
    },
    {
      name: "90 day attendance",
      stat: `${player?.attendance_90}%`,
      classNames: "hidden sm:block",
    },
    {
      name: "Lifetime attendance",
      stat: `${player?.attendance_life}%`,
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
        <h1 className="text-xl font-medium capitalize leading-6 text-gray-900">
          {player?.name}
        </h1>
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
            <div className="ml-4 mt-2 flex-shrink-0">
              <button
                type="button"
                className="relative inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Add box
              </button>
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
        </dl>
      </div>
    </div>
  );
}
