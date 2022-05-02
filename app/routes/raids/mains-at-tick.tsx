import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { getMainsAtTick } from "~/models/roster.server";

import { requireUserId } from "~/session.server";

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireUserId(request);
  const url = new URL(request.url);
  const raidId = BigInt(url?.searchParams.get("raidId") ?? "0");
  const tick = BigInt(url.searchParams.get("tick") ?? "0");

  if (!raidId) {
    return null;
  }

  return getMainsAtTick(raidId, tick);
};
