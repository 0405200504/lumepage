'use client';

import React, { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ETAPAS, etapaAtual, etapasConcluidas } from '@/lib/mais-clientes/regras';
import type { ResumoNegocio } from '@/lib/mais-clientes/negocio';
import type { RoteiroX1 } from '@/lib/mais-clientes/x1';
import type { EtapaId, GrowthProgram } from '@/types/mais-clientes';
import { EtapaNegocio } from './EtapaNegocio';
import { EtapaFotos } from './EtapaFotos';
import { EtapaDiagnostico } from './EtapaDiagnostico';
import { EtapaEstrutura } from './EtapaEstrutura';

export interface PropsEtapa {
  professionalId: string;
  programa: GrowthProgram;
  setPrograma: React.Dispatch<React.SetStateAction<GrowthProgram>>;
  negocio: ResumoNegocio;
  avancar: () => void;
  acesso: DadosAcesso;
}

/** O que a profissional precisa para dar acesso à Lume (vem de Configurações do admin). */
export interface DadosAcesso { metaBusinessId: string; googleEmail: string; zapSuporte: string }

export function Jornada({ professionalId, inicial, negocio, acesso }: {
  professionalId: string;
  inicial: GrowthProgram;
  negocio: ResumoNegocio;
  roteiroInicial: RoteiroX1;
  acesso: DadosAcesso;
}) {
  const [programa, setPrograma] = useState(inicial);
  const feitas = useMemo(() => etapasConcluidas(programa), [programa]);
  const [aberta, setAberta] = useState<EtapaId>(() => etapaAtual(inicial));
  const indice = ETAPAS.findIndex(e => e.id === aberta);
  const avancar = () => {
    const prox = ETAPAS[indice + 1];
    if (prox) { setAberta(prox.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };
  const props: PropsEtapa = { professionalId, programa, setPrograma, negocio, avancar, acesso };
  const totalFeitas = ETAPAS.filter(e => feitas[e.id]).length;

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        trail={['Assessoria Lume', `${totalFeitas} de ${ETAPAS.length} etapas`]}
        title="Quero mais clientes"
        description="Responda, mande as fotos e aprove: a equipe Lume estrutura o seu canal de clientes a partir daqui."
      />

      <nav aria-label="Etapas" className="card p-2 sm:p-3">
        <ol className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
          {ETAPAS.map((e, i) => {
            const ativa = e.id === aberta;
            const feita = feitas[e.id];
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setAberta(e.id)}
                  aria-current={ativa ? 'step' : undefined}
                  className={`w-full text-left rounded-card px-3 py-3 flex items-start gap-3 transition-ui ${ativa ? 'bg-wine-50 ring-1 ring-inset ring-wine-200' : 'hover:bg-n-50'}`}
                >
                  <span className={`shrink-0 grid place-items-center h-7 w-7 rounded-full text-caption font-bold ${feita ? 'bg-success text-white' : ativa ? 'bg-wine-700 text-white' : 'bg-n-150 text-n-600'}`}>
                    {feita ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-body-sm font-semibold ${ativa ? 'text-wine-800' : 'text-heading'}`}>{e.titulo}</span>
                    <span className="hidden sm:block text-caption text-n-500 leading-snug">{e.resumo}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {aberta === 'negocio' && <EtapaNegocio {...props} />}
      {aberta === 'fotos' && <EtapaFotos {...props} />}
      {aberta === 'diagnostico' && <EtapaDiagnostico {...props} />}
      {aberta === 'estrutura' && <EtapaEstrutura {...props} />}
    </div>
  );
}

export default Jornada;
