"use client";

import React, { useRef, createContext, useContext } from "react";
import { Scrollbar } from "smooth-scrollbar-react";
import type { Scrollbar as SmoothScrollbarInstance } from "smooth-scrollbar/scrollbar";

// Context so HeaderSection can call scrollTo on the same instance
const ScrollCtx = createContext<{ scrollTo: (target: HTMLElement | number) => void }>({
  scrollTo: () => {},
});

export const useSmoothScroll = () => useContext(ScrollCtx);

interface Props {
  children: React.ReactNode;
  header?: React.ReactNode;
}

export const SmoothScrollProvider = ({ children, header }: Props) => {
  const sbRef = useRef<SmoothScrollbarInstance | null>(null);

  const scrollTo = (target: HTMLElement | number) => {
    const sb = sbRef.current;
    if (!sb) return;

    if (typeof target === "number") {
      sb.scrollTo(0, target, 800);
    } else {
      const containerRect = sb.containerEl.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = sb.scrollTop + (targetRect.top - containerRect.top) - 84; // 84px nav height
      sb.scrollTo(0, offset, 800);
    }
  };

  return (
    <ScrollCtx.Provider value={{ scrollTo }}>
      {/* Header lives inside context so useSmoothScroll() works, but outside Scrollbar so position:fixed works */}
      {header}
      <Scrollbar
        ref={sbRef}
        style={{ height: "100vh", width: "100%" }}
      >
        {children}
      </Scrollbar>
    </ScrollCtx.Provider>
  );
};
