import React from 'react';
import { AppNavbar } from './AppNavbar';
import { AppSidebar } from './AppSidebar';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-shell h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
      <div className="page-noise" aria-hidden="true" />
      <AppNavbar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="max-w-5xl mx-auto p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
