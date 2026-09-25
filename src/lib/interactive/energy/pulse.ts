/** Static markup is complete; enhancement only adds a single shared time reveal. */
export function enhancePulse(root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  const visual = root.querySelector<HTMLElement>("[data-pulse-visual]");
  if (!view || !visual || !view.IntersectionObserver || !view.matchMedia) return () => {};
  // The preceding enhanced section changes the static document's height.
  // Resolve a requested PricePulse anchor against the finished layout.
  const anchor = root.ownerDocument.getElementById(view.location.hash.slice(1));
  const navigation = view.performance?.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
  const restoreAnchor = (event?: PageTransitionEvent) => {
    if (!event?.persisted && anchor && root.closest(".energy-arrival")?.contains(anchor) && navigation?.type !== "back_forward") {
      anchor.scrollIntoView?.({ block: "start", behavior: "instant" });
    }
  };
  restoreAnchor();
  // Initial pageshow follows the browser's own saved-scroll restoration and
  // the preceding section's load-time layout. Never override history traversal.
  if (root.ownerDocument.readyState !== "complete") view.addEventListener("pageshow", restoreAnchor, { once: true });
  const motion = view.matchMedia("(prefers-reduced-motion: reduce)");
  let observer: IntersectionObserver | undefined;
  let timer: number | undefined;
  const finish = () => {
    observer?.disconnect();
    view.clearTimeout(timer);
    root.dataset.pulseState = "complete";
  };
  const changed = () => { if (motion.matches) finish(); };
  const restored = (event: PageTransitionEvent) => { if (event.persisted) finish(); };
  const print = () => finish();
  // Delayed JS and deep loads must never erase a chart the reader already sees.
  if (motion.matches || visual.getBoundingClientRect().top < view.innerHeight) {
    finish();
    return () => view.removeEventListener("pageshow", restoreAnchor);
  }
  try {
    observer = new view.IntersectionObserver(entries => {
      if (root.dataset.pulseState !== "pending") return;
      if (!entries.some(e => e.isIntersecting && e.intersectionRatio >= .3)) return;
      observer?.disconnect();
      root.dataset.pulseState = "revealing";
      timer = view.setTimeout(finish, 1500);
    }, { threshold: .3 });
    observer.observe(visual);
    root.dataset.pulseState = "pending";
    motion.addEventListener("change", changed);
    view.addEventListener("pageshow", restored);
    view.addEventListener("beforeprint", print);
  } catch { finish(); }
  return () => {
    finish();
    motion.removeEventListener("change", changed);
    view.removeEventListener("pageshow", restored);
    view.removeEventListener("beforeprint", print);
    view.removeEventListener("pageshow", restoreAnchor);
  };
}
