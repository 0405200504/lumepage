'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles, Check, ArrowRight, ChevronDown, ChevronUp,
  LayoutTemplate, Scissors, Clock, Calendar, Share2,
  Copy, CheckCheck, ExternalLink, HelpCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { OPEN_WELCOME_EVENT } from './WelcomeModal';
import { OPEN_ONBOARDING_EVENT } from './OnboardingTour';

interface QuickStartChecklistProps {
  professionalName: string;
  slug: string;
  servicesCount: number;
  hasAppointments?: boolean;
}

const CHECKLIST_STORAGE_KEY = 'lume_quickstart_checklist_v1';

export function QuickStartChecklist({
  professionalName,
  slug,
  servicesCount,
  hasAppointments = false,
}: QuickStartChecklistProps) {
  const { success } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Carrega estado de minimizado / fechado
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (saved === 'dismissed') setIsDismissed(true);
      if (saved === 'collapsed') setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, next ? 'collapsed' : 'expanded');
    } catch {
      /* ignore */
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, 'dismissed');
    } catch {
      /* ignore */
    }
  };

  const baseUrl = (typeof window !== 'undefined' ? window.location.origin : '') || 'https://www.lumepage.com.br';
  const publicBookingUrl = slug ? `${baseUrl}/agendar/${slug}` : '';

  const handleCopyLink = () => {
    if (!publicBookingUrl) return;
    navigator.clipboard.writeText(publicBookingUrl);
    setCopied(true);
    success('Link copiado! 📋', 'Cole na bio do Instagram ou envie para suas clientes no WhatsApp.');
    setTimeout(() => setCopied(false), 3000);
  };

  const hasServices = servicesCount > 0;

  const items = [
    {
      id: 'site',
      title: 'Personalize a sua Página na Bio',
      desc: 'Use o Assistente Rápido para preencher textos do seu nicho e escolher seu modelo visual.',
      href: '/dashboard/site',
      done: true, // Já tem modelo inicial pronto
      icon: LayoutTemplate,
      actionLabel: 'Personalizar página',
    },
    {
      id: 'services',
      title: 'Cadastre seus Serviços e Preços',
      desc: hasServices
        ? `Você já tem ${servicesCount} procedimento(s) cadastrado(s).`
        : 'Adicione os procedimentos que você realiza com duração e valor.',
      href: '/dashboard/services',
      done: hasServices,
      icon: Scissors,
      actionLabel: hasServices ? 'Ver serviços' : 'Cadastrar serviço',
    },
    {
      id: 'availability',
      title: 'Configure seus Horários de Atendimento',
      desc: 'Marque os dias e faixas de horário em que você atende na semana.',
      href: '/dashboard/availability',
      done: true, // Horário padrão 9h às 18h vem pré-configurado
      icon: Clock,
      actionLabel: 'Ajustar horários',
    },
    {
      id: 'agenda',
      title: 'Conheça a sua Agenda Online',
      desc: 'Acompanhe marcações, crie bloqueios e veja sua grade do dia e da semana.',
      href: '/dashboard/agenda',
      done: hasAppointments,
      icon: Calendar,
      actionLabel: 'Abrir agenda',
    },
    {
      id: 'share',
      title: 'Compartilhe seu Link de Agendamento',
      desc: 'Coloque o link na bio do Instagram e no recado do seu WhatsApp para começar a receber clientes.',
      onClick: handleCopyLink,
      done: copied,
      icon: Share2,
      actionLabel: copied ? 'Link copiado ✓' : 'Copiar link da bio',
      isShare: true,
    },
  ];

  const completedCount = items.filter(i => i.done).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);
  const isAllDone = completedCount === items.length;

  if (isDismissed) return null;

  return (
    <div className="rounded-2xl border border-wine-200/80 bg-gradient-to-r from-wine-50/70 via-white to-n-50/70 p-4 shadow-sm mb-6 transition-all animate-fade-up">
      {/* Cabeçalho do Checklist */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-wine-700 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-body font-bold text-heading">
                Guia de Início Rápido · 5 Passos
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-wine-100 text-wine-800 border border-wine-200">
                {completedCount} de {items.length} prontos ({progressPercent}%)
              </span>
            </div>
            <p className="text-[12px] text-n-600 mt-0.5">
              {isAllDone
                ? '🎉 Parabéns! Sua conta está 100% pronta para receber agendamentos.'
                : 'Siga estes passos para deixar sua agenda e seu site funcionando perfeitamente.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_WELCOME_EVENT))}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-n-600 hover:bg-white/80 hover:text-n-800 transition-colors border border-transparent hover:border-n-200 cursor-pointer"
            title="Ver apresentação do sistema"
          >
            <HelpCircle className="h-3.5 w-3.5" /> Tutorial
          </button>

          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 rounded-xl text-n-500 hover:bg-white/80 hover:text-n-800 transition-colors cursor-pointer border border-transparent hover:border-n-200"
            aria-label={collapsed ? 'Expandir checklist' : 'Minimizar checklist'}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Barra de Progresso Fina */}
      <div className="mt-3 h-1.5 w-full bg-n-200/70 rounded-full overflow-hidden">
        <div
          className="h-full bg-wine-700 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Lista de Passos (se não estiver minimizado) */}
      {!collapsed && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                  item.done
                    ? 'bg-white/90 border-emerald-200/80 shadow-2xs'
                    : 'bg-white border-n-200 hover:border-wine-300 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center ${
                        item.done ? 'bg-emerald-100 text-emerald-800' : 'bg-wine-50 text-wine-700'
                      }`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[12px] font-bold text-heading">
                        {item.title}
                      </span>
                    </div>

                    {item.done && (
                      <span className="h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0" title="Passo concluído">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-n-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-n-100 flex items-center justify-between">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-wine-700 hover:text-wine-800 hover:underline transition-colors"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={item.onClick}
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        copied
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-wine-700 text-white hover:bg-wine-800 shadow-2xs'
                      }`}
                    >
                      {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{item.actionLabel}</span>
                    </button>
                  )}

                  {item.isShare && publicBookingUrl && (
                    <a
                      href={publicBookingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-n-500 hover:text-n-800 inline-flex items-center gap-0.5"
                    >
                      Testar <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
