/**
 * Feriados nacionais brasileiros (fixos + móveis baseados na Páscoa).
 * Cálculo 100% local — sem dependências externas.
 */

export interface Holiday {
  date: string; // "YYYY-MM-DD"
  name: string;
  type: 'nacional' | 'movel';
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toISO(year: number, month1: number, day: number): string {
  return `${year}-${pad(month1)}-${pad(day)}`;
}

/**
 * Algoritmo de Meeus/Jones/Butcher para o Domingo de Páscoa.
 */
function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=março, 4=abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/** Soma `days` dias a uma data (ano, mês1, dia) e devolve ISO. */
function addDaysISO(year: number, month1: number, day: number, days: number): string {
  const d = new Date(Date.UTC(year, month1 - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Lista de feriados nacionais para um ano. */
export function getBrazilHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  const eY = year;
  const eM = easter.month;
  const eD = easter.day;

  const carnaval = addDaysISO(eY, eM, eD, -47);
  const sextaSanta = addDaysISO(eY, eM, eD, -2);
  const pascoa = toISO(eY, eM, eD);
  const corpusChristi = addDaysISO(eY, eM, eD, 60);

  const list: Holiday[] = [
    { date: toISO(year, 1, 1), name: 'Confraternização Universal', type: 'nacional' },
    { date: carnaval, name: 'Carnaval', type: 'movel' },
    { date: sextaSanta, name: 'Sexta-feira Santa', type: 'movel' },
    { date: pascoa, name: 'Páscoa', type: 'movel' },
    { date: toISO(year, 4, 21), name: 'Tiradentes', type: 'nacional' },
    { date: toISO(year, 5, 1), name: 'Dia do Trabalho', type: 'nacional' },
    { date: corpusChristi, name: 'Corpus Christi', type: 'movel' },
    { date: toISO(year, 9, 7), name: 'Independência do Brasil', type: 'nacional' },
    { date: toISO(year, 10, 12), name: 'Nossa Senhora Aparecida', type: 'nacional' },
    { date: toISO(year, 11, 2), name: 'Finados', type: 'nacional' },
    { date: toISO(year, 11, 15), name: 'Proclamação da República', type: 'nacional' },
    { date: toISO(year, 11, 20), name: 'Consciência Negra', type: 'nacional' },
    { date: toISO(year, 12, 25), name: 'Natal', type: 'nacional' },
  ];
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/** Mapa { "YYYY-MM-DD": Holiday } para 1+ anos. */
export function getHolidayMap(years: number[]): Record<string, Holiday> {
  const map: Record<string, Holiday> = {};
  for (const y of years) {
    for (const h of getBrazilHolidays(y)) {
      map[h.date] = h;
    }
  }
  return map;
}
