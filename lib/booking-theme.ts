export type BookingTheme = 'sparkles' | 'stars' | 'flowers' | 'hearts' | 'none';

export const BOOKING_THEMES: { id: BookingTheme; label: string; emoji: string }[] = [
  { id: 'sparkles', label: 'Brilhos', emoji: '✨' },
  { id: 'stars', label: 'Estrelas', emoji: '⭐' },
  { id: 'flowers', label: 'Flores', emoji: '🌸' },
  { id: 'hearts', label: 'Corações', emoji: '🤍' },
  { id: 'none', label: 'Nenhum', emoji: '∅' },
];

export const DEFAULT_BOOKING_THEME: BookingTheme = 'sparkles';

export function normalizeTheme(v?: string | null): BookingTheme {
  const ok = BOOKING_THEMES.some(t => t.id === v);
  return (ok ? v : DEFAULT_BOOKING_THEME) as BookingTheme;
}
