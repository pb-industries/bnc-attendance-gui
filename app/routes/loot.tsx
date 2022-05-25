import {
  ActionFunction,
  Form,
  json,
  LoaderFunction,
  redirect,
  useLoaderData,
} from "remix";
import { DateRangePicker } from "react-date-range";
import { getUserId, requireUser } from "~/session.server";
import {
  getLatestRaidId,
  getLootForPeriod,
  getLootForRaid,
  getRaidList,
} from "~/models/loot.server";
import { classNames, useOptionalUser } from "~/utils";
import { prisma } from "~/db.server";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Highcharts from "highcharts";
import drilldown from "highcharts/modules/drilldown.js";
import HighchartsReact from "highcharts-react-official";
import LootTable from "~/components/lootTable";
import { Menu, Switch, Transition } from "@headlessui/react";
import { getMains } from "~/models/roster.server";
import { addDays, subDays } from "date-fns";

type LoaderData = {
  loot: Awaited<ReturnType<typeof getLootForRaid>>;
  raids: Awaited<ReturnType<typeof getRaidList>>;
  raidId: bigint;
  mains: Awaited<ReturnType<typeof getMains>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  const { searchParams } = new URL(request.url);

  const rawCategories = searchParams.get("categories");
  const categories = (
    rawCategories
      ? rawCategories.replace(" ", "").split(",")
      : ["bis", "rolled"]
  ) as Category[];
  let from = searchParams.get("period.from") ?? false;
  let to = searchParams.get("period.to") ?? false;
  console.log(from, to);

  if (from && to) {
    const loot = await getLootForPeriod(
      new Date(from),
      new Date(to),
      categories
    );

    return json<LoaderData>({
      loot,
      raids: await getRaidList(),
      raidId: BigInt(0),
      mains: await getMains(),
    });
  }

  let raidId = BigInt(`${searchParams.get("raidId") ?? 0}`);
  if (!raidId) {
    raidId = (await getLatestRaidId()) ?? BigInt(0);
  }
  const loot = await getLootForRaid(
    raidId ? [raidId] : [],
    undefined,
    categories
  );

  return json<LoaderData>({
    loot,
    raids: await getRaidList(),
    raidId,
    mains: await getMains(),
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  const user = requireUser(request);
  const formData = await request.formData();

  const itemId = BigInt(`${formData.get("item_id") ?? 0}`);
  const category = formData.get("category");

  if (!itemId || typeof category !== "string") {
    return null;
  }

  if (!user) {
    return null;
  }

  await prisma.item.update({
    where: { id: itemId },
    data: {
      category,
    },
  });

  let raidId = BigInt(`${formData.get("raidId") ?? 0}`);
  if (!raidId) {
    raidId = (await getLatestRaidId()) ?? BigInt(0);
  }
  const loot = await getLootForRaid(raidId ? [raidId] : []);

  return json<LoaderData>({
    loot,
    raidId,
    raids: await getRaidList(),
    mains: await getMains(),
  });
};

type Category = "bis" | "rolled" | "trash" | "uncategorized";
type DrilldownDatum = {
  playerId: string;
  name: string;
  total_items: number;
  drilldown: { [altId: string]: [string, number] };
};

export default function () {
  const user = useOptionalUser();
  const [ranges, setRanges] = useState([
    {
      key: "selection",
      startDate: subDays(new Date(), 7),
      endDate: new Date(),
    },
  ]);
  const filterFormSubmit = useRef(null);
  const [filterBy, setFilterBy] = useState<"raidId" | "period">("raidId");
  const [includeBis, setIncludeBis] = useState(true);
  const [includeRolled, setIncludeRolled] = useState(false);
  const [includePasses, setIncludePasses] = useState(false);
  const [lootDistribution, setLootDistribution] = useState<DrilldownDatum[]>(
    []
  );
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { loot: lootRaw, raids, raidId, mains } = useLoaderData<LoaderData>();

  useMemo(() => {
    if (!mounted && typeof window !== "undefined") {
      setMounted(true);
      drilldown(Highcharts);
    }
  }, [mounted]);

  useMemo(() => {
    setTimeout(() => {
      filterFormSubmit?.current?.click();
    }, 50);
  }, [filterBy, ranges]);

  useMemo(() => {
    const distribution: { [key: string]: DrilldownDatum } = {};
    const categories = new Set();
    if (includeBis) {
      categories.add("bis");
    }
    if (includeRolled) {
      categories.add("rolled");
    }

    mains.forEach((m) => {
      if (!distribution?.[`${m.id}`]) {
        distribution[`${m.id}`] = {
          playerId: `${m.id}`,
          name: m.name,
          total_items: 0,
          drilldown: {},
        };
      }
    });

    lootRaw.map((lr) => {
      // Sacred water is our pass token
      const isPassToken = `${lr.item_id}` === "756381770069475329";
      if (isPassToken && !includePasses) {
        return;
      }

      if (
        !isPassToken &&
        !categories.has((lr.item.category ?? "trash").toLowerCase().trim())
      ) {
        return;
      }

      const playerAlt = lr.player.player_alt_playerToplayer_alt_alt_id?.[0];
      const isBox = !!(playerAlt && playerAlt.alt_id === lr.looted_by_id);
      const mainName = isBox
        ? playerAlt.player_playerToplayer_alt_player_id.name
        : lr.player.name;
      const mainId = isBox ? playerAlt.player_id : lr.looted_by_id;
      const altId = playerAlt?.alt_id ? playerAlt.alt_id : lr.looted_by_id;

      if (!distribution?.[`${mainId}`]) {
        distribution[`${mainId}`] = {
          playerId: `${mainId}`,
          name: mainName,
          total_items: 0,
          drilldown: {},
        };
      }

      if (isBox) {
        if (!distribution?.[`${mainId}`]?.drilldown?.[`${altId}`]) {
          distribution[`${mainId}`].drilldown[`${altId}`] = [lr.player.name, 0];
        }

        distribution[`${mainId}`].drilldown[`${altId}`][1] += parseInt(
          `${lr.quantity}`
        );
      }

      distribution[`${mainId}`].total_items += parseInt(`${lr.quantity}`);
    });

    setLootDistribution(Object.values(distribution));
  }, [lootRaw, includeRolled, includeBis, includePasses, filterBy]);

  return (
    <div className="relative w-full">
      <nav className="sticky top-[64px] z-10 -mt-4 mb-4 flex w-full items-center justify-between border-b border-gray-200 bg-white py-4">
        <div className="flex items-center gap-4">
          <Form method="get">
            {filterBy === "raidId" ? (
              <div>
                <label
                  htmlFor="raidId"
                  className="block text-xs font-medium text-gray-700"
                >
                  Raid name
                </label>
                <select
                  className="mt-1 block w-full min-w-[256px] rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  name="raidId"
                  onChange={(e) => filterFormSubmit?.current?.click()}
                >
                  {raids.map((r) => (
                    <option key={`${r.id}`} value={`${r.id}`}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="relative">
                <Menu as="div" className="flex-shrink/active k-0 relative">
                  <Menu.Button className="flex flex-col">
                    <label
                      htmlFor="period"
                      className="block text-xs font-medium text-gray-700"
                    >
                      Date range:
                    </label>
                    <div className="item-center mt-1 flex w-full min-w-[256px] gap-4 rounded-md border border-gray-300 py-2 pl-3 pr-10 text-base text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm">
                      <span className="flex items-center gap-1">
                        <span className="rounded-md bg-gray-100 py-1 px-2 text-xs text-gray-900">
                          from:
                        </span>
                        <span>{ranges[0].startDate.toDateString()}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="rounded-md bg-gray-100 py-1 px-2 text-xs text-gray-900">
                          to:
                        </span>
                        <span>{ranges[0].endDate.toDateString()}</span>
                      </span>
                    </div>
                    <input
                      readOnly={true}
                      type="hidden"
                      name="period.from"
                      value={`${ranges[0].startDate.toDateString()}`}
                    />
                    <input
                      readOnly={true}
                      type="hidden"
                      name="period.to"
                      value={ranges[0].endDate.toDateString()}
                    />
                  </Menu.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <Menu.Item>
                        <DateRangePicker
                          onChange={(item: any) => setRanges([item.selection])}
                          showSelectionPreview={true}
                          moveRangeOnFirstSelection={false}
                          months={2}
                          ranges={ranges}
                          direction="horizontal"
                        />
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            )}
            <button ref={filterFormSubmit} className="hidden" type="submit">
              Refresh
            </button>
          </Form>
          <Switch.Group as="div" className="flex items-center gap-4">
            <div className="flex flex-col-reverse gap-1">
              <Switch
                checked={filterBy === "raidId"}
                onChange={() => {
                  setFilterBy(filterBy === "raidId" ? "period" : "raidId");
                }}
                className={classNames(
                  filterBy === "raidId" ? "bg-indigo-600" : "bg-gray-200",
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                )}
              >
                <span
                  aria-hidden="true"
                  className={classNames(
                    filterBy === "raidId" ? "translate-x-5" : "translate-x-0",
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  )}
                />
              </Switch>
              <Switch.Label as="span">
                <span className="text-xs text-gray-700">Filter by raid?</span>
              </Switch.Label>
            </div>
          </Switch.Group>
        </div>

        <Switch.Group as="div" className="flex items-center gap-4">
          <div className="flex flex-col-reverse gap-1">
            <Switch
              checked={includeBis}
              onChange={() => setIncludeBis(!includeBis)}
              className={classNames(
                includeBis ? "bg-indigo-600" : "bg-gray-200",
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              )}
            >
              <span
                aria-hidden="true"
                className={classNames(
                  includeBis ? "translate-x-5" : "translate-x-0",
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                )}
              />
            </Switch>
            <Switch.Label as="span">
              <span className="text-xs text-gray-700">Include BiS</span>
            </Switch.Label>
          </div>
          <div className="flex flex-col-reverse gap-1">
            <Switch
              checked={includeRolled}
              onChange={() => setIncludeRolled(!includeRolled)}
              className={classNames(
                includeRolled ? "bg-indigo-600" : "bg-gray-200",
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              )}
            >
              <span
                aria-hidden="true"
                className={classNames(
                  includeRolled ? "translate-x-5" : "translate-x-0",
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                )}
              />
            </Switch>
            <Switch.Label as="span">
              <span className="text-xs text-gray-700">Include Rolled</span>
            </Switch.Label>
          </div>

          <div className="flex flex-col-reverse gap-1">
            <Switch
              checked={includePasses}
              onChange={() => setIncludePasses(!includePasses)}
              className={classNames(
                includePasses ? "bg-indigo-600" : "bg-gray-200",
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              )}
            >
              <span
                aria-hidden="true"
                className={classNames(
                  includePasses ? "translate-x-5" : "translate-x-0",
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                )}
              />
            </Switch>
            <Switch.Label as="span">
              <span className="text-xs text-gray-700">Include Passes</span>
            </Switch.Label>
          </div>
        </Switch.Group>
      </nav>
      <HighchartsReact
        highcharts={Highcharts}
        options={{
          chart: {
            type: "pie",
            height: "500px",
            events: {
              drilldown: function (e) {
                const term = e.seriesOptions.data.map((p) => p[0]).join("+");
                setSearchTerm(term);
              },
              drillup: function (e) {
                setTimeout(() => {
                  setSearchTerm("");
                }, 1000);
                return true;
              },
            },
          },
          title: { text: "Loot distribution by player" },
          subtitle: {
            text: "Click the slices to view loot by player and their boxes",
          },
          accessibility: {
            announceNewData: {
              enabled: true,
              point: { valueSuffix: " items" },
            },
          },
          plotOptions: {
            series: {
              dataLabels: {
                enabled: true,
                format: "{point.name}: {point.y} items",
              },
            },
          },
          tooltip: {
            headerFormat:
              '<span style="font-size:11px">{series.name}</span><br>',
            pointFormat:
              '<span style="color:{point.color}">{point.name}</span>: <b>{point.y}</b> items<br/>',
          },
          series: [
            {
              name: "Main loot",
              colorByPoint: true,
              data: lootDistribution.map((p) => {
                if (!p.total_items) {
                  return null;
                }

                return { name: p.name, y: p.total_items, drilldown: p.name };
              }),
            },
          ],
          drilldown: {
            series: lootDistribution.map((p) => {
              const values = Object.values(p.drilldown);
              const boxWins = values.reduce((sum, value) => {
                return sum + value[1];
              }, 0);
              return {
                name: p.name,
                id: p.name,
                data: [[p.name, p.total_items - boxWins], ...values],
              };
            }),
          },
        }}
      />
      <LootTable
        {...{
          lootRaw,
          filterTerm: searchTerm,
          user,
          hideEmpty: true,
          includePasses,
          withRaid: filterBy === "period",
        }}
      />
    </div>
  );
}
