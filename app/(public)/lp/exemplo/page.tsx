'use client';

// ============================================
// PASSO 1: Importar o que precisa
// ============================================
import { useState } from 'react';
import { BookingModal } from '@/components/booking/BookingModal';

export default function LandingPageExemplo() {
  // ============================================
  // PASSO 2: Criar o estado que controla se o popup tá aberto ou fechado
  // ============================================
  const [popupAberto, setPopupAberto] = useState(false);

  // ============================================
  // PASSO 3: Definir o slug da profissional
  // Esse slug vem do cadastro dela no sistema.
  // Ex: "Amanda Costa Estética" vira "amanda-costa-estetica"
  // ============================================
  const slugDaProfissional = 'amanda-costa';

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      
      <h1>Landing Page da Amanda Costa</h1>
      <p>Essa é uma página de exemplo. Os botões abaixo abrem o popup de agendamento.</p>

      <hr style={{ margin: '30px 0' }} />

      {/* ============================================
          PASSO 4: Qualquer botão que tenha onClick={() => setPopupAberto(true)}
          vai abrir o popup de agendamento. Pode ter quantos botões quiser.
          ============================================ */}

      <button 
        onClick={() => setPopupAberto(true)}
        style={{ padding: '15px 30px', fontSize: '16px', background: '#500b18', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', marginBottom: '10px', display: 'block', width: '100%' }}
      >
        🗓️ Agendar Horário
      </button>

      <button 
        onClick={() => setPopupAberto(true)}
        style={{ padding: '15px 30px', fontSize: '16px', background: '#500b18', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', marginBottom: '10px', display: 'block', width: '100%' }}
      >
        ✨ Marcar Avaliação
      </button>

      <button 
        onClick={() => setPopupAberto(true)}
        style={{ padding: '15px 30px', fontSize: '16px', background: '#500b18', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', marginBottom: '10px', display: 'block', width: '100%' }}
      >
        💆‍♀️ Quero meu Atendimento
      </button>

      {/* ============================================
          PASSO 5: Colocar o BookingModal no final da página.
          É só UM componente. Ele fica invisível até alguém clicar no botão.
          
          - professionalSlug: o slug da profissional cadastrada
          - isOpen: se o popup tá aberto ou não
          - onClose: função que fecha o popup
          ============================================ */}
      <BookingModal 
        professionalSlug={slugDaProfissional}
        isOpen={popupAberto} 
        onClose={() => setPopupAberto(false)} 
      />

    </div>
  );
}
