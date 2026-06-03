import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SessionData } from '@/lib/auth/auth';

interface LayoutAdminProps {
  children: React.ReactNode;
  session: SessionData;
  title: string;
  subtitle?: string;
}

export const LayoutAdmin: React.FC<LayoutAdminProps> = ({
  children,
  session,
  title,
  subtitle
}) => {
  return (
    <div className="flex min-h-screen bg-[#faf9f6]">
      <Sidebar role="super_admin" name={session.name} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title={title} 
          subtitle={subtitle} 
          userName={session.name} 
          userEmail={session.email} 
          role="super_admin" 
        />
        
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
export default LayoutAdmin;
