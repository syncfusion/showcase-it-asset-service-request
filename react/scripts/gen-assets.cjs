// One-off generator for src/data/assets.json (not shipped in the bundle).
// Run with: node scripts/gen-assets.cjs
//
// Emits a deterministic, fully populated fixture: every (type, status)
// pair has real coverage and every location appears under every type.
// Output is byte-identical across runs (fixed xorshift32 seed, no
// Math.random). The shape matches `src/types/assets.ts` (AssetsFixture).

const fs = require('fs');
const path = require('path');

const types = ['Laptop', 'Monitor', 'Phone', 'Peripheral'];
const statuses = ['InUse', 'Available', 'InRepair', 'Retired'];
const locations = [
  'HQ · Floor 3',
  'West campus',
  'Remote',
  'Depot · Repair bay',
  'Archive · Bay 2',
];
const icons = {
  Laptop: 'laptop',
  Monitor: 'monitor',
  Phone: 'smartphone',
  Peripheral: 'headphones',
};

// Title pools per type. Cycled independently per type so each type gets
// its own full roster of models (no cross-type title bleed).
const modelPools = {
  Laptop: [
    'MacBook Pro 14" (M3)',
    'MacBook Air 13" (M2)',
    'ThinkPad T14 Gen 3',
    'ThinkPad X1 Carbon Gen 11',
    'Dell XPS 13',
    'HP EliteBook 840',
    'Surface Laptop 5',
    'Razer Blade 14',
    'Framework Laptop 13',
    'Lenovo Yoga 9i',
  ],
  Monitor: [
    'Dell UltraSharp 27"',
    'LG 4K 27" UltraFine',
    'BenQ PD2725U',
    'Samsung ViewFinity S8',
    'Apple Studio Display 27"',
    'Eizo FlexScan EV2785',
    'Acer ConceptD CP7',
    'HP Z27q G3',
  ],
  Phone: [
    'iPhone 13',
    'iPhone 14',
    'iPhone 15 Pro',
    'Pixel 8',
    'Galaxy S23',
    'Galaxy A55',
    'OnePlus 11',
    'Motorola Edge 40',
  ],
  Peripheral: [
    'Logitech MX Master 3S',
    'Keychron K3 Pro',
    'AirPods Pro 2',
    'Sony WH-1000XM5',
    'Bose QC45',
    'Sennheiser Momentum 4',
    'Apple Magic Trackpad',
    'Logitech MX Keys',
    'Webcam C920',
    'USB-C Hub',
  ],
};

const firstNames = [
  'Dana','Neil','Maya','Carlos','Aisha','Tomas','Priya','Ethan','Lina','Ravi',
  'Sofia','Jin','Hannah','Marcus','Lila','Owen','Yara','Mateo','Naomi','Felix',
  'Ines','Kai','Zara','Asha','Liam','Nora','Pablo','Quinn','Rosa','Sven',
  'Tariq','Uma','Vera','Will','Xochi','Yusuf','Zane','Ada','Ben','Cleo',
  'Dax','Eve','Finn','Gia','Hugo','Iris','Jude','Kira','Levi','Mae',
];
const lastNames = [
  'Quinn','Iyer','Ruiz','Patel','Khan','Nakamura','Sharma','Chen','Garcia','Singh',
  'Park','Reyes','Lopez','Okafor','Tan','Kato','Ali','Wong','Cohen','Diaz',
  'Mendez','Wright','Hassan','Yilmaz','Sato','Muller','Bianchi','Romero','Sanders','Petrov',
  'Andersson','Olsen','Sorensen','Costa','Vargas','Jensen','Adler','Bauer','Becker','Fischer',
  'Klein','Koch','Lang','Maier','Mayer','Pfeiffer','Roth','Schmitt','Wagner','Weber',
];

// Per (type, status) row counts. Totals ~210 to match prior density.
// InUse skews high (the "fleet" in service), Retired is a tail, InRepair
// is a smaller depot queue. Distribution is balanced across all four
// types so the matrix is fully populated.
const plan = [
  // Laptops — 96
  { type: 'Laptop',    status: 'InUse',     count: 48 },
  { type: 'Laptop',    status: 'Available', count: 24 },
  { type: 'Laptop',    status: 'InRepair',  count: 12 },
  { type: 'Laptop',    status: 'Retired',   count: 12 },
  // Monitors — 54
  { type: 'Monitor',   status: 'InUse',     count: 20 },
  { type: 'Monitor',   status: 'Available', count: 14 },
  { type: 'Monitor',   status: 'InRepair',  count: 12 },
  { type: 'Monitor',   status: 'Retired',   count:  8 },
  // Phones — 31
  { type: 'Phone',     status: 'InUse',     count: 10 },
  { type: 'Phone',     status: 'Available', count:  8 },
  { type: 'Phone',     status: 'InRepair',  count:  8 },
  { type: 'Phone',     status: 'Retired',   count:  5 },
  // Peripherals — 29
  { type: 'Peripheral',status: 'InUse',     count:  8 },
  { type: 'Peripheral',status: 'Available', count:  8 },
  { type: 'Peripheral',status: 'InRepair',  count:  5 },
  { type: 'Peripheral',status: 'Retired',   count:  8 },
];

// Deterministic PRNG (xorshift32) so the JSON is byte-identical across
// runs. Same seed as before to keep diffs small.
let _rngState = 0xC0FFEE;
function rand() {
  let x = _rngState | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  _rngState = x | 0;
  // map to [0, 1)
  return ((x >>> 0) / 0x100000000);
}

// Reproducible serial: "SN-" + 10 uppercase alphanumerics.
function serial() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = 'SN-';
  for (let i = 0; i < 10; i++) out += alphabet[Math.floor(rand() * alphabet.length)];
  return out;
}

const ownerName = (i) =>
  firstNames[i % firstNames.length] + ' ' + lastNames[(i * 7) % lastNames.length];
const initialsOf = (n) => {
  const p = n.split(' ');
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
};

// Build a shuffled purchased-date pool that covers the full age range
// (current year down to current year - 6) and is spread across all
// types — not just the first 27 entries.
const purchasedPool = (() => {
  const yr = new Date().getFullYear();
  const dates = [];
  for (let yOff = 0; yOff <= 6; yOff++) {
    for (let m = 0; m < 12; m++) {
      for (let d = 0; d < 7; d++) {
        const y = yr - yOff;
        const mm = String(m + 1).padStart(2, '0');
        const dd = String(d * 4 + 1).padStart(2, '0');
        if (y > yr) continue;
        dates.push(`${y}-${mm}-${dd}`);
      }
    }
  }
  // Fisher-Yates shuffle with the deterministic PRNG.
  for (let i = dates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [dates[i], dates[j]] = [dates[j], dates[i]];
  }
  return dates;
})();

// Per-type model index. Each type walks its own pool so Monitors never
// surface a Laptop title (the prior bug used a shared counter).
const modelIndex = { Laptop: 0, Monitor: 0, Phone: 0, Peripheral: 0 };

const assets = [];
let serialId = 0;
let ownerId = 0;
let purchaseIdx = 0;

for (const { type, status, count } of plan) {
  const pool = modelPools[type];
  for (let i = 0; i < count; i++) {
    // Round-robin the model pool per type.
    const title = pool[modelIndex[type] % pool.length];
    modelIndex[type]++;

    // Round-robin locations so every (type, status) sees all five.
    const location = locations[(serialId + i) % locations.length];

    // Owners: only InUse rows get a named owner; everything else is
    // the sentinel "Unassigned" (matches the AssetOwner contract).
    const owner =
      status === 'InUse'
        ? (() => {
            const n = ownerName(ownerId++);
            return { name: n, initials: initialsOf(n) };
          })()
        : { name: 'Unassigned', initials: '' };

    const id = 'A-' + String(serialId + 1).padStart(5, '0');
    const sn = serial();
    assets.push({
      id,
      title,
      sub: `${id} · SN ${sn}`,
      type,
      status,
      owner,
      location,
      purchased: purchasedPool[purchaseIdx % purchasedPool.length],
      icon: icons[type],
    });
    serialId++;
    purchaseIdx++;
  }
}

const data = {
  assets,
  filterOptions: { status: statuses, type: types, location: locations, aging: true },
};
const out = path.resolve(__dirname, '..', 'src', 'data', 'assets.json');
fs.writeFileSync(out, JSON.stringify(data, null, 2));
console.log('Wrote', assets.length, 'assets to', out);
