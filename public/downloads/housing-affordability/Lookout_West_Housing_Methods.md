# Housing access: methods and source checks

*Lookout West | Original analysis: November 4, 2026; publication update: November 6, 2026*

## November 6 publication update

The revised feature adds October asking-price and local sales observations and the November 5 mortgage rate. The March affordability comparisons and their unresolved cross-source discrepancy remain unchanged. The sections below document the original March analysis. The opening payment illustrations are separate from NAR’s model: they assume 20% down, a 30-year fixed mortgage, and principal and interest only. Their inputs, sources, formula and exclusions are documented in endnote 1 of the updated article. The original replication script reproduces the March comparisons and supplementary figures, not the new payment illustrations.

## Scope

The article reports NAR/Realtor.com's March 2026 affordability estimates, adds arithmetic comparisons across household budgets, and uses local sales reports to illustrate the types of housing sold at related prices. It is not a November market update or original interview reporting. It does not estimate causal effects of construction, household raises or mortgage-rate changes.

The principal affordability findings use one published table internally. The separate Realtor.com public inventory file has not been reconciled with that table. The discrepancy is documented below and is not treated as resolved.

## Financing and shares

NAR's framework allocates 30% of gross income to mortgage financing, property taxes and homeowners insurance, with mortgage insurance added for down payments below 20%. It specifies a 30-year fixed mortgage and variable down payments. The report describes local mortgage rates and ownership-cost inputs, without publishing complete metro-by-month values. We use its published purchase limits rather than inventing a rate or down payment.

A $100,000 household's modeled monthly allocation is $2,500. NAR's published maximum prices are $386,070 in Denver and $386,270 in Boise. At $125,000, they are $482,590 and $482,830; at $150,000, $579,110 and $579,400. These are source estimates, not an independently reconstructed underwriting model. Qualification and cash for closing remain separate constraints. HOA fees and maintenance are not specified in the publisher's listed cost components.

Each affordable share is cumulative: the share at $125,000 includes the listings also affordable at $100,000. Subtracting the two shares therefore measures the share between the two published price limits. It does not measure the effect of an individual pay raise.

| Income | Denver March 2025 | Denver March 2026 | Change, pp | Boise March 2025 | Boise March 2026 | Change, pp |
|---|---:|---:|---:|---:|---:|---:|
| $75,000 | 6.6% | 9.1% | +2.5 | 1.3% | 1.8% | +0.5 |
| $100,000 | 16.3% | 19.6% | +3.3 | 11.6% | 11.7% | +0.1 |
| $125,000 | 28.9% | 33.3% | +4.4 | 36.8% | 35.2% | −1.6 |
| $150,000 | 45.2% | 49.4% | +4.2 | 54.5% | 51.6% | −2.9 |

Boise's band share is 35.2 − 11.7 = 23.5 percentage points; Denver's is 33.3 − 19.6 = 13.7. The corresponding ranges are $386,270–$482,830 and $386,070–$482,590. The ratio 35.2/11.7 is approximately 3.01. This is a ratio of modeled listing shares in one snapshot, not a tripling of observed purchases or a prediction for any individual household.

The chart shows published observations between $50,000 and $250,000; the retained data include all 11 finite published incomes. Connecting lines guide the eye, and an exact crossover income is not estimated. The $75,000 observation is explicitly labeled on the axis. A single source caption accompanies the chart in the article; a companion captions file supplies credit for reuse.

Two March snapshots control for the calendar month but do not establish persistence. No confidence interval or statistical significance is claimed. A smaller affordable share can accompany a larger affordable count if total inventory expands. No cross-publisher counts are constructed.

## Regional comparison

All 100 metro rows and 11 finite income observations per metro were extracted from the published NAR PDF (1,100 observations). The regional filter includes any metro whose state suffix intersects AK, AZ, CA, CO, HI, ID, MT, NV, NM, OR, UT, WA, WY, ND, SD, NE, KS, OK or TX. Cross-border metros are included in full. This yields 33 large metros, not comprehensive coverage of Western towns or rural communities.

For each metro, subtract the March 2026 share at $100,000 from that at $125,000. Boise ranks sixth, at 23.5 percentage points, among the 33. The median is 16.6; Denver is 13.7. Five higher observations are El Paso and Fresno (both 25.9), Colorado Springs (23.8), Bakersfield (23.7) and Albuquerque (23.6). These differences use rounded published shares; small rank differences should not be overinterpreted.

This is a comparison of access between identical nominal household incomes. Local financing limits differ, so it is not a ranking of the share of homes in one common dollar price range. For example, Boise's range is about $386,000–$483,000, while El Paso's is about $299,000–$374,000. The selected geographic rule was not changed based on these outcomes. See data/regional_budget_band_comparison.csv for every metro, both thresholds and both shares.

The older alignment-score tables and counts remain supplementary research inputs. They are not used to explain the income-specific results. The unexplained Boise score movement is not an editorial finding, and no change in income weights is asserted as its cause.

## What local sales reports establish

Boise Regional Realtors/Idaho Policy Institute's March 2026 Canyon County single-family report gives median closed prices of $406,000 for resales and $449,990 for new homes; new homes accounted for 53% of sales. Canyon County is part of the Boise metro. These medians illustrate real transactions within the approximate buying-limit band. They do not identify what proportion of NAR's active-listing band consists of new homes, resales or particular property types. No such decomposition is claimed.

DMAR's March report gives attached and detached median closed prices of $397,000 and $645,000, and discusses HOA and insurance pressures. Its geographic footprint differs from NAR's metro. Comparing the attached median with the $100,000 household's modeled $386,000 limit is illustrative, not an estimate of available inventory. No household interview or specific loan approval is invented.

## Unresolved reconciliation: NAR versus the public inventory file

The reviewer correctly identified a problem. Matching March instead of using Q1 averages does not eliminate it:

| March 2026 | NAR maximum price at $150,000 income | NAR affordable share | Realtor.com public median asking price |
|---|---:|---:|---:|
| Boise | $579,400 | 51.6% | $624,987 |
| Denver | $579,110 | 49.4% | $575,000 |

If these described the same simple price distribution and the same price cutoff, the Boise share above 50% would put the median at or below $579,400. Denver's share below 50% would place the median above $579,110. The public medians point the other way. Rounding does not account for Boise's large gap, and comparing March to March rules out quarterly averaging as a sufficient explanation.

The published material inspected does not identify a definitive explanation. Different listing coverage, geographic treatment, weighting or model processing could be relevant, but none is established here. We do not label the difference harmless or claim the files are harmonized. The affordability feature reports NAR's estimates as published; its central comparisons and regional ranking are calculated within that same source. The public inventory medians and the former asking-median chart have been removed from the feature. They remain archived as supplementary research, with this limitation.

No NAR share is multiplied by a public Realtor.com active count. No inference about the property mix of NAR's band is derived from the public median-size series. Verifying the precise relationship between these files requires additional publisher documentation; this package cannot reproduce a proprietary listings universe.

## Historical prices and size: supplementary checks

FHFA seasonally adjusted purchase-only metro indexes rose from 398.69 to 733.37 in Boise and 495.94 to 708.60 in Denver, Q1 2019–Q1 2026: increases of 83.9449% and 42.8802%. The article reports these as separate single-family repeat-sales comparisons, not explanations or reconstructions of NAR's listing shares.

The archived Realtor.com calculations average January–March monthly medians in each year; they are not pooled quarterly medians. All 18 retained observations have quality_flag = 0. The public history is revised and uses updated metro delineations. Denver's mean monthly median listed area was 2,488.33 sq ft in Q1 2019, 1,962.67 in Q1 2025 and 1,941 in Q1 2026. The annual decline was 1.10394%; the seven-year decline was 21.9960%. Most of the decline preceded the 2025–2026 affordability change. The size series cannot explain that annual gain. It has been moved entirely out of the feature.

## Replication and included files

Run `python reproduce_analysis.py` with pandas and matplotlib installed. The code checks the source-data dimensions, regional filter, budget-band calculations and annual changes; it regenerates the article chart and supplementary price/size chart. CSV inputs include all NAR income observations, the complete regional band comparison, the two-city observations, and the public inventory/FHFA extracts. The script reproduces Lookout West's arithmetic, not NAR's proprietary financing model.

Source PDFs and download links are listed in the article's visible bibliography. The print PDF spells out the source URLs. All relative data, methods and figure paths resolve within the supplied package; website deployment must retain them or map them to actual asset routes. No live website URL or interview is fabricated.
