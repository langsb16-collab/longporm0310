import React from 'react';
import { Video, Globe, Settings } from 'lucide-react';
import { Language } from '../../translations';

interface MobileHeaderProps {
  title: string;
  language: Language;
  onLanguageClick: () => void;
}

export function MobileHeader({ title, language, onLanguageClick }: MobileHeaderProps) {
  return (
    <header className="h-14 bg-[#0F1935]/95 backdrop-blur-xl border-b border-blue-500/20 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-[#1428A0] to-[#2563EB] rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50">
          <Video size={18} />
        </div>
        <h1 className="text-sm font-bold tracking-tight text-white">롱 폼 factory</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={onLanguageClick}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors text-xs font-medium text-gray-300"
        >
          <Globe size={14} />
          {language.toUpperCase()}
        </button>
      </div>
    </header>
  );
}
