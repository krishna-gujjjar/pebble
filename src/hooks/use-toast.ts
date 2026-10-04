import { useEffect, useState } from "react";

/** one-line confirmation at the bottom of the screen, cleared on its own */
export const useToast = () => {
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) {
      return;
    }
    const id = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const say = (msg: string) => setToast(msg);

  return { say, toast };
};
