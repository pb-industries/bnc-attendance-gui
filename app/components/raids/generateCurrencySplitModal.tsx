import { Dialog, Transition } from "@headlessui/react";
import { FC, Fragment, useEffect, useRef, useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { getRollRange, Attendee, getCurrencySplit } from "~/utils";
import { EyeIcon } from "@heroicons/react/outline";

interface HandleLottoRangeModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  attendees: { total_tickets: number, split_info: Attendee[] };
}

const GenerateCurrencySplitModal: FC<HandleLottoRangeModalProps> = ({
  attendees,
  open,
  setOpen,
}) => {
  // @ts-ignore
  const cancelButtonRef = useRef<HTMLButtonRef>();
  const [selectedAttendees, setSelectedAttendees] = useState(
    new Set<Attendee>(attendees?.split_info)
  );
  const splitAmountRef = useRef()
  const [range, setRange] = useState([]);
  const [showRange, setShowRange] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [copyText, setCopyText] = useState("")

  const onCopyText = () => {
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 1000);
  };

  useEffect(() => {
    setTimeout(()=>{
      splitAmountRef?.current?.focus()
    }, 100)
    if (!open) {
      setShowRange(false);
      setSelectedAttendees(new Set<Attendee>(attendees?.split_info));
    }
  }, [open]);

  useEffect(() => {
    if (showRange === true) {
      const tickets = Array.from(selectedAttendees).reduce((c, d) => c + d.awarded_tickets, 0)
      const splitAmount = parseInt(splitAmountRef.current?.value ?? '0')
      const split = getCurrencySplit(splitAmount, Array.from(selectedAttendees), tickets)
      setCopyText(`${tickets} units split: ${split.map(d => `${d.name} received ${d.split_amount}`).join(' | ')}`)
      setRange(split)
    }
  }, [showRange]);

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
            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 w-full text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <Dialog.Title
                      as="h3"
                      className="flex items-center text-lg font-medium capitalize leading-6 text-gray-900"
                    >
                      <span className="flex-grow">Generate Currency Split</span>
                      <div className="flex gap-2 justify-self-end">
                        { showRange && (
                          <button className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto sm:text-sm">
                            <CopyToClipboard text={copyText} onCopy={onCopyText}>
                              <span>{isCopied ? "Copied" : "Copy"}</span>
                            </CopyToClipboard>
                          </button>)}
                      </div>
                    </Dialog.Title>
                  </div>
                </div>
              </div>
                  <div className='px-4 py-2'>
                    <label
                      htmlFor="split.amount"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Split amount:
                    </label>
                    <div className="mt-1">
                      <input
                        ref={splitAmountRef}
                        id="split.amount"
                        required
                        autoFocus={true}
                        name="player.level"
                        type="number"
                        min="1"
                        max="99999999"
                        defaultValue=''
                        disabled={showRange}
                        autoComplete="split.amount"
                        aria-describedby="split.amount-error"
                        className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                      />
                    </div>
                    </div>
              <div
                className={`${
                  showRange ? "hidden" : null
                } grid grid-cols-12 gap-2 p-4`}
              >
                {attendees?.split_info.map((attendee) => {
                  return (
                    <div
                      className={`col-span-4 flex items-center gap-2 rounded px-4 py-3 shadow hover:cursor-pointer hover:bg-gray-100 ${
                        selectedAttendees.has(attendee)
                          ? "border-2 border-blue-300"
                          : "border-2 border-white"
                      }`}
                      key={attendee.player_id}
                      onClick={() => {
                        const newAttendees = new Set(Array.from(selectedAttendees));
                        newAttendees.has(attendee)
                          ? newAttendees.delete(attendee)
                          : newAttendees.add(attendee);
                        setSelectedAttendees(newAttendees);
                      }}
                    >
                      <img
                        className="h-6 w-6 rounded-full"
                        src={`/images/${attendee?.class || "warrior"}.png`}
                        alt=""
                      />
                      <span className="text-md capitalize">{attendee.name}</span>
                    </div>
                  );
                })}
              </div>
              <div
                className={`${
                  !showRange ? "hidden" : null
                } flex w-full items-center justify-center gap-2 p-4`}
              >
                <div className="min-h-40 relative min-w-full rounded-md bg-gray-100 p-4">
                  {range?.map(d =>
                    <div>{d.name} receives {d.split_amount}</div>
                  ) }
                </div>
              </div>
              <div className="gap-2 bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <div className="flex items-center">
                      {!showRange && (
                      <button
                        disabled={selectedAttendees.size === 0}
                        onClick={() => setShowRange(true)}
                        className={`relative inline-flex w-full justify-center rounded-l-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto sm:text-sm ${
                          selectedAttendees.size === 0
                            ? "bg-gray-600 hover:bg-gray-500"
                            : "bg-indigo-600 hover:bg-indigo-500"
                        }`}
                      >
                        <span>Split</span>
                      </button>)}
                    </div>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  ref={cancelButtonRef}
                  onClick={() => setOpen(false)}
                >
                  {showRange ? 'Done' : 'Cancel'}
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default GenerateCurrencySplitModal;
