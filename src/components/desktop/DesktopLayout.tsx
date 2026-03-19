import React, { ReactNode } from 'react';

interface DesktopLayoutProps {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  chatPanel: ReactNode;
}

export function DesktopLayout({ sidebar, header, children, chatPanel }: DesktopLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0F1E35] to-[#1A2942] text-white font-sans flex">
      {/* Sidebar - 고정 */}
      {sidebar}
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        {header}
        
        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      
      {/* Chat Panel - 우측 고정 (항상 보임) */}
      {chatPanel}
    </div>
  );
}
