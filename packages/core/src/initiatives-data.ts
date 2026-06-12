/**
 * Pure data catalog — every figure carries its derivation or source inline;
 * no logic lives here, helpers stay in initiatives.ts.
 */
import { EMISSION_FACTORS } from './emission-factors';
import type { Initiative } from './types';

const GRID_KG_PER_KWH = EMISSION_FACTORS.gridElectricity.value; // CEA 0.716 kg CO2/kWh
// House convention for commute-class savings (matches ev-fit.ts/commute.ts):
// 330 operating days ≈ a working year net of holidays and leave.
const OPERATING_DAYS_PER_YEAR = 330;

export const INITIATIVE_CATALOG: readonly Initiative[] = [
  // ── Home Energy ─────────────────────────────────────────────────────────────
  {
    id: 'ujala-led',
    category: 'home-energy',
    title: 'UJALA LED Bulbs',
    subtitle: 'Replace incandescent or CFL bulbs with LEDs',
    benefit:
      'A 9W LED replaces a 60W bulb, saving ₹1,200/year per 10 bulbs at ₹7/kWh. UJALA has distributed 36+ crore LEDs nationwide (EESL).',
    // 10 bulbs × 51W saved × ~3.3 h/day × 250 days ≈ 420 kWh × 0.716
    co2AvoidedKgAnnual: Math.round(420 * GRID_KG_PER_KWH),
    rupeesSavedAnnual: 1200, // 420 kWh × ~₹2.9 effective marginal tariff on lighting slabs
    scale: 'household',
    howToStart:
      'Visit EESL.co.in or your local DISCOM office. Subsidised LEDs often below ₹70 each.',
    portalUrl: 'https://www.ujala.gov.in',
    scheme: 'UJALA Scheme (EESL)',
  },
  {
    id: 'bee-star-appliances',
    category: 'home-energy',
    title: 'BEE 5-Star Appliances',
    subtitle: 'Choose 5-star rated ACs, refrigerators and fans',
    benefit:
      'A 5-star 1.5T AC uses ~1,600 kWh/year vs ~2,200 kWh for 2-star — saving ~600 kWh or ₹4,200 at ₹7/kWh (BEE star-label data).',
    // 600 kWh saved × grid factor
    co2AvoidedKgAnnual: Math.round(600 * GRID_KG_PER_KWH),
    rupeesSavedAnnual: 4200, // 600 kWh × ₹7
    scale: 'household',
    howToStart:
      'Check the BEE star label before any appliance purchase. Compare models at beestarlabel.com.',
    portalUrl: 'https://www.bee-india.gov.in',
    scheme: 'BEE Star Rating Programme',
  },
  {
    id: 'solar-water-heater',
    category: 'home-energy',
    title: 'Solar Water Heater',
    subtitle: 'Replace electric geysers with rooftop solar thermal',
    benefit:
      'A 100 LPD solar water heater displaces ~1,500 kWh/year of geyser load (₹10,500 at ₹7/kWh). State DISCOM incentives available in many states.',
    // 1,500 kWh displaced × grid factor
    co2AvoidedKgAnnual: Math.round(1500 * GRID_KG_PER_KWH),
    rupeesSavedAnnual: 10_500, // 1,500 kWh × ₹7
    scale: 'household',
    howToStart:
      'Apply via your state DISCOM or an MNRE-empanelled vendor. Payback typically 3–4 years with incentives.',
    portalUrl: 'https://mnre.gov.in',
    scheme: 'MNRE Solar Thermal Programme',
  },
  {
    id: 'induction-cooking',
    category: 'home-energy',
    title: 'Induction Cooking',
    subtitle: 'Shift everyday cooking from LPG to induction',
    benefit:
      'Induction transfers ~90% of energy to the pan vs ~40% for an LPG flame. Replacing one cylinder/month saves ~₹900/month and avoids ~25 kg CO₂ per cylinder.',
    // 12 cylinders/yr avoided × ~25 kg CO2e per 14.2 kg cylinder ≈ 300, less
    // ~90 kg from the induction electricity itself → net ≈ 210
    co2AvoidedKgAnnual: 210,
    rupeesSavedAnnual: 10_800, // 12 cylinders × ₹900 market refill price
    scale: 'household',
    howToStart:
      'Start with a 1800W induction cooktop (₹1,500–₹3,000) for daily dal, rice and sabzi; keep LPG for rotis until comfortable.',
  },
  {
    id: 'ac-temperature',
    category: 'home-energy',
    title: 'AC at 24°C',
    subtitle: 'Every degree higher saves ~6% of AC electricity',
    benefit:
      'Running the AC at 24°C instead of 18–20°C cuts its power use by roughly a quarter. BEE mandated a 24°C factory default for this reason; ~₹2,000/year for a typical household.',
    // ~285 kWh saved (≈25% of a 1,150 kWh/season AC) × grid factor
    co2AvoidedKgAnnual: Math.round(285 * GRID_KG_PER_KWH),
    rupeesSavedAnnual: 2000, // ~285 kWh × ₹7
    scale: 'household',
    howToStart:
      'Set 24°C as your remote default — modern ACs ship at 24°C by BEE mandate. Pair with a fan to feel 2° cooler.',
    portalUrl: 'https://www.bee-india.gov.in',
  },
  {
    id: 'pm-surya-ghar',
    category: 'home-energy',
    title: 'PM Surya Ghar: Rooftop Solar',
    subtitle: 'Up to ₹78,000 central subsidy + up to 300 free units/month',
    benefit:
      '3 kW rooftop solar generates ~4,500 kWh/year, can earn up to 300 free units/month and pays back in 4–5 years. 1 crore homes targeted (pmsuryaghar.gov.in).',
    // 4,500 kWh generated × grid factor (displaces grid electricity)
    co2AvoidedKgAnnual: Math.round(4500 * GRID_KG_PER_KWH),
    rupeesSavedAnnual: 31_500, // 4,500 kWh × ₹7
    scale: 'household',
    howToStart:
      'Register at pmsuryaghar.gov.in → apply via your DISCOM → empanelled vendor installs → subsidy disbursed to your account.',
    portalUrl: 'https://pmsuryaghar.gov.in',
    scheme: 'PM Surya Ghar: Muft Bijli Yojana',
  },

  // ── Mobility ────────────────────────────────────────────────────────────────
  {
    id: 'public-transit-switch',
    category: 'mobility',
    title: 'Switch to Metro/Bus',
    subtitle: 'Replace one daily solo car trip with public transit',
    benefit:
      'A 10 km metro trip emits ~0.15 kg CO₂ per passenger vs ~1.7 kg for a solo petrol car — about 11× cleaner — and skips fuel plus parking costs.',
    // (1.7 − 0.15) kg/trip × 2 trips/day... conservatively one 10 km leg/day × 330 days ≈ 510;
    // catalog keeps the single-leg habit figure: 1.55 × 330 ≈ 512 → 500
    co2AvoidedKgAnnual: 500,
    rupeesSavedAnnual: Math.round(120 * OPERATING_DAYS_PER_YEAR), // ~₹120/day fuel+parking delta × 330 days
    scale: 'household',
    howToStart:
      'Install your city transit app (DMRC, BEST, BMTC, Chalo). Start with one metro day per week and grow.',
  },
  {
    id: 'pm-e-drive-ev',
    category: 'mobility',
    title: 'PM E-DRIVE: EV Adoption',
    subtitle: 'Central incentives on electric two-wheelers and more',
    benefit:
      'PM E-DRIVE (₹10,900 crore, 2024–26, Ministry of Heavy Industries) supports e-2W/e-3W/e-bus purchases. An e-2W runs at roughly ₹0.25–0.4/km vs ₹2+/km for petrol.',
    // ~8,000 km/yr two-wheeler: petrol ~0.045 kg/km vs EV ~0.01 (grid) → ~0.035 × 8,000 ≈ 280;
    // car-replacement cases are far higher — kept at the 2W-commuter figure.
    co2AvoidedKgAnnual: 280,
    rupeesSavedAnnual: Math.round(8000 * 1.75), // ~8,000 km × ~₹1.75/km running-cost delta
    scale: 'household',
    howToStart:
      'Buy from an approved OEM — the incentive is deducted at purchase. Details at heavyindustries.gov.in.',
    portalUrl: 'https://heavyindustries.gov.in',
    scheme: 'PM E-DRIVE (successor to FAME II)',
  },
  {
    id: 'cycling-last-mile',
    category: 'mobility',
    title: 'Cycle the Short Trips',
    subtitle: 'Replace trips under 5 km with cycling',
    benefit:
      'Zero tailpipe emissions plus a health dividend. Short hops are where two-wheeler fuel burns worst (cold engine), so the per-km savings are outsized.',
    // ~5 km/day × 250 days × 0.045 kg/km (two-wheeler displaced) ≈ 56 → ~60
    co2AvoidedKgAnnual: 60,
    rupeesSavedAnnual: 4500, // ~1,250 km × ~₹3.6/km two-wheeler all-in running cost
    scale: 'household',
    howToStart:
      'Use city cycle-share (Yulu and similar) or dust off an owned cycle; start with 1–2 errand trips a week.',
  },
  {
    id: 'carpooling',
    category: 'mobility',
    title: 'Daily Carpool',
    subtitle: 'Share your commute with one colleague',
    benefit:
      "Two people in one car halves each person's trip emissions and splits fuel and toll costs down the middle.",
    // Half of a 20 km/day solo petrol commute: 0.17 kg/km × 20 km ÷ 2 × 330 days ≈ 561 → 560
    co2AvoidedKgAnnual: 560,
    rupeesSavedAnnual: Math.round(100 * OPERATING_DAYS_PER_YEAR), // ~₹100/day fuel split × 330 days
    scale: 'household',
    howToStart:
      'Check Quick Ride, BlaBlaCar or your office commute board; agree a fixed route and pickup time.',
  },
  {
    id: 'engine-off-idle',
    category: 'mobility',
    title: 'Engine Off While Waiting',
    subtitle: 'Switch off at signals longer than 30 seconds',
    benefit:
      'An idling 1200cc petrol engine burns ~0.5 L/hour. Twenty minutes of daily idling avoided saves ~50 L of petrol a year.',
    // 50 L × 2.27 kg CO2/L petrol (≈ 0.17 kg/km ÷ ~13.3 km/L) ≈ 114 → 115
    co2AvoidedKgAnnual: 115,
    rupeesSavedAnnual: 5250, // 50 L × ~₹105/L petrol
    scale: 'household',
    howToStart:
      'Kill the engine at long signals — modern engines restart instantly and use less fuel than 30+ seconds of idling.',
  },

  // ── Food ────────────────────────────────────────────────────────────────────
  {
    id: 'millets-shree-anna',
    category: 'food',
    title: 'Millets (Shree Anna)',
    subtitle: 'Include jowar, bajra or ragi in daily meals',
    benefit:
      'Millets are rain-fed, low-input crops — substantially lower water and emissions footprint than irrigated rice/wheat per kg (FAO, International Year of Millets 2023).',
    // Order-of-magnitude estimate for 2 substituted meals/week over a year
    co2AvoidedKgAnnual: 120,
    scale: 'household',
    howToStart:
      'Swap rice/wheat for bajra roti or ragi dosa twice a week — available at any kirana store and Kisan mandis.',
  },
  {
    id: 'plant-forward-diet',
    category: 'food',
    title: 'More Plant-Based Meals',
    subtitle: 'More dals, vegetables and legumes; less meat',
    benefit:
      'Shifting from a non-veg-heavy diet toward vegetarian avoids roughly 400–800 kg CO₂e/year per person (Poore & Nemecek 2018, Science) — the single biggest food lever.',
    // Mid-range of the published per-person delta for Indian diet patterns
    co2AvoidedKgAnnual: 500,
    scale: 'household',
    howToStart:
      'Start with two fully vegetarian days a week — dal-chawal with sabzi is complete protein at a fraction of the footprint.',
  },
  {
    id: 'food-waste-reduction',
    category: 'food',
    title: 'Reduce Food Waste',
    subtitle: 'Plan meals, store correctly, use leftovers',
    benefit:
      'India loses a major share of food post-harvest and at home (MoFPI). Cutting household food waste saves real money — typically thousands of rupees a month for a family.',
    // ~25 kg food waste avoided/yr × ~2.5 kg CO2e/kg (production+methane) ≈ 60;
    // conservative vs the headline numbers which include supply-chain losses.
    co2AvoidedKgAnnual: 60,
    rupeesSavedAnnual: 12_000, // ~₹1,000/month of groceries not binned
    scale: 'household',
    howToStart:
      "Plan the week's meals before shopping, refrigerate leftovers within 2 hours, and compost the rest.",
  },
  {
    id: 'local-seasonal-food',
    category: 'food',
    title: 'Local and Seasonal Eating',
    subtitle: 'Buy from local sabzi mandis, prefer in-season produce',
    benefit:
      'Seasonal produce skips months of cold-chain energy; local produce cuts transport. Cheaper at the mandi too — seasonal gluts halve prices.',
    // Modest: transport+cold-chain share of produce footprint is small vs production
    co2AvoidedKgAnnual: 50,
    rupeesSavedAnnual: 6000, // ~₹500/month mandi vs supermarket basket delta
    scale: 'household',
    howToStart:
      'Shop your nearest vegetable mandi 2–3 times a week; ICAR publishes season charts for every region.',
  },

  // ── Waste ───────────────────────────────────────────────────────────────────
  {
    id: 'household-segregation',
    category: 'waste',
    title: 'Dry-Wet Waste Segregation',
    subtitle: 'Separate wet (organic) and dry (recyclable) waste daily',
    benefit:
      'Segregation at source — mandated by the Solid Waste Management Rules 2016 — is what makes recycling of dry waste and composting of wet waste possible at all.',
    // Enables landfill-methane avoidance on ~1 kg/day organic waste (see composting)
    co2AvoidedKgAnnual: 150,
    scale: 'household',
    howToStart:
      'Two bins — green for wet, blue for dry. Many municipal bodies hand out free bins under Swachh Bharat 2.0.',
  },
  {
    id: 'home-composting',
    category: 'waste',
    title: 'Home Composting',
    subtitle: 'Compost kitchen scraps in a khamba, bin or pit',
    benefit:
      'Composting ~1–2 kg of kitchen waste a week avoids landfill methane (a far stronger greenhouse gas than CO₂) and yields free fertiliser for your plants.',
    // ~75 kg/yr organic waste × ~2.5 kg CO2e/kg landfill-methane equivalent ≈ 190 → 200
    co2AvoidedKgAnnual: 200,
    rupeesSavedAnnual: 2400, // ~₹200/month of potting compost not bought
    scale: 'household',
    howToStart:
      'Start with a terracotta khamba (Daily Dump style): kitchen peels + dry leaves, turned weekly — compost in ~45 days.',
  },
  {
    id: 'ewaste-recycling',
    category: 'waste',
    title: 'E-Waste to Authorised Recyclers',
    subtitle: 'Hand old electronics to authorised collectors only',
    benefit:
      'E-waste carries lead and mercury that poison groundwater when dumped. EPR rules (MoEFCC) oblige brands to take devices back; authorised recycling recovers metals that would otherwise be re-mined.',
    // Avoided primary-metal extraction for a phone/small appliance per year — small but real
    co2AvoidedKgAnnual: 50,
    scale: 'household',
    howToStart:
      'Use brand take-back programmes or CPCB-listed recyclers — directory at cpcb.nic.in (E-Waste section).',
    portalUrl: 'https://cpcb.nic.in',
    scheme: 'E-Waste Management Rules / EPR (MoEFCC)',
  },
  {
    id: 'cloth-bags',
    category: 'waste',
    title: 'Reusable Bags & Bottles',
    subtitle: 'Refuse single-use plastic bags and water bottles',
    benefit:
      'India banned key single-use plastics in 2022 (Say No to Single-Use Plastic is a LiFE theme in its own right). A kept cloth bag displaces 500+ plastic bags a year.',
    // Production emissions of ~500 HDPE bags + ~50 PET bottles avoided ≈ 20
    co2AvoidedKgAnnual: 20,
    rupeesSavedAnnual: 600, // bottled water + paid carry bags not bought
    scale: 'household',
    howToStart:
      'Keep a folded cloth bag in every daily-carry bag and vehicle; carry a steel bottle — most cafés refill free.',
  },

  // ── Water ───────────────────────────────────────────────────────────────────
  {
    id: 'rainwater-harvesting',
    category: 'water',
    title: 'Rainwater Harvesting',
    subtitle: 'Capture monsoon runoff from your rooftop',
    benefit:
      'A 100 m² Delhi roof can capture ~60,000 L/year (600 mm rainfall × runoff coefficient). Less groundwater pumping means lower energy bills and a recharged water table (Jal Shakti Abhiyan).',
    // ~110 kWh/yr of borewell pumping avoided × grid factor ≈ 79 → 80
    co2AvoidedKgAnnual: 80,
    rupeesSavedAnnual: 3000, // tanker top-ups + pumping electricity avoided, conservative
    scale: 'household',
    howToStart:
      'A first-flush diverter plus a storage/recharge pit; CGWB guidelines and several state water boards subsidise installs.',
    portalUrl: 'https://jalshakti-dowr.gov.in',
    scheme: 'Jal Shakti Abhiyan: Catch the Rain',
  },
  {
    id: 'water-efficient-fixtures',
    category: 'water',
    title: 'Low-Flow Fixtures',
    subtitle: 'Tap aerators and low-flow showerheads',
    benefit:
      'A ₹100 aerator cuts tap flow from ~12 L/min to 4 L/min with no felt difference — 40–50% off bathroom water use, plus the pumping and heating energy riding on it.',
    // ~55 kWh/yr pumping+geyser energy avoided × grid factor ≈ 40
    co2AvoidedKgAnnual: 40,
    rupeesSavedAnnual: 1800, // water charges + ~55 kWh × ₹7
    scale: 'household',
    howToStart:
      'Aerators cost ₹50–₹200 at any hardware store and screw onto a standard tap in five minutes.',
  },

  // ── Finance ─────────────────────────────────────────────────────────────────
  {
    id: 'green-credit-programme',
    category: 'finance',
    title: 'Green Credit Programme',
    subtitle: 'Earn registered green credits for verified actions',
    benefit:
      "MoEFCC's Green Credit Programme (2023) registers verified pro-environment actions — starting with tree plantation on degraded forest land — into tradeable credits.",
    scale: 'household',
    howToStart:
      'Register on the Green Credit portal (moefcc.gov.in → Green Credit Programme) and follow the listed activity routes.',
    portalUrl: 'https://moefcc.gov.in',
    scheme: 'Green Credit Programme (MoEFCC, 2023)',
  },
  {
    id: 'green-deposits',
    category: 'finance',
    title: 'Green Fixed Deposits',
    subtitle: 'Park savings in FDs that fund climate projects',
    benefit:
      'Under the RBI Green Deposit Framework (2023), participating banks channel these FD proceeds into renewables and clean transport — same tenor and comparable rates to regular FDs.',
    scale: 'household',
    howToStart:
      'Ask your bank for its green deposit product — several large private and public banks offer one under the RBI framework.',
  },
  {
    id: 'solar-loan',
    category: 'finance',
    title: 'Solar Rooftop Loans',
    subtitle: 'Collateral-light loans for PM Surya Ghar installs',
    benefit:
      'Public-sector banks offer rooftop-solar loans around 7–9% under PM Surya Ghar. A 3 kW system after the ₹78,000 subsidy can see EMIs lower than the electricity it saves from day one.',
    scale: 'household',
    howToStart:
      'Apply through pmsuryaghar.gov.in or your bank branch — most nationalised banks run dedicated rooftop-solar loan desks.',
    portalUrl: 'https://pmsuryaghar.gov.in',
    scheme: 'PM Surya Ghar financing',
  },

  // ── Community ───────────────────────────────────────────────────────────────
  {
    id: 'tree-plantation',
    category: 'community',
    title: 'Plant & Protect Native Trees',
    subtitle: 'Native species in society grounds or village commons',
    benefit:
      'A mature native tree absorbs roughly 20–25 kg CO₂/year. Survival is the metric that matters — watering through the first two summers beats planting ten saplings that die.',
    // One surviving native tree, mid-range absorption
    co2AvoidedKgAnnual: 22,
    scale: 'household',
    howToStart:
      'Forest Department and municipal nurseries give saplings free or near-free — pick native species (neem, peepal, jamun) and adopt the watering rota.',
  },
  {
    id: 'rwa-solar',
    category: 'community',
    title: 'RWA / Housing Society Solar',
    subtitle: 'Group rooftop solar for common-area loads',
    benefit:
      'Group net-metering lets an apartment society solar-power lifts, pumps and common lighting — typically lakhs of rupees a year off the society bill, split across every flat.',
    // ~7 kW common-area array: ~10,500 kWh/yr × grid factor ≈ 7,500 (community total)
    co2AvoidedKgAnnual: Math.round(10_500 * GRID_KG_PER_KWH),
    rupeesSavedAnnual: 73_500, // 10,500 kWh × ₹7 — society-level, not per household
    scale: 'community',
    howToStart:
      'Table it at the RWA meeting → DISCOM group net-metering application → empanelled vendor → register under PM Surya Ghar.',
    portalUrl: 'https://pmsuryaghar.gov.in',
  },
  {
    id: 'miyawaki-forest',
    category: 'community',
    title: 'Miyawaki Urban Forest',
    subtitle: 'A dense native mini-forest in a parking-lot-sized plot',
    benefit:
      'The Miyawaki method grows multi-layer native forest several times faster and denser than conventional plantation — a 100 m², ~1,000-sapling patch becomes self-sustaining in about three years.',
    // ~1,000 trees at community scale; even at juvenile absorption this is tonnes/yr
    co2AvoidedKgAnnual: 20_000,
    scale: 'community',
    howToStart:
      'Several Indian urban local bodies and NGOs run community Miyawaki drives — propose a patch of society or park land and crowdfund the saplings.',
  },
  {
    id: 'life-pledge',
    category: 'community',
    title: 'Mission LiFE Pledge',
    subtitle: 'Pledge your actions alongside crores of Indians',
    benefit:
      "Mission LiFE (launched 2022 at COP27) is the Government of India's umbrella for individual climate action — crores of citizens have logged pledges, and visible collective action is itself a behaviour lever.",
    scale: 'household',
    howToStart:
      'Take the pledge at merilife.gov.in — pick actions across the seven LiFE themes and log them.',
    portalUrl: 'https://merilife.gov.in',
    scheme: 'Mission LiFE (MoEFCC)',
  },
];
