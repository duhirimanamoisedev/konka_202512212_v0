
import React, { useState, useRef } from 'react';
import { AppState, UserProfile, Institution, AppTheme } from '../types';
import { GlassCard } from '../components/GlassCard';
import { generateProfessionalBio, suggestGoals } from '../services/geminiService';
import { 
  User, Sparkles, Save, Shield, 
  Globe, Bell, Monitor, Palette, Camera, Loader2,
  CheckCircle, Target, Briefcase, Plus, Trash2, 
  Building2, GraduationCap, Calendar, Layers, Eye, Zap, Crown, LogOut, Phone
} from 'lucide-react';
import { LANGUAGES, LanguageCode } from '../services/translations';

interface ProfileViewProps {
  data: AppState;
  onUpdateUser: (user: UserProfile) => void;
  onLogout?: () => void;
}

const THEMES: { id: AppTheme; label: string; colors: string; desc: string }[] = [
  { id: 'midnight', label: 'Midnight', colors: 'from-slate-900 via-slate-900 to-emerald-900', desc: 'Deep focus mode' },
  { id: 'ocean', label: 'Ocean', colors: 'from-blue-900 via-slate-900 to-cyan-900', desc: 'Calm & expansive' },
  { id: 'forest', label: 'Forest', colors: 'from-emerald-950 via-slate-900 to-green-900', desc: 'Natural balance' },
  { id: 'sunset', label: 'Sunset', colors: 'from-indigo-950 via-slate-900 to-rose-900', desc: 'Warm gradients' },
  { id: 'nebula', label: 'Nebula', colors: 'from-violet-950 via-slate-900 to-fuchsia-900', desc: 'Cosmic creativity' },
  { id: 'graphite', label: 'Graphite', colors: 'from-gray-900 via-slate-950 to-neutral-900', desc: 'Minimal monochrome' },
  { id: 'royal', label: 'Royal', colors: 'from-neutral-950 via-slate-900 to-amber-700', desc: 'Gold & Luxury' },
  { id: 'cherry', label: 'Cherry', colors: 'from-rose-950 via-slate-900 to-red-900', desc: 'Vibrant energy' },
  { id: 'nordic', label: 'Nordic', colors: 'from-slate-900 via-slate-800 to-sky-900', desc: 'Cool & clean' },
  { id: 'solar', label: 'Solar', colors: 'from-orange-950 via-slate-900 to-yellow-900', desc: 'Bright warmth' },
  { id: 'synth', label: 'Synth', colors: 'from-fuchsia-950 via-slate-900 to-cyan-900', desc: 'Cyberpunk neon' },
  { id: 'slate', label: 'Slate', colors: 'from-slate-900 via-slate-800 to-gray-700', desc: 'Professional grey' },
];

export const ProfileView = ({ data, onUpdateUser, onLogout }: ProfileViewProps) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'academics' | 'visuals' | 'system'>('identity');
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<UserProfile>(data.user);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [isSuggestingGoals, setIsSuggestingGoals] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onUpdateUser(editedUser);
    setIsEditing(false);
  };

  const handleGenerateBio = async () => {
    setIsGeneratingBio(true);
    try {
      const bio = await generateProfessionalBio(editedUser, data.courses);
      setEditedUser(prev => ({ ...prev, bio: bio.replace(/"/g, '') }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingBio(false);
    }
  };

  const handleSuggestGoals = async () => {
    setIsSuggestingGoals(true);
    try {
      const newGoals = await suggestGoals(editedUser, data.courses);
      setEditedUser(prev => ({ ...prev, goals: [...prev.goals, ...newGoals] }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSuggestingGoals(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) { // Limit to 2MB
        alert("Image size too large. Please use an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedUser(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addInstitution = () => {
    const newInst: Institution = {
      id: `inst_${Date.now()}`,
      name: "New Institution",
      type: "University",
      program: "Program Name",
      startDate: new Date().toISOString().split('T')[0],
      expectedGraduation: "",
      primary: editedUser.institutions.length === 0
    };
    setEditedUser(prev => ({ ...prev, institutions: [...prev.institutions, newInst] }));
  };

  const removeInstitution = (id: string) => {
    setEditedUser(prev => ({ ...prev, institutions: prev.institutions.filter(i => i.id !== id) }));
  };

  const updateInstitution = (id: string, field: keyof Institution, value: any) => {
    setEditedUser(prev => ({
      ...prev,
      institutions: prev.institutions.map(inst => 
        inst.id === id ? { ...inst, [field]: value } : inst
      )
    }));
  };

  return (
    <div className="space-y-8 animate-fade-in p-2 max-w-[1600px] mx-auto min-h-screen">
      
      {/* Dynamic Header */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl group min-h-[250px] flex items-end">
         {/* Background Layer */}
         <div className={`absolute inset-0 bg-gradient-to-r ${THEMES.find(t => t.id === editedUser.preferences.theme)?.colors} opacity-80 transition-all duration-1000`} />
         <div className="absolute inset-0 backdrop-blur-3xl bg-black/20" />
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
         
         <div className="relative z-10 w-full px-8 py-8 flex flex-col md:flex-row items-center md:items-end gap-8 bg-gradient-to-t from-slate-950/80 to-transparent">
            <div className="relative group/avatar">
               <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl bg-slate-800 ring-4 ring-black/20">
                  <img src={editedUser.avatar} alt="Profile" className="w-full h-full object-cover" />
               </div>
               {isEditing && (
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover/avatar:opacity-100 transition-opacity backdrop-blur-sm"
                 >
                   <Camera className="text-white w-8 h-8" />
                 </div>
               )}
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
               />
            </div>

            <div className="flex-1 text-center md:text-left mb-2 space-y-3">
               <div>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg flex items-center justify-center md:justify-start gap-3">
                    {editedUser.name}
                    {isEditing && <span className="bg-emerald-500/20 p-1 rounded-full"><Zap size={16} className="text-emerald-400" /></span>}
                  </h1>
                  <p className="text-emerald-200 font-medium text-xl opacity-90">{editedUser.title}</p>
               </div>
               
               <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  {editedUser.institutions.map(inst => (
                    <span key={inst.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-white border border-white/10 backdrop-blur-md hover:bg-white/20 transition-colors">
                       <Building2 size={12} className="text-emerald-400" />
                       {inst.name}
                    </span>
                  ))}
               </div>
            </div>

            <div className="flex gap-3 pb-2">
               {isEditing ? (
                 <button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-emerald-900/20 transform hover:-translate-y-0.5 hover:shadow-emerald-500/20">
                    <Save size={18} /> Save Changes
                 </button>
               ) : (
                  <button onClick={() => setIsEditing(true)} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-medium transition-all backdrop-blur-md border border-white/20 hover:border-white/40 flex items-center gap-2">
                    <Palette size={18} /> Customize
                  </button>
               )}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-w-0">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-4 min-w-0">
          <GlassCard className="p-2 space-y-1 bg-slate-900/60 sticky top-4">
            {[
              { id: 'identity', label: 'Identity & Bio', icon: <User size={18} /> },
              { id: 'academics', label: 'Institutions', icon: <GraduationCap size={18} /> },
              { id: 'visuals', label: 'Visual Engine', icon: <Palette size={18} /> },
              { id: 'system', label: 'System Prefs', icon: <Monitor size={18} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'bg-gradient-to-r from-emerald-500/20 to-transparent text-emerald-300 border-l-2 border-emerald-400 shadow-lg shadow-black/20' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </GlassCard>

          <GlassCard className="bg-gradient-to-b from-slate-800/50 to-transparent border border-white/5">
             <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Connect</span>
                {isEditing && <Plus size={14} className="text-slate-400 cursor-pointer hover:text-white" />}
             </div>
             <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors cursor-pointer group">
                   <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <Globe size={16} />
                   </div>
                   {isEditing ? <input className="bg-transparent border-b border-white/10 w-full focus:outline-none focus:border-emerald-500 py-1" value={editedUser.socialLinks?.website || ''} placeholder="Website URL" onChange={e => setEditedUser({...editedUser, socialLinks: {...editedUser.socialLinks, website: e.target.value}})} /> : (editedUser.socialLinks?.website || 'Add Website')}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors cursor-pointer group">
                   <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <Briefcase size={16} />
                   </div>
                   {isEditing ? <input className="bg-transparent border-b border-white/10 w-full focus:outline-none focus:border-blue-500 py-1" value={editedUser.socialLinks?.linkedin || ''} placeholder="LinkedIn URL" onChange={e => setEditedUser({...editedUser, socialLinks: {...editedUser.socialLinks, linkedin: e.target.value}})} /> : (editedUser.socialLinks?.linkedin || 'Add LinkedIn')}
                </div>
             </div>
          </GlassCard>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9 space-y-6 min-w-0">
          
          {/* IDENTITY TAB */}
          {activeTab === 'identity' && (
             <GlassCard className="min-h-[600px] border-t-4 border-t-emerald-500">
                <div className="space-y-10 animate-fade-in">
                   <div>
                      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                         <div className="p-2 bg-emerald-500/10 rounded-lg"><User className="text-emerald-400" size={24} /></div>
                         Personal Information
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-2 group">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-emerald-400 transition-colors ml-1">Full Name</label>
                            <input 
                                disabled={!isEditing}
                                value={editedUser.name}
                                onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                                className="w-full bg-slate-900/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500 focus:bg-slate-900/80 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all font-medium"
                             />
                         </div>
                         <div className="space-y-2 group">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-emerald-400 transition-colors ml-1">Professional Title</label>
                            <input 
                                disabled={!isEditing}
                                value={editedUser.title}
                                onChange={(e) => setEditedUser({...editedUser, title: e.target.value})}
                                className="w-full bg-slate-900/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500 focus:bg-slate-900/80 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all font-medium"
                             />
                         </div>
                         <div className="space-y-2 group">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-emerald-400 transition-colors ml-1">Phone Number</label>
                            <div className="relative">
                               <input 
                                   disabled={!isEditing}
                                   value={editedUser.phoneNumber || ''}
                                   onChange={(e) => setEditedUser({...editedUser, phoneNumber: e.target.value})}
                                   className="w-full bg-slate-900/40 border border-white/10 rounded-xl px-4 py-3.5 pl-10 text-white focus:outline-none focus:border-emerald-500 focus:bg-slate-900/80 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all font-medium"
                               />
                               <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            </div>
                         </div>
                         <div className="space-y-2 group">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-emerald-400 transition-colors ml-1">Primary Currency</label>
                            <input 
                                disabled={!isEditing}
                                value={editedUser.currency}
                                onChange={(e) => setEditedUser({...editedUser, currency: e.target.value})}
                                className="w-full bg-slate-900/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500 focus:bg-slate-900/80 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all font-medium"
                             />
                         </div>
                      </div>
                   </div>

                   <div className="h-px bg-white/5" />

                   <div>
                      <div className="flex justify-between items-center mb-4">
                         <h3 className="text-lg font-bold text-white flex items-center gap-2"><Briefcase size={18} className="text-blue-400" /> Bio & Summary</h3>
                         {isEditing && (
                           <button 
                             onClick={handleGenerateBio}
                             disabled={isGeneratingBio}
                             className="flex items-center gap-2 text-xs font-bold text-emerald-300 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all shadow-lg hover:shadow-emerald-900/20"
                           >
                             {isGeneratingBio ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                             AI Rewrite
                           </button>
                         )}
                      </div>
                      <textarea 
                         disabled={!isEditing}
                         value={editedUser.bio}
                         onChange={(e) => setEditedUser({...editedUser, bio: e.target.value})}
                         rows={5}
                         className="w-full bg-slate-900/40 border border-white/10 rounded-xl px-5 py-4 text-slate-300 focus:outline-none focus:border-emerald-500 focus:text-white disabled:opacity-60 transition-all resize-none leading-relaxed text-sm font-medium"
                      />
                   </div>

                   <div>
                      <div className="flex justify-between items-center mb-4">
                         <h3 className="text-lg font-bold text-white flex items-center gap-2"><Target size={18} className="text-rose-400" /> Strategic Goals</h3>
                         {isEditing && (
                           <button 
                             onClick={handleSuggestGoals}
                             disabled={isSuggestingGoals}
                             className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                           >
                             {isSuggestingGoals ? <Loader2 className="animate-spin" size={12}/> : <Plus size={12}/>} AI Suggest
                           </button>
                         )}
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                         {editedUser.goals.map((goal, idx) => (
                           <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all group">
                             <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                                <CheckCircle size={14} />
                             </div>
                             {isEditing ? (
                                <input 
                                  value={goal}
                                  onChange={(e) => {
                                    const newGoals = [...editedUser.goals];
                                    newGoals[idx] = e.target.value;
                                    setEditedUser({...editedUser, goals: newGoals});
                                  }}
                                  className="flex-1 bg-transparent border-none focus:outline-none text-white font-medium"
                                />
                             ) : (
                                <span className="text-sm font-medium text-slate-200">{goal}</span>
                             )}
                             {isEditing && (
                                <button onClick={() => {
                                   const newGoals = editedUser.goals.filter((_, i) => i !== idx);
                                   setEditedUser({...editedUser, goals: newGoals});
                                }} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all">
                                   <Trash2 size={16} />
                                </button>
                             )}
                           </div>
                         ))}
                         {isEditing && (
                            <button onClick={() => setEditedUser({...editedUser, goals: [...editedUser.goals, "New Goal"]})} className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all font-bold text-sm">
                               + Add Custom Goal
                            </button>
                         )}
                      </div>
                   </div>
                </div>
             </GlassCard>
          )}

          {/* ACADEMICS TAB */}
          {activeTab === 'academics' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                 <div>
                    <h2 className="text-2xl font-bold text-white">Education & Institutions</h2>
                    <p className="text-slate-400 text-sm mt-1">Manage your active schools and programs.</p>
                 </div>
                 {isEditing && (
                    <button onClick={addInstitution} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 hover:shadow-emerald-500/20">
                       <Plus size={18} /> Add School
                    </button>
                 )}
              </div>

              <div className="grid grid-cols-1 gap-6">
                 {editedUser.institutions.map((inst, index) => (
                    <GlassCard key={inst.id} className="relative group border-l-4 border-l-emerald-500 overflow-visible">
                       <div className="flex flex-col xl:flex-row gap-8">
                          {/* Left Column: Visual/Logo */}
                          <div className="flex-shrink-0 flex flex-col items-center justify-center w-full xl:w-56 bg-gradient-to-br from-white/10 to-transparent rounded-2xl p-6 text-center border border-white/5 relative overflow-hidden">
                              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-noise.png')] opacity-20"></div>
                              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-3 text-emerald-400 shadow-inner">
                                 <Building2 size={32} />
                              </div>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{inst.type}</div>
                              {inst.primary && <span className="mt-3 px-3 py-1 bg-emerald-500 text-white text-[10px] uppercase font-bold rounded-full shadow-lg shadow-emerald-500/30">Primary</span>}
                          </div>

                          {/* Right Column: Form */}
                          <div className="flex-1 space-y-5">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Institution Name</label>
                                   <input 
                                     disabled={!isEditing}
                                     value={inst.name}
                                     onChange={(e) => updateInstitution(inst.id, 'name', e.target.value)}
                                     className="w-full bg-slate-900/30 border-b-2 border-white/10 py-2 text-xl font-bold text-white focus:outline-none focus:border-emerald-500 disabled:border-transparent transition-all placeholder:text-slate-600"
                                     placeholder="University Name"
                                   />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Program / Major</label>
                                   <input 
                                     disabled={!isEditing}
                                     value={inst.program}
                                     onChange={(e) => updateInstitution(inst.id, 'program', e.target.value)}
                                     className="w-full bg-slate-900/30 border-b-2 border-white/10 py-2 text-lg text-slate-200 focus:outline-none focus:border-emerald-500 disabled:border-transparent transition-all placeholder:text-slate-600"
                                     placeholder="B.S. Computer Science"
                                   />
                                </div>
                             </div>

                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                <div className="space-y-1">
                                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                                   <input 
                                     type="date"
                                     disabled={!isEditing}
                                     value={inst.startDate}
                                     onChange={(e) => updateInstitution(inst.id, 'startDate', e.target.value)}
                                     className="w-full bg-slate-900/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 focus:bg-slate-900/80"
                                   />
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Graduation</label>
                                   <input 
                                     type="date"
                                     disabled={!isEditing}
                                     value={inst.expectedGraduation}
                                     onChange={(e) => updateInstitution(inst.id, 'expectedGraduation', e.target.value)}
                                     className="w-full bg-slate-900/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 focus:bg-slate-900/80"
                                   />
                                </div>
                                <div className="space-y-1 col-span-2">
                                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Student ID</label>
                                   <input 
                                     disabled={!isEditing}
                                     value={inst.studentId || ''}
                                     placeholder="Optional"
                                     onChange={(e) => updateInstitution(inst.id, 'studentId', e.target.value)}
                                     className="w-full bg-slate-900/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 focus:bg-slate-900/80"
                                   />
                                </div>
                             </div>
                          </div>
                       </div>
                       
                       {isEditing && (
                          <div className="absolute top-4 right-4 flex gap-2">
                             <button onClick={() => updateInstitution(inst.id, 'primary', !inst.primary)} className={`p-2 rounded-lg transition-all ${inst.primary ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-emerald-400 hover:bg-white/10'}`} title="Make Primary">
                                <CheckCircle size={18} />
                             </button>
                             <button onClick={() => removeInstitution(inst.id)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all" title="Remove">
                                <Trash2 size={18} />
                             </button>
                          </div>
                       )}
                    </GlassCard>
                 ))}
                 {editedUser.institutions.length === 0 && (
                    <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 flex flex-col items-center justify-center gap-4">
                       <GraduationCap size={48} className="text-slate-600" />
                       <div className="space-y-1">
                          <h3 className="text-xl font-bold text-white">No Institutions Listed</h3>
                          <p className="text-slate-400">Add a university, bootcamp, or school to start tracking.</p>
                       </div>
                       <button onClick={addInstitution} className="text-emerald-400 font-bold hover:text-emerald-300 bg-emerald-500/10 px-6 py-2 rounded-full mt-2 transition-colors">
                          + Add your first school
                       </button>
                    </div>
                 )}
              </div>
            </div>
          )}

          {/* VISUALS TAB */}
          {activeTab === 'visuals' && (
             <GlassCard className="min-h-[600px] border-t-4 border-t-purple-500">
                <div className="space-y-10 animate-fade-in">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-purple-500/10 rounded-lg"><Palette className="text-purple-400" size={24} /></div>
                      <div>
                         <h2 className="text-2xl font-bold text-white">Visual Engine</h2>
                         <p className="text-slate-400 text-sm">Customize the interface aesthetic and themes.</p>
                      </div>
                   </div>

                   {/* Theme Selector Grid */}
                   <div className="space-y-4">
                      <div className="flex justify-between items-end">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Theme Collection</label>
                         <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded font-bold">{THEMES.length} Presets Available</span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                         {THEMES.map((theme) => (
                            <button
                               key={theme.id}
                               onClick={() => isEditing && setEditedUser(prev => ({ ...prev, preferences: { ...prev.preferences, theme: theme.id } }))}
                               disabled={!isEditing}
                               className={`
                                 relative h-32 rounded-2xl overflow-hidden border-2 transition-all duration-300 group text-left
                                 ${editedUser.preferences.theme === theme.id 
                                   ? 'border-emerald-400 scale-[1.02] shadow-2xl shadow-black/50 ring-2 ring-emerald-500/20' 
                                   : 'border-transparent hover:border-white/20 hover:scale-[1.02] opacity-80 hover:opacity-100'}
                               `}
                            >
                               {/* Theme Preview Gradient */}
                               <div className={`absolute inset-0 bg-gradient-to-br ${theme.colors}`} />
                               <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
                               
                               {/* Content */}
                               <div className="absolute inset-0 p-4 flex flex-col justify-end">
                                  <span className="font-bold text-white text-base z-10 drop-shadow-md">{theme.label}</span>
                                  <span className="text-[10px] text-white/70 font-medium z-10">{theme.desc}</span>
                               </div>
                               
                               {editedUser.preferences.theme === theme.id && (
                                  <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1.5 shadow-lg">
                                     <CheckCircle size={14} className="text-white"/>
                                  </div>
                               )}
                               
                               {/* Lock icon if not editing */}
                               {!isEditing && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                     <span className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded">Edit to Change</span>
                                  </div>
                               )}
                            </button>
                         ))}
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                      {/* Glass Settings */}
                      <div className="space-y-6">
                         <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Glass Opacity</label>
                            <span className="text-xs text-white bg-white/10 px-2 py-0.5 rounded font-mono">{editedUser.preferences.glassOpacity}</span>
                         </div>
                         <div className="flex gap-2 p-1 bg-black/30 rounded-xl border border-white/5">
                            {['low', 'medium', 'high'].map((opt) => (
                               <button 
                                 key={opt}
                                 disabled={!isEditing}
                                 onClick={() => setEditedUser(prev => ({ ...prev, preferences: { ...prev.preferences, glassOpacity: opt as any } }))}
                                 className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all capitalize ${editedUser.preferences.glassOpacity === opt ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                               >
                                  {opt}
                               </button>
                            ))}
                         </div>

                         <div className="flex items-center justify-between mt-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Blur Strength</label>
                            <span className="text-xs text-white bg-white/10 px-2 py-0.5 rounded font-mono">{editedUser.preferences.blurStrength}</span>
                         </div>
                         <div className="flex gap-2 p-1 bg-black/30 rounded-xl border border-white/5">
                            {['sm', 'md', 'lg', 'xl'].map((opt) => (
                               <button 
                                 key={opt}
                                 disabled={!isEditing}
                                 onClick={() => setEditedUser(prev => ({ ...prev, preferences: { ...prev.preferences, blurStrength: opt as any } }))}
                                 className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all uppercase ${editedUser.preferences.blurStrength === opt ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                               >
                                  {opt}
                               </button>
                            ))}
                         </div>
                      </div>

                      {/* Accent Color */}
                      <div className="space-y-6">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Accent Color</label>
                         <div className="grid grid-cols-5 gap-4">
                            {['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#6366f1', '#d946ef'].map((color) => (
                               <button
                                  key={color}
                                  onClick={() => isEditing && setEditedUser(prev => ({ ...prev, preferences: { ...prev.preferences, accentColor: color } }))}
                                  disabled={!isEditing}
                                  className={`
                                    w-full aspect-square rounded-xl transition-all flex items-center justify-center relative
                                    ${editedUser.preferences.accentColor === color ? 'ring-2 ring-white scale-110 shadow-xl' : 'opacity-40 hover:opacity-100 scale-95 hover:scale-100'}
                                  `}
                                  style={{ backgroundColor: color }}
                               >
                                  {editedUser.preferences.accentColor === color && <CheckCircle size={16} className="text-white mix-blend-difference" />}
                               </button>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </GlassCard>
          )}

          {/* SYSTEM TAB */}
          {activeTab === 'system' && (
             <GlassCard className="min-h-[600px] border-t-4 border-t-blue-500">
               <div className="space-y-8 animate-fade-in">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                     <div className="p-2 bg-blue-500/10 rounded-lg"><Monitor className="text-blue-400" size={24} /></div>
                     System Preferences
                  </h2>
                  
                  {/* Language Selection */}
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                     <div className="flex items-center gap-5 mb-4">
                        <div className="p-3 bg-slate-800 rounded-xl text-emerald-400 shadow-inner">
                           <Globe size={18} />
                        </div>
                        <div>
                           <p className="font-bold text-white text-lg">System Language</p>
                           <p className="text-sm text-slate-500 mt-1">Select your preferred interface language.</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {LANGUAGES.map((lang) => (
                           <button
                              key={lang.code}
                              onClick={() => isEditing && setEditedUser(prev => ({ ...prev, preferences: { ...prev.preferences, language: lang.code } }))}
                              disabled={!isEditing}
                              className={`
                                 flex items-center justify-between px-4 py-3 rounded-xl border transition-all
                                 ${editedUser.preferences.language === lang.code 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-white' 
                                    : 'bg-black/20 border-transparent text-slate-400 hover:bg-black/40'}
                                 ${!isEditing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                              `}
                           >
                              <span className="font-medium">{lang.label}</span>
                              <span className="text-lg">{lang.flag}</span>
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-4">
                     {[
                       { key: 'notifications', label: 'Smart Notifications', desc: 'Allow AI to send study nudges and budget alerts.', icon: <Bell size={18} /> },
                       { key: 'publicProfile', label: 'Public Profile Visibility', desc: 'Allow your profile to be discovered by peers.', icon: <Globe size={18} /> },
                     ].map((item) => (
                       <div key={item.key} className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                          <div className="flex items-center gap-5">
                             <div className="p-3 bg-slate-800 rounded-xl text-slate-400 group-hover:text-blue-400 transition-colors shadow-inner">
                                {item.icon}
                             </div>
                             <div>
                                <p className="font-bold text-white text-lg">{item.label}</p>
                                <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                             </div>
                          </div>
                          <button 
                             onClick={() => {
                               if (!isEditing) return;
                               setEditedUser(prev => ({
                                 ...prev, 
                                 preferences: { ...prev.preferences, [item.key]: !prev.preferences[item.key as keyof typeof prev.preferences] }
                               }));
                             }}
                             disabled={!isEditing}
                             className={`
                               w-14 h-8 rounded-full relative cursor-pointer transition-all duration-300 shadow-inner
                               ${editedUser.preferences[item.key as keyof typeof editedUser.preferences] ? 'bg-emerald-500' : 'bg-slate-700'}
                               ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}
                             `}
                          >
                             <div className={`absolute top-1 bottom-1 w-6 bg-white rounded-full shadow-lg transition-all duration-300 ${editedUser.preferences[item.key as keyof typeof editedUser.preferences] ? 'right-1' : 'left-1'}`} />
                          </button>
                       </div>
                    ))}
                  </div>
                  
                  <div className="pt-8 mt-8 border-t border-white/5">
                     <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Data Management</h3>
                     <div className="flex flex-col gap-3">
                        <button className="w-full p-5 rounded-2xl border border-white/10 flex items-center justify-between hover:bg-white/5 text-left group transition-all bg-black/10">
                           <div className="flex items-center gap-3">
                              <Save size={20} className="text-slate-400 group-hover:text-emerald-400" />
                              <span className="text-slate-300 group-hover:text-white font-medium">Export Data Archive (JSON)</span>
                           </div>
                           <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">2.4 MB</span>
                        </button>
                        <button className="w-full p-5 rounded-2xl border border-white/10 flex items-center justify-between hover:bg-rose-500/5 hover:border-rose-500/20 text-left group transition-all bg-black/10">
                           <div className="flex items-center gap-3">
                              <Trash2 size={20} className="text-slate-400 group-hover:text-rose-400" />
                              <span className="text-slate-300 group-hover:text-rose-400 font-medium">Delete All Local Data</span>
                           </div>
                           <Shield size={16} className="text-slate-600" />
                        </button>
                     </div>
                  </div>
                  
                  {onLogout && (
                    <div className="pt-8 mt-8 border-t border-white/5">
                         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Session Control</h3>
                         <button 
                           onClick={onLogout}
                           className="w-full p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 flex items-center justify-center gap-3 text-rose-400 hover:text-rose-300 transition-all font-bold"
                         >
                            <LogOut size={20} />
                            Sign Out of Device
                         </button>
                    </div>
                  )}
               </div>
             </GlassCard>
          )}

        </div>
      </div>
    </div>
  );
};
