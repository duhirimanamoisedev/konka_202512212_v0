

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './views/Dashboard';
import { AcademicView } from './views/AcademicView';
import { FinanceView } from './views/FinanceView';
import { WellbeingView } from './views/WellbeingView';
import { ProfileView } from './views/ProfileView';
import { AuthView } from './views/AuthView';
import { TimeHubView } from './views/TimeHubView'; // Import new view
import { AIAssistant } from './components/AIAssistant';
import { getStoredData, saveStoredData } from './services/storageService';
import { AppState, ViewState, UserProfile, RegisteredUser } from './types';
import { Sparkles, Menu } from 'lucide-react';

// Map theme IDs to actual CSS gradients/classes for the app background
const THEME_STYLES: Record<string, string> = {
  midnight: 'bg-slate-950',
  ocean: 'bg-blue-950',
  forest: 'bg-emerald-950',
  sunset: 'bg-indigo-950',
  nebula: 'bg-violet-950',
  graphite: 'bg-gray-950',
  royal: 'bg-neutral-950',
  cherry: 'bg-red-950',
  nordic: 'bg-slate-900',
  solar: 'bg-orange-950',
  synth: 'bg-fuchsia-950',
  slate: 'bg-slate-900',
};

// Map gradient overlays - Richer, deeper gradients for a premium feel
const GRADIENT_OVERLAYS: Record<string, string> = {
  midnight: 'from-slate-950 via-slate-900/95 to-emerald-900/30',
  ocean: 'from-blue-950 via-slate-900/95 to-cyan-900/30',
  forest: 'from-emerald-950 via-slate-900/95 to-green-900/30',
  sunset: 'from-indigo-950 via-slate-900/95 to-rose-900/30',
  nebula: 'from-violet-950 via-slate-900/95 to-fuchsia-900/30',
  graphite: 'from-gray-950 via-neutral-900/95 to-slate-800/30',
  royal: 'from-neutral-950 via-slate-900/95 to-amber-700/20',
  cherry: 'from-rose-950 via-slate-900/95 to-red-900/30',
  nordic: 'from-slate-900 via-slate-800/95 to-sky-900/30',
  solar: 'from-orange-950 via-slate-900/95 to-yellow-900/20',
  synth: 'from-fuchsia-950 via-slate-900/95 to-cyan-900/30',
  slate: 'from-slate-900 via-slate-800/95 to-gray-700/30',
};

const App: React.FC = () => {
  const [data, setData] = useState<AppState | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load data on mount
  useEffect(() => {
    const stored = getStoredData();
    setData(stored);
    
    // Check for session in localStorage (Simple persistence)
    const session = sessionStorage.getItem('KONKA_SESSION');
    if (session === 'active' && stored.user.name) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (user: UserProfile) => {
     if (!data) return;
     // Update current user
     const newData = { ...data, user };
     setData(newData);
     saveStoredData(newData);
     setIsAuthenticated(true);
     sessionStorage.setItem('KONKA_SESSION', 'active');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('KONKA_SESSION');
    // Optional: clear current view
    setCurrentView('dashboard');
  };

  const handleRegister = (newUser: RegisteredUser, profile: UserProfile) => {
    if (!data) return;
    const newData = {
      ...data,
      registeredUsers: [...data.registeredUsers, newUser],
      user: profile // Set as active
    };
    setData(newData);
    saveStoredData(newData);
    setIsAuthenticated(true);
    sessionStorage.setItem('KONKA_SESSION', 'active');
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    if (!data) return;
    const newData = { ...data, user: updatedUser };
    setData(newData);
    saveStoredData(newData);
  };

  const handleUpdateData = (newData: AppState) => {
    setData(newData);
    saveStoredData(newData);
  };

  if (!data) return <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-emerald-500 font-mono animate-pulse">Initializing KONKA System...</div>;

  // --- AUTH GUARD ---
  if (!isAuthenticated) {
     return <AuthView data={data} onLogin={handleLogin} onRegister={handleRegister} />;
  }

  const currentTheme = data.user.preferences.theme || 'midnight';
  const bgClass = THEME_STYLES[currentTheme] || THEME_STYLES['midnight'];
  const gradientClass = GRADIENT_OVERLAYS[currentTheme] || GRADIENT_OVERLAYS['midnight'];
  
  // Custom Styles based on preferences
  const customStyle = {
    '--konka-accent': data.user.preferences.accentColor,
  } as React.CSSProperties;

  return (
    <div className={`relative flex h-screen w-screen overflow-hidden text-white selection:bg-emerald-500 selection:text-white ${bgClass}`} style={customStyle}>
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none transition-all duration-1000 ease-in-out"
        style={{
            backgroundImage: `url('https://picsum.photos/1920/1080?grayscale&blur=2')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'hue-rotate(0deg) contrast(1.1)'
        }}
      />
      
      {/* Dynamic Gradient Overlay */}
      <div className={`absolute inset-0 z-0 bg-gradient-to-br ${gradientClass} pointer-events-none transition-all duration-1000 ease-in-out`} />

      {/* Main Layout Container */}
      <div className="relative z-10 flex w-full h-full max-w-[2000px] mx-auto shadow-2xl overflow-hidden">
        
        {/* Mobile Menu Toggle */}
        <div className="lg:hidden absolute top-4 left-4 z-50">
           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-glass-200 backdrop-blur-md rounded-lg border border-white/10 text-white">
              <Menu size={24} />
           </button>
        </div>

        {/* Sidebar Navigation */}
        <div className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 absolute lg:relative z-40 h-full transition-transform duration-300`}>
             <Sidebar 
                currentView={currentView} 
                user={data.user}
                onNavigate={(view) => { setCurrentView(view); setIsMobileMenuOpen(false); }} 
                onLogout={handleLogout}
             />
        </div>
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          {/* Top Bar */}
          <div className="h-16 flex items-center justify-end px-6 lg:px-10 border-b border-white/5 bg-transparent shrink-0">
             <button 
                onClick={() => setIsAiOpen(!isAiOpen)}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300
                    ${isAiOpen 
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
                        : 'bg-glass-100 border-white/10 hover:bg-glass-200 text-slate-300'}
                `}
              >
                <Sparkles size={18} />
                <span className="font-medium text-sm">AI Assistant</span>
             </button>
          </div>

          {/* Scrollable View Content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth" id="main-scroll">
             {/* Width Constraint */}
             <div className="max-w-7xl mx-auto min-h-full">
                {currentView === 'dashboard' && <Dashboard data={data} onUpdateData={handleUpdateData} />}
                {currentView === 'timehub' && <TimeHubView data={data} onUpdateData={handleUpdateData} />}
                {currentView === 'academic' && <AcademicView data={data} onUpdateData={handleUpdateData} />}
                {currentView === 'finance' && <FinanceView data={data} onUpdateData={handleUpdateData} />}
                {currentView === 'wellbeing' && <WellbeingView data={data} onUpdateData={handleUpdateData} />}
                {currentView === 'profile' && <ProfileView data={data} onUpdateUser={handleUpdateUser} onLogout={handleLogout} />}
            </div>
            {/* Spacer for bottom scrolling */}
            <div className="h-20" />
          </div>

          {/* AI Assistant Overlay */}
          <AIAssistant 
             appState={data}
             isOpen={isAiOpen}
             onClose={() => setIsAiOpen(false)}
          />

        </main>
      </div>
    </div>
  );
};

export default App;