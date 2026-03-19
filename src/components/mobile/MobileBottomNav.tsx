import React from 'react';
import { LayoutDashboard, Plus, TrendingUp, MessageSquare } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: 'dashboard' | 'create' | 'trends' | 'comments') => void;
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: '홈' },
    { id: 'create', icon: Plus, label: '생성' },
    { id: 'trends', icon: TrendingUp, label: '트렌드' },
    { id: 'comments', icon: MessageSquare, label: '분석' },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0F1935]/95 backdrop-blur-xl border-t border-blue-500/20 flex justify-around items-center z-40">
      {tabs.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all ${
            activeTab === id
              ? 'text-[#60A5FA]'
              : 'text-gray-400'
          }`}
        >
          <Icon size={20} />
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
}
