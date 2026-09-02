'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type EditableTabId =
  | 'template' | 'identity' | 'theme' | 'content' | 'services'
  | 'gallery' | 'beforeAfter' | 'testimonials' | 'extras' | 'sections' | 'address';

export interface VisualElementPayload {
  tab: EditableTabId;
  fieldId: string;
  label: string;
  kind?: 'text' | 'image' | 'theme' | 'service';
  currentValue?: string;
  imageKind?: string;
}

export interface VisualEditorContextValue {
  active: boolean;
  setActive: (active: boolean) => void;
  selectedField: string | null;
  selectField: (payload: VisualElementPayload) => void;
  quickImageModal: {
    isOpen: boolean;
    fieldId: string;
    label: string;
    currentUrl?: string;
    imageKind?: string;
  };
  openQuickImage: (payload: { fieldId: string; label: string; currentUrl?: string; imageKind?: string }) => void;
  closeQuickImage: () => void;
}

const VisualEditorContext = createContext<VisualEditorContextValue | null>(null);

export function VisualEditorProvider({
  active = true,
  onSelectField,
  onOpenQuickImage,
  children,
}: {
  active?: boolean;
  onSelectField?: (payload: VisualElementPayload) => void;
  onOpenQuickImage?: (payload: { fieldId: string; label: string; currentUrl?: string; imageKind?: string }) => void;
  children: React.ReactNode;
}) {
  const [isActive, setIsActive] = useState(active);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [quickImageModal, setQuickImageModal] = useState<{
    isOpen: boolean;
    fieldId: string;
    label: string;
    currentUrl?: string;
    imageKind?: string;
  }>({
    isOpen: false,
    fieldId: '',
    label: '',
  });

  const selectField = useCallback((payload: VisualElementPayload) => {
    setSelectedField(payload.fieldId);
    onSelectField?.(payload);
  }, [onSelectField]);

  const openQuickImage = useCallback((payload: { fieldId: string; label: string; currentUrl?: string; imageKind?: string }) => {
    setQuickImageModal({
      isOpen: true,
      ...payload,
    });
    onOpenQuickImage?.(payload);
  }, [onOpenQuickImage]);

  const closeQuickImage = useCallback(() => {
    setQuickImageModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <VisualEditorContext.Provider
      value={{
        active: isActive,
        setActive: setIsActive,
        selectedField,
        selectField,
        quickImageModal,
        openQuickImage,
        closeQuickImage,
      }}
    >
      {children}
    </VisualEditorContext.Provider>
  );
}

export function useVisualEditor() {
  return useContext(VisualEditorContext);
}
