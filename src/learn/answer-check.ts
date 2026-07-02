/* Antwortprüfung fürs Tippen: Varianten („sein; existieren"), Klammer-Zusätze
   und optional ein Tippfehler werden toleriert. */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[.!?…]/g, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function variants(expected: string): string[] {
  return expected
    .split(/[;/]/)
    .map(normalize)
    .filter(Boolean)
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (Math.abs(m - n) > 1) return 2
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = cur
  }
  return prev[n]
}

export function checkAnswer(expected: string, given: string, typoTolerance: boolean): boolean {
  const g = normalize(given)
  if (!g) return false
  for (const v of variants(expected)) {
    if (v === g) return true
    // "to be" auch ohne "to" gelten lassen
    if (v.startsWith('to ') && v.slice(3) === g) return true
    if (typoTolerance && v.length > 4 && levenshtein(v, g) <= 1) return true
  }
  return false
}
