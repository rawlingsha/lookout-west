/** Semantic content is complete without JS; reveal the explanation only once. */
export function enhanceFiscal(root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  const flow = root.querySelector<HTMLElement>('[data-fiscal-flow]');
  if (!view || !flow || !view.matchMedia || !view.IntersectionObserver) return () => {};
  const anchor = root.ownerDocument.getElementById(view.location.hash.slice(1));
  const navigation = view.performance?.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
  const restoreAnchor = (event?: PageTransitionEvent) => {
    if (!event?.persisted && anchor && root.contains(anchor) && navigation?.type !== 'back_forward') {
      anchor.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    }
  };
  restoreAnchor();
  if (root.ownerDocument.readyState !== 'complete') view.addEventListener('pageshow', restoreAnchor, { once: true });
  const motion = view.matchMedia('(prefers-reduced-motion: reduce)');
  let observer: IntersectionObserver | undefined;
  let timer: number | undefined;
  const finish = () => {
    observer?.disconnect();
    view.clearTimeout(timer);
    root.dataset.fiscalState = 'complete';
  };
  if (motion.matches || flow.getBoundingClientRect().top < view.innerHeight) {
    finish();
    return () => view.removeEventListener('pageshow', restoreAnchor);
  }
  const changed = () => { if (motion.matches) finish(); };
  const restored = () => finish();
  const historyRestored = (event: PageTransitionEvent) => { if (event.persisted) finish(); };
  try {
    observer = new view.IntersectionObserver(entries => {
      if (root.dataset.fiscalState !== 'pending' || !entries.some(e => e.isIntersecting && e.intersectionRatio >= .15)) return;
      observer?.disconnect();
      root.dataset.fiscalState = 'revealing';
      timer = view.setTimeout(finish, 1000);
    }, { threshold: .15 });
    observer.observe(flow);
    root.dataset.fiscalState = 'pending';
    motion.addEventListener('change', changed);
    view.addEventListener('beforeprint', restored);
    view.addEventListener('pageshow', historyRestored);
    root.addEventListener('focusin', finish);
  } catch { finish(); }
  return () => {
    finish();
    motion.removeEventListener('change', changed);
    view.removeEventListener('beforeprint', restored);
    view.removeEventListener('pageshow', historyRestored);
    view.removeEventListener('pageshow', restoreAnchor);
    root.removeEventListener('focusin', finish);
  };
}
