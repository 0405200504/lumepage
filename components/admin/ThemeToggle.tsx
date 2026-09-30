'use client';

import React, { useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

/** Cookie de um ano + aplicação imediata na casca, sem esperar navegação. */
function persistTheme(next: Theme) {
  document.cookie = `lume_admin_theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  document.querySelectorAll('[data-theme]').forEach(el => el.setAttribute('data-theme', next));
}

const OPTIONS: { value: Theme; icon: React.ElementType; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Claro' },
  { value: 'dark', icon: Moon, label: 'Escuro' },
  { value: 'system', icon: Monitor, label: 'Sistema' },
];

/**
 * Tema do admin, em segmented. A escolha vai para cookie e a casca já renderiza
 * com o atributo certo no servidor — sem piscar branco no carregamento.
 * Mora em Sistema › Configurações: preferência não é ação de tela.
 */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  const apply = (next: Theme) => {
    setTheme(next);
    persistTheme(next);
  };

  return (
    <div className="segmented" role="radiogroup" aria-label="Tema do painel">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          data-active={theme === value ? 'true' : undefined}
          onClick={() => apply(value)}
        >
          <Icon className="h-4 w-4" aria-hidden /> {label}
        </button>
      ))}
    </div>
  );
}

export default ThemeToggle;
