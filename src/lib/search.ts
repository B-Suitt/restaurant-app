const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Indica si `text` contiene `query`, sin distinguir mayúsculas ni tildes ("limon" encuentra "Limón"). */
export function matchesText(text: string, query: string) {
  const q = query.trim();
  return !q || normalize(text).includes(normalize(q));
}
