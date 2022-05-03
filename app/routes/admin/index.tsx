import {
  ActionFunction,
  Form,
  json,
  Link,
  LoaderFunction,
  useActionData,
  useLoaderData,
} from "remix";
import { requireUser } from "~/session.server";
import { getLootForRaid } from "~/models/loot.server";
import { formatDate, useOptionalUser, useUser } from "~/utils";
import {
  CubeIcon,
  ShieldCheckIcon,
  TrashIcon,
  XIcon,
} from "@heroicons/react/outline";
import { prisma } from "~/db.server";
import { useEffect, useMemo, useState } from "react";
import { guild } from "@prisma/client";
import { calculateAttendance } from "~/models/api.server";

type LoaderData = { guild: guild | null };

interface ActionData {
  success: boolean;
}

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireUser(request);
  const guild = await prisma.guild.findFirst({
    where: { id: BigInt(user?.player?.guild_id ?? 0) },
  });

  return json<LoaderData>({ guild });
};

export const action: ActionFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const formData = await request.formData();

  const lastWinModifier = parseFloat(
    `${formData.get("last_win_modifier") ?? 0}`
  );
  const boxModifier = parseFloat(`${formData.get("box_modifier") ?? 0}`);
  const guildId = BigInt(`${formData.get("guild_id") ?? 0}`);

  if (!user || !guildId || user?.role !== "admin") {
    return null;
  }

  await prisma.guild.update({
    where: { id: guildId },
    data: {
      last_win_modifier: lastWinModifier / 100,
      box_modifier: boxModifier / 100,
    },
  });

  const res = await calculateAttendance();

  return json<ActionData>({ success: res !== null });
};

export default function () {
  const user = useUser();
  const { guild } = useLoaderData();
  const actionData = useActionData<ActionData>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSaving(false);
  }, [actionData]);

  return (
    <Form method="post" className="flex flex-row justify-end gap-2 py-4">
      <input type="hidden" name="guild_id" value={guild?.id} />
      <div>
        <label
          htmlFor="last_win_modifier"
          className="block text-sm font-medium text-gray-700"
        >
          Last Win Modifier
        </label>
        <div className="relative mt-1 rounded-md shadow-sm">
          <input
            readOnly={user?.role !== "admin"}
            type="text"
            name="last_win_modifier"
            className={`block w-full rounded-md border-gray-300 pl-4 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
              user?.role !== "admin" ? "bg-gray-100" : "bg-white"
            }`}
            placeholder="0.00"
            aria-describedby="last_win_modifier-percent"
            defaultValue={guild?.last_win_modifier * 100}
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-gray-500 sm:text-sm">%</span>
          </div>
        </div>
      </div>
      <div>
        <label
          htmlFor="box_modifier"
          className="block text-sm font-medium text-gray-700"
        >
          Box Modifier
        </label>
        <div className="relative mt-1 rounded-md shadow-sm">
          <input
            readOnly={user?.role !== "admin"}
            type="text"
            name="box_modifier"
            className={`block w-full rounded-md border-gray-300 pl-4 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
              user?.role !== "admin" ? "bg-gray-100" : "bg-white"
            }`}
            placeholder="0.00"
            aria-describedby="box_modifier-percent"
            defaultValue={guild?.box_modifier * 100}
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-gray-500 sm:text-sm">%</span>
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={user?.role !== "admin"}
        onClick={(e) => setSaving(true)}
        className={`${
          user?.role !== "admin"
            ? "bg-gray-500 hover:bg-gray-600"
            : "bg-indigo-500 hover:bg-indigo-600"
        } fit-content inline-flex w-full justify-center self-end rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto sm:text-sm`}
      >
        {saving ? (
          <div className="flex items-center justify-center px-12">
            <svg
              className="h-5 w-5 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        ) : (
          <span>Update Modifiers</span>
        )}
      </button>
    </Form>
  );
}
