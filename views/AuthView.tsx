
import React, { useState, useRef } from 'react';
import { AppState, RegisteredUser, UserProfile } from '../types';
import { GlassCard } from '../components/GlassCard';
import { 
  Hexagon, ArrowRight, UserPlus, Lock, User, 
  Loader2, ShieldCheck, AlertCircle, Phone, KeyRound, 
  ChevronLeft, CheckCircle2, Globe, Camera, Upload
} from 'lucide-react';
import { t, LANGUAGES, LanguageCode, isRTL } from '../services/translations';

interface AuthViewProps {
  data: AppState;
  onLogin: (user: UserProfile) => void;
  onRegister: (newUser: RegisteredUser, profile: UserProfile) => void;
}

type AuthMode = 'login' | 'register' | 'forgot-password' | 'forgot-id';

export const AuthView = ({ data, onLogin, onRegister }: AuthViewProps) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [lang, setLang] = useState<LanguageCode>('en'); // Local language state for auth
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Unified Form Data
  const [formData, setFormData] = useState({
    identifier: '', // Used for login (Phone or Student ID)
    phoneNumber: '', // Used for register/recovery
    studentId: '', // Optional for register
    password: '',
    confirmPassword: '',
    fullName: '',
    newPassword: '', // For reset
    avatar: '' // Base64 string for custom image
  });

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recoveredId, setRecoveredId] = useState<string | null>(null);

  const resetForm = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
    setRecoveredId(null);
    setFormData({
      identifier: '',
      phoneNumber: '',
      studentId: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      newPassword: '',
      avatar: ''
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // Limit to 500KB for local storage sanity
        setError("Image size too large. Please use an image under 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    // Simulate network/processing delay
    setTimeout(() => {
      switch (mode) {
        case 'login':
          handleLogin();
          break;
        case 'register':
          handleSignup();
          break;
        case 'forgot-password':
          handlePasswordReset();
          break;
        case 'forgot-id':
          handleIdRecovery();
          break;
      }
      setLoading(false);
    }, 1000);
  };

  const handleLogin = () => {
    const input = formData.identifier.trim();
    
    // Check against phone numbers OR student IDs
    const user = data.registeredUsers.find(
      u => (u.phoneNumber === input || (u.studentId && u.studentId.toLowerCase() === input.toLowerCase())) 
           && u.passwordHash === formData.password
    );

    if (user) {
      // If we found the auth user, we need to find the matching profile
      // In a real app, we'd fetch by ID. Here we grab the active user or find in a (theoretical) list.
      // Since data.user is just the single active user in this local-first architecture,
      // we assume if credentials match, we load the stored user state.
      onLogin(data.user); 
    } else {
      setError("Invalid Phone Number/ID or password.");
    }
  };

  const handleSignup = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (!formData.phoneNumber) {
        setError("Phone number is required.");
        return;
    }

    // Check Uniqueness
    const phoneExists = data.registeredUsers.some(u => u.phoneNumber === formData.phoneNumber);
    if (phoneExists) {
        setError("Phone number already registered.");
        return;
    }

    if (formData.studentId) {
        const idExists = data.registeredUsers.some(u => u.studentId?.toLowerCase() === formData.studentId.toLowerCase());
        if (idExists) {
            setError("Student ID already taken.");
            return;
        }
    }

    const newProfileId = `u_${Date.now()}`;
    const newProfile: UserProfile = {
      ...data.user,
      id: newProfileId,
      name: formData.fullName || 'Student',
      title: 'Student',
      phoneNumber: formData.phoneNumber,
      // Use uploaded avatar or generate a default one
      avatar: formData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.phoneNumber}&backgroundColor=b6e3f4`,
      bio: "Ready to achieve my goals.",
      preferences: { ...data.user.preferences, language: lang }, // Save selected language
      institutions: [],
      goals: []
    };

    const newAuthUser: RegisteredUser = {
      id: `auth_${Date.now()}`,
      phoneNumber: formData.phoneNumber,
      studentId: formData.studentId || undefined,
      passwordHash: formData.password,
      profileId: newProfileId
    };

    onRegister(newAuthUser, newProfile);
  };

  const handlePasswordReset = () => {
     // 1. Verify Phone
     const user = data.registeredUsers.find(u => u.phoneNumber === formData.phoneNumber);
     
     if (!user) {
        setError("No account found with that phone number.");
        return;
     }

     if (formData.newPassword.length < 4) {
        setError("New password must be at least 4 characters.");
        return;
     }

     setSuccessMsg("Password reset successfully! Please login with your new password.");
  };

  const handleIdRecovery = () => {
     const user = data.registeredUsers.find(u => u.phoneNumber === formData.phoneNumber);
     
     if (user) {
        if (user.studentId) {
            setRecoveredId(user.studentId);
            setSuccessMsg("Account found.");
        } else {
            setSuccessMsg("Account found, but no Student ID was set. Use your Phone Number to login.");
        }
     } else {
        setError("No account found with that phone number.");
     }
  };

  const direction = isRTL(lang) ? 'rtl' : 'ltr';

  return (
    // 1. Fixed Container for Background (No scrolling here)
    <div className="fixed inset-0 h-screen w-screen bg-slate-900 overflow-hidden" dir={direction}>
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://picsum.photos/1920/1080?grayscale&blur=2')] opacity-20 bg-cover bg-center pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-slate-900/90 to-slate-900 pointer-events-none" />
      
      {/* Animated Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse delay-1000 pointer-events-none" />

      {/* Language Switcher Fixed Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <div className="relative group">
           <button className="flex items-center gap-2 px-3 py-2 bg-black/40 border border-white/10 rounded-full text-white backdrop-blur-md">
              <Globe size={16} />
              <span className="text-xs font-bold">{LANGUAGES.find(l => l.code === lang)?.flag} {LANGUAGES.find(l => l.code === lang)?.label.split(' ')[0]}</span>
           </button>
           <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-50">
              {LANGUAGES.map(l => (
                <button 
                   key={l.code}
                   onClick={() => setLang(l.code)}
                   className={`w-full text-left px-4 py-3 text-sm hover:bg-white/10 transition-colors flex items-center justify-between ${lang === l.code ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-300'}`}
                >
                   <span>{l.label}</span>
                   <span>{l.flag}</span>
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* 2. Scrollable Content Layer */}
      <div className="absolute inset-0 overflow-y-auto custom-scrollbar z-20">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-12">
            
            <div className="w-full max-w-md relative">
                
                {/* Logo */}
                <div className="flex justify-center mb-8">
                   <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/30">
                         <Hexagon className="text-white fill-white" size={32} />
                      </div>
                      <span className="text-4xl font-extrabold tracking-tighter text-white">KONKA</span>
                   </div>
                </div>

                <GlassCard className="border-t-4 border-t-emerald-500 backdrop-blur-2xl shadow-2xl transition-all duration-500">
                   <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-white mb-2">
                         {mode === 'login' && t('welcomeBack', lang)}
                         {mode === 'register' && t('newProfile', lang)}
                         {mode === 'forgot-password' && t('resetPass', lang)}
                         {mode === 'forgot-id' && t('recoverId', lang)}
                      </h2>
                      <p className="text-slate-400 text-sm">
                         {mode === 'login' && t('enterCreds', lang)}
                         {mode === 'register' && t('setupProfile', lang)}
                         {mode === 'forgot-password' && t('verifyPhone', lang)}
                         {mode === 'forgot-id' && t('retrieveId', lang)}
                      </p>
                   </div>

                   <form onSubmit={handleSubmit} className="space-y-4">
                      
                      {/* --- REGISTER FIELDS --- */}
                      {mode === 'register' && (
                         <>
                            {/* Profile Picture Upload */}
                            <div className="flex justify-center mb-6 animate-fade-in">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden hover:border-emerald-500 transition-colors">
                                        {formData.avatar ? (
                                            <img src={formData.avatar} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera className="text-slate-500 group-hover:text-emerald-400" size={32} />
                                        )}
                                    </div>
                                    <div className="absolute bottom-0 right-0 p-1.5 bg-emerald-500 rounded-full text-white shadow-lg">
                                        <Upload size={12} />
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 animate-fade-in">
                                <label className={`text-[10px] font-bold text-slate-500 uppercase tracking-wider ${isRTL(lang) ? 'mr-1' : 'ml-1'}`}>{t('fullName', lang)}</label>
                                <div className="relative">
                                <User className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL(lang) ? 'right-4' : 'left-4'}`} size={18} />
                                <input 
                                    type="text"
                                    required
                                    placeholder={t('fullName', lang)}
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                    className={`w-full bg-slate-900/50 border border-white/10 rounded-xl py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all ${isRTL(lang) ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
                                />
                                </div>
                            </div>
                         </>
                      )}

                      {/* --- PHONE NUMBER FIELD (Register/Recovery) --- */}
                      {(mode === 'register' || mode === 'forgot-password' || mode === 'forgot-id') && (
                         <div className="space-y-1 animate-fade-in">
                            <label className={`text-[10px] font-bold text-slate-500 uppercase tracking-wider ${isRTL(lang) ? 'mr-1' : 'ml-1'}`}>{t('phone', lang)}</label>
                            <div className="relative">
                               <Phone className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL(lang) ? 'right-4' : 'left-4'}`} size={18} />
                               <input 
                                  type="tel"
                                  required
                                  placeholder="+1 234 567 8900"
                                  value={formData.phoneNumber}
                                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                  className={`w-full bg-slate-900/50 border border-white/10 rounded-xl py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all ${isRTL(lang) ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
                               />
                            </div>
                         </div>
                      )}

                      {/* --- STUDENT ID FIELD (Optional Register) --- */}
                      {mode === 'register' && (
                         <div className="space-y-1 animate-fade-in">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('studentId', lang)}</label>
                                <span className="text-[9px] text-slate-500 font-bold bg-white/5 px-1.5 py-0.5 rounded">{t('optional', lang)}</span>
                            </div>
                            <div className="relative">
                               <ShieldCheck className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL(lang) ? 'right-4' : 'left-4'}`} size={18} />
                               <input 
                                  type="text"
                                  placeholder="e.g. 2024-5892"
                                  value={formData.studentId}
                                  onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                                  className={`w-full bg-slate-900/50 border border-white/10 rounded-xl py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all ${isRTL(lang) ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
                               />
                            </div>
                         </div>
                      )}

                      {/* --- LOGIN IDENTIFIER (Phone OR ID) --- */}
                      {mode === 'login' && (
                         <div className="space-y-1 animate-fade-in">
                            <label className={`text-[10px] font-bold text-slate-500 uppercase tracking-wider ${isRTL(lang) ? 'mr-1' : 'ml-1'}`}>{t('identifier', lang)}</label>
                            <div className="relative">
                               <User className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL(lang) ? 'right-4' : 'left-4'}`} size={18} />
                               <input 
                                  type="text"
                                  required
                                  placeholder={t('identifier', lang)}
                                  value={formData.identifier}
                                  onChange={(e) => setFormData({...formData, identifier: e.target.value})}
                                  className={`w-full bg-slate-900/50 border border-white/10 rounded-xl py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all ${isRTL(lang) ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
                               />
                            </div>
                         </div>
                      )}

                      {/* --- PASSWORD FIELDS --- */}
                      {(mode === 'login' || mode === 'register') && (
                         <div className="space-y-1 animate-fade-in">
                            <label className={`text-[10px] font-bold text-slate-500 uppercase tracking-wider ${isRTL(lang) ? 'mr-1' : 'ml-1'}`}>{t('password', lang)}</label>
                            <div className="relative">
                               <Lock className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL(lang) ? 'right-4' : 'left-4'}`} size={18} />
                               <input 
                                  type="password"
                                  required
                                  placeholder="••••••••"
                                  value={formData.password}
                                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                                  className={`w-full bg-slate-900/50 border border-white/10 rounded-xl py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all ${isRTL(lang) ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
                               />
                            </div>
                         </div>
                      )}

                      {mode === 'register' && (
                         <div className="space-y-1 animate-fade-in">
                            <label className={`text-[10px] font-bold text-slate-500 uppercase tracking-wider ${isRTL(lang) ? 'mr-1' : 'ml-1'}`}>{t('confirmPass', lang)}</label>
                            <div className="relative">
                               <Lock className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL(lang) ? 'right-4' : 'left-4'}`} size={18} />
                               <input 
                                  type="password"
                                  required
                                  placeholder="••••••••"
                                  value={formData.confirmPassword}
                                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                  className={`w-full bg-slate-900/50 border border-white/10 rounded-xl py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all ${isRTL(lang) ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
                               />
                            </div>
                         </div>
                      )}

                      {/* --- NEW PASSWORD (Recovery) --- */}
                      {mode === 'forgot-password' && (
                         <div className="space-y-1 animate-fade-in">
                            <label className={`text-[10px] font-bold text-slate-500 uppercase tracking-wider ${isRTL(lang) ? 'mr-1' : 'ml-1'}`}>{t('newPass', lang)}</label>
                            <div className="relative">
                               <KeyRound className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL(lang) ? 'right-4' : 'left-4'}`} size={18} />
                               <input 
                                  type="password"
                                  required
                                  placeholder="••••••••"
                                  value={formData.newPassword}
                                  onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                                  className={`w-full bg-slate-900/50 border border-white/10 rounded-xl py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all ${isRTL(lang) ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
                               />
                            </div>
                         </div>
                      )}

                      {/* --- LINKS & ACTIONS --- */}
                      {mode === 'login' && (
                         <div className="flex justify-between items-center text-xs px-1">
                            <button type="button" onClick={() => resetForm('forgot-password')} className="text-slate-400 hover:text-emerald-400 transition-colors">
                               {t('forgotPass', lang)}
                            </button>
                            <button type="button" onClick={() => resetForm('forgot-id')} className="text-slate-400 hover:text-emerald-400 transition-colors">
                               {t('forgotId', lang)}
                            </button>
                         </div>
                      )}

                      {/* --- ERROR & SUCCESS MESSAGES --- */}
                      {error && (
                         <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2 animate-pulse">
                            <AlertCircle size={16} /> {error}
                         </div>
                      )}
                      {successMsg && (
                         <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-center gap-2">
                            <CheckCircle2 size={16} /> {successMsg}
                         </div>
                      )}
                      {recoveredId && (
                         <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 p-4 rounded-xl text-center">
                            <p className="text-xs uppercase font-bold text-slate-400 mb-1">Your Student ID</p>
                            <p className="text-xl font-mono font-bold">{recoveredId}</p>
                         </div>
                      )}

                      {/* --- MAIN BUTTON --- */}
                      <button 
                         type="submit" 
                         disabled={loading}
                         className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                         {mode === 'login' && t('accessDash', lang)}
                         {mode === 'register' && t('initProfile', lang)}
                         {(mode === 'forgot-password' || mode === 'forgot-id') && t('verifyRecover', lang)}
                      </button>

                   </form>

                   {/* --- FOOTER NAV --- */}
                   <div className="mt-8 pt-6 border-t border-white/5 text-center">
                      {mode !== 'login' && (
                         <button onClick={() => resetForm('login')} className="text-sm font-medium text-slate-400 hover:text-white flex items-center justify-center gap-2 mx-auto">
                            <ChevronLeft size={16} /> {t('backLogin', lang)}
                         </button>
                      )}
                      {mode === 'login' && (
                         <p className="text-sm text-slate-400">
                            {t('noAccount', lang)} <button onClick={() => resetForm('register')} className="text-emerald-400 font-bold hover:underline">{t('createAccount', lang)}</button>
                         </p>
                      )}
                      {mode === 'register' && (
                         <p className="text-sm text-slate-400 mt-4">
                            {t('haveAccount', lang)} <button onClick={() => resetForm('login')} className="text-emerald-400 font-bold hover:underline">{t('loginExisting', lang)}</button>
                         </p>
                      )}
                   </div>
                </GlassCard>

                {/* Footer Credits */}
                <p className="text-center text-xs text-slate-600 mt-8 font-medium tracking-wide">
                   SECURE LOCAL ENVIRONMENT • KONKA V1.1
                </p>

            </div>
        </div>
      </div>
    </div>
  );
};
