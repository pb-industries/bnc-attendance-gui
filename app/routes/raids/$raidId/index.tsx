import { Link, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getRaid } from "~/models/raid.server";
import { ChevronRightIcon } from "@heroicons/react/outline";
import { useCallback, useEffect, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts";
import debounce from "lodash.debounce";

type LoaderData = {
  raid: Awaited<ReturnType<typeof getRaid>>;
};

type HighchartsData = {
  title: { text: string };
  chart?: { type: string; width: number; height: number };
  xAxis: { categories: string[]; crosshair: boolean };
  series: { name: string; data: number[] }[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const raid = await getRaid({ id: (params.raidId ?? 0) as unknown as number });
  return json<LoaderData>({ raid });
};

export default function raidIdPage() {
  const { raid } = useLoaderData<LoaderData>();
  const [mounted, setMounted] = useState(false);
  const [containerWidth, setContainerWidth] = useState(
    typeof window === "undefined" ? 800 : window.innerWidth - 100
  );
  const [options, setOptions] = useState<HighchartsData>({
    title: { text: "Attendance" },
    xAxis: { categories: [], crosshair: true },
    series: [],
  });

  const doResize = () => {
    let container = document.querySelector("#chart-container");
    var width = container?.getBoundingClientRect().width;
    if (!width) {
      width = window.innerWidth;
    }

    setContainerWidth(width - 100);
  };

  const debouncedResize = useCallback(
    debounce(() => {
      doResize();
    }, 100),
    []
  );

  useEffect(() => {
    window.addEventListener("resize", debouncedResize);
    doResize();
    setMounted(true);
    return () => window.removeEventListener("resize", debouncedResize);
  }, [mounted]);

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
      console.log(attendeeData);
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
    console.log(xAxis);
    console.log(seriesData);
    setOptions({
      ...options,
      series: seriesData,
      xAxis,
    });
  }, [raid]);

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
        <div className="mt-4 flex flex-shrink-0 md:mt-0 md:ml-4">
          <button
            type="button"
            className="ml-3 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Request missing ticks
          </button>
        </div>
      </div>

      <div
        id="chart-container"
        className="w-full p-4"
        style={{ height: "700px" }}
      >
        <HighchartsReact
          highcharts={Highcharts}
          options={{
            ...options,
            chart: {
              type: "column",
              width: containerWidth,
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
              headerFormat: "<b>{point.x}</b><br/>",
              pointFormat:
                "{series.name}: {point.y}<br/>Total: {point.stackTotal}",
            },
            plotOptions: {
              column: { stacking: "normal", dataLabels: { enabled: true } },
            },
          }}
        />
      </div>
    </div>
  );
}
