import { resolveSupplyStep } from "./model.ts";

const transitionTimers = new WeakMap<HTMLElement, number>();
function finishTransition(root: HTMLElement) {
  root.ownerDocument.defaultView?.clearTimeout(transitionTimers.get(root));
  transitionTimers.delete(root);
  delete root.dataset.entering;
}

/** A complete render from one index; reverse/fast navigation never replays a queue. */
export function setSupplyStage(root: HTMLElement, stage: number, direction = "initial") {
  const index = Math.max(0, Math.min(3, Math.trunc(Number.isFinite(stage) ? stage : 0)));
  root.dataset.activeStep = String(index);
  root.dataset.scrollDirection = direction;
  finishTransition(root);
  const view = root.ownerDocument.defaultView;
  if (view && !view.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    root.dataset.entering = "true";
    transitionTimers.set(root, view.setTimeout(() => finishTransition(root), 800));
  }
  const sticky = root.querySelector<HTMLElement>("[data-supply-sticky]");
  sticky?.querySelectorAll<SVGElement>("[data-introduced]").forEach((object) => {
    const introduced = Number(object.dataset.introduced);
    const state = introduced > index ? "future" : introduced === index ? "current" : "context";
    if (object.dataset.state !== state) object.dataset.state = state;
    object.setAttribute("aria-hidden", String(state === "future"));
  });
  const progress = sticky?.querySelector("[data-supply-progress]");
  if (progress) progress.textContent = `0${index + 1} / 04`;
  const steps = [...root.querySelectorAll<HTMLElement>("[data-supply-step]")];
  const description = steps[index]?.querySelector("[data-route-description]")?.textContent;
  const liveDescription = sticky?.querySelector("[data-route-description]");
  if (liveDescription && description) liveDescription.textContent = description;
  const title = sticky?.querySelector("title");
  if (title) title.textContent = `The route to your pump · stage ${index + 1} of 4`;
}

export function enhanceSupply(root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  const sticky = root.querySelector<HTMLElement>("[data-supply-sticky]");
  const steps = [...root.querySelectorAll<HTMLElement>("[data-supply-step]")];
  const headings = steps.map((step) => step.querySelector("h3")!);
  if (!view || !sticky || headings.length !== 4 || headings.some((h) => !h) ||
      !sticky.querySelector("[data-route-canvas]") || !view.IntersectionObserver || !view.matchMedia) return () => {};
  const media = view.matchMedia("(min-width: 62rem) and (min-height: 42rem)");
  const lifetime = new view.AbortController();
  let observer: IntersectionObserver | undefined;
  let frame = 0;
  let active = -1;
  let lastScroll = view.scrollY;
  let activationLine = Math.round(view.innerHeight * .45);
  let debug: HTMLDivElement | undefined;
  if (import.meta.env?.DEV && new URLSearchParams(view.location.search).has("supply-debug")) {
    debug = root.ownerDocument.createElement("div");
    debug.className = "energy-supply-debug";
    debug.setAttribute("aria-hidden", "true");
    debug.append(root.ownerDocument.createElement("output"));
    root.ownerDocument.body.append(debug);
    root.dataset.debug = "true";
  }
  const resolve = () => {
    frame = 0;
    if (!root.classList.contains("is-sticky")) return;
    const direction = view.scrollY === lastScroll ? "restored" : view.scrollY > lastScroll ? "down" : "up";
    lastScroll = view.scrollY;
    const index = resolveSupplyStep(headings.map((heading) => heading.getBoundingClientRect().top), activationLine);
    if (index !== active) {
      setSupplyStage(root, index, direction);
      active = index;
    }
    if (debug) {
      const bounds = root.querySelector(".energy-supply-grid")!.getBoundingClientRect();
      debug.querySelector("output")!.textContent = `Stage ${index + 1}/4 · ${direction} · trigger ${activationLine}px · bounds ${Math.round(bounds.top)}…${Math.round(bounds.bottom)}`;
    }
  };
  // At most one read per scroll event frame; no recurring animation-frame loop.
  const schedule = () => {
    if (!frame && root.classList.contains("is-sticky")) frame = view.requestAnimationFrame(resolve);
  };
  const stop = () => {
    finishTransition(root);
    observer?.disconnect();
    observer = undefined;
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
    active = -1;
    root.classList.remove("is-sticky");
    sticky.hidden = true;
    if (debug) debug.hidden = true;
  };
  const configure = () => {
    if (!media.matches) { stop(); return; }
    observer?.disconnect();
    activationLine = Math.round(view.innerHeight * .45);
    const headerHeight = root.ownerDocument.querySelector(".site-header")?.getBoundingClientRect().height ?? 68;
    root.style.setProperty("--supply-header-clearance", `${Math.ceil(headerHeight + 24)}px`);
    try {
      observer = new view.IntersectionObserver(resolve, {
        rootMargin: `-${activationLine}px 0px -${Math.max(0, view.innerHeight - activationLine - 1)}px 0px`,
        threshold: 0,
      });
      headings.forEach((heading) => observer!.observe(heading));
      sticky.hidden = false;
      root.classList.add("is-sticky");
      if (debug) { debug.hidden = false; debug.style.top = `${activationLine}px`; }
      resolve();
      schedule();
    } catch { stop(); }
  };
  media.addEventListener("change", configure, { signal: lifetime.signal });
  view.addEventListener("resize", configure, { signal: lifetime.signal });
  view.addEventListener("orientationchange", configure, { signal: lifetime.signal });
  view.addEventListener("pageshow", configure, { signal: lifetime.signal });
  view.addEventListener("load", configure, { signal: lifetime.signal });
  view.addEventListener("hashchange", schedule, { signal: lifetime.signal });
  view.addEventListener("scroll", schedule, { passive: true, signal: lifetime.signal });
  root.addEventListener("focusin", (event) => {
    if (!root.classList.contains("is-sticky")) return;
    const index = steps.findIndex((step) => step.contains(event.target as Node));
    if (index >= 0) { setSupplyStage(root, index, "keyboard"); active = index; }
  }, { signal: lifetime.signal });
  configure();
  // Replacing the tall static fallback changes anchor geometry on a cold load.
  // Honor an explicit section anchor after that first layout, except on history restore.
  const anchor = root.ownerDocument.getElementById(view.location.hash.slice(1));
  const navigation = view.performance?.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (root.classList.contains("is-sticky") && anchor && root.contains(anchor) && navigation?.type !== "back_forward") {
    anchor.scrollIntoView?.({ block: "start", behavior: "instant" });
    resolve();
  }
  return () => {
    stop();
    lifetime.abort();
    debug?.remove();
    delete root.dataset.debug;
  };
}
