import { AnimatePresence } from "motion/react";
import { div as MotionDiv } from "motion/react-m";

const Toast = ({ msg }: { msg: string }) => (
  <AnimatePresence>
    {msg ? (
      <MotionDiv
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="fixed bottom-38 left-1/2 z-50 w-max max-w-[90vw] -translate-x-1/2 rounded-full bg-[#1c2b23] px-5 py-2.5 text-[13.5px] font-medium text-[#f7f4ec] shadow-xl md:bottom-10"
      >
        {msg}
      </MotionDiv>
    ) : null}
  </AnimatePresence>
);

export default Toast;
