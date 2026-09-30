import { redirect } from 'next/navigation';

/**
 * A tela de alertas foi absorvida pela Início: os itens que pedem atenção
 * aparecem lá, na seção "Precisa da sua atenção". A rota fica para não quebrar
 * link antigo.
 */
export default function AdminAlertsRedirect() {
  redirect('/admin#atencao');
}
