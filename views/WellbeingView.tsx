
import React, { useState, useEffect } from 'react';
import { AppState, WellbeingLog, WellbeingActivity, ActivityType } from '../types';
import { GlassCard } from '../components/GlassCard';
import { analyzeHolisticWellbeing } from '../services/geminiService';
import { 
  Heart, Zap, BookOpen, Brain, Activity, Plus, X, 
  Sparkles, CheckCircle2, TrendingUp, Calendar, 
  Dumbbell, Cross, Users, Coffee, Music, List, BarChart3,
  Flame, ScrollText, UserPlus, Phone, Signal, Ruler
} from 'lucide-react';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart, BarChart, Bar
} from 'recharts';

interface WellbeingViewProps {
  data: AppState;
  onUpdateData: (data: AppState) => void;
}

type Sector = 'Overview' | 'Body' | 'Mind' | 'Spirit' | 'Connection';

export const WellbeingView = ({ data, onUpdateData }: WellbeingViewProps) => {
  const [activeSector, setActiveSector] = useState<Sector>('Overview');
  const [showLogModal, setShowLogModal] = useState(false);
  const [logModalType, setLogModalType] = useState<ActivityType | undefined>(undefined);
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    if (data.wellbeing.length > 0 && !insight) {
      analyzeHolisticWellbeing(data).then(setInsight);
    }
  }, [data.wellbeing.length]);

  // --- CALCULATION ENGINE ---
  const latestLog = data.wellbeing[0] || {};
  
  // Calculate Holistic Score (Weighted Average)
  const calculateScore = (log: Partial<WellbeingLog>) => {
     if (!log.mood) return 0;
     const physical = (log.sleepQuality || 5) + (log.energyLevel || 5); // Max 20
     const mental = (log.mood || 5) + (10 - (log.stress || 5)); // Max 20
     const spiritual = log.activities?.some(a => a.type === 'Spiritual') ? 10 : 5; // Bonus for practice
     const social = (log.socialSatisfaction || 5); // Max 10
     
     // Normalize to 100 roughly
     const raw = physical + mental + spiritual + social;
     return Math.min(100, Math.round((raw / 50) * 100));
  };

  const dailyScore = calculateScore(latestLog);

  // --- ACTIONS ---
  const handleOpenLog = (type?: ActivityType) => {
      setLogModalType(type);
      setShowLogModal(true);
  };

  const handleSaveActivity = (activity: WellbeingActivity) => {
      // Logic to add activity to today's log or create a new one
      const today = new Date().toISOString().split('T')[0];
      const existingLogIndex = data.wellbeing.findIndex(w => w.date === today);
      
      let newWellbeing = [...data.wellbeing];

      if (existingLogIndex >= 0) {
          // Update existing
          newWellbeing[existingLogIndex] = {
              ...newWellbeing[existingLogIndex],
              activities: [activity, ...newWellbeing[existingLogIndex].activities]
          };
      } else {
          // Create new log for today
          const newLog: WellbeingLog = {
              id: Date.now().toString(),
              date: today,
              mood: 5, stress: 5, gratitude: [],
              sleepHours: 0, sleepQuality: 5, energyLevel: 5, nutritionScore: 5,
              socialSatisfaction: 5,
              activities: [activity],
              journalEntry: ''
          };
          newWellbeing = [newLog, ...newWellbeing];
      }

      onUpdateData({ ...data, wellbeing: newWellbeing });
      setShowLogModal(false);
  };

  // --- NAVIGATION ---
  const sectors: {id: Sector, icon: any, color: string}[] = [
    { id: 'Overview', icon: BarChart3, color: 'text-emerald-400' },
    { id: 'Body', icon: Dumbbell, color: 'text-blue-400' },
    { id: 'Mind', icon: Brain, color: 'text-purple-400' },
    { id: 'Spirit', icon: Cross, color: 'text-amber-400' }, 
    { id: 'Connection', icon: Users, color: 'text-rose-400' },
  ];

  return (
    <div className="space-y-8 animate-fade-in p-2 min-h-screen pb-20">
      
      {/* HEADER & NAV */}
      <div className="flex flex-col xl:flex-row justify-between items-end gap-6 mb-8">
         <div>
            <h1 className="text-4xl font-extrabold text-white mb-2 flex items-center gap-3">
               Life Analytics<span className="text-emerald-500">.</span>
            </h1>
            <p className="text-slate-400">Quantified Self & Holistic Tracking System</p>
         </div>

         <div className="flex bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl overflow-x-auto max-w-full">
            {sectors.map(sector => (
               <button
                  key={sector.id}
                  onClick={() => setActiveSector(sector.id)}
                  className={`
                     flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap
                     ${activeSector === sector.id 
                       ? 'bg-white/10 text-white shadow-lg border border-white/10' 
                       : 'text-slate-400 hover:text-white hover:bg-white/5'}
                  `}
               >
                  <sector.icon size={16} className={activeSector === sector.id ? sector.color : ''} />
                  {sector.id}
               </button>
            ))}
         </div>
      </div>

      {/* SECTOR VIEWS */}
      {activeSector === 'Overview' && <OverviewSector data={data} dailyScore={dailyScore} insight={insight} />}
      {activeSector === 'Body' && <BodySector data={data} onOpenLog={handleOpenLog} />}
      {activeSector === 'Mind' && <MindSector data={data} onOpenLog={handleOpenLog} />}
      {activeSector === 'Spirit' && <SpiritSector data={data} onOpenLog={handleOpenLog} />}
      {activeSector === 'Connection' && <ConnectionSector data={data} onOpenLog={handleOpenLog} />}

      {/* FAB LOG BUTTON */}
      <button 
         onClick={() => handleOpenLog()}
         className="fixed bottom-8 right-8 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 transition-all hover:scale-110 z-50 group"
      >
         <Plus size={24} />
         <span className="absolute right-16 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
            Log Activity
         </span>
      </button>

      {/* ACTIVITY LOG MODAL */}
      {showLogModal && (
         <ActivityLogModal 
            onClose={() => setShowLogModal(false)} 
            onSave={handleSaveActivity}
            initialType={logModalType}
         />
      )}
    </div>
  );
};

// --- SECTOR COMPONENTS ---

const OverviewSector = ({ data, dailyScore, insight }: { data: AppState, dailyScore: number, insight: string | null }) => {
   // Radar Data
   const radarData = [
      { subject: 'Physical', A: (data.wellbeing[0]?.energyLevel || 5), fullMark: 10 },
      { subject: 'Mental', A: (data.wellbeing[0]?.mood || 5), fullMark: 10 },
      { subject: 'Social', A: (data.wellbeing[0]?.socialSatisfaction || 5), fullMark: 10 },
      { subject: 'Spiritual', A: (data.wellbeing[0]?.activities?.some(a => a.type === 'Spiritual') ? 9 : 4), fullMark: 10 },
      { subject: 'Sleep', A: (data.wellbeing[0]?.sleepQuality || 5), fullMark: 10 },
   ];

   return (
      <div className="space-y-6">
         {/* Top Grid */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Score Card */}
            <GlassCard className="lg:col-span-1 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden bg-gradient-to-br from-slate-900 to-emerald-900/20">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
               <div className="relative z-10 text-center">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Daily Holistic Score</div>
                  <div className="text-8xl font-black text-white tracking-tighter drop-shadow-2xl">
                     {dailyScore}
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mt-4 border ${dailyScore > 80 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                     {dailyScore > 80 ? 'Optimal State' : 'Improvement Needed'}
                  </div>
               </div>
            </GlassCard>

            {/* AI Insight */}
            <GlassCard className="lg:col-span-2 flex flex-col justify-center border-t-4 border-t-indigo-500">
               <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-500/10 rounded-lg"><Sparkles className="text-indigo-400" size={20} /></div>
                  <h3 className="text-lg font-bold text-white">Analysis Engine</h3>
               </div>
               <div className="prose prose-invert prose-sm">
                  <p className="text-slate-300 leading-relaxed text-base">
                     {insight || "Gathering data points for analysis..."}
                  </p>
               </div>
            </GlassCard>
         </div>

         {/* Middle Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard title="Balance Vector">
               <div className="h-[300px] w-full min-w-0" style={{ minHeight: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%" debounce={200}>
                     <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                        <Radar name="Wellbeing" dataKey="A" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.4} />
                     </RadarChart>
                  </ResponsiveContainer>
               </div>
            </GlassCard>

            <GlassCard title="Activity Stream" icon={<List size={18} />}>
               <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {data.wellbeing.flatMap(d => d.activities.map(a => ({...a, date: d.date}))).slice(0, 10).map((act, i) => (
                     <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-colors">
                        <div className={`p-3 rounded-lg ${act.type === 'Sport' ? 'bg-blue-500/20 text-blue-400' : act.type === 'Spiritual' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                           {act.type === 'Sport' ? <Dumbbell size={16}/> : act.type === 'Spiritual' ? <BookOpen size={16}/> : <Activity size={16}/>}
                        </div>
                        <div className="flex-1">
                           <p className="font-bold text-white text-sm">{act.name}</p>
                           <p className="text-xs text-slate-500">{new Date(act.date).toLocaleDateString(undefined, {weekday: 'short'})} • {act.time} • {act.durationMinutes}m</p>
                        </div>
                        <div className="text-right">
                           <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Int: {act.intensity}</div>
                        </div>
                     </div>
                  ))}
                  {data.wellbeing.length === 0 && (
                      <p className="text-slate-500 text-sm p-4 text-center">No activities recorded yet.</p>
                  )}
               </div>
            </GlassCard>
         </div>
      </div>
   );
};

const BodySector = ({ data, onOpenLog }: { data: AppState, onOpenLog: (type: ActivityType) => void }) => {
   const chartData = [...data.wellbeing].reverse().map(w => ({
      date: new Date(w.date).toLocaleDateString(undefined, { weekday: 'short' }),
      energy: w.energyLevel,
      sleep: w.sleepHours
   }));

   const activities = data.wellbeing.flatMap(w => w.activities).filter(a => a.type === 'Sport');

   return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-6">
            <GlassCard title="Physical Load & Recovery">
               <div className="h-[300px] w-full min-w-0" style={{ minHeight: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%" debounce={200}>
                     <AreaChart data={chartData}>
                        <defs>
                           <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <XAxis dataKey="date" stroke="#64748b" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '8px'}} />
                        <Area type="monotone" dataKey="energy" stroke="#3b82f6" strokeWidth={3} fill="url(#colorEnergy)" name="Energy" />
                        <Line type="monotone" dataKey="sleep" stroke="#f59e0b" strokeWidth={3} name="Sleep (h)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </GlassCard>

            <div className="grid grid-cols-2 gap-4">
               {['Sleep Quality', 'Nutrition'].map(metric => (
                  <GlassCard key={metric} className="flex items-center justify-between p-6">
                     <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">{metric}</p>
                        <p className="text-2xl font-bold text-white mt-1">8.5<span className="text-sm text-slate-500">/10</span></p>
                     </div>
                     <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <Activity size={20} />
                     </div>
                  </GlassCard>
               ))}
            </div>
         </div>

         <div className="space-y-4">
            <GlassCard title="Workout Log" className="h-full">
               <div className="space-y-3">
                  {activities.length > 0 ? activities.map((act, i) => (
                     <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <div>
                           <p className="font-bold text-white text-sm">{act.name}</p>
                           <p className="text-xs text-slate-400">
                               {act.metricValue ? `${act.metricValue} ${act.metricUnit} • ` : ''}
                               {act.durationMinutes} min
                           </p>
                        </div>
                        <Dumbbell size={16} className="text-blue-400" />
                     </div>
                  )) : <p className="text-slate-500 text-sm">No workouts logged recently.</p>}
                  
                  <button 
                     onClick={() => onOpenLog('Sport')}
                     className="w-full py-3 border border-dashed border-white/10 rounded-xl text-slate-500 hover:text-blue-400 hover:border-blue-500/30 transition-all text-sm font-bold flex items-center justify-center gap-2"
                  >
                     <Plus size={16} /> Log Workout
                  </button>
               </div>
            </GlassCard>
         </div>
      </div>
   );
};

const SpiritSector = ({ data, onOpenLog }: { data: AppState, onOpenLog: (type: ActivityType) => void }) => {
   const spiritualActs = data.wellbeing.flatMap(w => w.activities).filter(a => a.type === 'Spiritual');

   return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <GlassCard className="relative overflow-hidden border-t-4 border-t-amber-500">
            <div className="absolute top-0 right-0 p-6 opacity-10">
               <BookOpen size={120} className="text-amber-500" />
            </div>
            <div className="relative z-10">
               <h2 className="text-2xl font-bold text-white mb-6">Spiritual Practice</h2>
               
               <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {spiritualActs.length > 0 ? spiritualActs.map((act, i) => (
                     <div key={i} className="bg-amber-900/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-4">
                        <div className="p-3 bg-amber-500/20 rounded-lg text-amber-400">
                           <BookOpen size={20} />
                        </div>
                        <div>
                           <div className="flex items-center gap-2">
                               <h4 className="font-bold text-white text-lg">{act.name}</h4>
                               {act.reference && <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">{act.reference}</span>}
                           </div>
                           <p className="text-amber-200/60 text-sm mb-2">{act.durationMinutes} minutes • {act.time}</p>
                           {act.notes && (
                              <p className="text-sm text-slate-300 italic">"{act.notes}"</p>
                           )}
                        </div>
                     </div>
                  )) : (
                     <div className="text-center py-10 text-slate-500">
                        No spiritual practices logged this week.
                     </div>
                  )}
               </div>

               <button 
                  onClick={() => onOpenLog('Spiritual')}
                  className="mt-6 w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-amber-900/20 transition-all"
               >
                  Log Practice (Bible, Meditation, etc.)
               </button>
            </div>
         </GlassCard>

         <div className="space-y-6">
            <GlassCard title="Meaning & Purpose" className="min-h-[300px] flex flex-col">
               <div className="flex flex-col h-full justify-between">
                  <div className="space-y-4">
                     <p className="text-sm text-slate-300 leading-relaxed">
                        "The mystery of life is not a problem to be solved, but a reality to be experienced."
                     </p>
                     <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Verse of the Day</h4>
                        <p className="text-white font-serif text-lg">Philippians 4:13</p>
                        <p className="text-slate-400 text-sm italic">"I can do all things through Christ who strengthens me."</p>
                     </div>
                  </div>
                  
                  <div className="mt-8">
                     <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Consistency Streak</h4>
                     <div className="flex gap-1">
                        {[1,1,1,0,1,1,0].map((d, i) => (
                           <div key={i} className={`h-8 flex-1 rounded-md ${d ? 'bg-amber-500' : 'bg-slate-700/50'}`} />
                        ))}
                     </div>
                     <p className="text-right text-xs text-amber-400 mt-2 font-bold">5 Days this week</p>
                  </div>
               </div>
            </GlassCard>
         </div>
      </div>
   );
};

const MindSector = ({ data, onOpenLog }: { data: AppState, onOpenLog: (type: ActivityType) => void }) => (
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <GlassCard title="Cognitive State" className="lg:col-span-2">
         <div className="h-[250px] w-full min-w-0" style={{ minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%" debounce={200}>
               <LineChart data={[...data.wellbeing].reverse().map(w => ({date: new Date(w.date).toLocaleDateString(undefined, {weekday:'short'}), mood: w.mood, stress: w.stress}))}>
                  <XAxis dataKey="date" stroke="#64748b" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none'}} />
                  <Line type="monotone" dataKey="mood" stroke="#a855f7" strokeWidth={3} dot={{r:4}} name="Mood" />
                  <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={3} dot={{r:4}} name="Stress" />
               </LineChart>
            </ResponsiveContainer>
         </div>
         <div className="mt-4 flex justify-end">
             <button onClick={() => onOpenLog('Intellectual')} className="text-xs text-purple-400 font-bold border border-purple-500/30 px-3 py-1.5 rounded-lg hover:bg-purple-500/10">
                 + Log Intellectual Activity
             </button>
         </div>
      </GlassCard>
      
      <GlassCard title="Gratitude Journal">
         <div className="space-y-3">
            {data.wellbeing.slice(0, 3).map((w, i) => (
               <div key={i}>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">{new Date(w.date).toLocaleDateString()}</p>
                  <ul className="list-disc list-inside text-sm text-slate-300">
                     {w.gratitude.map((g, j) => <li key={j}>{g}</li>)}
                  </ul>
               </div>
            ))}
            <button onClick={() => onOpenLog('Creative')} className="w-full mt-2 py-2 text-xs text-purple-400 font-bold border border-dashed border-purple-500/30 rounded-lg hover:bg-purple-500/5">
                + Add Entry
            </button>
         </div>
      </GlassCard>
   </div>
);

const ConnectionSector = ({ data, onOpenLog }: { data: AppState, onOpenLog: (type: ActivityType) => void }) => (
   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <GlassCard title="Social Battery">
         <div className="flex items-center justify-center h-[200px]">
            <div className="relative w-32 h-32">
               <svg className="w-full h-full -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                  <circle cx="64" cy="64" r="56" stroke="#f43f5e" strokeWidth="12" fill="none" strokeDasharray="351" strokeDashoffset="100" strokeLinecap="round" />
               </svg>
               <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold text-white">72%</span>
                  <span className="text-[10px] uppercase text-rose-400 font-bold">Charged</span>
               </div>
            </div>
         </div>
         <p className="text-center text-sm text-slate-400">You have energy for 1 more event today.</p>
      </GlassCard>

      <GlassCard title="Interaction Log">
         <div className="space-y-3">
             {data.wellbeing.flatMap(w => w.activities).filter(a => a.type === 'Social').map((act, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                   <div className="p-2 bg-rose-500/10 rounded-full text-rose-400">
                      <Users size={16} />
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between">
                          <p className="text-sm font-bold text-white">{act.name}</p>
                          {act.person && <span className="text-[10px] bg-white/10 px-2 rounded text-slate-300">{act.person}</span>}
                      </div>
                      <p className="text-xs text-slate-500">
                          {act.platform ? `${act.platform} • ` : ''} {act.durationMinutes} mins
                      </p>
                   </div>
                </div>
             ))}
             <button 
                onClick={() => onOpenLog('Social')}
                className="w-full py-2 border border-dashed border-white/10 rounded-lg text-xs text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition-all"
             >
               + Log Interaction
             </button>
         </div>
      </GlassCard>
   </div>
);

// --- DYNAMIC MODAL ---

export interface ActivityLogModalProps {
   onClose: () => void;
   onSave: (activity: WellbeingActivity) => void;
   initialType?: ActivityType;
}

export const ActivityLogModal = ({ onClose, onSave, initialType }: ActivityLogModalProps) => {
   const [type, setType] = useState<ActivityType>(initialType || 'Sport');
   
   // Unified State Form
   const [form, setForm] = useState<Partial<WellbeingActivity>>({
      durationMinutes: 30,
      intensity: 5,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      name: '',
      notes: '',
      // Specifics
      reference: '',
      metricValue: undefined,
      metricUnit: 'km',
      person: '',
      platform: 'In Person',
      focusScore: 5
   });

   const handleSubmit = () => {
      if (!form.name) return;
      onSave({
         id: Date.now().toString(),
         type: type,
         name: form.name,
         durationMinutes: Number(form.durationMinutes) || 30,
         intensity: Number(form.intensity) || 5,
         time: form.time || '12:00',
         notes: form.notes,
         reference: form.reference,
         metricValue: form.metricValue ? Number(form.metricValue) : undefined,
         metricUnit: form.metricUnit,
         person: form.person,
         platform: form.platform,
         focusScore: Number(form.focusScore)
      });
   };

   // Render different inputs based on active type
   const renderFormContent = () => {
       switch(type) {
           case 'Sport': // BODY
               return (
                   <>
                       <div className="space-y-4 animate-fade-in">
                           <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
                               <Dumbbell className="text-blue-400" />
                               <div>
                                   <h4 className="font-bold text-white text-sm">Physical Activity</h4>
                                   <p className="text-xs text-slate-400">Track movements, sets, and cardio.</p>
                               </div>
                           </div>
                           
                           <div>
                               <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Activity Name</label>
                               <input 
                                   value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                                   placeholder="e.g. Morning Run, Chest Day" 
                                   className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" 
                               />
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                   <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Distance / Amount</label>
                                   <div className="flex gap-2">
                                       <input type="number" value={form.metricValue || ''} onChange={e => setForm({...form, metricValue: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" placeholder="0" />
                                       <select value={form.metricUnit} onChange={e => setForm({...form, metricUnit: e.target.value})} className="bg-black/20 border border-white/10 rounded-xl px-2 text-white text-xs">
                                           <option value="km">km</option>
                                           <option value="mi">mi</option>
                                           <option value="kg">kg</option>
                                           <option value="reps">reps</option>
                                       </select>
                                   </div>
                               </div>
                               <div>
                                   <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Intensity (1-10)</label>
                                   <input type="number" max="10" min="1" value={form.intensity} onChange={e => setForm({...form, intensity: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none" />
                               </div>
                           </div>
                       </div>
                   </>
               );
            case 'Spiritual': // SPIRIT
                return (
                    <>
                       <div className="space-y-4 animate-fade-in">
                           <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                               <BookOpen className="text-amber-400" />
                               <div>
                                   <h4 className="font-bold text-white text-sm">Spiritual Practice</h4>
                                   <p className="text-xs text-slate-400">Log scripture, prayer, or meditation.</p>
                               </div>
                           </div>
                           
                           <div>
                               <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Practice Name</label>
                               <input 
                                   value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                                   placeholder="e.g. Bible Study, Morning Prayer" 
                                   className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:outline-none" 
                               />
                           </div>

                           <div>
                               <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Reference / Verse (Optional)</label>
                               <div className="relative">
                                   <ScrollText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                   <input 
                                       value={form.reference || ''} onChange={e => setForm({...form, reference: e.target.value})}
                                       placeholder="e.g. John 3:16, Psalm 23" 
                                       className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-amber-500 focus:outline-none font-serif italic" 
                                   />
                               </div>
                           </div>
                       </div>
                   </>
                );
            case 'Social': // CONNECTION
                return (
                    <>
                       <div className="space-y-4 animate-fade-in">
                           <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
                               <Users className="text-rose-400" />
                               <div>
                                   <h4 className="font-bold text-white text-sm">Social Interaction</h4>
                                   <p className="text-xs text-slate-400">Track connections and relationships.</p>
                               </div>
                           </div>
                           
                           <div>
                               <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Event / Context</label>
                               <input 
                                   value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                                   placeholder="e.g. Lunch, Call, Study Group" 
                                   className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none" 
                               />
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                   <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Person / Group</label>
                                   <div className="relative">
                                       <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                       <input 
                                           value={form.person || ''} onChange={e => setForm({...form, person: e.target.value})}
                                           placeholder="Name" 
                                           className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-rose-500 focus:outline-none" 
                                       />
                                   </div>
                               </div>
                               <div>
                                   <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Platform</label>
                                   <select value={form.platform} onChange={e => setForm({...form, platform: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none text-sm appearance-none">
                                       <option>In Person</option>
                                       <option>Phone Call</option>
                                       <option>Video Chat</option>
                                       <option>Texting</option>
                                   </select>
                               </div>
                           </div>
                       </div>
                    </>
                );
           default: // GENERIC / MIND
               return (
                   <>
                       <div className="space-y-4 animate-fade-in">
                           <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-3">
                               <Brain className="text-purple-400" />
                               <div>
                                   <h4 className="font-bold text-white text-sm">Mental Activity</h4>
                                   <p className="text-xs text-slate-400">Log learning, reading, or creative work.</p>
                               </div>
                           </div>
                           
                           <div>
                               <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Topic / Activity</label>
                               <input 
                                   value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                                   placeholder="e.g. Reading History, Coding" 
                                   className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none" 
                               />
                           </div>
                           
                           <div>
                               <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Focus Level (1-10)</label>
                               <input type="number" max="10" min="1" value={form.focusScore || 5} onChange={e => setForm({...form, focusScore: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none" />
                           </div>
                       </div>
                   </>
               );
       }
   };

   return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
         <GlassCard className={`w-full max-w-lg border-t-4 ${type === 'Sport' ? 'border-t-blue-500' : type === 'Spiritual' ? 'border-t-amber-500' : type === 'Social' ? 'border-t-rose-500' : 'border-t-purple-500'}`}>
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-white">Log Activity</h3>
               <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-white" /></button>
            </div>

            {/* Type Selector (Tabs) */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
               {['Sport', 'Spiritual', 'Intellectual', 'Social', 'Creative'].map(t => (
                  <button 
                     key={t} 
                     onClick={() => setType(t as ActivityType)}
                     className={`
                        px-3 py-1.5 rounded-lg border transition-all text-xs font-bold uppercase whitespace-nowrap
                        ${type === t 
                           ? 'bg-white/10 text-white border-white/20' 
                           : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}
                     `}
                  >
                     {t}
                  </button>
               ))}
            </div>

            {/* DYNAMIC FORM CONTENT */}
            {renderFormContent()}

            {/* COMMON FIELDS */}
            <div className="grid grid-cols-2 gap-4 mt-4">
                 <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Duration (min)</label>
                      <input 
                        type="number" 
                        value={form.durationMinutes}
                        onChange={e => setForm({...form, durationMinutes: Number(e.target.value)})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none" 
                      />
                 </div>
                 <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Time</label>
                      <input 
                        type="time" 
                        value={form.time}
                        onChange={e => setForm({...form, time: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none" 
                      />
                 </div>
            </div>

            <div className="mt-4">
               <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Reflections / Notes</label>
               <textarea 
                  value={form.notes || ''}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="How did it feel?" 
                  rows={2} 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none" 
               />
            </div>

            <button 
               onClick={handleSubmit}
               disabled={!form.name}
               className={`w-full mt-6 text-white font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${type === 'Sport' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' : type === 'Spiritual' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20' : type === 'Social' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20'}`}
            >
               Save Entry
            </button>
         </GlassCard>
      </div>
   );
};
