export const metricIds = ["gasoline", "diesel", "electricity"] as const;
export type MetricId = (typeof metricIds)[number];
export interface PriceRow {
  code: string;
  name: string;
  value: number;
}
export interface Metric {
  id: MetricId;
  label: string;
  sourceId: string;
  observationPeriod: string;
  unit: string;
  axisMax: number;
  caveat: string;
  rows: PriceRow[];
}
export interface EnergySnapshot {
  version: string;
  researchDate: string;
  outlook: string;
  metrics: Metric[];
  cpi: {
    sourceId: string;
    observationPeriod: string;
    unit: string;
    rows: { name: string; value: number }[];
  };
  fiscal: {
    sourceId: string;
    annualMillionsPerDollar: number;
    fiscalYear: number;
    changes: number[];
  };
}
export function assertSnapshot(
  value: unknown,
): asserts value is EnergySnapshot {
  const data = value as EnergySnapshot;
  const expected = "AK AZ CA CO HI ID MT NM NV OR UT WA WY";
  if (
    !data ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.version) ||
    data.metrics?.length !== 3
  )
    throw new Error("Invalid energy snapshot");
  for (const [index, id] of metricIds.entries()) {
    const metric = data.metrics[index];
    const electricity = id === "electricity";
    if (
      metric.id !== id ||
      metric.rows?.length !== 13 ||
      metric.rows
        .map((r) => r.code)
        .sort()
        .join(" ") !== expected ||
      metric.sourceId !== (electricity ? "eia-electricity" : "aaa") ||
      metric.unit !==
        (electricity ? "cents per kilowatt-hour" : "dollars per gallon") ||
      metric.observationPeriod !==
        (electricity ? "June 2026" : "September 19, 2026") ||
      !Number.isFinite(metric.axisMax) ||
      metric.axisMax <= 0 ||
      metric.rows.some(
        (r) =>
          r.name !==
            data.metrics[0].rows.find((base) => base.code === r.code)?.name ||
          !r.name ||
          !Number.isFinite(r.value) ||
          r.value < 0 ||
          r.value > metric.axisMax,
      )
    ) {
      throw new Error(`Invalid ${id} coverage, units, period or values`);
    }
  }
  if (
    data.cpi?.rows?.length !== 3 ||
    data.cpi.rows.some((r) => !Number.isFinite(r.value) || r.value < 0) ||
    data.fiscal?.annualMillionsPerDollar !== 56.45 ||
    data.fiscal.fiscalYear !== 2027
  )
    throw new Error("Invalid economic inputs");
}
export function sortPrices(rows: PriceRow[]): PriceRow[] {
  return [...rows].sort(
    (a, b) => b.value - a.value || a.name.localeCompare(b.name),
  );
}
export type BudgetValidation =
  | { valid: true; gallons: number; deltaCents: number }
  | { valid: false; gallonsError?: string; priceError?: string };
export function validateBudget(
  gallonsText: string,
  priceText: string,
): BudgetValidation {
  const gallons = gallonsText.trim() === "" ? NaN : Number(gallonsText);
  const price = priceText.trim() === "" ? NaN : Number(priceText);
  const deltaCents = Math.round(price * 100);
  const gallonsError =
    !Number.isInteger(gallons) || gallons < 0 || gallons > 500
      ? "Enter a whole number from 0 to 500 gallons."
      : undefined;
  const priceError =
    !Number.isFinite(price) ||
    price < -2 ||
    price > 2 ||
    Math.abs(price * 100 - deltaCents) > 0.000001 ||
    deltaCents % 5 !== 0
      ? "Enter a price change from −$2 to +$2, in 5-cent increments."
      : undefined;
  return gallonsError || priceError
    ? { valid: false, gallonsError, priceError }
    : { valid: true, gallons, deltaCents };
}
export function fuelBudget(gallons: number, deltaCents: number) {
  if (
    !Number.isInteger(gallons) ||
    gallons < 0 ||
    gallons > 500 ||
    !Number.isInteger(deltaCents) ||
    deltaCents < -200 ||
    deltaCents > 200 ||
    deltaCents % 5 !== 0
  )
    throw new RangeError("Invalid budget inputs");
  const monthlyCents = gallons * deltaCents;
  return {
    monthlyCents: monthlyCents || 0,
    twoMonthCents: monthlyCents * 2 || 0,
  };
}
export function fiscalSensitivity(
  priceDifference: number,
  annualMillionsPerDollar = 56.45,
) {
  if (
    !Number.isFinite(priceDifference) ||
    !Number.isFinite(annualMillionsPerDollar) ||
    annualMillionsPerDollar < 0
  )
    throw new RangeError("Invalid fiscal inputs");
  // Integer hundredths of a million avoid a floating-point tie at 564.5.
  return (priceDifference * Math.round(annualMillionsPerDollar * 100)) / 100;
}
export function roundedFiscalMagnitude(millions: number) {
  return Math.round(Math.abs(millions));
}
export function signedMoney(cents: number) {
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(Math.abs(cents) / 100);
  return `${cents < 0 ? "−" : cents > 0 ? "+" : ""}${amount}`;
}
export function formatPrice(value: number, metric: MetricId) {
  return `${metric === "electricity" ? "" : "$"}${value.toFixed(2)}${metric === "electricity" ? "¢" : ""}`;
}
export function resolveSupplyStep(
  headingTops: number[],
  activationLine: number,
) {
  let active = 0;
  headingTops.forEach((top, index) => {
    if (top <= activationLine) active = index;
  });
  return active;
}
