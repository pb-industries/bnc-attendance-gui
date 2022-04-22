import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import * as React from "react";

import { getUserId, createUserSession } from "~/session.server";

import {
  createUser,
  getUserByEmail,
  getUserByPlayerName,
} from "~/models/user.server";
import {
  getClasses,
  safeRedirect,
  validateEmailOrUsername,
  validatePlayer,
} from "~/utils";

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return json({});
};

interface ActionData {
  errors: {
    email?: string;
    password?: string;
    player?: {
      name?: string;
      level?: string;
      class?: string;
    };
  };
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString() ?? null;
  const password = formData.get("password");
  const playerName = formData.get("player.name")?.toString() ?? null;
  const playerClass = formData.get("player.class")?.toString() ?? null;
  const playerLevel =
    parseInt(formData.get("player.level")?.toString() ?? "0") ?? 65;
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/");

  if (!validateEmailOrUsername(email) && !validateEmailOrUsername(playerName)) {
    return json<ActionData>(
      { errors: { email: "Email or username is invalid" } },
      { status: 400 }
    );
  }

  if (typeof password !== "string") {
    return json<ActionData>(
      { errors: { password: "Password is required" } },
      { status: 400 }
    );
  }

  if (
    !playerName ||
    !playerClass ||
    !validatePlayer({
      name: playerName ?? "",
      class: playerClass ?? "",
      // @ts-ignore
      level: playerLevel ?? 0,
    })
  ) {
    return json<ActionData>(
      { errors: { player: { name: "Invalid player details" } } },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return json<ActionData>(
      { errors: { password: "Password is too short" } },
      { status: 400 }
    );
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return json<ActionData>(
      { errors: { email: "A user already exists with this email" } },
      { status: 400 }
    );
  }

  const existingPlayer = await getUserByPlayerName(playerName);
  if (existingPlayer) {
    return json<ActionData>(
      { errors: { email: "A user already exists with this player name" } },
      { status: 400 }
    );
  }

  const user = await createUser(email, password, {
    name: playerName,
    // @ts-ignore
    level: playerLevel,
    class: playerClass,
  });

  if (!user) {
    return json<ActionData>(
      { errors: { email: "Failed to create a user with this email" } },
      { status: 400 }
    );
  }

  return createUserSession({
    request,
    userId: `${user.id}`,
    remember: false,
    redirectTo,
  });
};

export const meta: MetaFunction = () => {
  return {
    title: "Sign Up",
  };
};

export default function Join() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? undefined;
  const actionData = useActionData() as ActionData;
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const playerNameRef = React.useRef<HTMLInputElement>(null);
  const playerLevelRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef.current?.focus();
    } else if (actionData?.errors?.password) {
      passwordRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="flex min-h-full w-full flex-grow flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-8">
        <Form method="post" className="space-y-6">
          <div>
            <label
              htmlFor="player.name"
              className="block text-sm font-medium text-gray-700"
            >
              Main name:
            </label>
            <div className="mt-1">
              <input
                ref={playerNameRef}
                id="player.name"
                required
                autoFocus={true}
                name="player.name"
                type="text"
                autoComplete="player.name"
                aria-invalid={
                  actionData?.errors?.player?.name ? true : undefined
                }
                aria-describedby="player.name-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.errors?.player?.name && (
                <div className="pt-1 text-red-700" id="player.name-error">
                  {actionData.errors?.player?.name}
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <div className="mt-1">
              <input
                ref={emailRef}
                id="email"
                autoFocus={true}
                name="email"
                type="email"
                autoComplete="email"
                aria-invalid={actionData?.errors?.email ? true : undefined}
                aria-describedby="email-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.errors?.email && (
                <div className="pt-1 text-red-700" id="email-error">
                  {actionData.errors.email}
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                ref={passwordRef}
                name="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={actionData?.errors?.password ? true : undefined}
                aria-describedby="password-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.errors?.password && (
                <div className="pt-1 text-red-700" id="password-error">
                  {actionData.errors.password}
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="player.level"
              className="block text-sm font-medium text-gray-700"
            >
              Level:
            </label>
            <div className="mt-1">
              <input
                ref={playerLevelRef}
                id="player.level"
                required
                autoFocus={true}
                name="player.level"
                type="number"
                min="1"
                max="150"
                defaultValue="65"
                autoComplete="player.level"
                aria-invalid={
                  actionData?.errors?.player?.level ? true : undefined
                }
                aria-describedby="player.level-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.errors?.player?.level && (
                <div className="pt-1 text-red-700" id="player.level-error">
                  {actionData.errors?.player?.level}
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="player.class"
              className="block text-sm font-medium text-gray-700"
            >
              Class:
            </label>
            <div className="mt-1">
              <select
                id="player.class"
                required
                autoFocus={true}
                name="player.class"
                autoComplete="player.class"
                aria-invalid={
                  actionData?.errors?.player?.class ? true : undefined
                }
                aria-describedby="player.class-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg capitalize"
              >
                {getClasses().map((className) => (
                  <option key={className} className="capitalize">
                    {className}
                  </option>
                ))}
              </select>

              {actionData?.errors?.player?.class && (
                <div className="pt-1 text-red-700" id="player.class-error">
                  {actionData.errors?.player?.class}
                </div>
              )}
            </div>
          </div>

          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button
            type="submit"
            className="w-full rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
          >
            Create Account
          </button>
          <div className="flex items-center justify-center">
            <div className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                className="text-blue-500 underline"
                to={{
                  pathname: "/login",
                  search: searchParams.toString(),
                }}
              >
                Log in
              </Link>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
