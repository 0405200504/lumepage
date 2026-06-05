import { redirect } from 'next/navigation';

/**
 * O cadastro público foi desativado.
 * As contas das profissionais são criadas exclusivamente pelo Super Admin.
 * Qualquer acesso a /register é redirecionado para o login.
 */
export default function RegisterPage() {
  redirect('/login');
}
