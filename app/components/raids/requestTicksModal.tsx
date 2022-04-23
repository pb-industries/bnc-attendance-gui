import { Dialog, Transition } from "@headlessui/react";
import { ExclamationIcon } from "@heroicons/react/outline";
import { player } from "@prisma/client";
import { FC, Fragment, useRef } from "react";
import { Form } from "remix";

interface HandleDeleteModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  players: player[];
  selectedPlayerId?: bigint;
  raidId: bigint;
  totalTicks: number;
}

const RequestTicksModal: FC<HandleDeleteModalProps> = ({
  players,
  totalTicks,
  selectedPlayerId,
  raidId,
  open,
  setOpen,
}) => {
  // @ts-ignore
  const cancelButtonRef = useRef<HTMLButtonRef>();
  const renderTicks = () => {
    const checkBoxes = [];
    for (let i = 0; i < totalTicks; i++) {
      checkBoxes.push(
        <input
          className="rounded-full p-4"
          type="checkbox"
          name={`tick`}
          value={`${i}`}
        />
      );
    }

    return <div className="mt-2 flex gap-2">{checkBoxes}</div>;
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-10 overflow-y-auto"
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
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium capitalize leading-6 text-gray-900"
                    >
                      Request missing ticks
                    </Dialog.Title>
                    <p className="mt-2 text-sm text-gray-500">
                      If you think you're missing any ticks, you can request
                      them here, an officer can then approve them if they
                      believe it to be correct
                    </p>
                  </div>
                </div>
              </div>
              <Form onSubmit={() => setOpen(false)} method="delete">
                <div className="flex flex-col items-center gap-4 p-4">
                  <input type="hidden" name="raid.id" value={`${raidId}`} />
                  {players.length > 1 ? (
                    <select
                      className="max-w-48 capitalize"
                      name="player.id"
                      defaultValue={`${selectedPlayerId ?? ""}`}
                    >
                      {players?.map((player) => (
                        <option key={`${player.id}`} value={`${player.id}`}>
                          {player.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="hidden"
                      name="player.id"
                      value={`${players?.[0]?.id ?? selectedPlayerId}`}
                    />
                  )}
                  {renderTicks()}
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Make Request
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    ref={cancelButtonRef}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </Form>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default RequestTicksModal;
