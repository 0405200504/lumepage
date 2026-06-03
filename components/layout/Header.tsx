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
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 backdrop-blur-md border-b border-[#e4e9e6] px-6 py-5 sticky top-0 z-30 select-none">
      <div>
        <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">{title}</h2>
        {subtitle && <p className="text-xs text-gray-450 mt-1.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 self-end sm:self-auto bg-gray-50 border border-[#e4e9e6] rounded-2xl p-2.5">
        {/* Avatar/Icon */}
        <div className="h-9 w-9 bg-[#500b18]/5 text-forest rounded-xl flex items-center justify-center font-bold">
          {role === 'super_admin' ? (
            <ShieldAlert className="h-5 w-5 text-forest" />
          ) : (
            <User className="h-5 w-5 text-forest" />
          )}
        </div>

        {/* User Info */}
        <div className="text-left">
          <p className="text-xs font-bold text-gray-800 leading-none">{userName}</p>
          <span className="text-[10px] text-gray-450 mt-1 block truncate max-w-[150px]" title={userEmail}>
            {userEmail}
          </span>
        </div>
      </div>
    </header>
  );
};
export default Header;
