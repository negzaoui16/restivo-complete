/**
 * Remplit la base LOCALE avec un jeu de données riche (6 restaurants, ~45 utilisateurs,
 * menus, plans de salle, ~400 réservations, commandes, avis, favoris, notifications).
 *
 * Lancer :  npm run seed:full
 *
 * Comptes avec mot de passe connu (un par rôle), affichés à la fin :
 *   client   client@restivo.test    / Client@2026
 *   manager  manager@restivo.test   / Manager@2026   (propriétaire de 3 restaurants)
 *   staff    staff@restivo.test     / Staff@2026      (personnel de 2 restaurants)
 *
 * Idempotent : tous les ids commencent par "01FL". À chaque lancement, les données portant
 * ces ids (et celles rattachées à ces restaurants) sont supprimées puis recréées. Rien d'autre
 * n'est touché (ni le restaurant de démo "01DM", ni vos propres données).
 *
 * Refuse de tourner en production ou si MONGODB_URI n'est pas localhost / 127.0.0.1.
 * N'affiche jamais MONGODB_URI. Les comptes "en masse" ont un mot de passe aléatoire inutilisable.
 */
import "temporal-polyfill/full/global";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

// ─── Garde-fous ───────────────────────────────────────────────────────────────

if (existsSync(".env")) process.loadEnvFile(".env");

function fail(message: string): never {
  console.error(`seed-full: ${message}`);
  process.exit(1);
}

if (process.env.NODE_ENV === "production") fail('refus de tourner avec NODE_ENV="production".');

const mongoUri =
  process.env.MONGODB_URI ||
  (process.env.DATABASE_URL?.startsWith("mongodb") ? process.env.DATABASE_URL : "") ||
  "mongodb://127.0.0.1:27017/restivo";

let host: string;
try {
  host = new URL(mongoUri).hostname;
} catch {
  fail("MONGODB_URI n'est pas une URL valide.");
}
if (host !== "localhost" && host !== "127.0.0.1") {
  fail("refus : l'hôte MongoDB n'est pas localhost / 127.0.0.1 (jamais de données de test sur une base partagée).");
}

// lib/db.ts lit MONGODB_URI à l'import : on l'importe après .env et le garde-fou.
const { db, connectMongo, isMongoConnected } = await import("../lib/db.ts");
await connectMongo().catch(() => undefined);
if (!(await isMongoConnected())) {
  fail("MongoDB local injoignable (sinon l'adaptateur écrirait dans data/db.json).");
}
const M = db.models as Record<string, any>;

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/** 26 caractères, comme un ULID. Préfixe "01FL" = jeu de données complet. */
const id = (code: string, n: number): string => `01FL${code}${String(n).padStart(20, "0")}`;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261112);
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const chance = (p: number) => rand() < p;
const money = (n: number) => n.toFixed(3);

const NOW = Date.now();
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const TUNIS_OFFSET = 60 * MIN; // Africa/Tunis = UTC+1 toute l'année
const tunisNow = new Date(NOW + TUNIS_OFFSET);
/** Minuit (heure de Tunis) du jour courant, en ms UTC. */
const TODAY0 = Date.UTC(tunisNow.getUTCFullYear(), tunisNow.getUTCMonth(), tunisNow.getUTCDate()) - TUNIS_OFFSET;
const at = (dayOffset: number, hour: number, minute = 0) => TODAY0 + dayOffset * DAY + (hour * 60 + minute) * MIN;
const SLOT = 90 * MIN;

// ─── Données ──────────────────────────────────────────────────────────────────

const FIRST = ["Sarra", "Amine", "Yassine", "Ines", "Mehdi", "Hela", "Karim", "Nour", "Walid", "Rania", "Sami", "Maya", "Omar", "Lina", "Bilel", "Salma", "Fares", "Emna", "Aymen", "Dorra", "Hichem", "Meriem", "Skander", "Ghada", "Rim", "Zied", "Amal", "Anis", "Yasmine", "Marwen", "Cyrine", "Taha", "Nesrine", "Oussama", "Khawla", "Hedi", "Molka", "Slim", "Syrine", "Nabil"];
const LAST = ["Ben Salah", "Trabelsi", "Gharbi", "Jlassi", "Mansouri", "Bouazizi", "Chaabane", "Hammami", "Khelifi", "Mejri", "Ayari", "Dridi", "Sassi", "Zouari", "Belhaj", "Ferchichi", "Karoui", "Naceur", "Riahi", "Abid"];

interface Dish { name: string; desc: string; price: number }
interface Category { name: string; desc: string; items: Dish[] }
interface Spec {
  key: string; name: string; slug: string; cuisine: string; priceLevel: number; city: string; address: string;
  postalCode: string; phone: string; lat: number; lng: number; description: string; owner: "manager" | "owner2" | "owner3";
  closedDay: number | null; menu: Category[];
}

const SPECS: Spec[] = [
  {
    key: "dar-el-jeld", name: "Dar El Jeld", slug: "dar-el-jeld", cuisine: "Tunisienne", priceLevel: 3, city: "Tunis",
    address: "5 Rue Dar El Jeld, Médina", postalCode: "1008", phone: "+216 71 560 916", lat: 36.7989, lng: 10.1706, owner: "manager", closedDay: null,
    description: "Table traditionnelle dans une demeure de la Médina : couscous, tajines et pâtisseries maison.",
    menu: [
      { name: "Entrées", desc: "Pour ouvrir le repas.", items: [
        { name: "Brik à l'œuf", desc: "Feuille croustillante, œuf coulant, thon et câpres.", price: 6.5 },
        { name: "Salade méchouia", desc: "Poivrons et tomates grillés, ail et huile d'olive.", price: 8 },
        { name: "Slata tounsia", desc: "Tomates, concombre, oignon, thon et olives.", price: 7.5 },
        { name: "Fricassé", desc: "Petit pain frit, thon, œuf, olives et harissa.", price: 5 } ] },
      { name: "Plats", desc: "Classiques tunisiens.", items: [
        { name: "Couscous à l'agneau", desc: "Semoule roulée main, agneau et légumes mijotés.", price: 28 },
        { name: "Ojja aux merguez", desc: "Sauce tomate pimentée, merguez maison et œufs.", price: 19.5 },
        { name: "Tajine tunisien", desc: "Gratin d'œufs, poulet, fromage et persil.", price: 17 },
        { name: "Kamounia", desc: "Ragoût de bœuf au cumin et à l'ail.", price: 24 },
        { name: "Poisson grillé", desc: "Pêche du jour grillée au charbon.", price: 32 } ] },
      { name: "Desserts", desc: "Pour finir en douceur.", items: [
        { name: "Makroudh", desc: "Semoule fourrée aux dattes, glacée au miel.", price: 5.5 },
        { name: "Assida zgougou", desc: "Crème de pignons d'Alep aux fruits secs.", price: 7.5 },
        { name: "Baklawa", desc: "Feuilletés aux amandes et au miel.", price: 6 } ] },
      { name: "Boissons", desc: "Thés et jus.", items: [
        { name: "Thé à la menthe", desc: "Thé vert à la menthe fraîche et aux pignons.", price: 4.5 },
        { name: "Jus d'orange pressé", desc: "Oranges de Cap Bon.", price: 5 },
        { name: "Eau minérale 1 L", desc: "Plate ou gazeuse.", price: 3 } ] },
    ],
  },
  {
    key: "golfe-bleu", name: "Le Golfe Bleu", slug: "le-golfe-bleu", cuisine: "Fruits de mer", priceLevel: 3, city: "La Marsa",
    address: "Corniche de La Marsa", postalCode: "2078", phone: "+216 71 746 800", lat: 36.8782, lng: 10.3247, owner: "manager", closedDay: 0,
    description: "Poissons et fruits de mer du jour, face à la mer.",
    menu: [
      { name: "Entrées froides", desc: "Fraîcheur marine.", items: [
        { name: "Carpaccio de daurade", desc: "Citron vert, huile d'olive et baies roses.", price: 18 },
        { name: "Salade de poulpe", desc: "Poulpe tendre, pommes de terre et câpres.", price: 16 },
        { name: "Huîtres de Bizerte (6)", desc: "Servies sur glace avec citron.", price: 24 } ] },
      { name: "Poissons", desc: "Pêche du jour.", items: [
        { name: "Loup grillé", desc: "Entier, légumes grillés.", price: 38 },
        { name: "Daurade au four", desc: "Citron, pommes de terre et herbes.", price: 34 },
        { name: "Rouget poêlé", desc: "Beurre citronné et câpres.", price: 30 },
        { name: "Mérou à la tunisienne", desc: "Sauce tomate épicée et poivrons.", price: 42 } ] },
      { name: "Crustacés", desc: "Crevettes et plus.", items: [
        { name: "Gambas flambées", desc: "Flambées au pastis, riz parfumé.", price: 36 },
        { name: "Spaghetti aux fruits de mer", desc: "Moules, crevettes, calamars.", price: 29 },
        { name: "Calamars frits", desc: "Sauce tartare maison.", price: 22 } ] },
      { name: "Desserts et boissons", desc: "Pour terminer.", items: [
        { name: "Tarte au citron", desc: "Meringue légère.", price: 9 },
        { name: "Citronnade menthe", desc: "Maison.", price: 5.5 },
        { name: "Café turc", desc: "Servi avec un loukoum.", price: 3.5 } ] },
    ],
  },
  {
    key: "napoli", name: "Pizzeria Napoli", slug: "pizzeria-napoli", cuisine: "Italienne", priceLevel: 2, city: "Sousse",
    address: "Boulevard de la Corniche", postalCode: "4000", phone: "+216 73 225 330", lat: 35.8256, lng: 10.6369, owner: "manager", closedDay: null,
    description: "Pizzas au feu de bois, pâtes fraîches et tiramisu maison.",
    menu: [
      { name: "Antipasti", desc: "À partager.", items: [
        { name: "Bruschetta tomate basilic", desc: "Pain grillé, tomates fraîches.", price: 8 },
        { name: "Burrata", desc: "Tomates cerises et pesto.", price: 14 },
        { name: "Arancini", desc: "Boulettes de riz, mozzarella fondante.", price: 9.5 } ] },
      { name: "Pizzas", desc: "Pâte maturée 48 h.", items: [
        { name: "Margherita", desc: "Tomate, mozzarella, basilic.", price: 14 },
        { name: "Quatre fromages", desc: "Mozzarella, gorgonzola, parmesan, emmental.", price: 18.5 },
        { name: "Diavola", desc: "Salami piquant et piment.", price: 17 },
        { name: "Reine", desc: "Jambon, champignons, olives.", price: 16 },
        { name: "Calzone", desc: "Jambon, ricotta et mozzarella.", price: 17.5 } ] },
      { name: "Pâtes", desc: "Fraîches, chaque jour.", items: [
        { name: "Spaghetti carbonara", desc: "Guanciale, œuf et pecorino.", price: 18 },
        { name: "Lasagnes maison", desc: "Bolognaise et béchamel.", price: 19 },
        { name: "Penne arrabbiata", desc: "Tomate et piment.", price: 14 } ] },
      { name: "Desserts et boissons", desc: "Dolce vita.", items: [
        { name: "Tiramisu", desc: "Recette classique au mascarpone.", price: 8.5 },
        { name: "Panna cotta", desc: "Coulis de fruits rouges.", price: 7.5 },
        { name: "Limonade maison", desc: "Citron et menthe.", price: 5 } ] },
    ],
  },
  {
    key: "chez-sidi", name: "Chez Sidi", slug: "chez-sidi", cuisine: "Café et brunch", priceLevel: 2, city: "Sidi Bou Saïd",
    address: "Rue Hached Ali", postalCode: "2026", phone: "+216 71 740 110", lat: 36.8702, lng: 10.3412, owner: "owner2", closedDay: null,
    description: "Café perché sur la colline : brunch, pâtisseries et vue sur le golfe.",
    menu: [
      { name: "Petit-déjeuner", desc: "Servi jusqu'à midi.", items: [
        { name: "Petit-déjeuner tunisien", desc: "Œuf, olives, fromage, pain et confiture.", price: 12 },
        { name: "Bambalouni", desc: "Beignet tunisien au sucre ou au miel.", price: 3 },
        { name: "Croissant et café", desc: "Formule du matin.", price: 6 } ] },
      { name: "Brunch", desc: "Salé et sucré.", items: [
        { name: "Avocado toast", desc: "Œuf poché et graines.", price: 14 },
        { name: "Pancakes", desc: "Sirop d'érable et fruits.", price: 12.5 },
        { name: "Shakshuka", desc: "Œufs pochés en sauce tomate.", price: 13 } ] },
      { name: "Pâtisseries", desc: "Faites maison.", items: [
        { name: "Mille-feuille", desc: "Crème vanille.", price: 7 },
        { name: "Cheesecake", desc: "Coulis de framboise.", price: 8 },
        { name: "Loukoum et amandes", desc: "Assortiment.", price: 5 } ] },
      { name: "Boissons", desc: "Chaudes et fraîches.", items: [
        { name: "Cappuccino", desc: "Mousse onctueuse.", price: 4.5 },
        { name: "Thé aux pignons", desc: "Spécialité de Sidi Bou Saïd.", price: 6 },
        { name: "Smoothie fruits rouges", desc: "Banane et fruits rouges.", price: 8 } ] },
    ],
  },
  {
    key: "burger-lab", name: "Burger Lab", slug: "burger-lab", cuisine: "Burgers", priceLevel: 1, city: "Les Berges du Lac",
    address: "Rue du Lac Windermere", postalCode: "1053", phone: "+216 71 960 450", lat: 36.8352, lng: 10.2396, owner: "owner2", closedDay: null,
    description: "Burgers de bœuf frais, frites maison et milkshakes.",
    menu: [
      { name: "Burgers", desc: "Viande 100 % bœuf.", items: [
        { name: "Classic", desc: "Cheddar, salade, tomate, sauce maison.", price: 16.5 },
        { name: "Double Cheese", desc: "Deux steaks, double cheddar.", price: 21 },
        { name: "BBQ Bacon", desc: "Bacon croustillant, oignons frits, sauce BBQ.", price: 20 },
        { name: "Crispy Chicken", desc: "Poulet pané, coleslaw.", price: 17 },
        { name: "Veggie", desc: "Galette de légumes, avocat.", price: 15 } ] },
      { name: "Accompagnements", desc: "À côté.", items: [
        { name: "Frites maison", desc: "Coupées chaque jour.", price: 6 },
        { name: "Onion rings", desc: "Panure croustillante.", price: 7 },
        { name: "Nuggets (6)", desc: "Sauce au choix.", price: 8 } ] },
      { name: "Desserts", desc: "Gourmandises.", items: [
        { name: "Brownie chaud", desc: "Glace vanille.", price: 9 },
        { name: "Cookie géant", desc: "Pépites de chocolat.", price: 5.5 } ] },
      { name: "Boissons", desc: "Fraîches.", items: [
        { name: "Milkshake vanille", desc: "Crémeux.", price: 9.5 },
        { name: "Soda 33 cl", desc: "Au choix.", price: 3.5 },
        { name: "Limonade", desc: "Maison.", price: 5 } ] },
    ],
  },
  {
    key: "sushi-zen", name: "Sushi Zen", slug: "sushi-zen", cuisine: "Japonaise", priceLevel: 3, city: "Hammamet",
    address: "Avenue des Nations Unies", postalCode: "8050", phone: "+216 72 280 275", lat: 36.4, lng: 10.6167, owner: "owner3", closedDay: 1,
    description: "Sushis et sashimis préparés à la minute, ambiance zen.",
    menu: [
      { name: "Entrées", desc: "Pour commencer.", items: [
        { name: "Edamame", desc: "Fèves de soja au sel de mer.", price: 8 },
        { name: "Soupe miso", desc: "Tofu et algues wakame.", price: 7 },
        { name: "Gyoza (5)", desc: "Raviolis de porc poêlés.", price: 12 } ] },
      { name: "Sushis et sashimis", desc: "Poisson très frais.", items: [
        { name: "Assortiment sushi (8 pièces)", desc: "Saumon, thon, crevette.", price: 32 },
        { name: "Sashimi saumon (6)", desc: "Tranches fines de saumon.", price: 24 },
        { name: "California roll (8)", desc: "Surimi, avocat, concombre.", price: 22 },
        { name: "Dragon roll (8)", desc: "Crevette tempura, anguille.", price: 34 } ] },
      { name: "Plats chauds", desc: "Cuisine japonaise.", items: [
        { name: "Poulet teriyaki", desc: "Riz et légumes sautés.", price: 26 },
        { name: "Ramen au porc", desc: "Bouillon riche, œuf mollet.", price: 25 },
        { name: "Udon aux crevettes", desc: "Nouilles épaisses sautées.", price: 27 } ] },
      { name: "Desserts et boissons", desc: "Pour finir.", items: [
        { name: "Mochi glacés", desc: "Trois parfums.", price: 10 },
        { name: "Thé vert matcha", desc: "Chaud ou glacé.", price: 6 },
        { name: "Saké (15 cl)", desc: "Servi frais.", price: 14 } ] },
    ],
  },
];

const COMMENTS: Record<number, string[]> = {
  5: ["Excellent repas, service impeccable.", "Accueil chaleureux et plats délicieux !", "Une très belle découverte, nous reviendrons.", "Cuisine généreuse, produits frais. Bravo à l'équipe.", "Parfait du début à la fin."],
  4: ["Très bon, un peu d'attente mais ça valait le coup.", "Belle cuisine et cadre agréable.", "Bon rapport qualité-prix, service sympathique."],
  3: ["Correct sans plus, le service était lent.", "Plats bons mais l'ambiance bruyante."],
  2: ["Déçu par l'attente, les plats sont arrivés tièdes."],
  1: ["Mauvaise expérience, table non prête à l'heure."],
};

// ─── Construction des données en mémoire ──────────────────────────────────────

const docs: Record<string, any[]> = {
  User: [], Profile: [], Restaurant: [], RestaurantMembership: [], RestaurantMembershipRequest: [],
  BusinessHours: [], Floor: [], Table: [], Menu: [], MenuCategory: [], MenuItem: [], Promotion: [],
  PromotionItem: [], Reservation: [], Order: [], OrderItem: [], Review: [], Favorite: [], Notification: [],
};
const add = (model: string, doc: any, dates: Record<string, number> = {}) => {
  const out: any = { ...doc };
  for (const [key, ms] of Object.entries(dates)) out[key] = new Date(ms);
  if (!out.id) throw new Error(`${model}: id manquant`);
  out._id = out.id;
  docs[model].push(out);
  return out;
};

const hash = (plain: string) => bcrypt.hash(plain, 12);
const unusable = await bcrypt.hash(randomBytes(24).toString("hex"), 10);

// Comptes avec mot de passe connu.
const MAIN = [
  { key: "client", email: "client@restivo.test", password: "Client@2026", first: "Sarra", last: "Ben Salah", role: null, phone: "+216 20 111 222" },
  { key: "manager", email: "manager@restivo.test", password: "Manager@2026", first: "Amine", last: "Trabelsi", role: "OWNER", phone: "+216 22 333 444" },
  { key: "staff", email: "staff@restivo.test", password: "Staff@2026", first: "Yassine", last: "Gharbi", role: "STAFF", phone: "+216 24 555 666" },
] as const;

const U: Record<string, string> = {};
let userN = 0;
const addUser = async (email: string, first: string, last: string, role: "OWNER" | "STAFF" | null, passwordHash: string, phone: string | null) => {
  userN += 1;
  const uid = id("US", userN);
  add("User", { id: uid, email, passwordHash, status: "ACTIVE", managementRole: role }, { emailVerifiedAt: NOW - 30 * DAY });
  add("Profile", { id: id("PF", userN), userId: uid, firstName: first, lastName: last, displayName: `${first} ${last}`, phone });
  return uid;
};

for (const a of MAIN) U[a.key] = await addUser(a.email, a.first, a.last, a.role, await hash(a.password), a.phone);
U.owner2 = await addUser("owner2@restivo.test", "Hichem", "Mansouri", "OWNER", unusable, "+216 25 777 888");
U.owner3 = await addUser("owner3@restivo.test", "Ines", "Khelifi", "OWNER", unusable, "+216 26 999 000");

const EXTRA_STAFF: string[] = [];
for (let i = 1; i <= 8; i += 1) {
  EXTRA_STAFF.push(await addUser(`personnel${String(i).padStart(2, "0")}@restivo.test`, pick(FIRST), pick(LAST), "STAFF", unusable, null));
}
const CUSTOMERS: string[] = [U.client];
for (let i = 1; i <= 30; i += 1) {
  CUSTOMERS.push(await addUser(`client${String(i).padStart(2, "0")}@restivo.test`, FIRST[i - 1], pick(LAST), null, unusable, i % 3 === 0 ? `+216 9${between(0, 9)} ${between(100, 999)} ${between(100, 999)}` : null));
}

const staffByRestaurant: Record<string, string[]> = {
  "dar-el-jeld": [U.staff, EXTRA_STAFF[0], EXTRA_STAFF[1]],
  "golfe-bleu": [U.staff, EXTRA_STAFF[2]],
  napoli: [EXTRA_STAFF[3], EXTRA_STAFF[4]],
  "chez-sidi": [EXTRA_STAFF[5]],
  "burger-lab": [EXTRA_STAFF[6]],
  "sushi-zen": [EXTRA_STAFF[7]],
};

const TABLE_CAPACITY = [2, 4, 4, 2, 6, 4, 4, 6, 2, 2];
interface TableRef { id: string; name: string; capacity: number }

let counters = { floor: 0, table: 0, menu: 0, cat: 0, item: 0, promo: 0, resv: 0, order: 0, oi: 0, rev: 0, notif: 0, fav: 0, pi: 0, mem: 0, hours: 0, req: 0 };
const reservationsByRestaurant: Record<string, any[]> = {};

for (const [index, spec] of SPECS.entries()) {
  const rid = id("RS", index + 1);
  const ownerId = U[spec.owner];
  add("Restaurant", {
    id: rid, ownerId, name: spec.name, slug: spec.slug, description: spec.description, logoUrl: null, coverUrl: null,
    cuisine: spec.cuisine, priceLevel: spec.priceLevel, phone: spec.phone, email: `contact@${spec.slug}.tn`, website: null,
    address: spec.address, city: spec.city, country: "Tunisie", postalCode: spec.postalCode, latitude: spec.lat, longitude: spec.lng,
    currency: "TND", timezone: "Africa/Tunis", status: "ACTIVE",
  }, { createdAt: NOW - (60 - index * 7) * DAY });

  counters.mem += 1;
  add("RestaurantMembership", { id: id("MB", counters.mem), userId: ownerId, restaurantId: rid, role: "OWNER", status: "ACTIVE" }, { joinedAt: NOW - 60 * DAY });
  for (const staffId of staffByRestaurant[spec.key]) {
    counters.mem += 1;
    add("RestaurantMembership", { id: id("MB", counters.mem), userId: staffId, restaurantId: rid, role: "STAFF", status: "ACTIVE" }, { joinedAt: NOW - 40 * DAY });
  }

  for (let day = 0; day < 7; day += 1) {
    counters.hours += 1;
    const closed = spec.closedDay === day;
    add("BusinessHours", {
      id: id("HR", counters.hours), restaurantId: rid, dayOfWeek: day, isClosed: closed,
      openTime: closed ? null : spec.cuisine === "Café et brunch" ? "08:00" : "11:30", closeTime: closed ? null : spec.cuisine === "Burgers" ? "01:00" : "23:30",
    });
  }

  // Deux étages : salle principale et terrasse.
  const tables: TableRef[] = [];
  const floors = [
    { name: "Salle principale", level: 0, w: 20, h: 14, count: 10, type: "STANDARD" },
    { name: "Terrasse", level: 0, w: 14, h: 10, count: 6, type: "OUTDOOR" },
  ];
  let tableNumber = 0;
  for (const [fi, f] of floors.entries()) {
    counters.floor += 1;
    const fid = id("FR", counters.floor);
    add("Floor", { id: fid, restaurantId: rid, name: f.name, level: f.level, width: String(f.w), height: String(f.h), backgroundImageUrl: null, sortOrder: fi, isActive: true });
    for (let t = 0; t < f.count; t += 1) {
      counters.table += 1;
      tableNumber += 1;
      const capacity = fi === 0 ? TABLE_CAPACITY[t] : t % 2 === 0 ? 2 : 4;
      const name = fi === 0 ? `T${String(t + 1).padStart(2, "0")}` : `TR${t + 1}`;
      const type = fi === 0 ? (t >= 8 ? "BAR" : t === 5 || t === 6 ? "BOOTH" : "STANDARD") : "OUTDOOR";
      const cols = fi === 0 ? 4 : 3;
      add("Table", {
        id: id("TB", counters.table), floorId: fid, name, number: tableNumber, type, capacity, minCapacity: null,
        x: String(3 + (t % cols) * 4), y: String(3 + Math.floor(t / cols) * 4.5),
        width: String(capacity >= 6 ? 2.4 : capacity === 4 ? 1.6 : 1.2), height: "1.2", rotation: "0", isActive: true,
      });
      tables.push({ id: id("TB", counters.table), name, capacity });
    }
  }

  // Menu publié, catégories, plats, promotion.
  counters.menu += 1;
  const menuId = id("MN", counters.menu);
  add("Menu", { id: menuId, restaurantId: rid, name: "Carte", description: null, isPublished: true });
  const dishes: { id: string; name: string; price: number; categoryIndex: number }[] = [];
  for (const [ci, cat] of spec.menu.entries()) {
    counters.cat += 1;
    const cid = id("CT", counters.cat);
    add("MenuCategory", { id: cid, menuId, name: cat.name, description: cat.desc, imageUrl: null, sortOrder: ci, isActive: true });
    for (const [ii, dish] of cat.items.entries()) {
      counters.item += 1;
      const did = id("DS", counters.item);
      add("MenuItem", {
        id: did, categoryId: cid, name: dish.name, description: dish.desc, imageUrl: null, price: money(dish.price),
        preparationTime: between(5, 25), isAvailable: true, isFeatured: ii === 0, sortOrder: ii,
      });
      dishes.push({ id: did, name: dish.name, price: dish.price, categoryIndex: ci });
    }
  }
  counters.promo += 1;
  const promoId = id("PR", counters.promo);
  const promoDishes = dishes.filter((d) => d.categoryIndex === 1).slice(0, 2);
  add("Promotion", {
    id: promoId, restaurantId: rid, name: "Offre de la semaine -15 %", description: "15 % sur deux plats signature.",
    type: "PERCENTAGE", value: "15", isActive: true,
  }, { startsAt: NOW - 3 * DAY, endsAt: NOW + 30 * DAY });
  for (const d of promoDishes) add("PromotionItem", { id: id("PI", ++counters.pi), promotionId: promoId, menuItemId: d.id });
  const promoIds = new Set(promoDishes.map((d) => d.id));

  // ── Réservations ──
  const used = new Set<string>();
  const list: any[] = [];
  const makeReservation = (dayOffset: number, startMs: number, table: TableRef, status: string, customer: string, notes: string | null = null) => {
    counters.resv += 1;
    const guests = Math.max(1, Math.min(table.capacity, between(1, table.capacity)));
    const r = add("Reservation", {
      id: id("RV", counters.resv), reservationCode: `RST${index + 1}-${String(counters.resv).padStart(5, "0")}`, restaurantId: rid,
      customerId: customer, tableId: table.id, guestCount: guests, status, notes,
    }, { startsAt: startMs, endsAt: startMs + SLOT, createdAt: Math.min(NOW - 5 * MIN, startMs - between(2, 9) * DAY) });
    r._startMs = startMs;
    list.push(r);
    used.add(`${table.id}|${startMs}`);
    return r;
  };
  const free = (table: TableRef, startMs: number) => !used.has(`${table.id}|${startMs}`);

  // Jour courant : de quoi alimenter « salle en direct », arrivées et retards.
  const TODAY_PLAN: [number, string, number][] = [
    [-40, "SEATED", 0], [-15, "SEATED", 1], [-150, "COMPLETED", 2], [20, "CONFIRMED", 3], [60, "CONFIRMED", 4],
    [120, "CONFIRMED", 5], [180, "PENDING", 6], [-5, "CONFIRMED", 7],
  ];
  for (const [offsetMin, status, ti] of TODAY_PLAN) {
    const customer = index < 3 && ti < 4 ? U.client : pick(CUSTOMERS);
    makeReservation(0, NOW + offsetMin * MIN, tables[ti], status, customer, ti === 4 ? "Anniversaire." : null);
  }

  // Autres jours : 24 jours passés et 9 à venir.
  const slotTimes: [number, number][] = [[12, 0], [13, 30], [19, 0], [20, 30], [22, 0]];
  for (let day = -24; day <= 9; day += 1) {
    if (day === 0) continue;
    const dow = new Date(at(day, 12) + TUNIS_OFFSET).getUTCDay();
    if (spec.closedDay === dow) continue;
    const weekend = dow === 5 || dow === 6;
    const count = weekend ? between(5, 8) : between(2, 5);
    for (let k = 0; k < count; k += 1) {
      const [h, m] = pick(slotTimes);
      const table = pick(tables);
      const startMs = at(day, h, m);
      if (!free(table, startMs)) continue;
      let status: string;
      if (startMs + SLOT < NOW) status = chance(0.82) ? "COMPLETED" : chance(0.5) ? "CANCELLED" : "NO_SHOW";
      else status = chance(0.72) ? "CONFIRMED" : chance(0.55) ? "PENDING" : "CANCELLED";
      makeReservation(day, startMs, table, status, pick(CUSTOMERS));
    }
  }

  // Le compte client a un historique complet et des réservations à venir dans cinq restaurants.
  if (index < 5) {
    const mine: [number, string][] = [[-18, "COMPLETED"], [-9, "COMPLETED"], [-3, "COMPLETED"], [2, "CONFIRMED"], [6, "PENDING"]];
    for (const [day, status] of mine) {
      const startMs = at(day, 20, 0) + index * 30 * MIN;
      const table = tables[(index * 2 + Math.abs(day)) % tables.length];
      if (free(table, startMs)) makeReservation(day, startMs, table, status, U.client);
    }
  }
  reservationsByRestaurant[rid] = list;

  // ── Commandes, lignes, avis ──
  const dishById = new Map(dishes.map((d) => [d.id, d]));
    for (const r of list) {
    let orderStatus: string | null = null;
    if (r.status === "COMPLETED") orderStatus = chance(0.88) ? "DELIVERED" : null;
    else if (r.status === "SEATED") orderStatus = chance(0.5) ? "PREPARING" : "READY";
    else if (r.status === "CONFIRMED") orderStatus = chance(0.55) ? "CONFIRMED" : null;
    else if (r.status === "PENDING") orderStatus = chance(0.3) ? "PENDING" : null;
    else if (r.status === "CANCELLED") orderStatus = chance(0.3) ? "CANCELLED" : null;
    if (!orderStatus) continue;

    counters.order += 1;
    const oid = id("DR", counters.order);
    const lines = new Map<string, number>();
    const lineCount = between(2, 5);
    for (let i = 0; i < lineCount; i += 1) lines.set(pick(dishes).id, between(1, 3));
    let subtotal = 0;
    let discount = 0;
    for (const [dishId, qty] of lines) {
      const d = dishById.get(dishId)!;
      subtotal += d.price * qty;
      if (promoIds.has(dishId)) discount += d.price * qty * 0.15;
    }
    const createdMs = r.status === "COMPLETED" || r.status === "SEATED" ? r._startMs - 20 * MIN : Math.min(NOW - 10 * MIN, r._startMs - between(1, 20) * 60 * MIN);
    add("Order", {
      id: oid, restaurantId: rid, customerId: r.customerId, reservationId: r.id, tableId: r.tableId, status: orderStatus, notes: null,
      subtotal: money(subtotal), discount: money(discount), total: money(subtotal - discount),
    }, { createdAt: createdMs, updatedAt: createdMs });
    for (const [dishId, qty] of lines) {
      const d = dishById.get(dishId)!;
      counters.oi += 1;
      add("OrderItem", { id: id("DT", counters.oi), orderId: oid, menuItemId: dishId, nameSnapshot: d.name, priceSnapshot: money(d.price), quantity: qty, notes: null }, { createdAt: createdMs });
    }

    if (r.status === "COMPLETED") r._hasOrder = true;
  }

  const clientCompleted = list.filter((r) => r.status === "COMPLETED" && r.customerId === U.client).sort((a, b) => b._startMs - a._startMs);
  const skipReview = new Set(clientCompleted.slice(0, 1).map((r) => r.id)); // le plus récent reste sans avis
  for (const r of list) {
    if (r.status !== "COMPLETED" || skipReview.has(r.id) || !chance(0.6)) continue;
    const roll = rand();
    const rating = roll < 0.45 ? 5 : roll < 0.8 ? 4 : roll < 0.92 ? 3 : roll < 0.97 ? 2 : 1;
    counters.rev += 1;
    add("Review", {
      id: id("RW", counters.rev), customerId: r.customerId, restaurantId: rid, reservationId: r.id, rating, comment: pick(COMMENTS[rating]), status: "PUBLISHED",
    }, { createdAt: r._startMs + 3 * 60 * MIN });
  }
}

// Demandes d'adhésion du personnel (page Équipe du gérant).
const R1 = id("RS", 1);
counters.req += 1;
add("RestaurantMembershipRequest", { id: id("RQ", counters.req), userId: EXTRA_STAFF[5], restaurantId: R1, status: "PENDING", message: "Serveur avec 3 ans d'expérience, disponible le week-end." }, { createdAt: NOW - 1 * DAY });
counters.req += 1;
add("RestaurantMembershipRequest", { id: id("RQ", counters.req), userId: EXTRA_STAFF[6], restaurantId: R1, status: "PENDING", message: "Commis de cuisine, je cherche un poste en soirée." }, { createdAt: NOW - 2 * DAY });
counters.req += 1;
add("RestaurantMembershipRequest", { id: id("RQ", counters.req), userId: EXTRA_STAFF[7], restaurantId: R1, status: "DECLINED", message: "Candidature spontanée.", reviewedById: U.manager }, { createdAt: NOW - 9 * DAY, reviewedAt: NOW - 8 * DAY });

// Favoris : 2 à 4 restaurants par client.
for (const customer of CUSTOMERS) {
  const chosen = new Set<number>();
  const n = customer === U.client ? 4 : between(2, 4);
  while (chosen.size < n) chosen.add(between(0, SPECS.length - 1));
  for (const ri of chosen) {
    counters.fav += 1;
    add("Favorite", { id: id("FV", counters.fav), userId: customer, restaurantId: id("RS", ri + 1) }, { createdAt: NOW - between(1, 20) * DAY });
  }
}

// Notifications.
const notify = (userId: string, restaurantId: string | null, type: string, title: string, message: string, hoursAgo: number, read: boolean) => {
  counters.notif += 1;
  add("Notification", { id: id("NT", counters.notif), userId, restaurantId, type, title, message, data: null }, { createdAt: NOW - hoursAgo * 60 * MIN, readAt: read ? NOW - (hoursAgo - 1) * 60 * MIN : null as any });
  const last = docs.Notification[docs.Notification.length - 1];
  if (!read) last.readAt = null;
};
notify(U.manager, R1, "RESERVATION", "Nouvelle réservation", "Sarra Ben Salah a réservé une table pour 4 personnes ce soir à 20 h 30.", 90, false);
notify(U.manager, R1, "ORDER", "Précommande reçue", "Une précommande de 3 plats est liée à la réservation de 20 h 30.", 85, false);
notify(U.manager, R1, "STAFF_REQUEST", "Demande d'adhésion", "Un membre du personnel demande à rejoindre Dar El Jeld.", 30 * 60, false);
notify(U.manager, id("RS", 2), "REVIEW", "Nouvel avis 5 étoiles", "« Excellent repas, service impeccable. »", 6 * 60, false);
notify(U.manager, id("RS", 2), "RESERVATION", "Réservation annulée", "Une réservation de demain 19 h a été annulée par le client.", 20 * 60, true);
notify(U.manager, id("RS", 3), "SYSTEM", "Bienvenue sur Restivo", "Votre restaurant Pizzeria Napoli est publié et visible des clients.", 10 * 24 * 60, true);
notify(U.staff, R1, "RESERVATION", "Table à préparer", "La table T04 est attendue dans 20 minutes.", 40, false);
notify(U.staff, R1, "ORDER", "Commande prête", "La commande de la table T02 est prête à servir.", 100, false);
notify(U.staff, id("RS", 2), "SYSTEM", "Votre demande a été acceptée", "Vous faites maintenant partie de l'équipe du Golfe Bleu.", 12 * 24 * 60, true);
notify(U.client, R1, "RESERVATION", "Réservation confirmée", "Votre table chez Dar El Jeld est confirmée.", 60, false);
notify(U.client, R1, "ORDER", "Votre commande est en préparation", "Les cuisines préparent votre précommande.", 45, false);
notify(U.client, id("RS", 2), "REVIEW", "Laissez un avis", "Comment s'est passé votre repas au Golfe Bleu ?", 3 * 24 * 60, true);
notify(U.client, id("RS", 3), "RESERVATION", "Rappel", "Votre réservation chez Pizzeria Napoli est dans 2 jours.", 5 * 60, false);

// ─── Écriture : on efface l'ancien jeu 01FL, puis on insère ───────────────────

const ORDER = [
  "User", "Profile", "Restaurant", "RestaurantMembership", "RestaurantMembershipRequest", "BusinessHours", "Floor", "Table", "Menu",
  "MenuCategory", "MenuItem", "Promotion", "PromotionItem", "Reservation", "Order", "OrderItem", "Review", "Favorite", "Notification",
];

async function reset() {
  const restaurantIds = SPECS.map((_, i) => id("RS", i + 1));
  // Données rattachées à ces restaurants mais créées ensuite depuis l'application (id non 01FL).
  const orders = await M.Order.find({ restaurantId: { $in: restaurantIds } }, { id: 1 }).lean();
  await M.OrderItem.deleteMany({ orderId: { $in: orders.map((o: any) => o.id) } });
  for (const name of ["Order", "Reservation", "Review", "Favorite", "Notification", "RestaurantMembershipRequest", "RestaurantMembership", "Promotion", "BusinessHours", "Menu"]) {
    await M[name].deleteMany({ restaurantId: { $in: restaurantIds } });
  }
  const floors = await M.Floor.find({ restaurantId: { $in: restaurantIds } }, { id: 1 }).lean();
  await M.Table.deleteMany({ floorId: { $in: floors.map((f: any) => f.id) } });
  await M.FloorObject.deleteMany({ floorId: { $in: floors.map((f: any) => f.id) } });
  await M.Floor.deleteMany({ restaurantId: { $in: restaurantIds } });
  // Tout ce qui porte un id 01FL (y compris catégories, plats, liens de promotion, utilisateurs).
  for (const name of [...ORDER].reverse()) await M[name].deleteMany({ _id: /^01FL/ });
}

console.log("Nettoyage de l'ancien jeu de données…");
await reset();
console.log("Insertion…");
for (const name of ORDER) {
  if (docs[name].length === 0) continue;
  await M[name].insertMany(docs[name], { ordered: false });
}

// ─── Résumé ───────────────────────────────────────────────────────────────────

console.log("\nBase remplie :");
for (const name of ORDER) console.log(`  ${name.padEnd(30)} ${docs[name].length}`);
console.log("\nComptes de connexion (un par rôle) :");
for (const a of MAIN) console.log(`  ${a.key.padEnd(8)} ${a.email.padEnd(24)} mot de passe : ${a.password}`);
console.log("\nLe restaurant de démo (01DM) et le mode « Démo automatique » ne sont pas modifiés.");

await db.close();
process.exit(0);
