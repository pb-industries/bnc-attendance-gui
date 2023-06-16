import { Link, useLoaderData } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { ChevronRightIcon, PencilIcon, XIcon } from "@heroicons/react/outline";
import { getBadgeStyle, useOptionalUser, validatePlayer } from "~/utils";
import {
  createBox,
  deletePlayer,
  getBoxes,
  getPlayer,
} from "~/models/roster.server";
import { getUserById, getUserByPlayerId } from "~/models/user.server";
import { player, user } from "@prisma/client";
import HandleDeleteModal from "../../../components/players/deleteModal";
import ManageBoxModal from "../../../components/players/manageBoxModal";
import { useEffect, useState } from "react";
import { requireUser } from "~/session.server";

type LoaderData = {
  boxes: Awaited<ReturnType<typeof getBoxes>>;
  user: Awaited<ReturnType<typeof getUserByPlayerId>>;
  player: player;
};

interface ActionData {
  errors: {
    player?: {
      name?: string;
      level?: string;
      class?: string;
    };
  };
}

const handleBoxEditAction = async (
  mainId: bigint,
  formData: FormData,
  method: string,
  user: user
) => {
  const playerId = formData.get("player.id")?.toString() ?? null;
  const playerName = formData.get("player.name")?.toString() ?? null;
  const playerClass = formData.get("player.class")?.toString() ?? null;
  const playerRank = formData.get("player.rank")?.toString() ?? null;
  const playerLevel =
    parseInt(formData.get("player.level")?.toString() ?? "0") ?? 65;

  if (typeof playerName !== "string") {
    return json<ActionData>(
      { errors: { player: { name: "Name is required" } } },
      { status: 400 }
    );
  }

  if (
    !playerName ||
    !playerClass ||
    !validatePlayer({
      name: playerName ?? "",
      class: playerClass ?? "",
      // @ts-ignore
      level: playerLevel ?? 0,
    })
  ) {
    return json<ActionData>(
      { errors: { player: { name: "Invalid player details" } } },
      { status: 400 }
    );
  }

  if (method.toUpperCase() === "PUT" && !playerId) {
    return json<ActionData>(
      { errors: { player: { name: "Player ID not found, contact a dev" } } },
      { status: 400 }
    );
  }

  let player: Partial<player> = {
    name: playerName,
    class: playerClass,
    level: playerLevel as unknown as bigint,
  };

  if (["admin", "officer"].includes(user?.role ?? "guest")) {
    const rank = ["alt", "raider", "support"].includes(playerRank ?? "")
      ? playerRank?.trim().toLowerCase()
      : "raider";
    player.rank = rank;
  }
  // @ts-ignore
  return await createBox(player, mainId, playerId);
};

export const action: ActionFunction = async ({ request, params }) => {
  const formData = await request.formData();
  const user = await requireUser(request);
  const method = request.method;

  if (method.toUpperCase() === "DELETE") {
    const playerId = formData.get("player_id");
    if (typeof playerId !== "string") {
      return redirect(request.headers.get("Referer") ?? "/");
    }

    await deletePlayer(request, BigInt(playerId));
  } else if (["PUT", "POST"].includes(method.toUpperCase())) {
    const mainId = params?.playerId ?? 0;
    await handleBoxEditAction(BigInt(mainId), formData, method, user);
  }

  return redirect(request.headers.get("Referer") ?? "/roster");
};

export const loader: LoaderFunction = async ({ params }) => {
  const playerId = params.playerId ?? 0;
  const user = await getUserByPlayerId(BigInt(playerId));
  let player: Awaited<ReturnType<typeof getPlayer>> | null = null;
  if (!user?.player) {
    player = await getPlayer(BigInt(playerId));
  } else {
    player = user.player;
  }
  if (!player) {
    return redirect("/");
  }
  if (player.player_alt_playerToplayer_alt_alt_id.length > 0) {
    return redirect(
      `/players/${player.player_alt_playerToplayer_alt_alt_id[0].player_id}`
    );
  }
  const boxes = await getBoxes(BigInt(playerId));
  return json<LoaderData>({ user, player, boxes });
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function RaidIndexPage() {
  const sessionUser = useOptionalUser();
  const { boxes, user, player } = useLoaderData<LoaderData>();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isManagePlayerModalOpen, setIsManagePlayerModalOpen] = useState(false);
  const [deletePlayer, setDeletePlayer] = useState<player | null>(null);
  const [editPlayer, setEditPlayer] = useState<player | null>(null);

  //   const { raids } = useLoaderData<LoaderData>();
  const stats = [
    {
      name: "30 day attendance",
      stat: `${player?.attendance_30 ?? 0}%`,
    },
    {
      name: "60 day attendance",
      stat: `${player?.attendance_60 ?? 0}%`,
      classNames: "hidden sm:block",
    },
    {
      name: "90 day attendance",
      stat: `${player?.attendance_90 ?? 0}%`,
      classNames: "hidden sm:block",
    },
    {
      name: "Lifetime attendance",
      stat: `${player?.attendance_life ?? 0}%`,
    },
  ];

  const deleteBox = (box?: player) => {
    setIsDeleteModalOpen(!isDeleteModalOpen);
    setDeletePlayer(box ?? null);
  };

  const editBox = (box?: player) => {
    setEditPlayer(box ?? null);
    setIsManagePlayerModalOpen(true);
  };

  const addBox = () => {
    setEditPlayer(null);
    setIsManagePlayerModalOpen(true);
  };

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
            {player?.name}
          </h1>
          <span className={getBadgeStyle(user?.role ?? "guest")}>
            {user?.role ?? "guest"}
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
                Lotto tickets:{player?.total_tickets ?? 0}
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
        <ul
          role="list"
          className="grid grid-cols-1 gap-6 py-4  sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {boxes?.map((box) => (
            <li
              key={box?.name}
              className="col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow"
            >
              <div className="flex w-full items-center justify-between space-x-6 p-6">
                <div className="flex-1 truncate">
                  <div className="flex items-center space-x-3">
                    <h3 className="truncate text-sm font-medium capitalize text-gray-900">
                      {box?.name}
                    </h3>
                    <span className="inline-block flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      {box?.class}
                    </span>
                    <span
                      className={`inline-block flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        box?.rank === "raider"
                          ? "bg-purple-100 text-purple-800"
                          : box?.rank === "support"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {box?.rank ?? "alt"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    Level {box?.level}
                  </p>
                </div>
                <img
                  className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-300"
                  src={`/images/${box?.class}.png`}
                  alt=""
                />
              </div>
              {sessionUser?.player?.id === player?.id ||
              ["admin", "officer"].includes(sessionUser?.role ?? "guest") ? (
                <div>
                  <div className="-mt-px flex divide-x divide-gray-200">
                    <div className="flex w-0 flex-1">
                      <button
                        // @ts-ignore
                        onClick={() => editBox(box)}
                        className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center rounded-bl-lg border border-transparent py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                      >
                        <PencilIcon
                          className="h-5 w-5 text-gray-400"
                          aria-hidden="true"
                        />
                        <span className="ml-2">Edit</span>
                      </button>
                    </div>
                    <div className="-ml-px flex w-0 flex-1">
                      <button
                        // @ts-ignore
                        onClick={() => {
                          deleteBox(box);
                        }}
                        className="relative inline-flex w-0 flex-1 items-center justify-center rounded-br-lg border border-transparent bg-red-500 py-2 text-sm font-medium text-white text-gray-700 hover:bg-red-600"
                      >
                        <XIcon
                          className="h-5 w-5 text-white"
                          aria-hidden="true"
                        />
                        <span className="ml-2 text-white">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
          {user?.player?.id === player?.id ||
          ["admin", "officer"].includes(sessionUser?.role ?? "guest") ? (
            <li
              key="add-box"
              className="col-span-1 flex flex flex-col items-center justify-center gap-2 divide-y divide-gray-200 rounded-lg border-2 border-dashed border-indigo-200 bg-white py-8 text-center"
            >
              <button
                type="button"
                onClick={() => addBox()}
                className="relative inline-flex items-center rounded-md border border-2 border-transparent border-indigo-600 px-4 py-2 text-sm font-medium text-white text-indigo-600 shadow-sm hover:bg-indigo-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Add box
              </button>
            </li>
          ) : null}
        </ul>
      </div>
      <HandleDeleteModal
        open={isDeleteModalOpen}
        setOpen={setIsDeleteModalOpen}
        deletePlayer={deletePlayer}
      />
      <ManageBoxModal
        open={isManagePlayerModalOpen}
        player={editPlayer}
        setOpen={setIsManagePlayerModalOpen}
        canSetRank={["admin", "officer"].includes(sessionUser?.role ?? "guest")}
      />
    </div>
  );
}
