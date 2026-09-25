import { fuelDistribution } from "./personal-model.ts";
import type { Metric } from "./model.ts";
export function enhancePersonal(root: HTMLElement) {
  const get = <T extends HTMLElement>(s: string) => {
    const el = root.querySelector<T>(s);
    if (!el) throw new Error(`Incomplete personal fuel view: ${s}`);
    return el;
  };
  const view = root.ownerDocument.defaultView!;
  const metrics = JSON.parse(root.dataset.priceData!) as Metric[];
  const controls = get("[data-metric-controls]");
  const select = get<HTMLSelectElement>("[data-state-select]");
  const stateControl = get("[data-state-control]");
  const fallback = get("[data-state-fallback]");
  const radios = [...controls.querySelectorAll<HTMLInputElement>("input")];
  const marker = get("[data-selected-marker]");
  const status = get("[data-metric-status]");
  const controller = new view.AbortController();
  let explicit = false;
  const render = (announce = true) => {
    const id =
      radios.find((r) => r.checked)?.value === "diesel" ? "diesel" : "gasoline";
    const d = fuelDistribution(metrics, id, select.value);
    root.dataset.fuel = id;
    get("[data-selection-label]").textContent = explicit
      ? "Selected state"
      : "Example state";
    get("[data-selected-name]").textContent = d.selected.name;
    get("[data-selected-value]").textContent =
      `$${d.selected.value.toFixed(2)}`;
    get("[data-position]").textContent = `${d.rank} of 13, from lowest price`;
    get("[data-fuel-label]").textContent =
      id === "gasoline" ? "regular gasoline" : "diesel";
    get("[data-equation-fuel]").textContent = id;
    get("[data-range-low]").textContent =
      `Lowest · ${d.low.name} $${d.low.value.toFixed(2)}`;
    get("[data-range-high]").textContent =
      `Highest · ${d.high.name} $${d.high.value.toFixed(2)}`;
    get("[data-fuel-caveat]").textContent =
      id === "gasoline"
        ? "Regular gasoline includes taxes. State averages vary from individual stations."
        : "Retail diesel includes taxes. Farm purchases can have different taxes and contract prices.";
    for (const dot of d.dots) {
      const el = get(`[data-state-dot="${dot.code}"]`);
      el.style.left = `${dot.x}%`;
      el.style.top = `${dot.lane * 14}px`;
    }
    const pin = get("[data-selected-code]");
    pin.textContent = d.selected.code;
    pin.style.left = `${d.selected.x}%`;
    pin.style.setProperty("--stem", `${d.selected.lane * 14 + 20}px`);
    marker.style.left = `${d.selected.x}%`;
    marker.style.top = `${d.selected.lane * 14}px`;
    if (announce)
      status.textContent = `${d.selected.name}: $${d.selected.value.toFixed(2)} per gallon, ${d.metric.label}, ${d.metric.observationPeriod}. ${d.rank} of 13 from lowest price. Lowest ${d.low.name}, $${d.low.value.toFixed(2)}; highest ${d.high.name}, $${d.high.value.toFixed(2)}.`;
  };
  select.addEventListener(
    "change",
    () => {
      explicit = true;
      render();
    },
    { signal: controller.signal },
  );
  controls.addEventListener("change", () => render(), {
    signal: controller.signal,
  });
  view.addEventListener("pageshow", () => render(false), {
    signal: controller.signal,
  });
  render(false);
  controls.hidden = false;
  stateControl.hidden = false;
  fallback.hidden = true;
  return () => {
    controller.abort();
    controls.hidden = true;
    stateControl.hidden = true;
    fallback.hidden = false;
    select.value = "NM";
    radios.forEach((r) => (r.checked = r.value === "gasoline"));
    explicit = false;
    render(false);
  };
}

/** Public chart return links now open the optional regional layer. */
export function enhanceRegionalPrices(root: HTMLElement) {
  const view = root.ownerDocument.defaultView!;
  const controller = new view.AbortController();
  const follow = () => {
    const id = view.location.hash.slice(1);
    const target = root.ownerDocument.getElementById(id);
    if (!target || !root.contains(target)) return;
    let parent = target.parentElement;
    while (parent) {
      if (parent.tagName === "DETAILS")
        (parent as HTMLDetailsElement).open = true;
      parent = parent.parentElement;
    }
    target.scrollIntoView?.({ block: "start" });
  };
  view.addEventListener("hashchange", follow, { signal: controller.signal });
  view.addEventListener("pageshow", follow, { signal: controller.signal });
  follow();
  return () => controller.abort();
}
