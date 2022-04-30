import { Link, useLoaderData, Outlet } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { createRaidTickRequest, getRaid } from "~/models/raid.server";
import { ChevronRightIcon } from "@heroicons/react/outline";
import { useEffect, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts";
import RequestTicksModal from "~/components/raids/requestTicksModal";
import GenerateLottoRangeModal from "~/components/raids/generateLottoRangeModal";
import { getMains } from "~/models/roster.server";
import { useOptionalUser } from "~/utils";
import { requireUser } from "~/session.server";
import { player } from "@prisma/client";

type LoaderData = {
  raid: Awaited<ReturnType<typeof getRaid>>;
  mains: Awaited<ReturnType<typeof getMains>> | player[];
  player: player;
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

  await createRaidTickRequest(BigInt(playerId), BigInt(raidId), ticks);

  return json({
    status: 200,
    alert: {
      type: "succes",
      message: "Successfully requested ticks, please await officer approval",
    },
  });
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const raid = await getRaid({ id: (params.raidId ?? 0) as unknown as number });
  return json<LoaderData>({
    raid,
    mains: await getMains(),
    player: user?.player,
  });
};

export default function raidIdPage() {
  const user = useOptionalUser();
  const { raid, mains, player } = useLoaderData<LoaderData>();
  const [isRequestTicksModalOpen, setIsRequestTicksModalOpen] = useState(false);
  const [isGenerateLottoRangeModalOpen, setIsGenerateLottoRangeModalOpen] =
    useState(false);
  const [options, setOptions] = useState<HighchartsData>({
    title: { text: "Attendance and box distribution" },
    xAxis: { categories: [], crosshair: true },
    series: [],
  });

  useEffect(() => {
    const seriesData: { name: string; data: number[] }[] = [];
    const categories: string[] = [];
    for (let i = 0; i <= raid.total_ticks; i++) {
      if (i === 0) {
        categories.push("On time tick");
      } else if (i === raid.total_ticks - 1) {
        categories.push("Final tick");
      } else {
        categories.push(`Tick ${i}`);
      }
    }

    raid.attendees.forEach((attendeeData) => {
      const seriesDatum: { name: string; data: number[] } = {
        name: attendeeData.name,
        data: [],
      };
      Object.keys(attendeeData.ticks).forEach((tick) => {
        const tickData = attendeeData.ticks[tick];
        if (tickData.length > 0) {
          seriesDatum.data.push(tickData.length);
        }
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
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            Raid: {raid.name}
          </h2>
          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500">
              Total ticks: {raid.total_ticks}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              Occurred on:{" "}
              {new Date(Date.parse(`${raid.created_at}`))
                .toISOString()
                .substring(0, 10)}
            </div>
          </div>
        </div>
        {user ? (
          <div className="mt-4 flex flex-shrink-0 md:mt-0 md:ml-4">
            <button
              type="button"
              className="ml-3 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={() => setIsRequestTicksModalOpen(true)}
            >
              Request missing ticks
            </button>
            {["officer", "admin"].includes(user?.role ?? "guest") ? (
              <button
                type="button"
                className="ml-3 inline-flex items-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={() => setIsGenerateLottoRangeModalOpen(true)}
              >
                Generate Lotto Range
              </button>
            ) : null}
          </div>
        ) : null}
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
                    return `<span class="capitalize">${this.series.name}</span>`;
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

      <GenerateLottoRangeModal
        open={isGenerateLottoRangeModalOpen}
        setOpen={setIsGenerateLottoRangeModalOpen}
        players={mains}
      />
    </div>
  );
}
