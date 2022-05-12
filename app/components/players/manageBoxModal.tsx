import { Dialog, Transition } from "@headlessui/react";
import { player } from "@prisma/client";
import { FC, Fragment, useRef } from "react";
import { Form, useActionData } from "@remix-run/react";
import { getClasses } from "~/utils";

interface ManageBoxModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  player: player | null;
  canSetRank: boolean;
}

interface ActionData {
  errors: {
    player?: {
      name?: string;
      level?: string;
      class?: string;
    };
  };
}

const AddBoxModal: FC<ManageBoxModalProps> = ({
  player,
  open,
  setOpen,
  canSetRank,
}) => {
  const actionData = useActionData<ActionData>();
  const cancelButtonRef = useRef<HTMLButtonElement>();
  const playerNameRef = useRef<HTMLInputElement>();
  const playerLevelRef = useRef<HTMLInputElement>();

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-10 overflow-y-auto"
        // @ts-ignore
        initialFocus={cancelButtonRef}
        onClose={setOpen}
      >
        <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span
            className="hidden sm:inline-block sm:h-screen sm:align-middle"
            aria-hidden="true"
          >
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="mx-auto w-full max-w-md px-8 py-8">
                <Form
                  onSubmit={() => setOpen(false)}
                  method={player ? "put" : "post"}
                  className="space-y-6"
                >
                  <div>
                    <label
                      htmlFor="player.name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Box name:
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
                        defaultValue={player?.name || ""}
                        aria-invalid={
                          actionData?.errors?.player?.name ? true : undefined
                        }
                        aria-describedby="player.name-error"
                        className="w-full rounded border border-gray-500 px-2 py-1 text-lg capitalize"
                      />
                      {actionData?.errors?.player?.name && (
                        <div
                          className="pt-1 text-red-700"
                          id="player.name-error"
                        >
                          {actionData.errors?.player?.name}
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
                        defaultValue={parseInt(`${player?.level ?? "65"}`)}
                        autoComplete="player.level"
                        aria-invalid={
                          actionData?.errors?.player?.level ? true : undefined
                        }
                        aria-describedby="player.level-error"
                        className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                      />
                      {actionData?.errors?.player?.level && (
                        <div
                          className="pt-1 text-red-700"
                          id="player.level-error"
                        >
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
                        defaultValue={player?.class ?? ""}
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
                        <div
                          className="pt-1 text-red-700"
                          id="player.class-error"
                        >
                          {actionData.errors?.player?.class}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="player.class"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Rank:
                    </label>
                    <div className="mt-1">
                      <select
                        disabled={canSetRank ? false : true}
                        id="player.rank"
                        required
                        autoFocus={true}
                        name="player.rank"
                        autoComplete="player.rank"
                        defaultValue={player?.rank ?? "raider"}
                        aria-describedby="player.class-error"
                        className={`w-full rounded border border-gray-500 px-2 py-1 text-lg capitalize ${
                          canSetRank ? "bg-white" : "bg-gray-100"
                        }`}
                      >
                        <option className="capitalize">alt</option>
                        <option className="capitalize">raider</option>
                      </select>
                    </div>
                  </div>

                  <input
                    className="hidden"
                    type="hidden"
                    name="player.id"
                    value={`${player?.id ?? 0}`}
                  />

                  <button
                    type="submit"
                    className="w-full rounded bg-blue-500 py-2  px-4 capitalize text-white hover:bg-blue-600 focus:bg-blue-400"
                  >
                    {player ? "update" : "add"} box
                  </button>
                </Form>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default AddBoxModal;
