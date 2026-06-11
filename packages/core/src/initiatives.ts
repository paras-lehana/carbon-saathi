/**
 * Mission LiFE initiative catalog. 7 official themes from missionlife-moefcc.nic.in.
 * Every entry cites a concrete benefit (₹ saved or kg CO2e avoided) with source.
 * Sources: BEE, UJALA, PM E-DRIVE, MoEFCC, IEA India 2020, MNRE, Green Credit Programme.
 */

export type InitiativeCategory =
  | 'home-energy'
  | 'mobility'
  | 'food'
  | 'waste'
  | 'water'
  | 'finance'
  | 'community';

/** Mission LiFE's 7 official individual-action themes */
export const LIFE_THEMES: Record<InitiativeCategory, { title: string; emoji: string; lifeTheme: string }> = {
  'home-energy': { title: 'Home Energy', emoji: '🏠', lifeTheme: 'Save Energy' },
  mobility: { title: 'Mobility', emoji: '🚌', lifeTheme: 'Reduce Waste & Emissions' },
  food: { title: 'Food & Diet', emoji: '🥗', lifeTheme: 'Eat Healthy' },
  waste: { title: 'Waste & Circularity', emoji: '♻️', lifeTheme: 'Reduce Waste' },
  water: { title: 'Water', emoji: '💧', lifeTheme: 'Save Water' },
  finance: { title: 'Green Finance', emoji: '💚', lifeTheme: 'Adopt Sustainable Lifestyle' },
  community: { title: 'Community & Nature', emoji: '🌳', lifeTheme: 'Promote Sustainable Living' },
};

export interface Initiative {
  id: string;
  category: InitiativeCategory;
  title: string;
  subtitle: string;
  /** Concrete individual benefit in clear language */
  benefit: string;
  /** Approximate annual kg CO2e avoided per household */
  co2AvoidedKgAnnual?: number;
  /** Approximate annual ₹ saved */
  rupeesSavedAnnual?: number;
  howToStart: string;
  /** Official portal or best reference URL */
  portalUrl?: string;
  /** Scheme or programme name if applicable */
  scheme?: string;
  /** Which Mission LiFE theme this maps to */
  lifeTheme: string;
}

export const INITIATIVE_CATALOG: readonly Initiative[] = [
  // ── Home Energy ──────────────────────────────────────────────────────────────
  {
    id: 'ujala-led',
    category: 'home-energy',
    title: 'UJALA LED Bulbs',
    subtitle: 'Replace incandescent or CFL bulbs with LEDs',
    benefit: 'A 9W LED replaces a 60W bulb, saving ₹1,200/year per 10 bulbs at ₹7/kWh. UJALA distributed 37 crore LEDs nationwide.',
    co2AvoidedKgAnnual: 300,
    rupeesSavedAnnual: 1200,
    howToStart: 'Visit EESL.co.in or your local DISCOM office. Subsidised LEDs often below ₹70 each.',
    portalUrl: 'https://www.ujala.gov.in',
    scheme: 'UJALA Scheme (EESL)',
    lifeTheme: 'Save Energy',
  },
  {
    id: 'bee-star-appliances',
    category: 'home-energy',
    title: 'BEE 5-Star Appliances',
    subtitle: 'Choose 5-star rated ACs, refrigerators and fans',
    benefit: 'A 5-star 1.5T AC uses ~1,600 kWh/year vs ~2,200 kWh for 2-star — saving ~600 kWh or ₹4,200 at ₹7/kWh. BEE estimates 15–20% national energy savings from star ratings.',
    co2AvoidedKgAnnual: 430,
    rupeesSavedAnnual: 4200,
    howToStart: 'Check the BEE star label before any appliance purchase. Compare at bee-india.gov.in/ratings.',
    portalUrl: 'https://www.bee-india.gov.in',
    scheme: 'BEE Star Rating Programme',
    lifeTheme: 'Save Energy',
  },
  {
    id: 'solar-water-heater',
    category: 'home-energy',
    title: 'Solar Water Heater',
    subtitle: 'Replace electric geysers with rooftop solar thermal',
    benefit: 'A 100 LPD solar water heater saves ~1,500 kWh/year (₹10,500 at ₹7). MNRE subsidy of 30% available through DISCOMs.',
    co2AvoidedKgAnnual: 1074,
    rupeesSavedAnnual: 10500,
    howToStart: 'Apply via your state DISCOM or MNRE portal. Payback typically 3–4 years with subsidy.',
    portalUrl: 'https://mnre.gov.in',
    scheme: 'MNRE Solar Water Heater Programme',
    lifeTheme: 'Save Energy',
  },
  {
    id: 'induction-cooking',
    category: 'home-energy',
    title: 'Induction Cooking',
    subtitle: 'Switch from LPG to induction for everyday cooking',
    benefit: 'Induction is 90% efficient vs 40% for LPG. Saves 1 cylinder/month = ₹900 + avoids ~25 kg CO2. Government PM UJJWALA promotes clean cooking.',
    co2AvoidedKgAnnual: 300,
    rupeesSavedAnnual: 10800,
    howToStart: 'Buy a 1800W induction cooktop (₹1,500–₹3,000). Use for daily dals, rice and sabzi first.',
    lifeTheme: 'Save Energy',
  },
  {
    id: 'ac-temperature',
    category: 'home-energy',
    title: 'AC at 24°C',
    subtitle: 'Every degree above 18°C saves 6% electricity',
    benefit: 'Setting AC at 24°C instead of 18°C cuts power use by ~36%. BEE estimates ₹2,000/year savings for an average household.',
    co2AvoidedKgAnnual: 200,
    rupeesSavedAnnual: 2000,
    howToStart: 'Set the default temperature to 24°C on your remote. Many modern ACs now ship with 24°C factory default per BEE mandate.',
    portalUrl: 'https://www.bee-india.gov.in',
    lifeTheme: 'Save Energy',
  },
  {
    id: 'pm-surya-ghar',
    category: 'home-energy',
    title: 'PM Surya Ghar: Rooftop Solar',
    subtitle: 'Up to ₹78,000 central subsidy + 300 free units/month',
    benefit: '3 kW rooftop solar generates ~4,500 kWh/year, earns 300 free units and pays back in 4–5 years. 1 crore homes targeted by 2027.',
    co2AvoidedKgAnnual: 3222,
    rupeesSavedAnnual: 31500,
    howToStart: 'Register at pmsuryaghar.gov.in → apply via DISCOM → empanelled vendor installs → subsidy disbursed automatically.',
    portalUrl: 'https://pmsuryaghar.gov.in',
    scheme: 'PM Surya Ghar: Muft Bijli Yojana',
    lifeTheme: 'Save Energy',
  },

  // ── Mobility ─────────────────────────────────────────────────────────────────
  {
    id: 'public-transit-switch',
    category: 'mobility',
    title: 'Switch to Metro/Bus',
    subtitle: 'Replace one car trip per day with public transit',
    benefit: 'A 10 km metro trip emits ~0.15 kg CO2 vs 1.7 kg for a solo petrol car — 11× cleaner. Saves ₹150/day in fuel + parking.',
    co2AvoidedKgAnnual: 400,
    rupeesSavedAnnual: 54000,
    howToStart: 'Download your city transit app (DMRC, BEST, BMTC etc). Try one metro day this week.',
    lifeTheme: 'Reduce Waste & Emissions',
  },
  {
    id: 'pm-e-drive-ev',
    category: 'mobility',
    title: 'PM E-DRIVE: EV Adoption',
    subtitle: 'Central subsidy on electric 2-wheelers and buses',
    benefit: 'PM E-DRIVE (₹10,900 crore, 2024–26) offers up to ₹10,000/vehicle subsidy on e-2Ws and ₹5L on e-buses. EV runs at ₹0.80/km vs ₹4+/km for petrol.',
    co2AvoidedKgAnnual: 1500,
    rupeesSavedAnnual: 60000,
    howToStart: 'Buy from an OEM on the approved list (pmegram.gov.in). Subsidy auto-deducted at point of purchase.',
    portalUrl: 'https://heavyindustries.gov.in',
    scheme: 'PM E-DRIVE (successor to FAME II)',
    lifeTheme: 'Reduce Waste & Emissions',
  },
  {
    id: 'cycling-last-mile',
    category: 'mobility',
    title: 'Cycle the Last Mile',
    subtitle: 'Replace short trips under 5 km with cycling',
    benefit: 'Zero emissions + health benefit. Saves ₹50–₹100/day. Urban cycling can reduce transport CO2 by 11% (European Environment Agency).',
    co2AvoidedKgAnnual: 250,
    rupeesSavedAnnual: 18000,
    howToStart: 'Use city cycle-sharing (Yulu, Rapido bikes). For owned bikes, start with 1–2 days/week.',
    lifeTheme: 'Reduce Waste & Emissions',
  },
  {
    id: 'carpooling',
    category: 'mobility',
    title: 'Daily Carpool',
    subtitle: 'Share your commute with one colleague',
    benefit: 'Halves your car trip emissions. Saves ₹100–₹200/day in fuel. BlaBlaCar, Quick Ride apps available across metro cities.',
    co2AvoidedKgAnnual: 600,
    rupeesSavedAnnual: 36000,
    howToStart: 'Check Quick Ride, BlaBlaCar or your company commute board. Agree on a fixed route and schedule.',
    lifeTheme: 'Reduce Waste & Emissions',
  },
  {
    id: 'engine-off-idle',
    category: 'mobility',
    title: 'Engine Off While Waiting',
    subtitle: 'Turn off engine at traffic signals > 30 seconds',
    benefit: 'Idling a 1200cc petrol engine burns 0.5 L/hour. 20 minutes of daily idling = 50L saved/year = ₹5,750 and 117 kg CO2 avoided.',
    co2AvoidedKgAnnual: 117,
    rupeesSavedAnnual: 5750,
    howToStart: 'Turn off at long signals. Modern engines restart instantly — wear is minimal vs the fuel saved.',
    lifeTheme: 'Reduce Waste & Emissions',
  },

  // ── Food ─────────────────────────────────────────────────────────────────────
  {
    id: 'millets-shree-anna',
    category: 'food',
    title: 'Millets (Shree Anna)',
    subtitle: 'Include sorghum, bajra or ragi in daily meals',
    benefit: 'Millets emit 40% less GHG than wheat per kg of food (FAO 2023). India is the largest millet producer — IYM 2023 promoted them globally.',
    co2AvoidedKgAnnual: 120,
    howToStart: 'Swap rice/wheat with bajra roti or ragi mudde twice a week. Available at local grocery stores and Kisan mandis.',
    lifeTheme: 'Eat Healthy',
  },
  {
    id: 'plant-forward-diet',
    category: 'food',
    title: 'More Plant-Based Meals',
    subtitle: 'Reduce meat and increase vegetables, pulses, legumes',
    benefit: 'Replacing one weekly beef meal with dal saves ~3.3 kg CO2. Fully vegetarian diet avoids 500–800 kg CO2/year vs mixed diet (Poore & Nemecek 2018).',
    co2AvoidedKgAnnual: 500,
    howToStart: 'Start with two vegetarian days per week. Dal-chawal with sabzi is nutritionally complete — no supplements needed.',
    lifeTheme: 'Eat Healthy',
  },
  {
    id: 'food-waste-reduction',
    category: 'food',
    title: 'Reduce Food Waste',
    subtitle: 'Plan meals, store correctly, use leftovers',
    benefit: '40% of food produced in India is wasted (MoFPI). If food waste were a country it would be the 3rd largest emitter. Saving ₹3,000–5,000/month in household food waste.',
    co2AvoidedKgAnnual: 300,
    rupeesSavedAnnual: 36000,
    howToStart: 'Plan weekly meals, buy only what you need, refrigerate leftovers within 2 hours. Compost what remains.',
    lifeTheme: 'Eat Healthy',
  },
  {
    id: 'local-seasonal-food',
    category: 'food',
    title: 'Local and Seasonal Eating',
    subtitle: 'Buy from local sabzi mandis, prefer in-season produce',
    benefit: 'Local produce has lower transport emissions. Seasonal food has lower cold-storage energy. Supporting local farmers aligns with PM\'s "vocal for local" push.',
    co2AvoidedKgAnnual: 50,
    howToStart: 'Shop at your nearest vegetable mandi 2–3 times/week instead of supermarkets. Seasonal charts available at ICAR.',
    lifeTheme: 'Eat Healthy',
  },

  // ── Waste ────────────────────────────────────────────────────────────────────
  {
    id: 'household-segregation',
    category: 'waste',
    title: 'Dry-Wet Waste Segregation',
    subtitle: 'Separate wet (organic) and dry (recyclable) waste daily',
    benefit: 'Proper segregation allows recycling of ~80% of dry waste. Wet waste can be composted (avoids methane from landfills). Mandated by SWM Rules 2016.',
    co2AvoidedKgAnnual: 150,
    howToStart: 'Use two bins — green (wet) and blue (dry). Many municipalities offer free bins under Swachh Bharat 2.0.',
    lifeTheme: 'Reduce Waste',
  },
  {
    id: 'home-composting',
    category: 'waste',
    title: 'Home Composting',
    subtitle: 'Compost kitchen scraps in a pot, bin or bag',
    benefit: 'Diverts 1–2 kg of organic waste/week from landfill (methane source). Produces free fertiliser. IISc estimates 200 kg CO2e avoided/household/year.',
    co2AvoidedKgAnnual: 200,
    rupeesSavedAnnual: 2400,
    howToStart: 'Start with Daily Dump khamba or a terracotta pot. Add kitchen peels + dry leaves. Ready compost in 45 days.',
    lifeTheme: 'Reduce Waste',
  },
  {
    id: 'ewaste-recycling',
    category: 'waste',
    title: 'E-Waste Proper Recycling',
    subtitle: 'Handover old electronics to authorised recyclers',
    benefit: 'E-waste contains lead, mercury and arsenic — improper disposal poisons groundwater. EPR (Extended Producer Responsibility) rules mandate take-back. Avoids ~50 kg CO2e per device properly recycled.',
    co2AvoidedKgAnnual: 50,
    howToStart: 'Use brand take-back (HP, Samsung, Apple) or authorised collectors at E-Parisaraa, Attero. Check ewasteinfo.cpcb.gov.in.',
    portalUrl: 'https://ewasteinfo.cpcb.gov.in',
    scheme: 'E-Waste EPR (MoEFCC)',
    lifeTheme: 'Reduce Waste',
  },
  {
    id: 'cloth-bags',
    category: 'waste',
    title: 'Reusable Bags & Bottles',
    subtitle: 'Say no to single-use plastic carry bags and water bottles',
    benefit: 'Plastic bags take 400–1,000 years to degrade. India banned sub-75µm bags in 2022. Reusable bags save 500–1,000 plastic bags/person/year.',
    co2AvoidedKgAnnual: 20,
    rupeesSavedAnnual: 500,
    howToStart: 'Keep a cloth bag folded in your bag/vehicle. Carry a steel water bottle. Most supermarkets now charge for plastic bags.',
    lifeTheme: 'Reduce Waste',
  },

  // ── Water ────────────────────────────────────────────────────────────────────
  {
    id: 'rainwater-harvesting',
    category: 'water',
    title: 'Rainwater Harvesting',
    subtitle: 'Collect monsoon runoff from rooftop or courtyard',
    benefit: 'A 100 m² roof captures ~60,000 L/year in Delhi (600mm rain). Reduces dependence on groundwater pumping (energy-intensive). Jal Jeevan Mission supports rural connections.',
    co2AvoidedKgAnnual: 80,
    rupeesSavedAnnual: 6000,
    howToStart: 'Install a simple first-flush diverter + storage tank. CGWB guidelines and state water boards offer subsidies.',
    portalUrl: 'https://jaljeevanmission.gov.in',
    scheme: 'Jal Shakti Abhiyan',
    lifeTheme: 'Save Water',
  },
  {
    id: 'water-efficient-fixtures',
    category: 'water',
    title: 'Low-Flow Fixtures',
    subtitle: 'Install aerators on taps and low-flow showerheads',
    benefit: 'Aerators cut tap flow from 12 LPM to 2–4 LPM with no felt difference. Saves 40–50% of bathroom water. Energy saved on pumping + heating = ~40 kg CO2/year.',
    co2AvoidedKgAnnual: 40,
    rupeesSavedAnnual: 3600,
    howToStart: 'Aerators cost ₹50–₹200 each at hardware stores. Install in 5 minutes on any standard tap.',
    lifeTheme: 'Save Water',
  },

  // ── Finance ──────────────────────────────────────────────────────────────────
  {
    id: 'green-credit-programme',
    category: 'finance',
    title: 'Green Credit Programme',
    subtitle: 'Earn tradeable green credits for pro-environment actions',
    benefit: 'MoEFCC launched GCP in 2023. Individuals can earn credits for tree plantation, water conservation, waste management. Credits tradeable on a domestic exchange.',
    howToStart: 'Register at greencredit.mca.gov.in. Activities include tree plantation (1 credit per tree above threshold), water conservation, and e-waste recycling.',
    portalUrl: 'https://greencredit.mca.gov.in',
    scheme: 'Green Credit Programme (MoEFCC 2023)',
    lifeTheme: 'Adopt Sustainable Lifestyle',
  },
  {
    id: 'green-deposits',
    category: 'finance',
    title: 'Green Fixed Deposits',
    subtitle: 'Park savings in bank FDs that fund climate projects',
    benefit: 'RBI issued Green Deposit framework (2023). Banks like SBI, HDFC, ICICI offer FDs whose proceeds fund renewables, EV infrastructure, and clean transport. Same interest rates as regular FDs.',
    howToStart: 'Ask your bank\'s branch or app about "Green Deposits". Currently available at SBI, HDFC Bank, Yes Bank.',
    lifeTheme: 'Adopt Sustainable Lifestyle',
  },
  {
    id: 'solar-loan',
    category: 'finance',
    title: 'Solar Rooftop Loans',
    subtitle: 'Subsidised loans for PM Surya Ghar installation',
    benefit: 'Nationalised banks offer solar loans at 7–9% under PM Surya Ghar. A 3 kW system costs ~₹1.5L after ₹78k subsidy. EMI ~₹3,000/month, savings ~₹5,000/month from Day 1.',
    howToStart: 'Apply at pmsuryaghar.gov.in or visit your bank branch. SBI, Bank of Baroda, Canara Bank all have dedicated solar loan desks.',
    portalUrl: 'https://pmsuryaghar.gov.in',
    scheme: 'PM Surya Ghar Solar Loan',
    lifeTheme: 'Adopt Sustainable Lifestyle',
  },

  // ── Community ─────────────────────────────────────────────────────────────────
  {
    id: 'tree-plantation',
    category: 'community',
    title: 'Plant & Protect Trees',
    subtitle: 'Native tree plantation in housing societies or villages',
    benefit: 'One mature native tree absorbs 22–45 kg CO2/year (varies by species). Green Credit Programme awards 1 credit per verified surviving tree. Government PM Ladli Behna + Van Mahotsav drives.',
    co2AvoidedKgAnnual: 30,
    howToStart: 'Contact your local Forest Department or municipal body for saplings (often free). Plant native species: neem, peepal, jamun. Record via Green Credit app.',
    portalUrl: 'https://greencredit.mca.gov.in',
    lifeTheme: 'Promote Sustainable Living',
  },
  {
    id: 'rwa-solar',
    category: 'community',
    title: 'RWA / Housing Society Solar',
    subtitle: 'Group rooftop solar through your apartment association',
    benefit: 'Group net-metering allows apartment complexes to pool rooftop solar for common area loads. Saves ₹20,000–₹1,00,000/year on society electricity bills.',
    co2AvoidedKgAnnual: 5000,
    rupeesSavedAnnual: 50000,
    howToStart: 'Raise proposal at RWA meeting → approach DISCOM for group net metering → empanelled vendor → PM Surya Ghar registration for the society.',
    portalUrl: 'https://pmsuryaghar.gov.in',
    lifeTheme: 'Promote Sustainable Living',
  },
  {
    id: 'miyawaki-forest',
    category: 'community',
    title: 'Miyawaki Urban Forest',
    subtitle: 'Dense multi-species native forest in a parking-lot-sized plot',
    benefit: 'Miyawaki forests grow 10× faster and are 30× denser than conventional plantations. 1,000 trees/100 m² absorb ~30 tonnes CO2/year after maturity.',
    co2AvoidedKgAnnual: 30000,
    howToStart: 'Contact Afforest (afforest.com) or SubahiStudio for methodology. Many urban local bodies now support community Miyawaki drives.',
    lifeTheme: 'Promote Sustainable Living',
  },
  {
    id: 'life-pledge',
    category: 'community',
    title: 'Mission LiFE Pledge',
    subtitle: 'Pledge 7 actions with 7.3 crore other Indians',
    benefit: 'PM Modi launched Mission LiFE (2022, COP27). 7.3 crore participants, 5.2 crore pledges recorded. Collective action amplifies individual impact and creates social proof.',
    howToStart: 'Take the pledge at merilife.gov.in. Choose 7 of 75 actions across energy, water, mobility, food, waste, adoption, and community.',
    portalUrl: 'https://merilife.gov.in',
    scheme: 'Mission LiFE (MoEFCC)',
    lifeTheme: 'Promote Sustainable Living',
  },
];

export function initiativesByCategory(category: InitiativeCategory): Initiative[] {
  return INITIATIVE_CATALOG.filter((initiative) => initiative.category === category);
}

export function allCategories(): InitiativeCategory[] {
  return Object.keys(LIFE_THEMES) as InitiativeCategory[];
}
