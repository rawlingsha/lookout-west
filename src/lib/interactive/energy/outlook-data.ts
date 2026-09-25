export const outlookDimensions = [
  { key: 'routes', title: 'Export routes' },
  { key: 'inventories', title: 'Available supply / stocks' },
  { key: 'refining', title: 'Refining + products' },
  { key: 'gasoline', title: 'Western gasoline' },
  { key: 'diesel', title: 'Western diesel' },
] as const;
export type OutlookDimension = typeof outlookDimensions[number]['key'];
type Condition = { label: string; detail: string };
export interface OutlookState {
  id: string; title: string; summary: string;
  routes: Condition; inventories: Condition; refining: Condition; gasoline: Condition; diesel: Condition;
  evidence: string;
  // Qualitative illustration settings, not measured quantities or price forecasts.
  geometry: { routeWidth: number; routeGap: number; bypassGap: number; stock: number; channel: number; dieselChannel: number; gasolineAngle: number; dieselAngle: number };
}
export const outlookToday: OutlookState = {
  id: 'today', title: 'Today', summary: 'Some export capacity has returned. Flows remain constrained and costly; depleted stocks leave little room for another disruption.',
  routes: { label: 'Partial restart; costly workarounds', detail: 'Saudi Arabia’s East–West pipeline restarted September 22 below full capacity; restoration could take weeks. Hormuz remains constrained, while ship-to-ship transfers off Oman are reported near their practical limit, raising shipping costs.' },
  inventories: { label: '507m barrels drawn', detail: 'Observed global oil stocks fell from February through August. That depleted cushion leaves less room for another supply loss.' },
  refining: { label: 'High runs; products still tight', detail: 'U.S. refineries ran at 94.0% of operable capacity in the week ending September 18, according to EIA’s September 23 release. High utilization and a partial crude-route restart do not by themselves resolve tight diesel supply.' },
  gasoline: { label: 'Durable easing not established', detail: 'Some export capacity has returned, but costly transport and constrained product supply still limit the basis for sustained pump relief.' },
  diesel: { label: 'Separate product shortage', detail: 'Depleted distillate stocks and constrained product output keep diesel under pressure.' },
  evidence: 'Watch whether diplomacy brings sustained route recovery and cheaper transport, or new infrastructure outages reverse the gains. Refinery runs and product stocks will show whether fuel supply is improving.',
  // Sep. 25 review: still a partial restart and depleted buffer. Product channels
  // show qualitative constraints, not utilization percentages; flat arrows mark the baseline.
  geometry: { routeWidth: 2, routeGap: 18, bypassGap: 7, stock: .23, channel: .45, dieselChannel: .23, gasolineAngle: 0, dieselAngle: 0 },
};
export const outlookCases: OutlookState[] = [
  {
    id: 'recovery', title: 'Routes recover', summary: 'More dependable flows; gasoline can ease before diesel.',
    routes: { label: 'Flows strengthen reliably', detail: 'Hormuz traffic becomes consistently safer and higher. Saudi Arabia’s East–West route ramps without another major interruption.' },
    inventories: { label: 'Stocks begin rebuilding', detail: 'Draws stop and observed inventories rise for several consecutive weeks. The buffer starts recovering from a depleted level.' },
    refining: { label: 'Product constraints loosen', detail: 'Refined-product output improves and unusually wide diesel refining margins narrow. Supply is improving, not instantly normal.' },
    gasoline: { label: 'Pressure eases at pumps', detail: 'Wholesale relief increasingly reaches drivers. West Coast structural premiums can persist.' },
    diesel: { label: 'Eases more slowly', detail: 'Diesel can lag gasoline while distillate inventories remain depleted.' },
    evidence: 'Several weeks of stronger, safer flows; stable or rebuilding inventories; narrowing product-market constraints.',
    geometry: { routeWidth: 4, routeGap: 0, bypassGap: 0, stock: .58, channel: .9, dieselChannel: .59, gasolineAngle: 18, dieselAngle: 7 },
  },
  {
    id: 'constraint', title: 'Recovery stalls', summary: 'More barrels move, but inventories do not rebuild.',
    routes: { label: 'Bypass returns; Hormuz irregular', detail: 'Some alternative capacity returns, but Hormuz remains unreliable and bypass routes run below normal capacity.' },
    inventories: { label: 'Draws slow; no sustained rebuild', detail: 'More supply limits further losses without restoring a meaningful inventory cushion.' },
    refining: { label: 'Refineries run hard; products tight', detail: 'Finished-product supply remains constrained, especially diesel. More crude movement does not resolve every product bottleneck.' },
    gasoline: { label: 'Uneven, reversible easing', detail: 'Favorable headlines can lower prices temporarily, followed by renewed pressure.' },
    diesel: { label: 'Tightness persists', detail: 'Diesel remains the stubborn part of the shock as product supply stays constrained.' },
    evidence: 'More barrels moving, but no sustained inventory rebuild and little improvement in diesel or other product supply.',
    geometry: { routeWidth: 2.7, routeGap: 13, bypassGap: 3, stock: .27, channel: .53, dieselChannel: .25, gasolineAngle: 3, dieselAngle: -3 },
  },
  {
    id: 'disruption', title: 'Another disruption', summary: 'Supply losses draw down stocks and tighten products again.',
    routes: { label: 'Export capacity is lost again', detail: 'Another attack or outage removes meaningful shipping, pipeline or export capacity.' },
    inventories: { label: 'Stock draws accelerate', detail: 'Stored oil must cover a larger supply gap, reducing the remaining cushion further.' },
    refining: { label: 'Product markets tighten further', detail: 'A refinery outage or renewed loss of finished-product exports compounds the supply constraint.' },
    gasoline: { label: 'Renewed upward pressure', detail: 'Wholesale increases reach Western markets and pumps with regional lags.' },
    diesel: { label: 'Can tighten faster', detail: 'Already-depleted distillate stocks leave diesel less protection from another outage.' },
    evidence: 'Falling exports, faster stock draws, widening product margins, higher freight or security costs, or a major refinery/export outage.',
    geometry: { routeWidth: 1.3, routeGap: 30, bypassGap: 22, stock: .1, channel: .25, dieselChannel: .1, gasolineAngle: -15, dieselAngle: -23 },
  },
];
export const outlookStates = [outlookToday, ...outlookCases];
export const outlookSources = [
  { label: 'EIA · Refinery runs, week ending Sept. 18 (released Sept. 23)', url: 'https://www.eia.gov/petroleum/supply/weekly/pdf/table2.pdf' },
  { label: 'Reuters · Oman transfer constraints, Sept. 25', url: 'https://www.marinelink.com/news/saudi-oil-surge-pushes-gulf-oman-543259' },
  { label: 'Reuters · East–West restart, Sept. 22', url: 'https://www.gulf-times.com/article/733893/region/saudi-arabia-restarts-east-west-oil-pipeline-sources-say' },
  { label: 'Reuters · Hormuz traffic, Sept. 21', url: 'https://www.arabnews.com/middle-east/vessels-trickle-through-hormuz-as-middle-east-conflict-persists-3002582' },
  { label: 'IEA · September oil report', url: 'https://www.iea.org/reports/oil-market-report-september-2026' },
  { label: 'EIA · September petroleum outlook', url: 'https://www.eia.gov/outlooks/steo/report/petro_prod.php' },
];
export function outlookGeometry(state: OutlookState) {
  const g = state.geometry;
  return {
    '--out-route-width': String(g.routeWidth), '--out-route-gap': String(g.routeGap), '--out-bypass-gap': String(g.bypassGap),
    '--out-stock': String(g.stock), '--out-channel': String(g.channel), '--out-diesel-channel': String(g.dieselChannel),
    '--out-gas-angle': `${g.gasolineAngle}deg`, '--out-diesel-angle': `${g.dieselAngle}deg`,
  };
}
