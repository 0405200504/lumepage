'use client';

import React from 'react';
import { useVisualEditor, type EditableTabId } from './VisualEditorContext';
import { Pencil, Camera } from 'lucide-react';

interface CanvaElementProps {
  tab: EditableTabId;
  fieldId: string;
  label: string;
  kind?: 'text' | 'image' | 'theme' | 'service';
  imageKind?: string;
  currentValue?: string;
  className?: string;
  children: React.ReactNode;
}

export function CanvaElement({
  tab,
  fieldId,
  label,
  kind = 'text',
  imageKind = 'geral',
  currentValue,
  className = '',
  children,
}: CanvaElementProps) {
  const visual = useVisualEditor();

  if (!visual || !visual.active) {
    return <>{children}</>;
  }

  const isSelected = visual.selectedField === fieldId;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    visual.selectField({
      tab,
      fieldId,
      label,
      kind,
      imageKind,
      currentValue,
    });

    if (kind === 'image') {
      visual.openQuickImage({
        fieldId,
        label,
        currentUrl: currentValue,
        imageKind,
      });
    }
  };

  return (
    <div
      onClick={handleClick}
      data-canva-field={fieldId}
      className={`group/canva relative transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'outline outline-2 outline-wine-700 outline-offset-2 ring-4 ring-wine-700/20 z-20'
          : 'hover:outline hover:outline-1 hover:outline-dashed hover:outline-wine-600 hover:outline-offset-1 hover:bg-wine-500/5'
      } ${className}`}
      style={{ borderRadius: 'inherit' }}
    >
      {children}

      {/* Badge Flutuante estilo Canva */}
      <span
        className={`absolute top-0 right-0 -translate-y-full mb-1 z-30 pointer-events-none opacity-0 group-hover/canva:opacity-100 transition-opacity inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded shadow-md ${
          isSelected
            ? 'opacity-100 bg-wine-700 text-white'
            : 'bg-n-900/90 text-white backdrop-blur-xs'
        }`}
      >
        {kind === 'image' ? (
          <Camera className="h-2.5 w-2.5" />
        ) : (
          <Pencil className="h-2.5 w-2.5" />
        )}
        <span>{label}</span>
      </span>

      {/* Alças de canto estilo Canva quando selecionado */}
      {isSelected && (
        <>
          <span className="absolute -top-1 -left-1 h-2 w-2 bg-white border-2 border-wine-700 rounded-xs pointer-events-none z-30 shadow-xs" />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-white border-2 border-wine-700 rounded-xs pointer-events-none z-30 shadow-xs" />
          <span className="absolute -bottom-1 -left-1 h-2 w-2 bg-white border-2 border-wine-700 rounded-xs pointer-events-none z-30 shadow-xs" />
          <span className="absolute -bottom-1 -right-1 h-2 w-2 bg-white border-2 border-wine-700 rounded-xs pointer-events-none z-30 shadow-xs" />
        </>
      )}
    </div>
  );
}
