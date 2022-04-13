import { Link, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getRaid } from "~/models/raid.server";
import { useEffect, useState } from "react";
import { player } from "@prisma/client";

type LoaderData = {
  raid: Awaited<ReturnType<typeof getRaid>>;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const raid = await getRaid({ id: (params.raidId ?? 0) as unknown as number });
  return json<LoaderData>({ raid });
};
export default function raidIdPage() {
  const { raid } = useLoaderData<LoaderData>();
  const [meta, setMeta] = useState({
    ticks: 0,
    attendees: new Set<player>([]),
  });

  useEffect(() => {
    let newMeta = { ...meta };
    raid?.player_raid.forEach((playerRaid) => {
      newMeta.attendees.add(playerRaid.player);
      newMeta.ticks = Math.max(meta.ticks, playerRaid.raid_hour);
    });
    setMeta(newMeta);
  }, [raid?.id]);

  return (
    <div>
      <h1>Raid {raid?.name}</h1>
      <h3>Total ticks: {meta.ticks}</h3>
      {[...meta.attendees].map((player) => (
        <div>{player.name}</div>
      ))}
      {raid?.name}
    </div>
  );
}
