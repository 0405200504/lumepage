'use client';

import React, { useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const NEXT: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };
const META: Record<Theme, { icon: React.ElementType; label: string }> = {
  light: { icon: Sun, label: 'Tema claro' },
  dark: { icon: Moon, label: 'Tema escuro' },
  system: { icon: Monitor, label: 'Tema do sistema' },
};

/**
 * Alterna claro / escuro / sistema. A escolha vai para um cookie e a casca do admin
 * já renderiza com o atributo certo no servidor — sem piscar branco no carregamento.
 */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const { icon: Icon, label } = META[theme];

  const cycle = () => {
    const next = NEXT[theme];
    setTheme(next);
    document.cookie = `lume_admin_theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    // Aplica na hora, sem esperar navegação.
    document.querySelectorAll('[data-theme]').forEach(el => el.setAttribute('data-theme', next));
  };

  return (
    <button type="button" onClick={cycle} title={`${label} — clique para trocar`} aria-label={label}
      className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-line bg-surface text-muted hover:text-ink hover:bg-surface-2 transition-colors">
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

export default ThemeToggle;
