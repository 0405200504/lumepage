'use client';

import React from 'react';

export interface ChannelItem {
  name: string;
  count: number;
  revenue: number;
  share: number; // 0 to 100
}

interface ChannelMatrixChartProps {
  items: ChannelItem[];
  format?: (v: number) => string;
  className?: string;
}

/**
 * Matriz de Telhas/Blocos Futuristas (estilo referência "Order - Base on social media").
 * Exibe a distribuição de volume/receita por canal ou método através de telhas com intensidade de cor.
 */
export const ChannelMatrixChart: React.FC<ChannelMatrixChartProps> = ({
  items,
  format = String,
  className = '',
}) => {
  if (!items || items.length === 0) return null;

  const totalCols = 10;

  return (
    <div className={`space-y-3.5 ${className}`}>
      {items.map((item) => {
        const activeTiles = Math.max(1, Math.round((item.share / 100) * totalCols));

        return (
          <div key={item.name} className="flex items-center justify-between gap-4 group">
            {/* Nome do Canal */}
            <span className="text-caption font-bold text-heading w-24 sm:w-28 shrink-0 truncate">
              {item.name}
            </span>

            {/* Matriz de Telhas Arredondadas */}
            <div className="flex-1 flex items-center gap-1 sm:gap-1.5 overflow-hidden">
              {Array.from({ length: totalCols }).map((_, tileIdx) => {
                const isActive = tileIdx < activeTiles;
                // Gradiente de intensidade da telha
                const opacity = isActive ? 0.35 + (tileIdx / activeTiles) * 0.65 : 0.08;

                return (
                  <div
                    key={tileIdx}
                    className="h-5 sm:h-6 flex-1 rounded-md sm:rounded-lg transition-all duration-300 transform group-hover:scale-105"
                    style={{
                      backgroundColor: isActive ? 'var(--color-wine-700)' : 'var(--color-n-300)',
                      opacity: opacity,
                      boxShadow: isActive ? '0 1px 4px rgba(107, 21, 37, 0.2)' : 'none',
                    }}
                    title={`${item.name}: ${item.share}%`}
                  />
                );
              })}
            </div>

            {/* Valor / Participação à direita */}
            <div className="text-right shrink-0 min-w-[70px]">
              <span className="text-caption font-bold text-heading num block">
                {format(item.revenue)}
              </span>
              <span className="text-micro font-semibold text-n-400 block">
                {item.share}% ({item.count}x)
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChannelMatrixChart;
