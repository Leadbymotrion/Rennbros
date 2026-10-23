/**
 * Is a typed address complete enough to check the area and send us there?
 * It needs a civic number and a street name: "245 rue" or "245" alone is not
 * an address, though a geocoder will happily place it in the middle of a town.
 * Street types and little words don't count as the name.
 */
const GENERIC = new Set([
  // French street types and articles
  "rue", "avenue", "av", "ave", "boulevard", "boul", "bd", "chemin", "ch", "route", "rte", "montee", "rang", "place", "pl",
  "croissant", "terrasse", "impasse", "allee", "carre", "cote", "promenade", "sentier", "voie", "de", "du", "des", "la", "le", "les", "l", "d",
  // English street types
  "street", "st", "road", "rd", "drive", "dr", "court", "ct", "crescent", "cres", "lane", "ln", "way", "circle", "cir", "blvd", "the",
  // Directions and unit words
  "n", "s", "e", "o", "w", "nord", "sud", "est", "ouest", "north", "south", "east", "west", "apt", "app", "unit", "suite",
]);

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** The town typed after the first comma ("12 Lakeshore Rd, Beaconsfield"),
 *  if any, matches the geocoder's town: guards against a fuzzy match to the
 *  same street name in another town. No town typed: nothing to compare. */
export function sameTown(raw: string, found?: string): boolean {
  const typed = fold(raw.split(",")[1] ?? "").replace(/\b(qc|quebec|canada)\b|[a-z]\d[a-z] ?\d[a-z]\d/g, "").replace(/[^a-z]/g, "");
  if (!typed || !found) return true;
  const got = fold(found).replace(/[^a-z]/g, "");
  return got.includes(typed) || typed.includes(got);
}

export function addressComplete(raw: string): boolean {
  const first = fold(raw.split(",")[0]).trim();
  if (!/\d/.test(first)) return false;
  const words = first.split(/[^a-z0-9]+/).filter(Boolean);
  // At least one real word of two letters or more besides the number and street type ("Principale", "Lakeshore", "101e" counts too).
  return words.some((w) => (/[a-z]{2,}/.test(w) && !GENERIC.has(w)) || /^\d+(e|er|re|nd|rd|th|st)$/.test(w) && words.length > 2);
}
