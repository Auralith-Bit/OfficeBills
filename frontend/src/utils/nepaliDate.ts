import NepaliDate from 'nepali-date-converter';

export const BS_MONTHS = ['Baishakh','Jestha','Ashadh','Shrawan','Bhadau','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
const pad = (n: number) => String(n).padStart(2, '0');

export interface BSDate { year: number; month: number; day: number; formatted: string; monthName: string; shortLabel: string; }

export function toBS(date: Date = new Date()): BSDate {
  const nd = new NepaliDate(date);
  const year = nd.getYear(), month = nd.getMonth(), day = nd.getDate();
  return {
    year, month, day,
    formatted: `${year}-${pad(month + 1)}-${pad(day)}`,
    monthName: BS_MONTHS[month],
    shortLabel: `${BS_MONTHS[month].slice(0, 3)} ${day}`,
  };
}

export const todayBS = () => toBS(new Date());

export function last7DaysBS(): BSDate[] {
  const out: BSDate[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    out.push(toBS(d));
  }
  return out;
}

/** Nepal fiscal year: Shrawan 1 → Ashadh end */
export function fiscalYearBS(ref = todayBS()): string {
  const startY = ref.month >= 3 ? ref.year : ref.year - 1;
  return `${startY}/${String((startY + 1) % 100).padStart(2, '0')}`;
}

export const formatNPR = (n: number) => `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const formatNPRCompact = (n: number) => `Rs. ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;