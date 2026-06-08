import React from 'react';
import { User, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  userName: string;
  userEmail: string;
  role: 'super_admin' | 'professional';
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  userName,
  userEmail,
  role
}) => {
  return (
    <header className="flex justify-between items-center gap-3 glass border-b border-gray-150 px-4 sm:px-6 py-4 sm:py-5 pt-safe sticky top-0 z-30 select-none">
      <div className="min-w-0">
        <h2 className="text-lg sm:text-xl font-black text-ink tracking-tight leading-tight truncate">{title}</h2>
        {subtitle && <p className="text-xs text-gray-450 mt-1 max-w-2xl line-clamp-1 sm:line-clamp-none">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 shrink-0 bg-paper/70 border border-gray-150 rounded-2xl p-2 sm:p-2.5 shadow-soft">
        {/* Avatar/Icon */}
        <div className="h-9 w-9 bg-wine-700/6 text-forest rounded-xl flex items-center justify-center font-bold shrink-0">
          {role === 'super_admin' ? (
            <ShieldAlert className="h-5 w-5 text-forest" />
          ) : (
            <User className="h-5 w-5 text-forest" />
          )}
        </div>

        {/* User Info — oculto em telas pequenas (já visível na barra lateral) */}
        <div className="text-left hidden sm:block">
          <p className="text-xs font-bold text-ink leading-none">{userName}</p>
          <span className="text-[10px] text-gray-450 mt-1 block truncate max-w-[150px]" title={userEmail}>
            {userEmail}
          </span>
        </div>
      </div>
    </header>
  );
};
export default Header;
