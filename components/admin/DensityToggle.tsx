'use client';

import React, { useState } from 'react';
import { Rows3, Rows4 } from 'lucide-react';

type Density = 'comfortable' | 'compact';

const META: Record<Density, { icon: React.ElementType; label: string }> = {
  comfortable: { icon: Rows3, label: 'Linhas confortáveis' },
  compact: { icon: Rows4, label: 'Linhas compactas' },
};

/**
 * Confortável × compacto. Num painel de operação com tabelas de 8 colunas, quem
 * passa o dia aqui quer mais linhas por tela; quem entra de vez em quando quer
 * respiro. A escolha vai para cookie e a casca já renderiza no servidor com o
 * atributo certo — nada de pulo de layout na hidratação.
 */
export function DensityToggle({ initial }: { initial: Density }) {
  const [density, setDensity] = useState<Density>(initial);
  const { icon: Icon, label } = META[density];

  const toggle = () => {
    const next: Density = density === 'compact' ? 'comfortable' : 'compact';
    setDensity(next);
    document.cookie = `lume_admin_density=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.querySelectorAll('[data-density]').forEach(el => el.setAttribute('data-density', next));
  };

  return (
    <button
      type="button" onClick={toggle} title={`${label} — clique para trocar`} aria-label={label}
      className="inline-flex items-center justify-center h-8 w-8 rounded-[4px] border border-line text-muted hover:text-ink hover:bg-surface-2 transition-colors"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

export default DensityToggle;
