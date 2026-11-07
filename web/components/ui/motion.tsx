"use client";

import { ViewTransition, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Route-level transition. Links tag navigations with `nav-forward`, `nav-back`
 * or `tab`; untagged ones (refresh, browser back) do not animate.
 */
export function Page({ children }: { children: ReactNode }) {
  const types = { "nav-forward": "nav-forward", "nav-back": "nav-back", tab: "tab", default: "none" };
  return (
    <ViewTransition enter={types} exit={types} default="none">
      <div className="flex grow flex-col">{children}</div>
    </ViewTransition>
  );
}

/** Staggered arrival: fade, 8px rise and a light blur, delayed by `i` steps. */
export function Enter({ i = 0, className = "", as: Tag = "div", children }: {
  i?: number; className?: string; as?: "div" | "section" | "header" | "p" | "span"; children: ReactNode;
}) {
  return <Tag className={`animate-enter ${className}`} style={{ "--i": i } as CSSProperties}>{children}</Tag>;
}

/**
 * Eased 0→1 progress since mount, for hero figures that count up once and then
 * keep moving live. Returns 1 immediately with reduced motion.
 */
export function useIntro(duration = 900): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (reducedMotion()) {
      const id = requestAnimationFrame(() => setProgress(1));
      return () => cancelAnimationFrame(id);
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setProgress(1 - Math.pow(1 - t, 4));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration]);
  return progress;
}

/**
 * iOS-style segmented control: a pill slides under the chosen option.
 * `soft` sits on a grey track with a white pill; `ink` uses a black pill.
 */
export function Segmented<T extends string | number>({ options, value, onChange, label, tone = "soft", fill = false }: {
  options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string;
  tone?: "soft" | "ink"; fill?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const active = options.findIndex((o) => o.value === value);
  useThumb(ref, active);
  const ink = tone === "ink";
  return (
    <div ref={ref} role="group" aria-label={label}
      className={`relative ${fill ? "grid w-full" : "inline-flex max-w-full flex-wrap"} rounded-full ${ink ? "gap-2" : "bg-surface p-1"}`}
      style={fill ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}>
      <span data-thumb className={`rounded-full ${ink ? "bg-ink" : "bg-white shadow-[0_1px_3px_rgb(0_0_0/0.1),0_1px_1px_rgb(0_0_0/0.04)]"}`} />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={String(o.value)} data-item type="button" aria-pressed={on} onClick={() => onChange(o.value)}
            className={`relative z-10 whitespace-nowrap rounded-full font-medium transition-colors duration-300 active:scale-[.97] ${
              ink ? `h-11 border text-sm ${on ? "border-transparent text-white" : "border-line text-ink hover:bg-page"}`
                : `h-8 px-3.5 text-[13px] ${on ? "text-ink" : "text-muted hover:text-ink"}`}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Moves a `[data-thumb]` element under the active `[data-item]` of a container,
 * like an iOS segmented control. Writes styles directly: no re-render per frame.
 */
export function useThumb(container: RefObject<HTMLElement | null>, active: number) {
  const ready = useRef(false);
  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const place = () => {
      const thumb = root.querySelector<HTMLElement>("[data-thumb]");
      const item = root.querySelectorAll<HTMLElement>("[data-item]")[active];
      if (!thumb) return;
      if (!item) { thumb.style.opacity = "0"; return; }
      thumb.style.opacity = "1";
      thumb.style.width = `${item.offsetWidth}px`;
      thumb.style.height = `${item.offsetHeight}px`;
      thumb.style.transform = `translate(${item.offsetLeft}px, ${item.offsetTop}px)`;
      if (!ready.current) {
        ready.current = true;
        requestAnimationFrame(() => thumb.setAttribute("data-ready", ""));
      }
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    return () => observer.disconnect();
  }, [container, active]);
}
