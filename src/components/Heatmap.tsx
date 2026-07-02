import { localDay } from '../learn/stats'
import './ui.css'

const WEEKS = 12

/** Lernaktivität der letzten 12 Wochen als Kalender-Heatmap (Zeilen = Mo–So) */
export function Heatmap({ byDay }: { byDay: Map<string, number> }) {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  // bis zum Sonntag der laufenden Woche auffüllen
  const daysToSunday = 6 - ((end.getDay() + 6) % 7)
  const last = new Date(end)
  last.setDate(last.getDate() + daysToSunday)

  const columns: { date: string; count: number; future: boolean }[][] = []
  for (let w = WEEKS - 1; w >= 0; w--) {
    const col: { date: string; count: number; future: boolean }[] = []
    for (let d = 6; d >= 0; d--) {
      const day = new Date(last)
      day.setDate(day.getDate() - w * 7 - d)
      col.push({
        date: localDay(day),
        count: byDay.get(localDay(day)) ?? 0,
        future: day > end,
      })
    }
    columns.push(col)
  }

  const level = (n: number) => (n === 0 ? 0 : n < 10 ? 1 : n < 20 ? 2 : n < 40 ? 3 : 4)

  return (
    <div className="heatmap" role="img" aria-label="Lernaktivität der letzten 12 Wochen">
      {columns.map((col, i) => (
        <div key={i} className="heatmap__col">
          {col.map((day) => (
            <span
              key={day.date}
              className={`heatmap__cell ${day.future ? 'heatmap__cell--future' : `heatmap__cell--${level(day.count)}`}`}
              title={`${day.date}: ${day.count} Karten`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
