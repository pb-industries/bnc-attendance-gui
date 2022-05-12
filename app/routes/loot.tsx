import {
  ActionFunction,
  json,
  LoaderFunction,
  redirect,
  useLoaderData,
} from "remix";
import { getUserId, requireUser } from "~/session.server";
import { getLatestRaidId, getLootForRaid } from "~/models/loot.server";
import { useOptionalUser } from "~/utils";
import { prisma } from "~/db.server";
import { useEffect, useMemo, useRef, useState } from "react";
import Highcharts from "highcharts";
import drilldown from "highcharts/modules/drilldown.js";
import HighchartsReact from "highcharts-react-official";
import LootTable from "~/components/lootTable";

type LoaderData = { loot: Awaited<ReturnType<typeof getLootForRaid>> };

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await getUserId(request);
  if (!userId) {
    return redirect("/");
  }

  const raidId = await getLatestRaidId();
  const loot = await getLootForRaid(raidId ? [raidId] : []);

  return json<LoaderData>({ loot });
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

  const raidId = await getLatestRaidId();
  const loot = await getLootForRaid(raidId ? [raidId] : []);

  return json<LoaderData>({ loot });
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
  const [chartCategories, setChartCategories] = useState<Category[]>(["bis"]);
  const [lootDistribution, setLootDistribution] = useState<DrilldownDatum[]>(
    []
  );
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { loot: lootRaw } = useLoaderData<LoaderData>();

  useMemo(() => {
    if (!mounted && typeof window !== "undefined") {
      setMounted(true);
      drilldown(Highcharts);
      console.log("drilled down");
    }
  }, [mounted]);

  useMemo(() => {
    const distribution: { [key: string]: DrilldownDatum } = {};
    lootRaw.map((lr) => {
      if (
        !chartCategories.includes((lr.item.category ?? "trash") as Category)
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
  }, [lootRaw]);

  return (
    <div>
      <HighchartsReact
        highcharts={Highcharts}
        options={{
          chart: {
            type: "pie",
            events: {
              drilldown: function (e) {
                const term = e.seriesOptions.data.map((p) => p[0]).join("+");
                setSearchTerm(term);
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
        }}
      />
    </div>
  );
}
