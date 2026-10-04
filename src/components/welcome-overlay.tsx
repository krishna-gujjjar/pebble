import { X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { div as MotionDiv } from "motion/react-m";

const WelcomeOverlay = ({
  open,
  onClose,
  onAddFirst,
}: {
  open: boolean;
  onClose: () => void;
  onAddFirst: () => void;
}) => (
  <AnimatePresence>
    {open ? (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <MotionDiv
          className="absolute inset-0 bg-[#1c2b23]/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
        <MotionDiv
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ damping: 24, stiffness: 280, type: "spring" }}
          className="relative m-4 w-full max-w-110 rounded-[28px] bg-[#faf7ef] p-6 text-center"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-white p-1.5 ring-1 ring-[#1c2b23]/10"
            aria-label="Close"
          >
            <X size={15} />
          </button>
          <img
            src="/images/companion.png"
            alt="Pebble"
            className="mx-auto h-24 w-24 rounded-full object-cover shadow-lg ring-2 ring-white"
          />
          <p className="font-display mt-4 text-[22px] font-bold">Meet Pebble</p>
          <p className="mx-auto mt-2 max-w-[320px] text-[14px] leading-relaxed text-[#5b6b60]">
            A quiet financial companion. Everything stays on this device, works
            fully offline, and recording takes seconds. I&apos;ve added a little
            sample life so you can see how I notice things - make it yours, or
            wipe it anytime.
          </p>
          <button
            type="button"
            onClick={onAddFirst}
            className="mt-5 w-full rounded-2xl bg-[#1c2b23] py-3.5 text-[15px] font-semibold text-[#f7f4ec]"
          >
            Add your first entry
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-2xl bg-white py-3 text-[14px] font-semibold text-[#1c2b23] ring-1 ring-[#1c2b23]/12"
          >
            Look around first
          </button>
        </MotionDiv>
      </div>
    ) : null}
  </AnimatePresence>
);

export default WelcomeOverlay;
