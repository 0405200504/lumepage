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
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass border-b border-gray-150 px-6 py-5 sticky top-0 z-30 select-none">
      <div>
        <h2 className="text-xl font-black text-ink tracking-tight leading-none">{title}</h2>
        {subtitle && <p className="text-xs text-gray-450 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 self-end sm:self-auto bg-paper/70 border border-gray-150 rounded-2xl p-2.5 shadow-soft">
        {/* Avatar/Icon */}
        <div className="h-9 w-9 bg-wine-700/6 text-forest rounded-xl flex items-center justify-center font-bold">
          {role === 'super_admin' ? (
            <ShieldAlert className="h-5 w-5 text-forest" />
          ) : (
            <User className="h-5 w-5 text-forest" />
          )}
        </div>

        {/* User Info */}
        <div className="text-left">
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
