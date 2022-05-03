import { player, player_alt } from "@prisma/client";
import { useMatches } from "@remix-run/react";
import { useMemo } from "react";

import type { user } from "~/models/user.server";
import { getMainsAtTick } from "./models/roster.server";

const DEFAULT_REDIRECT = "/";

/**
 * This should be used any time the redirect path is user-provided
 * (Like the query string on our login/signup pages). This avoids
 * open-redirect vulnerabilities.
 * @param {string} to The redirect destination
 * @param {string} defaultRedirect The redirect to use if the to is unsafe.
 */
export function safeRedirect(
  to: FormDataEntryValue | string | null | undefined,
  defaultRedirect: string = DEFAULT_REDIRECT
) {
  if (!to || typeof to !== "string") {
    return defaultRedirect;
  }

  if (!to.startsWith("/") || to.startsWith("//")) {
    return defaultRedirect;
  }

  return to;
}

/**
 * This base hook is used in other hooks to quickly search for specific data
 * across all loader data using useMatches.
 * @param {string} id The route id
 * @returns {JSON|undefined} The router data or undefined if not found
 */
export function useMatchesData(
  id: string
): Record<string, unknown> | undefined {
  const matchingRoutes = useMatches();
  const route = useMemo(
    () => matchingRoutes.find((route) => route.id === id),
    [matchingRoutes, id]
  );
  return route?.data;
}

function isUser(user: any): user is user {
  return (
    user && typeof user === "object" && typeof user.player.name === "string"
  );
}

export function useOptionalUser(): user | undefined {
  const data = useMatchesData("root");
  if (!data || !isUser(data.user)) {
    return undefined;
  }
  return data.user;
}

export function useUser(): user {
  const maybeUser = useOptionalUser();
  if (!maybeUser) {
    throw new Error(
      "No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead."
    );
  }
  return maybeUser;
}

export function validateEmailOrUsername(
  emailOrUsername: unknown
): emailOrUsername is string {
  return typeof emailOrUsername === "string" && emailOrUsername.length > 3;
}

export function getRaces() {
  return [
    "barbarian",
    "dark elf",
    "drakkin",
    "dwarf",
    "erudite",
    "froglok",
    "gnome",
    "half elf",
    "halfling",
    "high elf",
    "human",
    "iksar",
    "ogre",
    "troll",
    "vah shir",
    "wood elf",
  ];
}

export function getClasses() {
  return [
    "bard",
    "beastlord",
    "berserker",
    "cleric",
    "druid",
    "enchanter",
    "magician",
    "monk",
    "necromancer",
    "paladin",
    "ranger",
    "rogue",
    "shadowknight",
    "shaman",
    "warrior",
    "wizard",
  ];
}

export function getBadgeStyle(role: string) {
  const badgeStyles = {
    guest:
      "inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800",
    member:
      "inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800",
    officer:
      "inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800",
    admin:
      "inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800",
  };

  const style = badgeStyles?.[role.toLowerCase().trim()];
  return style ?? badgeStyles.guest;
}

export function verifyClass(className: string) {
  return getClasses().includes(className.trim().toLowerCase());
}

export function validatePlayer(playerData: player): playerData is player {
  if (
    typeof playerData.level !== "number" ||
    playerData.level < 1 ||
    playerData.level > 150
  ) {
    return false;
  }

  if (
    typeof playerData.class !== "string" ||
    !verifyClass(playerData.class.toLowerCase())
  ) {
    return false;
  }

  if (typeof playerData.name !== "string" || playerData.name.length < 3) {
    return false;
  }

  if (!playerData) {
    return false;
  }

  return true;
}

const changeTimezone = (date: Date, timeZone?: string) => {
  if (!timeZone) {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  return new Date(
    date.toLocaleString("en-US", {
      timeZone,
    })
  );
};

const padTo2Digits = (num: number) => {
  return num.toString().padStart(2, "0");
};

export function formatDate(date: Date, timeOnly?: boolean, timeZone?: string) {
  date = changeTimezone(date, timeZone);

  const parts = [
    [
      date.getFullYear(),
      padTo2Digits(date.getMonth() + 1),
      padTo2Digits(date.getDate()),
    ].join("-"),
    [
      padTo2Digits(date.getHours()),
      padTo2Digits(date.getMinutes()),
      padTo2Digits(date.getSeconds()),
    ].join(":"),
  ];

  if (timeOnly) {
    return parts[1];
  }

  return parts.join(" ");
}

export type PlayerWithBoxes = player & {
  player_alt_playerToplayer_alt_player_id: player_alt[];
};

export function getRollRange(
  players: Set<PlayerWithBoxes>,
  debug: boolean = false
) {
  let total = 0;

  const ranges = Array.from(players)
    .sort((p1, p2) =>
      p1?.name.trim().toLowerCase().localeCompare(p2?.name.trim().toLowerCase())
    )
    .map((p) => {
      const res = {
        p: p,
        lower: total + 1,
        upper:
          total +
          (parseInt(`${p?.total_tickets ?? p?.attendance_60 ?? 0}`, 10) + 1),
      };

      total = res.upper;

      return res;
    });

  if (debug) {
    return ranges
      .map((r) => {
        const boxes =
          r?.p?.player_alt_playerToplayer_alt_player_id?.length ?? 0;
        const boxString = boxes > 0 ? ` ${boxes + 1}-box |` : "";
        return `${r.p.name} (${r.p.attendance_60}% |${boxString} ${r.p.ticks_since_last_win} ticks since last BiS) ${r.lower}-${r.upper}`;
      })
      .join(" | ");
  }

  return ranges.map((r) => `${r.p.name} ${r.lower}-${r.upper}`).join(" | ");
}
