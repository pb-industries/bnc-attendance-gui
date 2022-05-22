import {
  CubeIcon,
  ShieldCheckIcon,
  TrashIcon,
  XIcon,
} from "@heroicons/react/outline";
import { FC, useRef } from "react";
import { user } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { DebounceInput } from "react-debounce-input";
import { Form, Link } from "remix";
import { getLootForRaid } from "~/models/loot.server";
import { formatDate } from "~/utils";

type Category = "bis" | "rolled" | "trash" | "uncategorized";
type LoaderData = {
  lootRaw: Awaited<ReturnType<typeof getLootForRaid>>;
  user: user;
  filterTerm: string;
  hideEmpty?: boolean;
};

const LootTable: FC<LoaderData> = ({
  user,
  lootRaw,
  filterTerm,
  hideEmpty,
}) => {
  const [categories] = useState<Category[]>([
    "bis",
    "rolled",
    "trash",
    "uncategorized",
  ]);
  const [categoryCounts, setCategoryCounts] = useState<{
    [key in Category]: number;
  }>({ bis: 0, rolled: 0, trash: 0, uncategorized: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortedLootData, setSortedLootData] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>("bis");
  const inputRef = useRef(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>({ key: "name", direction: "ascending" });

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

  useEffect(() => {
    filterLoot(filterTerm);
  }, [filterTerm]);

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
  const removeItem = (idx: number) => {
    const newLoot = [...sortedLootData];
    newLoot.splice(idx, 1);
    setSortedLootData(newLoot);
  };

  useEffect(() => {
    if (
      typeof zamTooltip !== "undefined" &&
      zamTooltip.hasOwnProperty("init")
    ) {
      zamTooltip.init();
    }
  }, [lootRaw]);

  return (
    <div className="grid min-h-[500px] grid-cols-12 gap-8">
      <div className="col-span-12">
        <h1 className="text-2xl font-medium">Items looted</h1>
        <div className="flex justify-between">
          <div className="flex gap-2 pt-4">
            {categories
              .filter((c) => (hideEmpty ? categoryCounts[c] > 0 : true))
              .map((c) => (
                <div
                  className={`${
                    c === activeCategory ? "bg-gray-200" : "bg-white"
                  } flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-sm capitalize shadow hover:cursor-pointer hover:bg-gray-100`}
                  onClick={() => {
                    setActiveCategory(c);
                  }}
                  key={c}
                >
                  {c}{" "}
                  <span className="rounded-md bg-gray-200 p-1 px-2 text-xs font-medium text-gray-900">
                    {categoryCounts[c] ?? 0}
                  </span>
                </div>
              ))}
          </div>
          <div className="relative mt-1 min-w-[300px] rounded-md pt-4 shadow-sm">
            <DebounceInput
              type="text"
              name="search"
              className="z-1 block w-full rounded-md border-gray-300 pr-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Search..."
              ref={inputRef}
              debounceTimeout={200}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                filterLoot(e.target.value);
              }}
            />
            <div
              onClick={() => {
                setSearchTerm("");
                filterLoot("");
              }}
              className="z-2 absolute inset-y-0 top-4 right-0 flex items-center rounded-sm pr-2"
            >
              <XIcon
                className="h-6 w-6 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
        <table className="mt-4 min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => requestSort("name")}
                scope="col"
                className="font-semibolds px-3 py-3.5 text-left text-sm text-gray-900"
              >
                Item
                {renderSortIndicator("name")}
              </th>
              <th
                onClick={() => requestSort("quantity")}
                scope="col"
                className="font-semibolds px-3 py-3.5 text-left text-sm text-gray-900"
              >
                Quantity
                {renderSortIndicator("quantity")}
              </th>
              <th
                onClick={() => requestSort("category")}
                scope="col"
                className="font-semibolds hidden px-3 py-3.5 text-left text-sm text-gray-900 sm:table-cell"
              >
                Category
                {renderSortIndicator("category")}
              </th>
              <th
                onClick={() => requestSort("looted_by_name")}
                scope="col"
                className="font-semibolds hidden px-3 py-3.5 text-left text-sm text-gray-900 sm:table-cell"
              >
                Looted by
                {renderSortIndicator("looted_by_name")}
              </th>
              <th
                onClick={() => requestSort("was_assigned")}
                scope="col"
                className="font-semibolds hidden px-3 py-3.5 text-left text-sm text-gray-900 lg:table-cell"
              >
                Acquired via
                {renderSortIndicator("was_assigned")}
              </th>
              <th
                onClick={() => requestSort("looted_at")}
                scope="col"
                className="font-semibolds px-3 py-3.5 text-left text-sm text-gray-900"
              >
                Looted at
                {renderSortIndicator("looted_at")}
              </th>
              {["admin", "officer"].includes(user?.role ?? "guest") ? (
                <th
                  scope="col"
                  className="font-semibolds px-3 py-3.5 text-left text-sm text-gray-900"
                >
                  Action
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sortedLootData.map((lh, idx) => {
              const isPassToken = `${lh.item_id}` === "756381770069475329";
              if (isPassToken) {
                lh.category = "bis";
              }
              const date = new Date(
                Date.parse(lh?.looted_at as unknown as string)
              );
              return (
                <tr
                  className={
                    activeCategory !== (lh?.category || "uncategorized") ||
                    lh?.hidden
                      ? "hidden"
                      : ""
                  }
                  key={`${lh.id}`}
                >
                  <td className="flex items-center gap-4 whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                    {!isPassToken ? (
                      <a
                        className="capitalize text-blue-500"
                        href={`https://everquest.allakhazam.com/db/item.html?item=${lh.lucy_id};source=lucy`}
                      >
                        {lh?.name}
                      </a>
                    ) : (
                      <span className="rounded-lg bg-orange-200 px-4 py-1">
                        Passed
                      </span>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap py-4 pr-3 text-sm font-medium capitalize text-gray-900 sm:table-cell">
                    {isPassToken ? null : lh?.quantity}
                  </td>
                  <td className="hidden whitespace-nowrap py-4 pr-3 text-sm font-medium capitalize text-gray-900 sm:table-cell">
                    <span className="rounded-lg bg-gray-200 px-4 py-1">
                      {lh?.category || "uncategorized"}
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap py-4 pr-3 text-sm font-medium capitalize text-gray-900 sm:table-cell">
                    <Link
                      className="text-blue-500"
                      to={`/players/${lh?.looted_by_id}`}
                    >
                      {lh?.looted_by_name}
                    </Link>
                  </td>
                  <td className="hidden whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 lg:table-cell">
                    {lh?.was_assigned ? "Assigned" : "Rolled for"}
                  </td>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 ">
                    {formatDate(date, true)}
                  </td>
                  {["admin", "officer"].includes(user?.role ?? "guest") ? (
                    <td className="flex gap-1 whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                      <Form
                        method="post"
                        onSubmit={(e) => {
                          if (lh.category === "bis") {
                            return false;
                          }
                          removeItem(idx);
                        }}
                      >
                        <input type="hidden" name="category" value="bis" />
                        <input
                          type="hidden"
                          name="item_id"
                          value={`${lh.item_id}`}
                        />
                        <button
                          type="submit"
                          className="h-8 w-8 rounded-sm bg-green-500 p-1 text-white hover:bg-green-600"
                        >
                          <ShieldCheckIcon />
                        </button>
                      </Form>
                      <Form
                        method="post"
                        onSubmit={(e) => {
                          if (lh.category === "rolled") {
                            return false;
                          }
                          removeItem(idx);
                        }}
                      >
                        <input type="hidden" name="category" value="rolled" />
                        <input
                          type="hidden"
                          name="item_id"
                          value={`${lh.item_id}`}
                        />
                        <button
                          type="submit"
                          className="h-8 w-8 rounded-sm bg-orange-500 p-1 text-white hover:bg-orange-600"
                        >
                          <CubeIcon />
                        </button>
                      </Form>
                      <Form
                        method="post"
                        onSubmit={(e) => {
                          if (lh.category === "trash") {
                            return false;
                          }
                          removeItem(idx);
                        }}
                      >
                        <input type="hidden" name="category" value="trash" />
                        <input
                          type="hidden"
                          name="item_id"
                          value={`${lh.item_id}`}
                        />
                        <button
                          type="submit"
                          className="h-8 w-8 rounded-sm bg-red-500 p-1 text-white hover:bg-red-600"
                        >
                          <TrashIcon />
                        </button>
                      </Form>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* <div className="col-span-4">
        <h1 className="text-2xl font-medium">Loot distribution</h1>
      </div> */}
    </div>
  );
};

export default LootTable;
