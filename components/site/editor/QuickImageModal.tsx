'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Trash2, Camera, Loader2, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { uploadSiteImage } from './uploadImage';

interface QuickImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  fieldId: string;
  currentUrl?: string;
  imageKind?: string;
  professionalId: string;
  onUpdateImage: (fieldId: string, newUrl: string) => void;
  onError: (msg: string) => void;
}

export function QuickImageModal({
  isOpen,
  onClose,
  label,
  fieldId,
  currentUrl,
  imageKind = 'geral',
  professionalId,
  onUpdateImage,
  onError,
}: QuickImageModalProps) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    const res = await uploadSiteImage(professionalId, file, imageKind);
    setBusy(false);

    if (res.ok && res.url) {
      onUpdateImage(fieldId, res.url);
      onClose();
    } else {
      onError(res.error || 'Não foi possível enviar a imagem.');
    }
  };

  const handleRemove = () => {
    onUpdateImage(fieldId, '');
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Alterar ${label || 'Imagem'}`}
      trail={['Página', 'Trocar Foto']}
      className="max-w-md"
      footer={
        <div className="flex items-center justify-between w-full">
          {currentUrl ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remover foto
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-bold text-n-600 hover:text-n-800 transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-wine-700 hover:bg-wine-800 text-white text-[12px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Escolher nova foto
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 select-none py-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="text-center">
          {currentUrl ? (
            <div className="relative mx-auto w-48 aspect-square rounded-2xl overflow-hidden border-2 border-n-200 shadow-inner bg-n-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUrl}
                alt={label}
                className="w-full h-full object-cover"
              />
              {busy && (
                <div className="absolute inset-0 bg-black/50 grid place-items-center text-white">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => inputRef.current?.click()}
              className="mx-auto w-48 aspect-square rounded-2xl border-2 border-dashed border-n-300 hover:border-wine-700 bg-n-50 hover:bg-wine-50/30 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <div className="h-10 w-10 rounded-full bg-white border border-n-200 flex items-center justify-center text-n-500 shadow-2xs">
                <Camera className="h-5 w-5" />
              </div>
              <span className="text-[12px] font-bold text-n-700">
                Enviar foto agora
              </span>
              <span className="text-[10px] text-n-400">JPG, PNG ou WEBP até 5MB</span>
            </div>
          )}
        </div>

        <p className="text-[11px] text-n-500 text-center leading-relaxed">
          Sua foto é otimizada e cortada automaticamente no formato ideal.
        </p>
      </div>
    </Modal>
  );
}
