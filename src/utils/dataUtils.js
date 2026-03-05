/**
 * dataUtils.js
 */

export function generateDemoData(weeks = 53) {
  const cells = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - weeks * 7);

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      if (date > today) continue;

      const r = Math.random();
      // More realistic distribution: bursts of activity
      let count = 0;
      if (r > 0.45) {
        const burst = Math.random();
        if (burst > 0.85) count = Math.floor(Math.random() * 20) + 10; // heavy day
        else if (burst > 0.5) count = Math.floor(Math.random() * 8) + 2; // normal day
        else count = Math.floor(Math.random() * 3) + 1; // light day
      }

      cells.push({ date: date.toISOString().slice(0, 10), count, week: w, day: d });
    }
  }
  return cells;
}

export function computeStats(data) {
  const total    = data.reduce((s, c) => s + c.count, 0);
  const maxCount = data.length ? Math.max(...data.map((c) => c.count)) : 0;
  const busiest  = data.find((c) => c.count === maxCount) ?? null;

  // Streak calculation (over calendar days in order)
  let maxStreak = 0, cur = 0;
  data.forEach((c) => {
    if (c.count > 0) { cur++; if (cur > maxStreak) maxStreak = cur; }
    else cur = 0;
  });

  let curStreak = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].count > 0) curStreak++;
    else break;
  }

  // Average per active day
  const activeDays = data.filter((c) => c.count > 0).length;
  const avgPerDay  = activeDays ? Math.round(total / activeDays) : 0;

  return { total, maxCount, busiest, maxStreak, curStreak, activeDays, avgPerDay };
}

/**
 * Build month labels — one per unique calendar month.
 * Uses the FIRST week that contains any day of that month.
 */
export function buildMonthLabels(data) {
  const seenMonthYear = new Set();
  const labels = [];

  // Walk week by week (Sunday of each week)
  const byWeek = {};
  data.forEach((c) => {
    if (!byWeek[c.week]) byWeek[c.week] = [];
    byWeek[c.week].push(c);
  });

  Object.keys(byWeek)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((week) => {
      // Use Sunday (day=0) of this week if available, else first cell
      const sunday = byWeek[week].find((c) => c.day === 0) || byWeek[week][0];
      const d      = new Date(sunday.date);
      const key    = `${d.getFullYear()}-${d.getMonth()}`;
      if (!seenMonthYear.has(key)) {
        seenMonthYear.add(key);
        labels.push({
          week,
          label: d.toLocaleString("default", { month: "short" }),
        });
      }
    });

  return labels;
}

export function normaliseContributions(raw) {
  const sorted = [...raw].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!sorted.length) return [];

  const startDate = new Date(sorted[0].date);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  return sorted.map((item) => {
    const d = new Date(item.date);
    const daysSinceStart = Math.round((d - startDate) / 86400000);
    return {
      date:  item.date,
      count: item.count,
      week:  Math.floor(daysSinceStart / 7),
      day:   d.getDay(),
    };
  });
}

/** @typedef {{ date: string, count: number, week: number, day: number }} ContributionCell */
