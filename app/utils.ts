import { player } from "@prisma/client";
import { useMatches } from "@remix-run/react";
import { useMemo } from "react";

import type { user } from "~/models/user.server";

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
