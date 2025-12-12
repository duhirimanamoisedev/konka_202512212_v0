

import React from 'react';
import { LayoutDashboard, GraduationCap, Wallet, Heart, Settings, Hexagon, LogOut, Clock } from 'lucide-react';
import { ViewState, UserProfile } from '../types';
import { t } from '../services/translations';

interface SidebarProps {
  currentView: ViewState;
  user: UserProfile;
  onNavigate: (view: ViewState) => void;
  onLogout?: () => void;
}

export const Sidebar = ({ currentView, user, onNavigate, onLogout }: SidebarProps) => {
  const lang = user.preferences.language || 'en';

  const navItems: { id: ViewState; icon: React.ReactNode; label: string }[] = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: t('dashboard', lang) },
    { id: 'academic', icon: <GraduationCap size={20} />, label: t('academic', lang) },
    { id: 'finance', icon: <Wallet size={20} />, label: t('finance', lang) },
    { id: 'wellbeing', icon: <Heart size={20} />, label: t('wellbeing', lang) },
    { id: 'timehub', icon: <Clock size={20} />, label: t('timehub', lang) },
    { id: 'profile', icon: <Settings size={20} />, label: t('profile', lang) },
  ];

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'ME';

  return (
    <div className="h-full w-20 lg:w-64 flex flex-col justify-between py-6 px-3 bg-glass-100 backdrop-blur-2xl border-r border-glass-border transition-all duration-300 z-50 pt-28 lg:pt-6">
      <div>
        <div className="flex items-center gap-3 mb-10 px-2 justify-center lg:justify-start">
          <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
            <Hexagon className="text-white fill-white" size={24} />
          </div>
          <span className="text-2xl font-bold tracking-tighter hidden lg:block bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
            KONKA
          </span>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group
                ${currentView === item.id 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm' 
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'}
              `}
            >
              <div className={`${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                {item.icon}
              </div>
              <span className="font-medium hidden lg:block">{item.label}</span>
              {currentView === item.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 hidden lg:block shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="hidden lg:flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/5 group">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user.name || 'Student'}</p>
                <p className="text-[10px] text-emerald-400 truncate">{user.title || 'Online'}</p>
            </div>
            {onLogout && (
               <button onClick={onLogout} title={t('logout', lang)} className="p-1.5 hover:bg-rose-500/20 rounded-lg text-slate-500 hover:text-rose-400 transition-colors">
                 <LogOut size={14} />
               </button>
            )}
        </div>
        
        {/* Mobile only logout */}
        {onLogout && (
           <button 
             onClick={onLogout} 
             className="lg:hidden w-full flex justify-center text-slate-400 hover:text-rose-400 py-2 mt-2"
           >
               <LogOut size={20} />
           </button>
        )}
      </div>
    </div>
  );
};