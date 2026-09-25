import { enhancePersonal, enhanceRegionalPrices } from "./personal.ts";
import { enhanceOutlook } from "./outlook.ts";
import { enhanceSupply } from "./supply.ts";
import { enhancePulse } from "./pulse.ts";
import { enhanceFiscal } from "./fiscal.ts";
export { enhanceSupply } from "./supply.ts";
import { fuelBudget, validateBudget, signedMoney } from "./model.ts";

const instances = new WeakMap<HTMLElement, () => void>();

export function enhanceBudget(root: HTMLElement) {
  const get = <T extends HTMLElement>(selector: string) => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Incomplete fuel calculator: ${selector}`);
    return element;
  };
  const view = root.ownerDocument.defaultView;
  if (!view) throw new Error("Missing window");
  const gallons = get<HTMLInputElement>("#energy-gallons");
  const price = get<HTMLInputElement>("#energy-price");
  const result = get("[data-budget-result]");
  const description = get("[data-budget-description]");
  const status = get("[data-budget-status]");
  const monthly = get("[data-monthly]");
  const twoMonth = get("[data-two-month]");
  const controls = get("[data-budget-controls]");
  const fallback = get("[data-budget-fallback]");
  const gallonsError = get("#gallons-error");
  const priceError = get("#price-error");
  const controller = new view.AbortController();
  let timer: number | undefined;
  const showError = (
    input: HTMLInputElement,
    element: HTMLElement,
    error?: string,
  ) => {
    input.setAttribute("aria-invalid", String(Boolean(error)));
    element.textContent = error ?? "";
    element.hidden = !error;
  };
  const render = (announce = true) => {
    view.clearTimeout(timer);
    const parsed = validateBudget(gallons.value, price.value);
    showError(
      gallons,
      gallonsError,
      parsed.valid ? undefined : parsed.gallonsError,
    );
    showError(price, priceError, parsed.valid ? undefined : parsed.priceError);
    result.hidden = !parsed.valid;
    root.querySelector<HTMLElement>("[data-invalid-result]")!.hidden =
      parsed.valid;
    root.querySelector<HTMLElement>(".personal-duration")!.style.visibility =
      parsed.valid ? "visible" : "hidden";
    let message: string;
    if (parsed.valid) {
      const values = fuelBudget(parsed.gallons, parsed.deltaCents);
      monthly.textContent = signedMoney(values.monthlyCents);
      twoMonth.textContent = signedMoney(values.twoMonthCents);
      message =
        parsed.gallons === 0
          ? "At zero gallons, this fuel-price change adds no spending."
          : parsed.deltaCents === 0
            ? "With no price change, fuel spending is unchanged at the same use."
            : `${parsed.gallons} gallons a month at $${(Math.abs(parsed.deltaCents) / 100).toFixed(2)} ${parsed.deltaCents < 0 ? "less" : "more"} per gallon ${parsed.deltaCents < 0 ? "saves" : "adds"} ${signedMoney(Math.abs(values.monthlyCents)).replace("+", "")} a month. If the same difference held for two months: ${signedMoney(values.twoMonthCents)}.`;
    } else
      message = [parsed.gallonsError, parsed.priceError]
        .filter(Boolean)
        .join(" ");
    description.textContent = message;
    if (announce)
      timer = view.setTimeout(() => {
        status.textContent = message;
      }, 250);
  };
  controls.addEventListener("input", () => render(), {
    signal: controller.signal,
  });
  controls.addEventListener(
    "click",
    (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>(
        "button",
      );
      if (!button) return;
      if (button.hasAttribute("data-budget-reset")) {
        gallons.value = "60";
        price.value = "1.00";
      } else if (button.dataset.pricePreset !== undefined)
        price.value = button.dataset.pricePreset;
      else return;
      render();
    },
    { signal: controller.signal },
  );
  view.addEventListener("pageshow", () => render(false), {
    signal: controller.signal,
  });
  render(false);
  controls.hidden = false;
  fallback.hidden = true;
  return () => {
    controller.abort();
    view.clearTimeout(timer);
    controls.hidden = true;
    fallback.hidden = false;
  };
}

export function enhancePrint(root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  if (!view) return () => {};
  const controller = new view.AbortController();
  let previouslyClosed: HTMLDetailsElement[] | undefined;
  const openNotes = () => {
    if (previouslyClosed) return;
    previouslyClosed = [
      ...root.querySelectorAll<HTMLDetailsElement>(
        "details.energy-data:not([open])",
      ),
    ];
    previouslyClosed.forEach((details) => {
      details.open = true;
    });
  };
  const restoreNotes = () => {
    previouslyClosed?.forEach((details) => {
      details.open = false;
    });
    previouslyClosed = undefined;
  };
  view.addEventListener("beforeprint", openNotes, {
    signal: controller.signal,
  });
  view.addEventListener("afterprint", restoreNotes, {
    signal: controller.signal,
  });
  return () => {
    controller.abort();
    restoreNotes();
  };
}

export function initializeEnergy(document: Document) {
  const modules: [string, (root: HTMLElement) => () => void][] = [
    ["[data-energy-personal]", enhancePersonal],
    ["[data-regional-prices]", enhanceRegionalPrices],
    ["[data-energy-budget]", enhanceBudget],
    ["[data-energy-supply]", enhanceSupply],
    ["[data-energy-pulse]", enhancePulse],
    ["[data-energy-fiscal]", enhanceFiscal],
    ["[data-energy-outlook]", enhanceOutlook],
    [".energy-story", enhancePrint],
  ];
  for (const [selector, initialize] of modules) {
    document.querySelectorAll<HTMLElement>(selector).forEach((root) => {
      if (instances.has(root)) return;
      try {
        instances.set(root, initialize(root));
      } catch (error) {
        console.error("Energy module kept its static fallback", error);
      }
    });
  }
  return () =>
    modules.forEach(([selector]) =>
      document.querySelectorAll<HTMLElement>(selector).forEach((root) => {
        instances.get(root)?.();
        instances.delete(root);
      }),
    );
}
