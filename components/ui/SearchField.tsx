'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

/**
 * Campo de busca das telas de tabela (serviços, contatos, agendamentos,
 * bloqueios, fila…).
 *
 * Existe como primitivo por um motivo prático: input + ícone posicionado +
 * botão de limpar é a combinação que cada tela remontava do zero, e é fácil
 * errar o padding e deixar o texto passar por cima do ícone. Aqui o
 * espaçamento é resolvido uma vez.
 */
export const SearchField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Rótulo para leitor de tela. Obrigatório: não há <label> visível. */
  label: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Buscar', label, className = '' }) => (
  <div className={`relative ${className}`}>
    <Search
      className="h-4 w-4 text-n-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
      aria-hidden
    />
    <input
      type="search"
      className="field-input pl-9 pr-9"
      placeholder={placeholder}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Limpar busca"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-badge text-n-500 hover:bg-n-100 hover:text-heading transition-ui"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

export default SearchField;
