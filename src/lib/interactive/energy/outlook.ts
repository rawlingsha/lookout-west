import { outlookStates, outlookToday, outlookGeometry } from './outlook-data.ts';
export function enhanceOutlook(root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  const controls = root.querySelector<HTMLElement>('[data-outlook-controls]');
  const inputs = [...root.querySelectorAll<HTMLInputElement>('[data-outlook-select]')];
  const copies = [...root.querySelectorAll<HTMLElement>('[data-outlook-copy]')];
  const status = root.querySelector<HTMLElement>('[data-outlook-status]');
  const mode = root.querySelector<HTMLElement>('[data-outlook-mode]');
  const vintage = root.querySelector<HTMLElement>('[data-outlook-vintage]');
  if (!view || !controls || !status || inputs.length !== outlookStates.length) throw new Error('Incomplete oil-system controls');
  const controller = new view.AbortController();
  const choose = (id: string, announce = true) => {
    const state = outlookStates.find(s=>s.id === id);
    if (!state) return;
    root.dataset.outlookState = state.id;
    if (mode) mode.textContent = state.id === 'today' ? 'Current conditions' : `Conditional case: ${state.title}`;
    if (vintage) vintage.hidden = state.id !== 'today';
    for (const [name,value] of Object.entries(outlookGeometry(state))) root.style.setProperty(name,value);
    copies.forEach(copy=> {
      if (copy.dataset.outlookCopy === state.id) copy.removeAttribute('aria-hidden');
      else copy.setAttribute('aria-hidden','true');
    });
    inputs.forEach(input=>input.checked = input.dataset.outlookSelect === state.id);
    if (announce) status.textContent = `${state.title}. ${state.summary} Gasoline: ${state.gasoline.label}. Diesel: ${state.diesel.label}.`;
  };
  inputs.forEach(input=>input.addEventListener('change',()=> {
    if (input.checked) choose(input.dataset.outlookSelect!);
  },{signal:controller.signal}));
  choose(outlookToday.id,false);
  controls.hidden = false;
  // Earlier progressive enhancement changes document height on a cold deep link.
  const anchor = root.ownerDocument.getElementById(view.location.hash.slice(1));
  const navigation = view.performance?.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
  const restoreAnchor = (event?: PageTransitionEvent) => {
    if (!event?.persisted && anchor && root.closest('.energy-futures')?.contains(anchor) && navigation?.type !== 'back_forward') anchor.scrollIntoView?.({block:'start',behavior:'instant'});
  };
  restoreAnchor();
  if(root.ownerDocument.readyState !== 'complete') view.addEventListener('pageshow',restoreAnchor,{once:true,signal:controller.signal});
  return () => { controller.abort(); choose(outlookToday.id,false); controls.hidden=true; status.textContent=''; };
}
