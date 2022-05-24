import {
  ActionFunction,
  Form,
  json,
  Link,
  LoaderFunction,
  useLoaderData,
} from "remix";
import { requireUser } from "~/session.server";
import { getLootForRaid } from "~/models/loot.server";
import { formatDate, useOptionalUser } from "~/utils";
import {
  CubeIcon,
  ShieldCheckIcon,
  TrashIcon,
  XIcon,
} from "@heroicons/react/outline";
import { prisma } from "~/db.server";
import { DebounceInput } from "react-debounce-input";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LootTable from "~/components/lootTable";

type LoaderData = { loot: Awaited<ReturnType<typeof getLootForRaid>> };

export const loader: LoaderFunction = async ({ request, params }) => {
  const loot = await getLootForRaid(
    [BigInt(params.raidId ?? 0)],
    undefined,
    []
  );

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

  const loot = await getLootForRaid(
    [BigInt(params.raidId ?? 0)],
    undefined,
    []
  );

  return json<LoaderData>({ loot });
};

type Category = "bis" | "rolled" | "trash" | "uncategorized";

export default function () {
  const user = useOptionalUser();
  const [categories] = useState<Category[]>([
    "bis",
    "rolled",
    "trash",
    "uncategorized",
  ]);
  const [mounted, setMounted] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<{
    [key in Category]: number;
  }>({ bis: 0, rolled: 0, trash: 0, uncategorized: 0 });
  const inputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { loot: lootRaw } = useLoaderData<LoaderData>();
  const [sortedLootData, setSortedLootData] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>("bis");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>({ key: "name", direction: "ascending" });

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig?.key === key && sortConfig?.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const renderSortIndicator = (col: string) => {
    if (sortConfig?.key === col) {
      return sortConfig.direction === "ascending" ? " ▲" : " ▼";
    }
  };

  const showAllData = () => {
    return setSortedLootData(
      sortedLootData.map((s) => {
        return { ...s, hidden: false };
      })
    );
  };

  const filterLoot = (term: string) => {
    if (!term) {
      return showAllData();
    }
    const filters = term.split("+").map((term) => term.trim().toLowerCase());

    const filteredData = sortedLootData.map((item) => {
      const matches = [
        item?.name?.toLowerCase().trim(),
        item?.looted_by_name?.toLowerCase().trim(),
      ].filter((t) => !!t);
      if (matches.length === 0) {
        return showAllData();
      }
      return {
        ...item,
        hidden: !filters.find((filter) =>
          matches.some((match) => match?.includes(filter))
        ),
      };
    });

    setSortedLootData(filteredData);
  };

  useMemo(() => {
    if (!lootRaw) {
      return;
    }

    const counts: { [key in Category]: number } = {
      bis: 0,
      rolled: 0,
      trash: 0,
      uncategorized: 0,
    };

    lootRaw.forEach(({ item }) => {
      const category = (item?.category || "uncategorized") as Category;
      counts[category] = (counts[category] ?? 0) + 1;
    });

    setCategoryCounts(counts);
    let sortedLootData = lootRaw.map((l) => {
      return {
        ...l.item,
        quantity: l.quantity,
        id: l.id,
        item_id: l.item_id,
        was_assigned: l.was_assigned,
        looted_by_id: l.looted_by_id,
        looted_at: l.created_at,
        looted_by_name: l.player.name,
        hidden: false,
      };
    });
    if (sortConfig?.key && sortConfig?.direction) {
      sortedLootData.sort((a, b) => {
        const key = sortConfig.key as keyof typeof a;
        if (a?.[key]! < b?.[key]!) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a?.[key]! > b?.[key]!) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    setSortedLootData(sortedLootData);
  }, [lootRaw, sortConfig]);

  const removeItem = (idx: number) => {
    const newLoot = [...sortedLootData];
    newLoot.splice(idx, 1);
    setSortedLootData(newLoot);
  };

  useEffect(() => {
    if (
      typeof zamTooltip !== "undefined" &&
      zamTooltip.hasOwnProperty("init") &&
      !mounted
    ) {
      zamTooltip.init();
      setMounted(true);
    }
  }, [lootRaw]);

  return (
    <div className="grid min-h-[500px] grid-cols-12 gap-8">
      <div className="col-span-12">
        <LootTable
          {...{
            lootRaw,
            filterTerm: searchTerm,
            user,
            hideEmpty: true,
            includePasses: true,
            withRaid: false,
          }}
        />
      </div>
    </div>
  );
}
