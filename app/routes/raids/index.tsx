import { Link, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getRaids } from "~/models/raid.server";

type LoaderData = {
  raids: Awaited<ReturnType<typeof getRaids>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  const raids = await getRaids({ skip: 0, take: 10 });
  return json<LoaderData>({ raids });
};

export default function RaidIndexPage() {
  const { raids } = useLoaderData<LoaderData>();
  return (
    <ul>
      {raids.map((raid) => (
        <li>
          <Link to={`/raids/${raid.id}`}>{raid.name}</Link>
        </li>
      ))}
    </ul>
  );
}
