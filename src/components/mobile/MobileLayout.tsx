import React, { ReactNode } from 'react';

interface MobileLayoutProps {
  header: ReactNode;
  children: ReactNode;
  bottomNav: ReactNode;
  floatingChat: ReactNode;
  floatingFAQ: ReactNode;
}

export function MobileLayout({ header, children, bottomNav, floatingChat, floatingFAQ }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0F1E35] to-[#1A2942] text-white font-sans flex flex-col">
      {/* Header */}
      {header}
      
      {/* Content - 스크롤 */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      
      {/* Bottom Navigation - 고정 */}
      {bottomNav}
      
      {/* Floating Chat Button */}
      {floatingChat}
      
      {/* Floating FAQ Button */}
      {floatingFAQ}
    </div>
  );
}
