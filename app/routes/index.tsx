import { Outlet } from "@remix-run/react";

// import { useOptionalUser } from "~/utils";

export default function Index() {
  return (
    <main className="relative min-h-screen bg-white sm:flex sm:items-center sm:justify-center">
      Hello world
      <Outlet />
    </main>
  );
}
