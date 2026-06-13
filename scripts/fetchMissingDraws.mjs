/**
 * Script one-shot pour récupérer les tirages manquants depuis juillet 2024.
 *
 * Sources :
 *  - EuroMillions : loterieplus.com (tirages séquentiels 1758→dernier)
 *  - Loto         : loterieplus.com (formulaire POST sur 72 dates récentes)
 *
 * Résultat stocké dans public/historical-supplement.json
 * Relancer ce script pour mettre à jour les données.
 *
 * Usage : node scripts/fetchMissingDraws.mjs
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "../public/historical-supplement.json");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept-Language": "fr-FR,fr;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const DELAY_MS = 300; // politesse entre les requêtes

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── EuroMillions via loterieplus.com ────────────────────────────────────────

/**
 * Récupère un tirage EuroMillions par son numéro séquentiel.
 * loterieplus.com accepte n'importe quel slug si le numéro est correct.
 *
 * @param {number} num - Numéro séquentiel du tirage (ex: 1758)
 * @returns {{ date: string, numbers: number[], stars: number[] } | null}
 */
async function fetchEuroTirage(num) {
  const url = `https://www.loterieplus.com/euromillions/resultat/tirage${num}_x.html`;
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Récupère la date depuis l'URL canonique (slug)
    const canonMatch = html.match(
      /rel="canonical" href="[^"]*tirage\d+_([A-Za-z]+-\d+-[A-Za-zûàéèê]+-\d{4})\.html"/
    );
    if (!canonMatch) return null;

    const slug = canonMatch[1]; // ex: "Vendredi-26-juillet-2024"
    const isoDate = parseSlugDate(slug);
    if (!isoDate) return null;

    // Numéros principaux (tdnum) et étoiles (tdeto)
    const nums = [...html.matchAll(/<td class="tdnum">(\d+)<\/td>/g)].map((m) =>
      parseInt(m[1])
    );
    const stars = [...html.matchAll(/<td class="tdeto">(\d+)<\/td>/g)].map((m) =>
      parseInt(m[1])
    );

    if (nums.length !== 5 || stars.length !== 2) return null;
    if (nums.some((n) => n < 1 || n > 50)) return null;
    if (stars.some((s) => s < 1 || s > 12)) return null;

    return {
      date: isoDate,
      numbers: nums.sort((a, b) => a - b),
      stars: stars.sort((a, b) => a - b),
    };
  } catch {
    return null;
  }
}

// ─── Loto ─────────────────────────────────────────────────────────────────────
//
// Le Loto n'est pas accessible via loterieplus.com pour les années passées :
// le formulaire Loto utilise JavaScript pour charger les données historiques
// (les années != l'année en cours retournent une page vide côté serveur).
//
// Les données Loto proviennent donc uniquement de :
//   - CSV FDJ (2008 – juillet 2024)
//   - Scraping FDJ récent (~5 derniers tirages, dans l'API route)
// La période août 2024 – décembre 2025 (~220 tirages) est inaccessible gratuitement.

// ─── Utilitaires ──────────────────────────────────────────────────────────────

const FR_MONTHS = {
  janvier: "01", février: "02", mars: "03", avril: "04",
  mai: "05", juin: "06", juillet: "07", août: "08",
  septembre: "09", octobre: "10", novembre: "11", décembre: "12",
  aout: "08", fevrier: "02",
};

/**
 * Parse un slug loterieplus en date ISO (YYYY-MM-DD).
 * Slug format: "Vendredi-26-juillet-2024"
 */
function parseSlugDate(slug) {
  const parts = slug.toLowerCase().split("-");
  // Format: [jour_semaine, jour, mois, annee]
  // Attention: certains mois contiennent des accents
  const year = parts[parts.length - 1];
  const monthStr = parts[parts.length - 2];
  const day = parts[parts.length - 3];

  const month = FR_MONTHS[monthStr];
  if (!month || !year || !day) return null;
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎲 Récupération des tirages manquants...\n");

  // Charge les données existantes
  let existing = { loto: [], euro: [], generatedAt: "" };
  if (existsSync(OUT_FILE)) {
    try {
      existing = JSON.parse(readFileSync(OUT_FILE, "utf8"));
      console.log(
        `📂 Existant : ${existing.loto.length} loto + ${existing.euro.length} euro\n`
      );
    } catch {}
  }

  const existingLotoDates = new Set(existing.loto.map((d) => d.date));
  const existingEuroDates = new Set(existing.euro.map((d) => d.date));

  // ── 1. EuroMillions (loterieplus.com tirages séquentiels) ──────────────────

  // Le tirage 1757 = mardi 23 juillet 2024 (couvert par CSV FDJ)
  // On commence à 1758 = vendredi 26 juillet 2024
  const EURO_START = 1758; // premier tirage après le CSV FDJ

  // Récupère le numéro du dernier tirage disponible
  let euroEnd = EURO_START;
  console.log("⭐ Détermination du dernier tirage EuroMillions...");
  try {
    const res = await fetch(
      "https://www.loterieplus.com/euromillions/resultat/tirage.php",
      { headers: HEADERS, signal: AbortSignal.timeout(10000) }
    );
    if (res.ok) {
      const html = await res.text();
      const nums = [...html.matchAll(/tirage(\d+)_/g)].map((m) => parseInt(m[1]));
      if (nums.length > 0) euroEnd = Math.max(...nums);
    }
  } catch {}

  // Fallback: cherche sur la page principale
  if (euroEnd === EURO_START) {
    try {
      const res = await fetch("https://www.loterieplus.com/euromillions/resultat/", {
        headers: HEADERS,
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const html = await res.text();
        const nums = [...html.matchAll(/tirage(\d+)_/g)].map((m) => parseInt(m[1]));
        if (nums.length > 0) euroEnd = Math.max(...nums);
      }
    } catch {}
  }

  console.log(`   Tirages EuroMillions à récupérer : ${EURO_START} → ${euroEnd}`);
  console.log(`   Total à scraper : ${euroEnd - EURO_START + 1} tirages\n`);

  const newEuroDraws = [];
  let euroOk = 0, euroSkip = 0, euroFail = 0;

  console.log("⭐ Scraping EuroMillions...");
  for (let num = EURO_START; num <= euroEnd; num++) {
    const progressPct = Math.round(((num - EURO_START) / (euroEnd - EURO_START + 1)) * 100);
    if (num % 10 === 0) process.stdout.write(`\r   Progress: ${progressPct}% (tirage ${num})`);

    // Skip si déjà récupéré (vérif par numéro → date)
    const draw = await fetchEuroTirage(num);
    if (!draw) {
      euroFail++;
      continue;
    }

    if (existingEuroDates.has(draw.date)) {
      euroSkip++;
    } else {
      existingEuroDates.add(draw.date);
      newEuroDraws.push(draw);
      euroOk++;
    }

    await sleep(DELAY_MS);
  }

  console.log(
    `\n   ✅ Euro : ${euroOk} nouveaux, ${euroSkip} déjà connus, ${euroFail} erreurs\n`
  );

  // ── 2. Loto ────────────────────────────────────────────────────────────────
  // Le Loto historique n'est pas scrapable depuis loterieplus.com (JavaScript requis).
  // Les données Loto dans le supplement viennent du scraping FDJ récent (routes API).
  console.log("🎱 Loto : pas de scraping disponible (données via CSV FDJ + API route)\n");
  const newLotoDraws = [];

  // ── 3. Fusion et sauvegarde ────────────────────────────────────────────────

  const allEuro = [...existing.euro, ...newEuroDraws].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const allLoto = [...existing.loto, ...newLotoDraws].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  // Déduplique
  const dedupeByDate = (arr) => {
    const seen = new Set();
    return arr.filter((d) => {
      if (seen.has(d.date)) return false;
      seen.add(d.date);
      return true;
    });
  };

  const output = {
    generatedAt: new Date().toISOString(),
    loto: dedupeByDate(allLoto),
    euro: dedupeByDate(allEuro),
  };

  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Terminé !");
  console.log(`   Loto         : ${output.loto.length} tirages dans le supplément`);
  console.log(`   EuroMillions : ${output.euro.length} tirages (2024-07-26 → présent)`);
  console.log("   Fichier      : public/historical-supplement.json");
  console.log("\n⚠️  Note Loto : août 2024–déc. 2025 inaccessible librement (~220 tirages).");
  console.log("    Stats Loto : 2008–2024 (CSV FDJ) + 2026–présent (scraping API FDJ).");
}

main().catch(console.error);
