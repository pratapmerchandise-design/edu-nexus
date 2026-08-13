import React from 'react';
import { AppNavbar } from './AppNavbar';
import { AppSidebar } from './AppSidebar';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <div className="page-noise" aria-hidden="true" />
      <AppNavbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-16 md:pb-0">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
