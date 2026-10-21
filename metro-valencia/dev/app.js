const CATALOG = [
  ["182", "Aeroport"], ["190", "Alacant"], ["69", "Alameda"], ["60", "Albalat dels Sorells"],
  ["2", "Alberic"], ["79", "Alboraia Palmaret"], ["56", "Alboraia Peris Aragó"], ["128", "Alfauir"],
  ["9", "Alginet"], ["57", "Almàssera"], ["192", "Amado Granell - Montolivet"], ["121", "Amistat"],
  ["25", "Àngel Guimerà"], ["110", "À Punt"], ["120", "Aragó"], ["8", "Ausiàs March"],
  ["73", "Av. del Cid"], ["122", "Ayora"], ["108", "Bailén"], ["53", "Benaguasil"],
  ["82", "Benicalap"], ["28", "Beniferri"], ["67", "Benimaclet"], ["41", "Benimàmet"],
  ["6", "Benimodo"], ["39", "Bétera"], ["94", "Beteró"], ["30", "Burjassot"],
  ["31", "Burjassot - Godella"], ["99", "Cabanyal"], ["43", "Campament"], ["27", "Campanar"],
  ["103", "Campus"], ["40", "Cantereria"], ["127", "Canyamelar"], ["7", "Carlet"],
  ["1", "Castelló"], ["194", "Ciutat Arts i Ciències - Justícia"], ["16", "Col·legi El Vedat"], ["70", "Colón"],
  ["98", "Dr. Lluch"], ["48", "El Clot"], ["29", "Empalme"], ["65", "Entrepins"],
  ["11", "Espioca"], ["130", "Estadi Ciutat de València"], ["68", "Facultats - Manuel Broseta"], ["177", "Faitanar"],
  ["100", "Fira València"], ["80", "Florista"], ["59", "Foios"], ["52", "Fondo de Benaguasil"],
  ["10", "Font Almaguer"], ["198", "Font del Barranc"], ["124", "Francesc Cubells"], ["45", "Fuente del Jarro"],
  ["119", "Gallipont - Torre del Virrei"], ["81", "Garbí"], ["32", "Godella"], ["125", "Grau - La Marina"],
  ["38", "Horta Vella"], ["23", "Jesús"], ["95", "La Cadena"], ["46", "La Canyada"],
  ["92", "La Carrasca"], ["113", "La Coma"], ["183", "La Cova"], ["105", "La Granja"],
  ["5", "L'Alcúdia"], ["63", "La Pobla de Farnals"], ["51", "La Pobla de Vallbona"], ["184", "La Presa"],
  ["47", "La Vallesa"], ["50", "L'Eliana"], ["42", "Les Carolines - Fira"], ["54", "Llíria"],
  ["115", "Ll. Llarga - Terramelar"], ["66", "Machado"], ["180", "Manises"], ["123", "Marítim"],
  ["84", "Marxalenes"], ["114", "Mas del Rosari"], ["185", "Masia de Traver"], ["37", "Masies"],
  ["3", "Massalavés"], ["62", "Massamagrell"], ["34", "Massarrojos"], ["58", "Meliana"],
  ["75", "Mislata"], ["76", "Mislata Almassil"], ["35", "Moncada - Alfara"], ["49", "Montesol"],
  ["4", "Montortal"], ["196", "Moreres"], ["61", "Museros"], ["197", "Natzaret"],
  ["126", "Neptú"], ["74", "Nou d'Octubre"], ["195", "Oceanogràfic"], ["12", "Omet"],
  ["129", "Orriols"], ["19", "Paiporta"], ["55", "Palau de Congressos"], ["111", "Parc Científic"],
  ["44", "Paterna"], ["22", "Patraix"], ["18", "Picanya"], ["13", "Picassent"],
  ["97", "Platja les Arenes"], ["96", "Platja Malva-rosa"], ["24", "Pl. Espanya"], ["87", "Pont de Fusta"],
  ["178", "Quart de Poblet"], ["193", "Quatre Carreres"], ["64", "Rafelbunyol"], ["15", "Realón"],
  ["85", "Reus"], ["186", "Riba-roja de Túria"], ["33", "Rocafort"], ["181", "Roses"],
  ["191", "Russafa"], ["21", "Safranar"], ["86", "Sagunt"], ["179", "Salt de l'Aigua"],
  ["77", "Santa Rita"], ["78", "Sant Isidre"], ["104", "Sant Joan"], ["131", "Sant Miquel dels Reis"],
  ["14", "Sant Ramon"], ["36", "Seminari - CEU"], ["93", "Tarongers - Ernest Lluch"], ["112", "Tomás y Valiente"],
  ["17", "Torrent"], ["107", "Torrent Avinguda"], ["132", "Tossal del Rei"], ["83", "Trànsits"],
  ["88", "Trinitat"], ["26", "Túria"], ["91", "Universitat Politècnica"], ["188", "València la Vella"],
  ["20", "València Sud"], ["102", "Vicent Andrés Estellés"], ["90", "Vicente Zaragozá"], ["71", "Xàtiva"],
];

function fold(value) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function slugify(value) {
  return fold(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const usedIds = new Map();
const STATIONS = CATALOG.map(([code, name]) => {
  let id = slugify(name);
  if (usedIds.has(id)) id = `${id}-${code}`;
  usedIds.set(id, code);
  return { id, tab: name, code, page: `https://horariosvlc.es/metro/estacion/${id}` };
});

const DEFAULT_SLOTS = ["angel-guimera"];

const LINE_COLORS = {
  1: ["#E4BE36", "#fff"],
  2: ["#B4397F", "#fff"],
  3: ["#B11D2F", "#fff"],
  4: ["#2B498B", "#fff"],
  5: ["#4E886D", "#fff"],
  6: ["#817FB3", "#fff"],
  7: ["#E86F1A", "#fff"],
  8: ["#96C4DA", "#fff"],
  9: ["#A47E52", "#fff"],
  10: ["#B6DD79", "#fff"],
};

const GEO_TEXT = `
190 -0.37739 39.46358 10
191 -0.36953 39.46391 10
119 -0.54192 39.56866 2
51 -0.56228 39.58276 2
52 -0.57808 39.59272 2
53 -0.58393 39.59888 2
1 -0.51601 39.08401 1
2 -0.52353 39.11705 1
3 -0.51876 39.14381 1
4 -0.51589 39.1738 1
7 -0.52494 39.2268 1
8 -0.49198 39.24956 1
9 -0.47489 39.26294 1
10 -0.46409 39.28941 1
11 -0.46675 39.32188 1
12 -0.47369 39.35324 1
13 -0.46486 39.36304 1
14 -0.46726 39.38486 1
196 -0.33841 39.45015 10
40 -0.41207 39.50238 2
198 -0.47166 39.5169 2
5 -0.51026 39.19381 1
6 -0.51962 39.21629 1
192 -0.36511 39.45937 10
193 -0.36013 39.45245 10
194 -0.35322 39.45259 10
195 -0.34734 39.45204 10
77 -0.45511 39.50566 2
45 -0.46452 39.51117 2
46 -0.48712 39.52681 2
47 -0.49798 39.53784 2
65 -0.51395 39.54334 2
48 -0.52799 39.54987 2
49 -0.5317 39.55557 2
15 -0.46401 39.39391 1
16 -0.46065 39.42313 1
24 -0.38163 39.4662 1,2
26 -0.39121 39.47887 1,2
27 -0.39504 39.48463 1,2
28 -0.39934 39.49103 1,2
197 -0.33467 39.44989 10
30 -0.40674 39.50842 1
31 -0.412 39.51353 1
32 -0.41446 39.5195 1
33 -0.40758 39.52871 1
34 -0.40288 39.53661 1
41 -0.41941 39.50188 2
186 -0.55944 39.54334 9
185 -0.54667 39.53806 9
188 -0.53421 39.53048 9
184 -0.51583 39.51722 9
183 -0.48444 39.49889 9
42 -0.42542 39.49874 2
43 -0.43532 39.49585 2
44 -0.44197 39.49881 2
50 -0.53592 39.56183 2
107 -0.47283 39.43181 2,7
17 -0.46099 39.43465 1,2,7
18 -0.43716 39.43312 1,2,7
19 -0.41806 39.43226 1,2,7
20 -0.41065 39.44081 1,2,7
108 -0.37942 39.46398 7
78 -0.4028 39.45103 1,2,7
21 -0.39838 39.45457 1,2,7
22 -0.39051 39.45645 1,2,7
23 -0.38454 39.4592 1,2,7
35 -0.38846 39.54353 1
36 -0.38974 39.54999 1
37 -0.40538 39.56658 1
38 -0.44314 39.58193 1
39 -0.45753 39.59061 1
120 -0.35812 39.47263 5,7
121 -0.35039 39.47033 5,7
122 -0.34297 39.46643 5,7
182 -0.47492 39.49237 3,5
181 -0.46724 39.49265 3,5,9
180 -0.45907 39.48959 3,5,9
179 -0.45057 39.48483 3,5,9
178 -0.44188 39.48109 3,5,9
177 -0.43318 39.47762 3,5,9
76 -0.42437 39.47601 3,5,9
75 -0.41831 39.47382 3,5,9
74 -0.40763 39.47066 3,5,9
73 -0.39757 39.46822 3,5,9
71 -0.37738 39.46719 3,5,9
70 -0.37093 39.47015 3,5,7,9
69 -0.36532 39.47316 3,5,7,9
68 -0.36191 39.478 3,5,7,9
79 -0.35522 39.49566 3,9
57 -0.35427 39.51226 3
58 -0.35182 39.52803 3
59 -0.35387 39.53722 3
60 -0.34829 39.54527 3
61 -0.34086 39.56158 3
62 -0.33303 39.57056 3
63 -0.33044 39.57942 3
25 -0.38504 39.4703 1,2,3,5,9
56 -0.35233 39.50076 3,9
66 -0.35879 39.49243 3,5,7,9
64 -0.33106 39.58852 3
54 -0.59028 39.62284 2
87 -0.37318 39.48178 4
86 -0.37497 39.4865 4
85 -0.38171 39.48597 4
84 -0.38384 39.48797 4
83 -0.38726 39.48956 4
82 -0.39093 39.49003 4
81 -0.39451 39.49229 4
80 -0.39682 39.49443 4
55 -0.40014 39.49718 4
29 -0.40211 39.49958 1,2,4
105 -0.41248 39.50403 4
104 -0.41632 39.50529 4
103 -0.41746 39.50722 4
102 -0.41988 39.50856 4
110 -0.42475 39.5122 4
111 -0.42262 39.51514 4
112 -0.42564 39.51977 4
113 -0.43171 39.52157 4
94 -0.3342 39.47659 4,6
93 -0.33962 39.47814 4,6
92 -0.34482 39.47966 4,6
91 -0.3505 39.48132 4,6
90 -0.35795 39.48337 4,6
67 -0.36233 39.48485 3,4,5,6,7,9
88 -0.36776 39.48627 4,6
128 -0.36603 39.4893 6
129 -0.36766 39.49315 6
130 -0.36554 39.49492 6
131 -0.36849 39.49722 6
98 -0.32815 39.46931 4,6
99 -0.32758 39.47285 4,6
123 -0.33824 39.46494 5,6,7,8
124 -0.33397 39.46325 6,8
125 -0.32947 39.4631 6,8
127 -0.32793 39.46652 6,8
132 -0.37254 39.49595 6
114 -0.43582 39.52496 4
115 -0.43045 39.5099 4
95 -0.32937 39.4752 4,6,8
96 -0.32573 39.47369 4,6,8
97 -0.32573 39.46893 4,6,8
126 -0.32585 39.46325 8
100 -0.42549 39.50414 4
`;

const REFRESH_MS = 45_000;
const app = document.querySelector("#app");
const status = document.querySelector("#status");
const panel = document.querySelector("#panel");
const dock = document.querySelector(".tabs");
const mapEl = document.querySelector("#map");
const mapScroll = document.querySelector("#map-scroll");
const mapHint = document.querySelector("#map-hint");
const planoImg = document.querySelector("#plano-img");
const planoHits = document.querySelector("#plano-hits");
const slotEls = [...document.querySelectorAll(".slot")];
const recentEl = document.querySelector("#recent");
const cache = new Map();
let activeId = DEFAULT_SLOTS[0];
let view = null;
const loadedDock = readSlots();
let slots = loadedDock.slots;
let recent = readRecent(loadedDock.seed);

function stationById(id) {
  return STATIONS.find((station) => station.id === id);
}

function stationFromHash() {
  const id = location.hash.replace("#", "");
  if (stationById(id)) return id;
  return slots.find(Boolean) || DEFAULT_SLOTS[0];
}

function keptId(id) {
  return id && stationById(id) ? id : null;
}

function readSlots() {
  try {
    const saved = JSON.parse(localStorage.getItem("metro-valencia-slots"));
    if (Array.isArray(saved) && saved.length) {
      const ids = saved.map(keptId);
      const kept = saved.length >= 4 ? ids[2] : ids[0];
      const displaced = saved.length >= 4 ? [ids[3], ids[0], ids[1]] : ids.slice(1);
      return { slots: [kept || DEFAULT_SLOTS[0]], seed: displaced };
    }
  } catch { /* keep the home station */ }
  return { slots: [...DEFAULT_SLOTS], seed: [] };
}

function normalizeRecent(ids) {
  const seen = new Set();
  const next = [];
  for (const id of ids) {
    if (!id || seen.has(id) || slots.includes(id) || !stationById(id)) continue;
    seen.add(id);
    next.push(id);
    if (next.length === 4) break;
  }
  return next;
}

function readRecent(seed) {
  let saved = [];
  try {
    const raw = JSON.parse(localStorage.getItem("metro-valencia-recent"));
    if (Array.isArray(raw)) saved = raw.map(keptId);
  } catch { /* keep stations that left the extra button */ }
  return normalizeRecent([...seed, ...saved]);
}

function saveSlots() {
  try { localStorage.setItem("metro-valencia-slots", JSON.stringify(slots)); } catch { /* private mode */ }
}

function saveRecent() {
  try { localStorage.setItem("metro-valencia-recent", JSON.stringify(recent)); } catch { /* private mode */ }
}

function remember(id) {
  recent = normalizeRecent(id ? [id, ...recent] : recent);
  saveRecent();
  paintRecent();
}

function ensureSlot(id) {
  if (!stationById(id) || slots.includes(id)) return;
  let index = slots.findIndex((slotId) => !slotId);
  if (index === -1) index = slots.findIndex((slotId) => slotId !== activeId);
  if (index === -1) index = 0;
  const previous = slots[index];
  slots[index] = id;
  saveSlots();
  remember(previous);
  paintSlot(index);
}

function paintSlot(index) {
  const station = stationById(slots[index]);
  const slot = slotEls[index];
  const tab = slot.querySelector(".tab");
  const find = slot.querySelector(".find");
  if (!station) {
    slot.classList.add("is-empty");
    tab.dataset.station = "";
    tab.id = `tab-empty-${index}`;
    tab.textContent = "Estación";
    tab.removeAttribute("title");
    tab.setAttribute("aria-selected", "false");
    find.setAttribute("aria-label", "Buscar estación");
    return;
  }
  slot.classList.remove("is-empty");
  tab.dataset.station = station.id;
  tab.id = `tab-${station.id}`;
  tab.textContent = station.tab;
  tab.title = station.tab;
  find.setAttribute("aria-label", `Buscar estación en lugar de ${station.tab}`);
}

function recentButton(id) {
  const station = stationById(id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "recent-stop";
  button.textContent = station.tab;
  button.title = station.tab;
  button.disabled = !navigator.onLine;
  button.addEventListener("click", () => recall(station));
  return button;
}

function paintRecent() {
  recent = normalizeRecent(recent);
  const rows = [];
  for (let index = 0; index < recent.length; index += 2) rows.push(recent.slice(index, index + 2));
  const body = document.createElement("tbody");
  rows.forEach((pair) => {
    const cell = document.createElement("td");
    const line = document.createElement("div");
    line.className = "recent-pair";
    pair.forEach((id) => line.append(recentButton(id)));
    cell.append(line);
    const row = document.createElement("tr");
    row.append(cell);
    body.append(row);
  });
  recentEl.replaceChildren(body);
  recentEl.hidden = recent.length === 0;
}

function recall(station) {
  const index = slotEls.findIndex((slot) => slot.querySelector(".tab").getAttribute("aria-selected") === "true");
  assignSlot(index === -1 ? 0 : index, station);
}

function matchingStations(query) {
  const folded = fold(query.trim());
  if (!folded) return [];
  return STATIONS
    .filter((station) => fold(station.tab).includes(folded))
    .sort((a, b) => fold(a.tab).indexOf(folded) - fold(b.tab).indexOf(folded) || a.tab.localeCompare(b.tab, "es"));
}

const GEO = new Map(GEO_TEXT.trim().split("\n").filter(Boolean).map((line) => {
  const [code, lon, lat, lines] = line.trim().split(/\s+/);
  return [code, { lon: Number(lon), lat: Number(lat), lines: lines.split(",").map(Number) }];
}));

const SVG_NS = "http://www.w3.org/2000/svg";
let mapReady = false;
let mapCursor = 0;
const stopNodes = new Map();

function svgEl(name, attrs) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

const MAP_W = 4300;
const MAP_H = 6166;

const SPOTS = [
  ["54", 1295, 201, 1505, 273],
  ["186", 350, 296, 642, 445],
  ["53", 1162, 299, 1477, 380],
  ["39", 2856, 364, 3066, 442],
  ["52", 871, 382, 1477, 477],
  ["38", 2853, 464, 3172, 545],
  ["185", 200, 470, 648, 546],
  ["51", 878, 476, 1477, 562],
  ["37", 2844, 559, 3054, 634],
  ["188", 186, 560, 648, 643],
  ["119", 1043, 568, 1478, 658],
  ["114", 2037, 651, 2420, 760],
  ["36", 2839, 656, 3280, 745],
  ["184", 404, 663, 652, 735],
  ["115", 1618, 682, 1950, 824],
  ["50", 1258, 683, 1477, 755],
  ["64", 3639, 689, 4026, 771],
  ["35", 2836, 751, 3314, 843],
  ["183", 415, 758, 655, 830],
  ["113", 2038, 764, 2298, 860],
  ["49", 1206, 780, 1477, 852],
  ["63", 3640, 785, 4190, 857],
  ["34", 2830, 847, 3173, 939],
  ["112", 2034, 857, 2509, 956],
  ["48", 1273, 876, 1483, 948],
  ["62", 3640, 883, 4031, 964],
  ["33", 2824, 944, 3083, 1023],
  ["111", 2038, 956, 2424, 1060],
  ["65", 1199, 974, 1479, 1053],
  ["61", 3640, 980, 3887, 1052],
  ["32", 2817, 1041, 3053, 1117],
  ["47", 1192, 1068, 1477, 1140],
  ["60", 3637, 1074, 4184, 1146],
  ["182", 206, 1085, 486, 1162],
  ["110", 2059, 1092, 2269, 1159],
  ["31", 2813, 1137, 3353, 1231],
  ["102", 2176, 1159, 2412, 1260],
  ["46", 1155, 1155, 1477, 1247],
  ["59", 3605, 1172, 3815, 1244],
  ["100", 1622, 1201, 1883, 1344],
  ["30", 2807, 1232, 3081, 1314],
  ["45", 1037, 1253, 1479, 1332],
  ["58", 3629, 1269, 3857, 1341],
  ["181", 393, 1346, 603, 1418],
  ["77", 1179, 1358, 1477, 1430],
  ["57", 3629, 1362, 3931, 1437],
  ["103", 1983, 1378, 2231, 1454],
  ["44", 1240, 1456, 1478, 1528],
  ["104", 1892, 1465, 2175, 1537],
  ["180", 352, 1528, 588, 1600],
  ["43", 1117, 1555, 1480, 1631],
  ["105", 1804, 1556, 2079, 1636],
  ["42", 940, 1646, 1477, 1718],
  ["179", 374, 1676, 589, 1829],
  ["41", 1145, 1741, 1480, 1813],
  ["40", 1168, 1839, 1477, 1911],
  ["178", 321, 1860, 590, 2002],
  ["56", 3639, 1897, 3985, 2050],
  ["29", 1196, 1936, 1480, 2016],
  ["55", 1767, 2005, 2114, 2158],
  ["28", 1228, 2095, 1478, 2167],
  ["132", 2823, 2116, 3238, 2188],
  ["79", 3646, 2180, 3915, 2324],
  ["131", 3006, 2226, 3348, 2368],
  ["27", 1173, 2230, 1481, 2306],
  ["177", 502, 2238, 743, 2310],
  ["80", 1601, 2260, 1820, 2332],
  ["76", 414, 2346, 848, 2422],
  ["81", 1723, 2350, 1933, 2422],
  ["26", 1294, 2354, 1504, 2426],
  ["130", 2560, 2434, 2935, 2576],
  ["82", 1715, 2443, 2004, 2523],
  ["75", 746, 2463, 956, 2535],
  ["83", 1860, 2532, 2094, 2604],
  ["66", 3501, 2571, 3779, 2643],
  ["74", 632, 2572, 1065, 2647],
  ["129", 2616, 2616, 2826, 2688],
  ["84", 1859, 2624, 2185, 2696],
  ["73", 810, 2686, 1171, 2759],
  ["25", 1428, 2717, 1859, 2808],
  ["85", 2096, 2717, 2306, 2789],
  ["128", 2510, 2727, 2720, 2799],
  ["86", 2150, 2810, 2368, 2887],
  ["24", 724, 2855, 1132, 2943],
  ["71", 1555, 2862, 1765, 2934],
  ["87", 2021, 2975, 2418, 3047],
  ["108", 1167, 3053, 1377, 3126],
  ["88", 2421, 3079, 2640, 3151],
  ["70", 1856, 3164, 2066, 3236],
  ["67", 2907, 3167, 3237, 3239],
  ["190", 1209, 3232, 1449, 3304],
  ["90", 3062, 3258, 3337, 3341],
  ["91", 3162, 3349, 3483, 3421],
  ["69", 2056, 3356, 2320, 3428],
  ["92", 3179, 3442, 3517, 3514],
  ["68", 2590, 3485, 3029, 3627],
  ["191", 1514, 3510, 1754, 3582],
  ["93", 3264, 3533, 3934, 3614],
  ["23", 694, 3569, 904, 3641],
  ["94", 3359, 3621, 3571, 3693],
  ["22", 718, 3667, 928, 3739],
  ["95", 3451, 3713, 3760, 3785],
  ["192", 1511, 3752, 1943, 3894],
  ["21", 716, 3762, 965, 3834],
  ["120", 2026, 3788, 2236, 3871],
  ["78", 716, 3859, 1029, 3931],
  ["121", 2121, 3920, 2357, 3992],
  ["96", 3658, 3953, 3970, 4095],
  ["20", 715, 3955, 1098, 4027],
  ["99", 3131, 4025, 3406, 4106],
  ["19", 719, 4053, 968, 4132],
  ["122", 2289, 4054, 2499, 4131],
  ["193", 1512, 4070, 1975, 4148],
  ["18", 719, 4149, 948, 4229],
  ["98", 3142, 4153, 3408, 4225],
  ["97", 3658, 4154, 3958, 4296],
  ["123", 2404, 4198, 2639, 4270],
  ["17", 714, 4246, 947, 4318],
  ["194", 1761, 4256, 2243, 4399],
  ["16", 716, 4341, 1194, 4422],
  ["124", 2305, 4355, 2791, 4427],
  ["107", 169, 4425, 457, 4573],
  ["15", 701, 4431, 911, 4506],
  ["125", 2491, 4486, 2919, 4558],
  ["195", 1958, 4523, 2354, 4606],
  ["14", 702, 4532, 1054, 4604],
  ["127", 3379, 4538, 3729, 4619],
  ["13", 706, 4626, 995, 4698],
  ["196", 2156, 4722, 2398, 4794],
  ["12", 692, 4725, 902, 4797],
  ["11", 712, 4819, 946, 4900],
  ["126", 3054, 4820, 3264, 4902],
  ["10", 714, 4913, 1139, 4991],
  ["197", 2352, 4919, 2616, 4991],
  ["9", 714, 5013, 938, 5094],
  ["8", 716, 5102, 1096, 5180],
  ["7", 710, 5203, 920, 5276],
  ["6", 723, 5296, 1028, 5371],
  ["5", 725, 5392, 991, 5467],
  ["4", 728, 5489, 1015, 5564],
  ["3", 730, 5582, 1053, 5660],
  ["2", 730, 5684, 950, 5756],
  ["1", 715, 5782, 970, 5854],
];

function ensureMap() {
  if (mapReady) return;
  mapReady = true;
  for (const [code, left, top, right, bottom] of SPOTS) {
    const station = STATIONS.find((item) => item.code === code);
    if (!station) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "spot";
    button.dataset.id = station.id;
    button.tabIndex = -1;
    button.setAttribute("aria-label", station.tab);
    button.style.left = `${(left / MAP_W) * 100}%`;
    button.style.top = `${(top / MAP_H) * 100}%`;
    button.style.width = `${((right - left) / MAP_W) * 100}%`;
    button.style.height = `${((bottom - top) / MAP_H) * 100}%`;
    button.addEventListener("click", () => {
      const index = slotEls.findIndex((slot) => slot.classList.contains("is-search"));
      if (index >= 0) assignSlot(index, station);
    });
    planoHits.append(button);
    stopNodes.set(station.id, [button]);
  }
}


function centerMapOn(id) {
  const spot = planoHits.querySelector(`.spot[data-id="${id}"]`);
  if (!spot) return;
  const pane = mapScroll.getBoundingClientRect();
  const box = spot.getBoundingClientRect();
  mapScroll.scrollLeft += (box.left + box.width / 2) - (pane.left + pane.width / 2);
  mapScroll.scrollTop += (box.top + box.height / 2) - (pane.top + pane.height / 2);
}

function paintMap(query) {
  ensureMap();
  const folded = query.trim();
  const matches = matchingStations(query);
  if (mapCursor >= matches.length) mapCursor = 0;
  const activeId = matches[mapCursor]?.id;
  for (const [id, nodes] of stopNodes) {
    for (const node of nodes) node.classList.toggle("is-hit", Boolean(folded) && id === activeId);
  }
  mapHint.textContent = matches[mapCursor]?.tab || (folded ? "Sin estaciones" : "Toca una estación");
  if (folded && activeId) requestAnimationFrame(() => centerMapOn(activeId));
}

function paintSuggestions(slot, query) {
  const list = slot.querySelector(".suggest");
  const folded = query.trim();
  const matches = matchingStations(query);
  if (!folded) {
    list.hidden = true;
    list.replaceChildren();
    return;
  }
  if (mapCursor >= matches.length) mapCursor = 0;
  list.hidden = false;
  if (!matches.length) {
    const empty = document.createElement("li");
    empty.className = "suggest-empty";
    empty.textContent = "Sin estaciones";
    list.replaceChildren(empty);
    return;
  }
  const index = slotEls.indexOf(slot);
  list.replaceChildren(...matches.map((station, itemIndex) => {
    const item = document.createElement("li");
    item.className = "suggest-item";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", itemIndex === mapCursor ? "true" : "false");
    if (itemIndex === mapCursor) item.classList.add("is-active");
    item.textContent = station.tab;
    item.addEventListener("pointerdown", (event) => event.preventDefault());
    item.addEventListener("click", () => assignSlot(index, station));
    return item;
  }));
  const active = list.querySelector(".is-active");
  if (!active) return;
  const top = active.offsetTop;
  const bottom = top + active.offsetHeight;
  if (top < list.scrollTop) list.scrollTop = top;
  else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
}

function paintFinder(slot) {
  const query = slot.querySelector(".query").value;
  paintMap(query);
  paintSuggestions(slot, query);
}

function pinDock() {
  if (!window.visualViewport) return;
  const open = dock.querySelector(".slot.is-search");
  if (!open) {
    dock.style.transform = "";
    return;
  }
  const viewport = window.visualViewport;
  const overlap = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
  dock.style.transform = overlap ? `translateY(-${overlap}px)` : "";
}

const ZOOM_MIN = 0.55;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 1.25;
let mapZoom = 1;
const zoomInBtn = document.querySelector("#zoom-in");
const zoomOutBtn = document.querySelector("#zoom-out");

function paintZoom() {
  zoomInBtn.disabled = mapZoom >= ZOOM_MAX - 0.01;
  zoomOutBtn.disabled = mapZoom <= ZOOM_MIN + 0.01;
}

function applyMapSize(recenterId) {
  const width = mapScroll.clientWidth;
  const height = mapScroll.clientHeight;
  if (!width || !height) return;
  const prevW = planoImg.getBoundingClientRect().width;
  const prevH = planoImg.getBoundingClientRect().height;
  const cx = prevW ? (mapScroll.scrollLeft + width / 2) / prevW : 0.5;
  const cy = prevH ? (mapScroll.scrollTop + height / 2) / prevH : 0.5;
  planoImg.style.width = `${Math.max(width, 840) * mapZoom}px`;
  requestAnimationFrame(() => {
    if (recenterId) {
      centerMapOn(recenterId);
      return;
    }
    const nextW = planoImg.getBoundingClientRect().width;
    const nextH = planoImg.getBoundingClientRect().height;
    mapScroll.scrollLeft = cx * nextW - mapScroll.clientWidth / 2;
    mapScroll.scrollTop = cy * nextH - mapScroll.clientHeight / 2;
  });
}

function sizeMap() {
  applyMapSize();
}

function setMapZoom(next) {
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 1000) / 1000));
  if (Math.abs(zoom - mapZoom) < 0.001) {
    paintZoom();
    return;
  }
  mapZoom = zoom;
  paintZoom();
  applyMapSize();
}

function syncMap() {
  const open = document.querySelector(".slot.is-search");
  document.body.classList.toggle("is-finding", Boolean(open));
  mapEl.hidden = !open;
  if (!open) return;
  mapZoom = 1;
  paintZoom();
  paintFinder(open);
  requestAnimationFrame(() => {
    applyMapSize("xativa");
    requestAnimationFrame(() => applyMapSize("xativa"));
  });
}

function closeFinder(slot, sync = true) {
  slot.classList.remove("is-search");
  const find = slot.querySelector(".find");
  const input = slot.querySelector(".query");
  find.setAttribute("aria-expanded", "false");
  input.hidden = true;
  input.value = "";
  const list = slot.querySelector(".suggest");
  list.hidden = true;
  list.replaceChildren();
  pinDock();
  if (sync) syncMap();
}

function closeFinders() {
  slotEls.forEach((slot) => closeFinder(slot, false));
  syncMap();
}

function openFinder(slot) {
  if (!navigator.onLine) return;
  slotEls.forEach((other) => { if (other !== slot) closeFinder(other, false); });
  slot.classList.add("is-search");
  const find = slot.querySelector(".find");
  const input = slot.querySelector(".query");
  find.setAttribute("aria-expanded", "true");
  input.hidden = false;
  input.value = "";
  mapCursor = 0;
  syncMap();
  input.focus();
  pinDock();
  setTimeout(pinDock, 300);
}

function assignSlot(index, station) {
  closeFinder(slotEls[index]);
  const existing = slots.indexOf(station.id);
  if (existing !== -1 && existing !== index) {
    selectTab(station.id, true);
    return;
  }
  const previous = slots[index];
  slots[index] = station.id;
  saveSlots();
  remember(previous === station.id ? null : previous);
  paintSlot(index);
  selectTab(station.id, true);
}

function endpoint(station) {
  return `https://geoportal.valencia.es/geoportal-services/api/v1/salidas-metro.html?estacion=${station.code}&lang=es`;
}

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function madridSeconds(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type) => Number(parts.find((part) => part.type === type).value);
  return read("hour") * 3600 + read("minute") * 60 + read("second");
}

function parseDepartures(html) {
  const now = madridSeconds();
  const departures = [];
  const pattern = /linea_metro_(\d+)\.png[\s\S]*?<b>([^<]*)<\/b>\s*-\s*<span>(\d{2}:\d{2}:\d{2})<\/span>/g;
  for (const match of html.matchAll(pattern)) {
    const [hour, minute, second] = match[3].split(":").map(Number);
    let delta = hour * 3600 + minute * 60 + second - now;
    let tomorrow = false;
    if (delta < -90) {
      delta += 24 * 3600;
      tomorrow = true;
    }
    const [color, text] = LINE_COLORS[match[1]] || ["#555", "#fff"];
    departures.push({
      time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      headsign: decodeHtml(match[2]),
      tomorrow,
      at: Date.now() + delta * 1000,
      line: { chip: `L${match[1]}`, color, text },
    });
    if (departures.length === 16) break;
  }
  return departures;
}

function formatWait(minutes) {
  const value = Math.max(0, Math.round(minutes));
  if (value === 0) return "ahora";
  return formatSpan(value);
}

function formatSpan(value) {
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest}`;
}

function formatPast(minutes) {
  return `-${formatSpan(Math.max(1, Math.round(Math.abs(minutes))))}`;
}

function isPast(departure) {
  return !navigator.onLine && minutesUntil(departure) < 0;
}

function minutesUntil(departure) {
  if (typeof departure.at === "number") return (departure.at - Date.now()) / 60_000;
  return departure.minutes ?? 0;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chip(code, color, text) {
  return `<span class="line"><span class="chip" style="--c:${escapeHtml(color)};color:${escapeHtml(text || "#fff")}">${escapeHtml(code)}</span></span>`;
}

const LEAVE_ICONS = {
  late: `<span class="leave-slot"><img class="leave-icon" src="no-time.webp" alt=""></span>`,
  runner: `<span class="leave-slot"><img class="leave-icon" src="runer.svg" alt=""></span>`,
  coffee: `<span class="leave-slot"><img class="leave-icon" src="coffee.svg" alt=""></span>`,
};

function leaveInfo(departure) {
  if (typeof window.walkSeconds !== "number") return null;
  const walk = Math.max(1, Math.round(window.walkSeconds / 60));
  const minutes = Math.round(minutesUntil(departure) - walk);
  const icon = minutes < 0 ? "late" : minutes < 3 ? "runner" : "coffee";
  return { minutes, icon };
}

function leaveLabel(minutes) {
  if (minutes < 0) return formatPast(minutes);
  return formatWait(minutes);
}

function paintLeave(cell, departure) {
  const info = leaveInfo(departure);
  if (!info) {
    cell.classList.remove("is-rush");
    cell.removeAttribute("title");
    delete cell.dataset.icon;
    cell.replaceChildren();
    return;
  }
  cell.classList.toggle("is-rush", info.icon !== "coffee");
  cell.title = "Tiempo para salir";
  const showTime = info.icon === "coffee";
  if (cell.dataset.icon !== info.icon) {
    cell.dataset.icon = info.icon;
    cell.innerHTML = showTime
      ? `${LEAVE_ICONS.coffee}<span class="leave-time"></span>`
      : LEAVE_ICONS[info.icon];
  }
  const time = cell.querySelector(".leave-time");
  if (time) time.textContent = leaveLabel(info.minutes);
}

function waitLabel(departure) {
  const minutes = minutesUntil(departure);
  if (!navigator.onLine && minutes < 0) return formatPast(minutes);
  const delay = typeof departure.delay === "number" && departure.delay !== 0
    ? ` ${departure.delay > 0 ? "+" : ""}${departure.delay}`
    : "";
  return formatWait(minutes) + delay;
}

const DEST_KEY = "metro-valencia-destinos";

function readDestFilters() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEST_KEY));
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function writeDestFilters(filters) {
  try { localStorage.setItem(DEST_KEY, JSON.stringify(filters)); } catch { /* private mode */ }
}

function selectedDestinations(stationId) {
  const list = readDestFilters()[stationId];
  return Array.isArray(list) ? list.filter((name) => typeof name === "string" && name) : [];
}

function destinationGroups(departures) {
  const groups = [];
  const byName = new Map();
  for (const departure of departures) {
    const name = (departure.headsign || "").trim();
    if (!name) continue;
    let group = byName.get(name);
    if (!group) {
      group = { name, lines: [] };
      byName.set(name, group);
      groups.push(group);
    }
    const code = departure.line?.chip;
    if (code && !group.lines.some((line) => line.chip === code)) group.lines.push(departure.line);
  }
  return groups;
}

function visibleDepartures(data) {
  const picked = selectedDestinations(data.id);
  if (!picked.length) return data.departures;
  const allow = new Set(picked);
  return data.departures.filter((departure) => allow.has((departure.headsign || "").trim()));
}

function toggleDestination(name) {
  if (!view || !name) return;
  const picked = new Set(selectedDestinations(view.id));
  if (picked.has(name)) picked.delete(name);
  else picked.add(name);
  const filters = readDestFilters();
  if (picked.size) filters[view.id] = [...picked];
  else delete filters[view.id];
  writeDestFilters(filters);
  render(view);
}

function destinationFilter(data) {
  const groups = destinationGroups(data.departures);
  if (!groups.length) return "";
  const picked = new Set(selectedDestinations(data.id));
  const chips = groups.map(({ name, lines }) => {
    const on = picked.has(name);
    const marks = lines.map((line) => chip(line.chip || "", line.color || "#333", line.text)).join("");
    return `<button type="button" class="dest-chip${on ? " is-on" : ""}" data-dest="${escapeHtml(name)}" aria-pressed="${on ? "true" : "false"}">${marks}<span class="dest-chip-name">${escapeHtml(name)}</span></button>`;
  }).join("");
  return `<div class="dest-filter" role="group" aria-label="Destinos"><div class="dest-filter-list">${chips}</div></div>`;
}

function departureRows(departures, filtered) {
  if (!departures.length) {
    return `<p class="empty">${filtered ? "No hay salidas a esos destinos." : "No hay salidas."}</p>`;
  }
  return departures.map((departure) => `<article class="row${isPast(departure) ? " is-past" : ""}">
      <span class="time">${escapeHtml(departure.time || "")}${departure.tomorrow ? '<small class="day">mañana</small>' : ""}</span>
      ${chip(departure.line?.chip || "", departure.line?.color || "#333", departure.line?.text)}
      <span class="dest">${escapeHtml(departure.headsign || "")}</span>
      <span class="wait">${escapeHtml(waitLabel(departure))}</span>
      <span class="leave"></span>
    </article>`).join("");
}

function paintWaits() {
  if (!view) return;
  const rows = document.querySelectorAll("#rows .row");
  visibleDepartures(view).forEach((departure, index) => {
    const row = rows[index];
    if (!row) return;
    row.classList.toggle("is-past", isPast(departure));
    const wait = row.querySelector(".wait");
    if (wait) wait.textContent = waitLabel(departure);
    const leave = row.querySelector(".leave");
    if (leave) paintLeave(leave, departure);
  });
}

function freshnessLabel(data) {
  const updated = data.updated ? ` ${data.updated}` : "";
  if (!navigator.onLine) return `sin conexión${updated}`;
  return `${data.realtime ? "en directo" : "horario"}${updated}`;
}

function render(data) {
  app.hidden = false;
  status.hidden = true;
  document.querySelector("#fresh").textContent = freshnessLabel(data);
  const picked = selectedDestinations(data.id);
  const departures = visibleDepartures(data);
  app.innerHTML = `
    <section class="board" aria-label="Próximas salidas">
      <div id="rows">${departureRows(departures, picked.length > 0)}</div>
      ${destinationFilter(data)}
    </section>
  `;
  paintWaits();
}

const BOARDS_KEY = "metro-valencia-boards";

function saveBoards() {
  const boards = {};
  for (const [id, data] of cache) boards[id] = data;
  try { localStorage.setItem(BOARDS_KEY, JSON.stringify(boards)); } catch { /* private mode */ }
}

function restoreBoards() {
  try {
    const saved = JSON.parse(localStorage.getItem(BOARDS_KEY));
    if (!saved || typeof saved !== "object") return;
    for (const [id, data] of Object.entries(saved)) {
      if (!stationById(id) || !data || !Array.isArray(data.departures)) continue;
      cache.set(id, data);
    }
  } catch { /* keep an empty cache */ }
}

function showOfflineEmpty() {
  view = null;
  app.hidden = false;
  status.hidden = true;
  document.querySelector("#fresh").textContent = "sin conexión";
  app.innerHTML = `<div class="error"><strong>Sin conexión.</strong><p>Abre la página con red una vez para ver el horario sin conexión.</p></div>`;
}

async function load(id) {
  const station = stationById(id);
  if (!station) return;
  const cached = cache.get(id);
  if (cached) {
    view = cached;
    render(cached);
  } else if (!navigator.onLine) {
    showOfflineEmpty();
    return;
  } else {
    status.hidden = false;
    status.textContent = "Cargando…";
    app.hidden = true;
    app.innerHTML = "";
  }

  if (!navigator.onLine) return;

  const response = await fetch(endpoint(station));
  if (!response.ok) throw new Error("No se pudo cargar el horario");
  const departures = parseDepartures(await response.text());
  if (activeId !== id) return;
  view = {
    id: station.id,
    page: station.page,
    departures,
    realtime: true,
    updated: new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
    fetchedAt: Date.now(),
  };
  cache.set(station.id, view);
  saveBoards();
  render(view);
}

function showError(error) {
  const fresh = document.querySelector("#fresh");
  if (view && view.id === activeId && fresh && document.querySelector("#rows")) {
    fresh.textContent = navigator.onLine ? "sin actualizar" : freshnessLabel(view);
    return;
  }
  if (!navigator.onLine) {
    showOfflineEmpty();
    return;
  }
  app.hidden = false;
  status.hidden = true;
  app.innerHTML = `<div class="error"><strong>No se pudieron cargar las salidas.</strong><p>${escapeHtml(error.message)}</p></div>`;
}

function showWalk(station) {
  const point = station && GEO.get(station.code);
  walkTo(point ? { id: station.id, lon: point.lon, lat: point.lat } : null);
}

function selectTab(id, updateHash) {
  const station = stationById(id) || stationById(slots.find(Boolean));
  if (!station) return;
  activeId = station.id;
  slotEls.forEach((slot) => {
    const tab = slot.querySelector(".tab");
    const selected = tab.dataset.station === station.id;
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    if (selected) panel.setAttribute("aria-labelledby", tab.id);
  });
  if (updateHash) history.replaceState(null, "", `#${station.id}`);
  load(station.id).catch(showError);
  showWalk(station);
}

function onQueryKey(event, slot, index) {
  const matches = matchingStations(slot.querySelector(".query").value);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (!matches.length) return;
    mapCursor = event.key === "ArrowDown"
      ? (mapCursor + 1) % matches.length
      : (mapCursor - 1 + matches.length) % matches.length;
    paintFinder(slot);
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    const typed = fold(slot.querySelector(".query").value.trim());
    const exact = STATIONS.find((station) => fold(station.tab) === typed);
    const station = exact || matches[mapCursor];
    if (station) assignSlot(index, station);
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeFinder(slot);
    slot.querySelector(".tab").focus();
  }
}

function setOffline(offline) {
  document.body.classList.toggle("is-offline", offline);
  for (const button of document.querySelectorAll(".find, .tab, .recent-stop, .spot")) {
    button.disabled = offline;
  }
  if (offline) {
    for (const button of document.querySelectorAll(".zoom-btn")) button.disabled = true;
    closeFinders();
  } else {
    paintZoom();
  }
  if (view && view.id === activeId && document.querySelector("#rows")) render(view);
}

const hashId = location.hash.replace("#", "");
restoreBoards();
if (stationById(hashId)) ensureSlot(hashId);
slotEls.forEach((_, index) => paintSlot(index));
paintRecent();
saveSlots();
saveRecent();

slotEls.forEach((slot, index) => {
  slot.querySelector(".find").addEventListener("click", () => {
    if (slot.classList.contains("is-search")) closeFinder(slot);
    else openFinder(slot);
  });
  slot.querySelector(".tab").addEventListener("click", () => {
    const id = slot.querySelector(".tab").dataset.station;
    if (!id) {
      openFinder(slot);
      return;
    }
    closeFinders();
    selectTab(id, true);
  });
  slot.querySelector(".query").addEventListener("input", () => {
    mapCursor = 0;
    paintFinder(slot);
  });
  slot.querySelector(".query").addEventListener("keydown", (event) => onQueryKey(event, slot, index));
});

zoomInBtn.addEventListener("click", () => setMapZoom(mapZoom * ZOOM_STEP));
zoomOutBtn.addEventListener("click", () => setMapZoom(mapZoom / ZOOM_STEP));
paintZoom();

document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".slot.is-search") && !event.target.closest("#map") && !event.target.closest(".zoom")) closeFinders();
});

if (window.visualViewport) {
  visualViewport.addEventListener("resize", pinDock);
  visualViewport.addEventListener("scroll", pinDock);
}

window.addEventListener("resize", () => {
  if (!mapEl.hidden) sizeMap();
});

window.addEventListener("hashchange", () => {
  const id = stationFromHash();
  ensureSlot(id);
  closeFinders();
  selectTab(id, false);
});

app.addEventListener("click", (event) => {
  const chip = event.target.closest(".dest-chip");
  if (!chip) return;
  toggleDestination(chip.dataset.dest);
});

selectTab(stationFromHash(), false);
setOffline(!navigator.onLine);
window.addEventListener("offline", () => setOffline(true));
window.addEventListener("online", () => {
  setOffline(false);
  load(activeId).catch(showError);
  const station = stationById(activeId);
  if (station) showWalk(station);
});
setInterval(paintWaits, 1000);
window.addEventListener("walk-time", paintWaits);
setInterval(() => {
  if (!navigator.onLine) return;
  load(activeId).catch(showError);
}, REFRESH_MS);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
