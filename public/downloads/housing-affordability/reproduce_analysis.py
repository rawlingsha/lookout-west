"""Reproduce Lookout West's comparisons and figures from archived CSV inputs.

Dependencies: pandas, matplotlib. Run from this script's directory.
NAR's source estimates are inputs, not an independently reconstructed model.
"""
from pathlib import Path
import re
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.ticker import PercentFormatter

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'data'
FIG = ROOT / 'figures'
FIG.mkdir(exist_ok=True)
PINE, EMBER, INK, GREY = '#4A5D44', '#D94E3D', '#20251F', '#646A63'
font = ROOT / 'assets' / 'LibreBaskerville.ttf'
if font.exists():
    font_manager.fontManager.addfont(str(font))
    font_name = font_manager.FontProperties(fname=str(font)).get_name()
else:
    font_name = 'DejaVu Serif'
plt.rcParams.update({'font.family': font_name, 'font.size': 11,
                     'text.color': INK, 'axes.labelcolor': GREY,
                     'xtick.color': GREY, 'ytick.color': INK,
                     'svg.fonttype': 'none', 'text.parse_math': False, 'figure.facecolor': 'white'})

region_states = set('AK AZ CA CO HI ID MT NV NM OR UT WA WY ND SD NE KS OK TX'.split())
all_scores = pd.read_csv(DATA / 'nar_all_100_scores.csv')
assert len(all_scores) == 100
mask = all_scores.metro.map(lambda n: bool(set(n.rsplit(', ', 1)[1].split('-')) & region_states))
scores = all_scores[mask].copy()
scores['change_2019_2026_points'] = scores.score_2026 - scores.score_2019
assert len(scores) == 33
assert (scores.score_2026 > scores.score_2025).sum() == 33
assert (scores.score_2026 < scores.score_2019).sum() == 21
scores.to_csv(DATA / 'west_plains_33_metro_scores.csv', index=False)

aff = pd.read_csv(DATA / 'denver_boise_affordability.csv')
assert len(aff) == 22
assert ((aff.affordable_share_2026_pct - aff.affordable_share_2025_pct - aff.change_pp).abs() < 1e-8).all()
for name, expected in [('Boise',23.5),('Denver',13.7)]:
    z = aff[aff.metro.str.startswith(name)].set_index('annual_household_income')
    assert abs(z.loc[125000,'affordable_share_2026_pct'] - z.loc[100000,'affordable_share_2026_pct'] - expected) < 1e-8
inputs = pd.read_csv(DATA / 'listing_monthly_inputs.csv')
assert len(inputs) == 18 and (inputs.quality_flag == 0).all()
inputs['year'] = inputs.month_date_yyyymm // 100
hpi = pd.read_csv(DATA / 'fhfa_repeat_sales_inputs.csv')
summary = []
for cbsa, name in [(19740, 'Denver'), (14260, 'Boise')]:
    x = inputs[inputs.cbsa_code == cbsa].groupby('year').mean(numeric_only=True)
    h = hpi[(hpi.cbsa == cbsa) & (hpi.qtr == 1)].set_index('yr')
    row = {'cbsa': cbsa, 'metro': name}
    for key in ['median_listing_price', 'median_square_feet',
                'median_listing_price_per_square_foot', 'active_listing_count', 'new_listing_count']:
        row[key + '_2019q1'] = x.loc[2019, key]
        row[key + '_2026q1'] = x.loc[2026, key]
        row[key + '_growth_pct'] = (x.loc[2026, key] / x.loc[2019, key] - 1) * 100
    row['fhfa_sa_2019q1'] = h.loc[2019, 'index_sa']
    row['fhfa_sa_2026q1'] = h.loc[2026, 'index_sa']
    row['fhfa_growth_pct'] = (h.loc[2026, 'index_sa'] / h.loc[2019, 'index_sa'] - 1) * 100
    row['fhfa_2025_2026_growth_pct'] = (h.loc[2026, 'index_sa'] / h.loc[2025, 'index_sa'] - 1) * 100
    summary.append(row)
summary = pd.DataFrame(summary)
summary.to_csv(DATA / 'price_and_size_comparison.csv', index=False)

def base(title, subtitle):
    fig = plt.figure(figsize=(9, 9), dpi=120)
    fig.text(.075, .95, 'LOOKOUT WEST', color=PINE, fontsize=11, weight='bold')
    fig.text(.075, .89, title, fontsize=22, linespacing=1.4)
    fig.text(.075, .81, subtitle, color=GREY, fontsize=11, linespacing=1.6)
    return fig

fig = base('Where buying options open up',
           'Share of active listings affordable at each household income\nMarch 2026 • NAR/Realtor.com model')
ax = fig.add_axes([.13, .32, .77, .37])
for metro, color in [('Denver', PINE), ('Boise', EMBER)]:
    z = aff[(aff.metro.str.startswith(metro)) & aff.annual_household_income.between(50000,250000)]
    ax.plot(z.annual_household_income/1000, z.affordable_share_2026_pct, marker='o', ms=6,
            lw=2, color=color, label=metro)
ax.axvspan(100,125,color='#DAA85E',alpha=.16)
ax.set(xlim=(45,255),ylim=(0,100),xticks=[50,75,100,125,150,200,250],yticks=[0,25,50,75,100])
ax.set_xticklabels(['$50k','$75k','$100k','$125k','$150k','$200k','$250k'],fontsize=9)
ax.yaxis.set_major_formatter(PercentFormatter(100,decimals=0))
ax.grid(axis='y', color='#E6E8E3',lw=.8)
for sp in ax.spines.values(): sp.set_visible(False)
ax.tick_params(length=0,pad=9)
ax.set_xlabel('Annual household income',labelpad=14)
ax.legend(frameon=False,loc='upper left',fontsize=11)
fig.text(.075,.20,'Between the $100,000 and $125,000 buying limits:',fontsize=12)
fig.text(.075,.145,'Boise: 23.5% of listings     Denver: 13.7%',fontsize=14)
fig.savefig(FIG/'01_affordable_share_by_income.png',facecolor='white',dpi=120)
fig.savefig(FIG/'01_affordable_share_by_income.svg',facecolor='white')
plt.close(fig)

fig = base('A different picture of price growth',
           'Change from Q1 2019 to Q1 2026\nListing medians and comparable-property prices cover different homes')
ax = fig.add_axes([.29, .39, .61, .31])
for j, metric in enumerate(['median_listing_price_growth_pct', 'fhfa_growth_pct']):
    for name, color, offset in [('Denver', PINE, -.16), ('Boise', EMBER, .16)]:
        v = summary.set_index('metro').loc[name, metric]
        ax.barh(j + offset, v, height=.24, color=color)
        ax.text(v + 2, j + offset, f'+{v:.0f}%', va='center', fontsize=12, color=color, weight='bold')
ax.set(yticks=[0, 1], yticklabels=['Asking-price\nmedian', 'FHFA repeat-sales\nindex'],
       xlim=(0, 100), ylim=(1.55, -.55), xticks=[0, 25, 50, 75, 100])
ax.xaxis.set_major_formatter(PercentFormatter(100, decimals=0))
ax.set_axisbelow(True)
ax.grid(axis='x', color='#E6E8E3', lw=.8)
for sp in ax.spines.values(): sp.set_visible(False)
ax.tick_params(length=0, pad=10)
fig.text(.29, .73, 'Denver', color=PINE, fontsize=12)
fig.text(.51, .73, 'Boise', color=EMBER, fontsize=12)
fig.text(.075, .26, 'Denver’s median listing became smaller', fontsize=15, weight='bold')
fig.text(.075, .20, '2,488 to 1,941 sq ft  (−22%)', color=PINE, fontsize=18)
fig.text(.075, .14, 'Boise: 2,121 to 2,200 sq ft  (+4%)', color=GREY, fontsize=12)
fig.text(.075, .045, 'Sources: Realtor.com Economic Research; FHFA; Lookout West calculations.\nListing prices and sizes: means of Jan–Mar monthly medians. FHFA: seasonally\nadjusted purchase-only single-family index. The gap is not a decomposition.',
         color=GREY, fontsize=7.8, linespacing=1.6)
fig.savefig(FIG / '02_prices_and_listing_size.png', facecolor='white', dpi=120)
fig.savefig(FIG / '02_prices_and_listing_size.svg', facecolor='white')
plt.close(fig)
regional_inputs = pd.read_csv(DATA / 'nar_all_metro_income_shares.csv')
regional = regional_inputs[regional_inputs.metro.isin(scores.metro) & regional_inputs.income.isin([100000,125000])].pivot(index='metro',columns='income',values=['share26','limit'])
regional.columns = [f'{a}_{b}' for a,b in regional.columns]
regional['band_share'] = regional.share26_125000 - regional.share26_100000
regional = regional.sort_values('band_share',ascending=False)
assert len(regional) == 33
assert abs(regional.band_share.median()-16.6) < 1e-8
assert regional.index.get_loc('Boise City, ID') == 5
regional.reset_index().to_csv(DATA/'regional_budget_band_comparison.csv',index=False)
print('Verified income shares, annual changes, regional budget-band comparison and supplementary price/size calculations.')
