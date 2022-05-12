/*
  This example requires Tailwind CSS v2.0+

  This example requires some changes to your config:

  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
    ],
  }
  ```
*/
import { Fragment } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import { MenuAlt1Icon, XIcon } from "@heroicons/react/outline";
import { Form, Link, Outlet } from "@remix-run/react";
import { useOptionalUser } from "./utils";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Shell() {
  const user = useOptionalUser();

  return (
    <>
      {/* Background color split screen for large screens */}
      {/* <div
        className="fixed top-0 left-0 h-full w-1/2 bg-white"
        aria-hidden="true"
      />
      <div
        className="fixed top-0 right-0 h-full w-1/2 bg-gray-50"
        aria-hidden="true"
      /> */}
      <div className="relative flex min-h-screen flex-col">
        {/* Navbar */}
        <Disclosure as="nav" className="flex-shrink-0 bg-gray-900">
          {({ open }) => (
            <>
              <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-8">
                <div className="relative flex h-16 items-center justify-between">
                  {/* Logo section */}
                  <div className="flex items-center px-2 lg:px-0 xl:w-64">
                    <div className="flex-shrink-0">
                      <Link to="/">
                        <img
                          className="h-8 w-auto"
                          src="/images/bnc.png"
                          alt="Workflow"
                        />
                      </Link>
                    </div>
                  </div>

                  <div className="flex lg:hidden">
                    {/* Mobile menu button */}
                    <Disclosure.Button className="inline-flex items-center justify-center rounded-md bg-indigo-600 p-2 text-indigo-400 hover:bg-indigo-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600">
                      <span className="sr-only">Open main menu</span>
                      {open ? (
                        <XIcon className="block h-6 w-6" aria-hidden="true" />
                      ) : (
                        <MenuAlt1Icon
                          className="block h-6 w-6"
                          aria-hidden="true"
                        />
                      )}
                    </Disclosure.Button>
                  </div>
                  {/* Links section */}
                  <div className="hidden lg:block lg:w-80">
                    <div className="flex items-center justify-end">
                      <div className="flex">
                        <Link
                          to="/raids"
                          className="rounded-md px-3 py-2 text-sm font-medium text-indigo-200 hover:text-white"
                        >
                          Raids
                        </Link>
                        <Link
                          to="/"
                          className="rounded-md px-3 py-2 text-sm font-medium text-indigo-200 hover:text-white"
                        >
                          Roster
                        </Link>
                        <Link
                          to="/loot"
                          className="rounded-md px-3 py-2 text-sm font-medium text-indigo-200 hover:text-white"
                        >
                          Loot
                        </Link>
                        {user ? null : (
                          <>
                            <Link
                              to="/login"
                              className="rounded-md px-3 py-2 text-sm font-medium text-indigo-200 hover:text-white"
                            >
                              Login
                            </Link>
                            <Link
                              to="/register"
                              className="rounded-md px-3 py-2 text-sm font-medium text-indigo-200 hover:text-white"
                            >
                              Register
                            </Link>
                          </>
                        )}
                      </div>
                      {/* Profile dropdown */}
                      {user ? (
                        <Menu as="div" className="relative ml-4 flex-shrink-0">
                          <div>
                            <Menu.Button className="flex rounded-full bg-indigo-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-700">
                              <span className="sr-only">Open user menu</span>
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600">
                                <span className="text-sm font-medium leading-none text-white">
                                  {user?.player?.name
                                    ?.slice(0, 2)
                                    .toUpperCase()}
                                </span>
                              </span>
                            </Menu.Button>
                          </div>
                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              <Menu.Item>
                                {({ active }) => (
                                  <Link
                                    to="/profile"
                                    className={classNames(
                                      active ? "bg-gray-100" : "",
                                      "block px-4 py-2 text-sm text-gray-700"
                                    )}
                                  >
                                    View Profile
                                  </Link>
                                )}
                              </Menu.Item>
                              {["admin", "officer"].includes(
                                user?.role ?? "guest"
                              ) ? (
                                <Menu.Item>
                                  {({ active }) => (
                                    <Link
                                      to="/admin"
                                      className={classNames(
                                        active ? "bg-gray-100" : "",
                                        "block px-4 py-2 text-sm text-gray-700"
                                      )}
                                    >
                                      Admin Console
                                    </Link>
                                  )}
                                </Menu.Item>
                              ) : null}
                              <Menu.Item>
                                {({ active }) => (
                                  <Form action="/logout" method="post">
                                    <button
                                      type="submit"
                                      className={classNames(
                                        active ? "bg-gray-100" : "",
                                        "block w-full px-4 py-2 text-left text-sm text-gray-700"
                                      )}
                                    >
                                      Log Out
                                    </button>
                                  </Form>
                                )}
                              </Menu.Item>
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <Disclosure.Panel className="lg:hidden">
                <div className="px-2 pt-2 pb-3">
                  <Disclosure.Button
                    as="a"
                    href="/raids"
                    className="block rounded-md bg-indigo-800 px-3 py-2 text-base font-medium text-white"
                  >
                    Raids
                  </Disclosure.Button>
                  <Disclosure.Button
                    as="a"
                    href="/"
                    className="mt-1 block rounded-md px-3 py-2 text-base font-medium text-indigo-200 hover:bg-indigo-600 hover:text-indigo-100"
                  >
                    Roster
                  </Disclosure.Button>
                  <Disclosure.Button
                    as="a"
                    href="/loot"
                    className="mt-1 block rounded-md px-3 py-2 text-base font-medium text-indigo-200 hover:bg-indigo-600 hover:text-indigo-100"
                  >
                    Loot
                  </Disclosure.Button>
                </div>
                <div className="border-t border-indigo-800 pt-4 pb-3">
                  <div className="px-2">
                    <Disclosure.Button
                      as="a"
                      href="/profile"
                      className="block rounded-md px-3 py-2 text-base font-medium text-indigo-200 hover:bg-indigo-600 hover:text-indigo-100"
                    >
                      Your Profile
                    </Disclosure.Button>
                    {["admin", "officer"].includes(user?.role ?? "guest") ? (
                      <Disclosure.Button
                        as="a"
                        href="/admin"
                        className="block rounded-md px-3 py-2 text-base font-medium text-indigo-200 hover:bg-indigo-600 hover:text-indigo-100"
                      >
                        Admin Console
                      </Disclosure.Button>
                    ) : null}
                    <Form action="/logout" method="post">
                      <button
                        type="submit"
                        className="mt-1 block w-full rounded-md px-3 py-2 text-left text-base font-medium text-indigo-200 hover:bg-indigo-600 hover:text-indigo-100"
                      >
                        Log Out
                      </button>
                    </Form>
                  </div>
                </div>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>

        <div className="mx-auto w-full flex-grow px-8 py-4 pb-8 lg:flex">
          <Outlet />
        </div>
      </div>
    </>
  );
}
