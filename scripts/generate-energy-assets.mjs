import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { pulseSvg, rebaseCpi } from "../src/lib/interactive/energy/pulse-model.ts";
import {
  assertSnapshot,
  sortPrices,
  formatPrice,
  fiscalSensitivity,
  roundedFiscalMagnitude,
} from "../src/lib/interactive/energy/model.ts";

const base = "src/data/interactive/west-energy-bill";
const data = JSON.parse(await readFile(`${base}/snapshot.json`, "utf8"));
const sources = JSON.parse(await readFile(`${base}/sources.json`, "utf8"));
assertSnapshot(data);
for (const source of sources) {
  if (
    !source.id ||
    !source.title ||
    !source.definition ||
    !source.observationPeriod ||
    !source.unit ||
    !source.geography ||
    !source.retrievedAt ||
    !source.reuseNote ||
    !source.revisionStatus ||
    !["observed", "derived", "official forecast", "illustrative"].includes(
      source.kind,
    )
  )
    throw new Error(`Incomplete source: ${source.id}`);
  new URL(source.url);
  if (source.archivedFile) {
    const hash = createHash("sha256")
      .update(await readFile(source.archivedFile))
      .digest("hex");
    if (hash !== source.sha256)
      throw new Error(`Source archive changed: ${source.id}`);
  }
}
const output = "public/images/research/west-energy-bill";
const downloads = "public/downloads/west-energy-bill";
await mkdir(output, { recursive: true });
await mkdir(downloads, { recursive: true });
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const text = (x, y, value, size = 24, fill = "#4a5d44", extra = "") =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${escape(value)}</text>`;
const svg = (height, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}"><rect width="1200" height="${height}" fill="#f4f4f0"/><g font-family="Georgia, serif">${body}</g></svg>`;
async function exportImage(id, markup) {
  await writeFile(`${output}/${id}.svg`, markup);
  await sharp(Buffer.from(markup)).png().toFile(`${output}/${id}.png`);
}

const monthly = JSON.parse(await readFile(`${base}/monthly-cpi.json`, "utf8"));
rebaseCpi(monthly.rows);
const pulseChart = pulseSvg(monthly.rows, "pulse-export")
  .replace('<svg ', '<svg x="60" y="150" width="1080" height="605" ');
const pulse = text(60, 45, "LOOKOUT WEST / OBSERVED PRICES", 20) +
  text(60, 99, "Western energy prices since February", 42) +
  text(60, 137, "West-region CPI-U · February 2026 = 100 · February–August 2026", 23, "#6B6E6A") +
  pulseChart +
  text(60, 802, "Source: U.S. Bureau of Labor Statistics; Lookout West calculations.", 21, "#6B6E6A") +
  text(60, 837, "Monthly indexes are not seasonally adjusted. Each observation covers the whole month.", 20, "#6B6E6A") +
  text(60, 872, "Electricity and utility gas reflect different markets. Observed changes do not estimate", 20, "#6B6E6A") +
  text(60, 900, "the disruption’s causal effect. Endpoint changes compare August with February, not a year earlier.", 20, "#6B6E6A");
await exportImage("energy-price-pulse", svg(930, pulse));
await writeFile(`${downloads}/monthly-cpi.json`, JSON.stringify(monthly, null, 2) + "\n");
await writeFile(`${downloads}/monthly-cpi.csv`, [
  "month,gasoline_all_types_cpi,electricity_cpi,utility_piped_gas_cpi,base,adjustment",
  ...monthly.rows.map(r => `${r.month},${r.gasoline.toFixed(3)},${r.electricity.toFixed(3)},${r.utilityGas.toFixed(3)},1982-84=100,not seasonally adjusted`)
].join("\n") + "\n");

for (const metric of data.metrics) {
  let body =
    text(60, 72, metric.label + " across the West", 40) +
    text(
      60,
      120,
      `${metric.observationPeriod} · ${metric.unit}`,
      24,
      "#5b5b57",
    );
  for (let tick = 0; tick <= 4; tick++) {
    const x = 280 + tick * 187.5;
    body += `<line x1="${x}" x2="${x}" y1="160" y2="810" stroke="#d5d8cf"/>`;
    body += text(
      x,
      845,
      formatPrice((metric.axisMax * tick) / 4, metric.id),
      20,
      "#5b5b57",
      'text-anchor="middle"',
    );
  }
  sortPrices(metric.rows).forEach((row, index) => {
    const y = 185 + index * 48;
    body +=
      text(60, y + 7, row.name, 25) +
      `<rect x="280" y="${y - 15}" width="${(row.value / metric.axisMax) * 750}" height="27" fill="#4a5d44"/>` +
      text(
        1128,
        y + 7,
        formatPrice(row.value, metric.id),
        25,
        "#4a5d44",
        'text-anchor="end"',
      );
  });
  body += text(
    60,
    905,
    metric.id === "electricity"
      ? "Source: EIA, Electric Power Monthly, Table 5.6.A; released August 26, 2026."
      : "Source: AAA state gas price averages, September 19, 2026.",
    20,
    "#5b5b57",
  );
  body += text(
    60,
    940,
    metric.id === "electricity"
      ? "Preliminary residential revenue per kWh sold. Average prices, not household bills."
      : metric.id === "diesel"
        ? "Retail averages. Farm taxes and contract prices can differ. Bills depend on gallons."
        : "Regular gasoline retail averages, including taxes. Bills also depend on gallons.",
    20,
    "#5b5b57",
  );
  body += text(
    60,
    975,
    "Lookout West · 13-state West · Research snapshot September 19, 2026",
    18,
    "#5b5b57",
  );
  await exportImage(`energy-${metric.id}`, svg(1010, body));
}

let fiscal =
  text(60, 75, "New Mexico: the annual average matters", 42) +
  text(
    60,
    124,
    "FY2027 direct-revenue sensitivity · August 2026 forecast",
    24,
    "#5b5b57",
  );
data.fiscal.changes.forEach((change, index) => {
  const x = 60 + index * 370;
  const millions = fiscalSensitivity(
    change,
    data.fiscal.annualMillionsPerDollar,
  );
  fiscal += `<line x1="${x}" x2="${x + 320}" y1="190" y2="190" stroke="#4a5d44" stroke-width="3"/>`;
  fiscal +=
    text(
      x,
      237,
      change < 0 ? "$10 lower" : change > 0 ? "$10 higher" : "No change",
      32,
    ) +
    text(x, 276, "Annual average oil price", 20, "#5b5b57") +
    text(x, 304, "relative to forecast", 20, "#5b5b57");
  fiscal +=
    text(
      x,
      394,
      change === 0 ? "$0" : `About $${roundedFiscalMagnitude(millions)}m`,
      40,
    ) +
    text(
      x,
      437,
      change < 0
        ? "less direct revenue"
        : change > 0
          ? "more direct revenue"
          : "revenue change",
      24,
    );
});
fiscal +=
  text(
    60,
    525,
    "Illustration: price difference × $56.45m. Other assumptions held constant.",
    21,
    "#5b5b57",
  ) +
  text(
    60,
    565,
    "Not collected cash, spendable budget money or residents’ net benefit.",
    23,
  ) +
  text(
    60,
    620,
    "Source: New Mexico August 2026 revenue forecast, pp. 16 and 41. Lookout West.",
    19,
    "#5b5b57",
  );
await exportImage("energy-nm-revenue", svg(665, fiscal));

let card =
  text(60, 70, "LOOKOUT WEST / ENERGY", 20) +
  text(60, 145, "The West’s Energy Bill", 54) +
  text(60, 196, "One oil shock. Different routes to the bill.", 27, "#5b5b57");
data.cpi.rows.forEach((row, i) => {
  const y = 285 + i * 86;
  card +=
    text(60, y, row.name, 25) +
    `<rect x="235" y="${y - 22}" width="${(row.value / 30) * 725}" height="28" fill="#4a5d44"/>` +
    text(
      1100,
      y,
      `+${row.value.toFixed(1)}%`,
      30,
      "#4a5d44",
      'text-anchor="end"',
    );
});
card += text(
  60,
  565,
  "Western CPI · August 2025–August 2026 · Source: BLS",
  20,
  "#5b5b57",
);
await exportImage("energy-card", svg(630, card));
await writeFile(
  `${downloads}/snapshot.json`,
  JSON.stringify(data, null, 2) + "\n",
);
await writeFile(
  `${downloads}/sources.json`,
  JSON.stringify(sources, null, 2) + "\n",
);
const csv = [
  "state_code,state,regular_gasoline_usd_per_gallon,diesel_usd_per_gallon,pump_price_date,residential_electricity_cents_per_kwh,electricity_month,electricity_status,pump_source,electricity_source",
];
data.metrics[0].rows.forEach((row, index) =>
  csv.push(
    [
      row.code,
      row.name,
      row.value.toFixed(4),
      data.metrics[1].rows[index].value.toFixed(4),
      "2026-09-19",
      data.metrics[2].rows[index].value.toFixed(2),
      "2026-06",
      "preliminary",
      "AAA",
      "EIA Table 5.6.A",
    ].join(","),
  ),
);
await writeFile(`${downloads}/state-prices.csv`, csv.join("\n") + "\n");
console.log(
  "Energy snapshot validated; five annotated charts, card image and data downloads ready.",
);
