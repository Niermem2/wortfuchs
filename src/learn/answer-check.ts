/* Antwortprüfung fürs Tippen: Varianten („sein; existieren"), Klammer-Zusätze
   und optional Tippfehler werden toleriert. Die Toleranz ist ein Prozentwert
   der Wortlänge (0 = exakte Schreibweise). */

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

/** Levenshtein-Distanz; bricht früh ab (liefert dann max + 1), wenn max überschritten ist. */
function levenshtein(a: string, b: string, max: number): number {
  const m = a.length
  const n = b.length
  if (Math.abs(m - n) > max) return max + 1
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      if (cur[j] < rowMin) rowMin = cur[j]
    }
    if (rowMin > max) return max + 1
    prev = cur
  }
  return prev[n]
}

/** Erlaubte Tippfehler für ein Wort dieser Länge: Prozent der Länge, abgerundet. */
export function allowedTypos(length: number, tolerancePercent: number): number {
  if (!(tolerancePercent > 0)) return 0
  return Math.floor((length * tolerancePercent) / 100)
}

export function checkAnswer(expected: string, given: string, tolerancePercent: number): boolean {
  const g = normalize(given)
  if (!g) return false
  for (const v of variants(expected)) {
    // "to be" auch ohne "to" gelten lassen
    const candidates = v.startsWith('to ') ? [v, v.slice(3)] : [v]
    for (const c of candidates) {
      if (c === g) return true
      const max = allowedTypos(c.length, tolerancePercent)
      if (max > 0 && levenshtein(c, g, max) <= max) return true
    }
  }
  return false
}
