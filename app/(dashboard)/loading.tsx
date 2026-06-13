import React from 'react';

/**
 * Loading da área de conteúdo (a casca — navegação/header — permanece fixa).
 * Skeleton leve, sem overlay de tela cheia nem blur, para a troca de aba
 * parecer instantânea (cara de app nativo).
 */
export default function Loading() {
  return (
    <div className="space-y-4 animate-fade-up">
      <div className="h-24 rounded-3xl bg-gray-150/60" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-28 rounded-3xl bg-gray-150/60" />
        <div className="h-28 rounded-3xl bg-gray-150/60" />
        <div className="h-28 rounded-3xl bg-gray-150/60" />
        <div className="h-28 rounded-3xl bg-gray-150/60" />
      </div>
      <div className="h-64 rounded-3xl bg-gray-150/50" />
    </div>
  );
}
