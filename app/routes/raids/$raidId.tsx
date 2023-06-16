import { Link, useLoaderData, Outlet, Form } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import {
  createRaidTickRequest,
  deleteRaidTicks,
  getRaid,
  getCurrencySplitMeta,
  getRaidTicks,
} from "~/models/raid.server";
import { ChevronRightIcon, CheckIcon, EyeIcon } from "@heroicons/react/outline";
import { useEffect, useRef, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts";
import RequestTicksModal from "~/components/raids/requestTicksModal";
import RemoveTicksModal from "~/components/raids/removeTicksModal";
import GenerateLottoRangeModal from "~/components/raids/generateLottoRangeModal";
import { getMains, getMainsAtTick } from "~/models/roster.server";
import { formatDate, getRollRange, useOptionalUser } from "~/utils";
import { getUser, requireUser } from "~/session.server";
import { player } from "@prisma/client";
import GenerateCurrencySplitModal from "~/components/raids/generateCurrencySplitModal";
import { AUDIT_TICK_REMOVED, AUDIT_TICK_REQUESTED, createAuditLog } from "~/models/admin.server";

type LoaderData = {
  raid: Awaited<ReturnType<typeof getRaid>>;
  mains: Awaited<ReturnType<typeof getMains>> | player[];
  player: player;
  raidTicks: Awaited<ReturnType<typeof getRaidTicks>>;
  attendees: Awaited<ReturnType<typeof getCurrencySplitMeta>>
};

type HighchartsData = {
  title: { text: string };
  chart?: { type: string; width: number; height: number };
  xAxis: { categories: string[]; crosshair: boolean };
  series: { name: string; data: number[] }[];
};

export const action: ActionFunction = async ({ request }) => {
  const user = await requireUser(request);
  const formData = await request.formData();

  const playerId = formData.get("player.id") ?? null;
  const raidId = formData.get("raid.id") ?? null;
  if (typeof playerId !== "string" || typeof raidId !== "string") {
    return json({ error: "No player selected" });
  }

  if (
    !["officer", "admin"].includes(user?.role ?? "guest") &&
    user?.player_id !== BigInt(playerId)
  ) {
    return json({
      status: 403,
      alert: {
        type: "error",
        message: "Only admins can request on behalf of other",
      },
    });
  }

  // @ts-ignore
  const ticks = formData.getAll("tick").map((tick) => BigInt(tick));
  if (ticks.length === 0) {
    return json({
      status: 403,
      alert: { type: "error", message: "No ticks selected" },
    });
  }

  if (request.method !== "DELETE") {
    await createRaidTickRequest(BigInt(playerId), BigInt(raidId), ticks);
    await createAuditLog({
      userId: user.id,
      type: AUDIT_TICK_REQUESTED,
      ticks: ticks as any as number[],
      from_player_id: BigInt(playerId),
      raid_id: BigInt(raidId)
    })
  } else if (
    request.method === "DELETE" &&
    ["admin"].includes(user?.role ?? "guest")
  ) {
    await deleteRaidTicks(BigInt(playerId), BigInt(raidId), ticks);
    await createAuditLog({
      userId: user.id,
      type: AUDIT_TICK_REMOVED,
      ticks: ticks as any as number[],
      from_player_id: BigInt(playerId),
      raid_id: BigInt(raidId)
    })
  }

  return json({
    status: 200,
    alert: {
      type: "succes",
      message: "Successfully requested ticks, please await officer approval",
    },
  });
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await getUser(request);
  const raid = await getRaid({ id: (params.raidId ?? 0) as unknown as number });
  const raidTicks = await getRaidTicks(params.raidId ?? 0);
  const attendees = await getCurrencySplitMeta(params.raidId ?? 0);
  return json<LoaderData>({
    raid,
    raidTicks,
    mains: await getMains(),
    attendees,
    player: user?.player,
  });
};

export default function raidIdPage() {
  const user = useOptionalUser();
  const [isCopied, setIsCopied] = useState(false);
  const [isDebugCopied, setIsDebugCopied] = useState(false);
  const refreshRef = useRef<HTMLButtonElement>();
  const { raidTicks, raid, mains, player, attendees } = useLoaderData<LoaderData>();
  const [isRequestTicksModalOpen, setIsRequestTicksModalOpen] = useState(false);
  const [isRemoveTicksModalOpen, setIsRemoveTicksModalOpen] = useState(false);
  const [isGenerateLottoRangeModalOpen, setIsGenerateLottoRangeModalOpen] =
    useState(false);
  const [
    isGenerateCurrencySplitModalOpen,
    setIsGenerateCurrencySplitModalOpen,
  ] = useState(false);
  const [options, setOptions] = useState<HighchartsData>({
    title: { text: "Attendance and box distribution" },
    xAxis: { categories: [], crosshair: true },
    series: [],
  });

  const onCopyText = async () => {
    const res: Awaited<ReturnType<typeof getMainsAtTick>> = await (
      await fetch(`/raids/mains-at-tick?raidId=${raid.id}`)
    ).json();
    const mainsAtTick = new Set(res);
    navigator.clipboard.writeText(getRollRange(mainsAtTick));

    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 1000);
  };

  const onCopyDebugText = async () => {
    const res: Awaited<ReturnType<typeof getMainsAtTick>> = await (
      await fetch(`/raids/mains-at-tick?raidId=${raid.id}`)
    ).json();
    const mainsAtTick = new Set(res);
    navigator.clipboard.writeText(getRollRange(mainsAtTick, true));

    setIsDebugCopied(true);
    setTimeout(() => {
      setIsDebugCopied(false);
    }, 1000);
  };

  useEffect(() => {
    console.log(attendees)
    let interval = setInterval(() => {
      // refreshRef?.current?.click()
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const seriesData: { name: string; data: number[] }[] = [];
    const categories: string[] = [];
    for (let i = 0; i <= raid.total_ticks; i++) {
      let category = "";
      if (i === 0) {
        category = "On time tick";
      } else if (i === raid.total_ticks - 1) {
        category = "Final tick";
      } else {
        category = `Tick ${i}`;
      }
      category = `${category} - ${formatDate(
        raidTicks[i] ?? new Date(),
        true
      )}`;
      categories.push(category);
    }

    raid.attendees.forEach((attendeeData) => {
      const seriesDatum: { name: string; data: number[] } = {
        name: attendeeData.name,
        data: [],
      };
      Object.keys(attendeeData.ticks).forEach((tick) => {
        const tickData = attendeeData.ticks[tick];
        seriesDatum.data.push(tickData.length);
      });
      seriesData.push(seriesDatum);
    });

    const xAxis: { categories: string[]; crosshair: boolean } = {
      categories,
      crosshair: true,
    };
    setOptions({
      ...options,
      series: seriesData,
      xAxis,
    });
  }, [raid]);

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
                  className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Raids
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
                  to={`/raids/${raid.id}`}
                  aria-current="page"
                  className="ml-4 text-sm font-medium text-blue-500 hover:text-gray-700"
                >
                  {raid.name}
                </Link>
              </div>
            </li>
          </ol>
        </nav>
      </div>
      <div className="mt-4 md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
              Raid: {raid.name}
            </h2>
            {raid.isLive ? (
              <div className="flex items-center">
                <button
                  onClick={onCopyText}
                  className="relative inline-flex w-full justify-center rounded-l-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto sm:text-sm"
                >
                  <span>{isCopied ? "Copied" : "Copy Live Range"}</span>
                </button>
                <button
                  onClick={onCopyDebugText}
                  className="relative inline-flex w-full justify-center rounded-r-md border border-l border-transparent border-l-red-100 bg-gray-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto sm:text-sm"
                >
                  <span>
                    {isDebugCopied ? (
                      <CheckIcon
                        className="h-5 w-5 flex-shrink-0 text-white"
                        aria-hidden="true"
                      />
                    ) : (
                      <EyeIcon
                        className="h-5 w-5 flex-shrink-0 text-white"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-300"></span>
                  </span>
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col items-center sm:mt-2 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="flex items-center text-sm text-gray-500">
              Total ticks: {raid.total_ticks}
            </div>
            <div className="flex items-center text-sm text-gray-500">
              Occurred on:{" "}
              {new Date(Date.parse(`${raid.created_at}`))
                .toISOString()
                .substring(0, 10)}
            </div>
            {raid?.is_official ? null : (
              <span className="rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-900">
                Unofficial
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-shrink-0 md:mt-0 md:ml-4">
          {["admin"].includes(user?.role ?? "guest") ? (
            <button
              type="button"
              className="ml-3 inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              onClick={() => setIsRemoveTicksModalOpen(true)}
            >
              Remove ticks
            </button>
          ) : null}
          {user ? (
            <button
              type="button"
              className="ml-3 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={() => setIsRequestTicksModalOpen(true)}
            >
              Request missing ticks
            </button>
          ) : null}
          <button
            type="button"
            className="ml-3 inline-flex items-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={() => setIsGenerateLottoRangeModalOpen(true)}
          >
            Generate Lotto Range
          </button>
          <button
            type="button"
            className="ml-3 inline-flex items-center rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={() => setIsGenerateCurrencySplitModalOpen(true)}
          >
            Generate Currency Split
          </button>
        </div>
      </div>

      <div
        id="chart-container"
        className="w-full sm:p-4"
        style={{ height: "700px" }}
      >
        <HighchartsReact
          highcharts={Highcharts}
          options={{
            ...options,
            chart: {
              type: "column",
              // width: containerWidth,
              height: 700,
            },
            yAxis: {
              allowDecimals: false,
              min: 0,
              title: { text: "Number of attendees per hour" },
              stackLabels: {
                enabled: true,
                style: {
                  fontWeight: "bold",
                  color: "gray",
                },
              },
            },
            legend: {
              align: "right",
              x: -30,
              verticalAlign: "top",
              y: 25,
              floating: true,
              backgroundColor: "white",
              borderColor: "#CCC",
              borderWidth: 1,
              shadow: false,
            },
            tooltip: {
              headerFormat: "<b>Boxes at tick</b><br/>",
              pointFormat: `<span class="capitalize">{series.name}</span>: {point.y}`,
            },
            plotOptions: {
              column: {
                stacking: "normal",
                dataLabels: {
                  enabled: true,
                  formatter: function () {
                    if (this.point.y > 0) {
                      return `<span class="capitalize">${this.series.name}</span>`;
                    }
                  },
                },
              },
            },
          }}
        />
      </div>

      <div className="mt-8 p-4">
        <Outlet />
      </div>

      <RequestTicksModal
        open={isRequestTicksModalOpen}
        setOpen={setIsRequestTicksModalOpen}
        players={
          ["officer", "admin"].includes(user?.role ?? "guest")
            ? mains
            : [player]
        }
        selectedPlayerId={user?.player_id}
        totalTicks={raid.total_ticks}
        raidId={raid.id!}
      />

      <RemoveTicksModal
        open={isRemoveTicksModalOpen}
        setOpen={setIsRemoveTicksModalOpen}
        players={mains}
        selectedPlayerId={user?.player_id}
        totalTicks={raid.total_ticks}
        raidId={raid.id!}
      />

      <GenerateLottoRangeModal
        open={isGenerateLottoRangeModalOpen}
        setOpen={setIsGenerateLottoRangeModalOpen}
        players={mains}
      />

      <GenerateCurrencySplitModal
        open={isGenerateCurrencySplitModalOpen}
        setOpen={setIsGenerateCurrencySplitModalOpen}
        attendees={attendees}
      />

      <Form className="hidden" method="get">
        <button ref={refreshRef} type="submit">
          Reload
        </button>
      </Form>
    </div>
  );
}
