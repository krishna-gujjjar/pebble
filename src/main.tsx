import { domAnimation, LazyMotion } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./app";

const rootEl = document.querySelector("#root");
if (!rootEl) {
  throw new Error("Missing #root mount point");
}

createRoot(rootEl).render(
  <StrictMode>
    <LazyMotion features={domAnimation} strict>
      <App />
    </LazyMotion>
  </StrictMode>
);
