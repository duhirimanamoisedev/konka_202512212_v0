
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, Assignment, Expense, Asset, WellbeingActivity, Course, Budget } from '../types';
import { GlassCard } from '../components/GlassCard';
import { generateDashboardInsight, analyzeSimulation } from '../services/geminiService';
import { 
  ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Calendar, ArrowRight, Zap, 
  Activity, Wallet, GraduationCap, AlertTriangle, Clock, 
  Sparkles, MoreHorizontal, Layout, Maximize2, FlaskConical,
  Sliders, ArrowUpRight, BarChart3, RotateCcw,
  BookOpen, Landmark, Plus, Target
} from 'lucide-react';

// Import Modals
import { AddExpenseModal, AddAssetModal, AddBudgetModal } from './FinanceView';
import { AddCourseModal, AddAssignmentModal } from './AcademicView';
import { ActivityLogModal } from './WellbeingView';

interface DashboardProps {
  data: AppState;
  onUpdateData: (data: AppState) => void;
}

type TimeRange = 'Week' | 'Month' | 'Semester' | 'Year' | 'All Time' | 'Custom';
type ActiveModal = 'expense' | 'wellbeing' | 'assignment' | 'asset' | 'course' | 'budget' | null;

export const Dashboard = ({ data, onUpdateData }: DashboardProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('Month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  
  const [isForecastMode, setIsForecastMode] = useState(false);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);

  // Quick Action State
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Neural Lab State
  const [labTab, setLabTab] = useState<'Correlator' | 'Simulator'>('Correlator');
  const [correlationX, setCorrelationX] = useState<'spend' | 'sleep' | 'study'>('spend');
  const [correlationY, setCorrelationY] = useState<'mood' | 'grade' | 'energy'>('mood');

  // Simulator State
  const [simStudyHours, setSimStudyHours] = useState(10); // + hours/week
  const [simSleep, setSimSleep] = useState(0); // + hours/night
  const [simSpending, setSimSpending] = useState(0); // % change
  const [simAnalysis, setSimAnalysis] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const currency = data.user.currency || '$';

  // --- 1. DATE LOGIC ENGINE ---
  const getDateRange = () => {
    const now = new Date();
    const start = new Date();
    
    // Default fallback
    if (data.wellbeing.length > 0) {
       // Set start to earliest log for All Time default if logic fails
       const earliest = new Date(data.wellbeing[data.wellbeing.length - 1].date);
       if (timeRange === 'All Time') return { start: earliest, end: now };
    }

    if (timeRange === 'Week') start.setDate(now.getDate() - 7);
    if (timeRange === 'Month') start.setMonth(now.getMonth() - 1);
    if (timeRange === 'Semester') start.setMonth(now.getMonth() - 4);
    if (timeRange === 'Year') start.setFullYear(now.getFullYear() - 1);
    
    if (timeRange === 'Custom') {
       const s = customStart ? new Date(customStart) : new Date();
       if (customStart) s.setHours(0,0,0,0);
       const e = customEnd ? new Date(customEnd) : now;
       if (customEnd) e.setHours(23,59,59,999);
       return { start: s, end: e };
    }

    return { start, end: now };
  };

  const { start: startDate, end: endDate } = getDateRange();

  // --- 2. DATA AGGREGATION ---
  useEffect(() => {
    setLoadingBrief(true);
    generateDashboardInsight(data, timeRange === 'Custom' ? 'Custom Range' : timeRange).then(res => {
      setAiBrief(res);
      setLoadingBrief(false);
    });
  }, [timeRange, customStart, customEnd, data]);

  const omniChartData = useMemo(() => {
    const chartMap = new Map<string, { 
       date: string, 
       spend: number, 
       mood: number, 
       grade: number | null,
       energy: number,
       productivity: number 
    }>();
    
    // Determine aggregation granularity
    const dayDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
    const isDaily = dayDiff <= 60; // Show daily if less than 2 months selected

    const iter = new Date(startDate);
    // Safety break for infinite loops
    let safeGuard = 0;
    while (iter <= endDate && safeGuard < 1000) {
      safeGuard++;
      const key = isDaily 
        ? iter.toISOString().split('T')[0] 
        : `${iter.getFullYear()}-${iter.getMonth()}`;
      
      const label = isDaily 
        ? iter.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
        : iter.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });

      if (!chartMap.has(key)) {
         chartMap.set(key, { date: label, spend: 0, mood: 0, grade: null, energy: 0, productivity: 0 }); 
      }
      
      if (isDaily) iter.setDate(iter.getDate() + 1);
      else iter.setMonth(iter.getMonth() + 1);
    }

    // Populate Data
    const addToMap = (dateStr: string, field: string, value: number) => {
       const d = new Date(dateStr);
       if (d >= startDate && d <= endDate) {
          const key = isDaily ? dateStr : `${d.getFullYear()}-${d.getMonth()}`;
          if (chartMap.has(key)) {
             const entry: any = chartMap.get(key)!;
             if (field === 'spend' || field === 'productivity') entry[field] += value;
             else {
                // Average for mood/energy
                entry[field] = entry[field] === 0 ? value : (entry[field] + value) / 2;
             }
          }
       }
    };

    data.expenses.forEach(e => addToMap(e.date, 'spend', e.amount));
    data.wellbeing.forEach(w => {
       addToMap(w.date, 'mood', w.mood);
       addToMap(w.date, 'energy', w.energyLevel);
       // Mock productivity: number of completed activities
       addToMap(w.date, 'productivity', w.activities.length * 10); 
    });

    // Mock Grades (interpolated)
    const avgGrade = data.courses.length > 0 
      ? data.courses.reduce((a,c) => a + c.grade, 0) / data.courses.length 
      : 0;

    Array.from(chartMap.keys()).forEach((key, i) => {
        const entry = chartMap.get(key)!;
        // Don't show default grade line if no courses
        entry.grade = data.courses.length > 0 ? avgGrade + (Math.sin(i) * 3) : null; 
    });

    let result = Array.from(chartMap.values());

    // Forecasting
    if (isForecastMode && result.length > 0) {
      const lastEntry = result[result.length - 1];
      const forecastLength = isDaily ? 7 : 3; 
      for (let i = 1; i <= forecastLength; i++) {
        result.push({
           date: `Future ${i}`,
           spend: lastEntry.spend * 1.05,
           mood: Math.max(0, Math.min(10, lastEntry.mood + (Math.random() - 0.5))),
           grade: lastEntry.grade ? lastEntry.grade + 0.2 : null,
           energy: Math.max(0, Math.min(10, lastEntry.energy + (Math.random() - 0.5))),
           productivity: lastEntry.productivity * 1.1
        });
      }
    }

    return result;
  }, [data, startDate, endDate, isForecastMode]);

  // --- 3. NEURAL LAB LOGIC ---
  const scatterData = useMemo(() => {
     // Map data points for correlation
     return data.wellbeing.map(w => {
        const dateExpenses = data.expenses
           .filter(e => e.date === w.date)
           .reduce((sum, e) => sum + e.amount, 0);
        
        // Mock study hours derived from activities
        const studyHrs = w.activities
           .filter(a => a.type === 'Intellectual')
           .reduce((sum, a) => sum + a.durationMinutes, 0) / 60;

        const xVal = correlationX === 'spend' ? dateExpenses : correlationX === 'sleep' ? w.sleepHours : studyHrs;
        const yVal = correlationY === 'mood' ? w.mood : correlationY === 'energy' ? w.energyLevel : 85; // Mock grade daily mapping

        return { x: xVal, y: yVal, z: 1 };
     }).filter(p => p.x > 0 || p.y > 0);
  }, [data, correlationX, correlationY]);

  const runSimulation = async () => {
     setIsSimulating(true);
     const result = await analyzeSimulation({ 
        studyHoursChange: simStudyHours, 
        sleepChange: simSleep, 
        spendingChange: simSpending 
     }, data);
     setSimAnalysis(result);
     setIsSimulating(false);
  };

  // --- HANDLERS FOR QUICK ACTIONS ---
  const handleSaveExpense = (expense: Expense) => {
     const updatedBudgets = data.budgets.map(b => {
      if (b.category === expense.category) return { ...b, spent: b.spent + expense.amount };
      return b;
     });
     onUpdateData({ ...data, expenses: [expense, ...data.expenses], budgets: updatedBudgets });
     setActiveModal(null);
  };

  const handleSaveWellbeing = (activity: WellbeingActivity) => {
      const today = new Date().toISOString().split('T')[0];
      const existingLogIndex = data.wellbeing.findIndex(w => w.date === today);
      let newWellbeing = [...data.wellbeing];

      if (existingLogIndex >= 0) {
          newWellbeing[existingLogIndex] = { ...newWellbeing[existingLogIndex], activities: [activity, ...newWellbeing[existingLogIndex].activities] };
      } else {
          newWellbeing = [{
              id: Date.now().toString(), date: today, mood: 5, stress: 5, gratitude: [],
              sleepHours: 0, sleepQuality: 5, energyLevel: 5, nutritionScore: 5,
              socialSatisfaction: 5, activities: [activity], journalEntry: ''
          }, ...newWellbeing];
      }
      onUpdateData({ ...data, wellbeing: newWellbeing });
      setActiveModal(null);
  };

  const handleSaveAssignment = (assignment: Assignment) => {
      onUpdateData({ ...data, assignments: [...data.assignments, assignment] });
      setActiveModal(null);
  };

  const handleSaveAsset = (asset: Asset) => {
      onUpdateData({ ...data, assets: [...data.assets, asset] });
      setActiveModal(null);
  };

  const handleSaveCourse = (course: Course) => {
      onUpdateData({ ...data, courses: [...data.courses, course] });
      setActiveModal(null);
  };

  const handleSaveBudget = (budget: Budget) => {
      onUpdateData({ ...data, budgets: [...data.budgets, budget] });
      setActiveModal(null);
  };

  // KPI Calcs
  const totalSpendInRange = data.expenses
    .filter(e => new Date(e.date) >= startDate && new Date(e.date) <= endDate)
    .reduce((a, b) => a + b.amount, 0);
  
  const avgMoodInRange = data.wellbeing
    .filter(w => new Date(w.date) >= startDate && new Date(w.date) <= endDate)
    .reduce((a, b) => a + b.mood, 0) / (data.wellbeing.filter(w => new Date(w.date) >= startDate && new Date(w.date) <= endDate).length || 1);

  const nextAssignment = data.assignments
    .filter(a => a.status !== 'completed' && new Date(a.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const daysUntilDeadline = nextAssignment 
    ? Math.ceil((new Date(nextAssignment.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) 
    : 0;
  
  const gpa = data.courses.length > 0
    ? (data.courses.reduce((a,c) => a + (c.grade >= 90 ? 4.0 : c.grade >= 80 ? 3.0 : c.grade >= 70 ? 2.0 : 1.0), 0) / data.courses.length).toFixed(2)
    : "N/A";

  return (
    <div className="space-y-8 animate-fade-in min-h-screen pb-10 max-w-full overflow-x-hidden">
      
      {/* 1. CONTROL DECK HEADER */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b border-white/5 pb-8">
         <div className="space-y-2">
            <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
               Command Center <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </h1>
            <p className="text-slate-400 font-medium">
               <span className="text-emerald-400">System Active.</span> Analyzing {timeRange} timeframe.
            </p>
         </div>

         <div className="flex flex-col items-end gap-4 w-full xl:w-auto">
             <div className="flex flex-wrap justify-end gap-4 items-center bg-slate-900/40 p-2 rounded-2xl border border-white/10 backdrop-blur-xl w-full xl:w-auto">
                 {/* Time Range Selector */}
                 <div className="flex bg-white/5 rounded-xl p-1 overflow-x-auto max-w-full scrollbar-hide">
                    {['Week', 'Month', 'Semester', 'Year', 'All Time', 'Custom'].map((range) => (
                       <button
                         key={range}
                         onClick={() => setTimeRange(range as TimeRange)}
                         className={`
                            px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                            ${timeRange === range 
                               ? 'bg-emerald-500 text-white shadow-lg' 
                               : 'text-slate-500 hover:text-white hover:bg-white/5'}
                         `}
                       >
                          {range}
                       </button>
                    ))}
                 </div>

                 {/* Forecast Toggle */}
                 <button
                   onClick={() => setIsForecastMode(!isForecastMode)}
                   className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider whitespace-nowrap
                      ${isForecastMode 
                         ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' 
                         : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10'}
                   `}
                 >
                    <Sparkles size={14} className={isForecastMode ? 'text-indigo-400' : 'text-slate-500'} />
                    Forecast
                 </button>
             </div>

             {/* Custom Date Pickers (Conditional) */}
             {timeRange === 'Custom' && (
                 <div className="flex items-center gap-2 animate-fade-in bg-white/5 p-2 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 px-3 py-1 bg-black/20 rounded-lg border border-white/10">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Start</span>
                        <input 
                            type="date" 
                            className="bg-transparent text-white text-xs font-mono outline-none"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                        />
                    </div>
                    <ArrowRight size={14} className="text-slate-600" />
                    <div className="flex items-center gap-2 px-3 py-1 bg-black/20 rounded-lg border border-white/10">
                        <span className="text-[10px] uppercase font-bold text-slate-500">End</span>
                        <input 
                            type="date" 
                            className="bg-transparent text-white text-xs font-mono outline-none"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                        />
                    </div>
                 </div>
             )}
         </div>
      </header>

      {/* 2. KPI MATRIX - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 min-w-0">
         <KPICard 
            title="Academic Velocity"
            value={gpa}
            trend={gpa !== "N/A" ? "+0.2" : undefined}
            icon={<GraduationCap size={20} />}
            color="text-blue-400"
            bg="bg-blue-500/10"
            subtext="Current Est. GPA"
         />
         <KPICard 
            title="Total Output"
            value={`${currency}${totalSpendInRange.toLocaleString()}`}
            trend={timeRange === 'Month' ? `-${currency}120` : undefined}
            isNegativeTrend={false}
            icon={<Wallet size={20} />}
            color="text-rose-400"
            bg="bg-rose-500/10"
            subtext="Financial Outflow"
         />
         <KPICard 
            title="Holistic Score"
            value={isNaN(avgMoodInRange) ? "N/A" : (avgMoodInRange * 10).toFixed(0)}
            trend="+5pts"
            icon={<Activity size={20} />}
            color="text-emerald-400"
            bg="bg-emerald-500/10"
            subtext="Optimized Balance"
         />
         <KPICard 
            title="Next Priority"
            value={nextAssignment ? `${daysUntilDeadline} Days` : "Clear"}
            trend="Urgent"
            icon={<Clock size={20} />}
            color="text-amber-400"
            bg="bg-amber-500/10"
            subtext={nextAssignment?.title || "No tasks"}
         />
      </div>

      {/* 3. MAIN OMNI-CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
         <GlassCard className="lg:col-span-2 min-h-[450px] flex flex-col relative overflow-hidden w-full">
             <div className="flex flex-col sm:flex-row justify-between items-start mb-6 z-10 relative gap-4">
                <div>
                   <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Layout size={18} className="text-emerald-400" /> Multi-Vector Analysis
                   </h3>
                   <p className="text-slate-400 text-xs mt-1">
                      Correlating 
                      <span className="text-rose-400 font-bold ml-1">Spend</span>, 
                      <span className="text-emerald-400 font-bold ml-1">Mood</span>, 
                      <span className="text-amber-400 font-bold ml-1">Energy</span>, 
                      & <span className="text-blue-400 font-bold ml-1">Grades</span>
                   </p>
                </div>
                {isForecastMode && (
                   <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-full animate-pulse whitespace-nowrap">
                      AI Projection Active
                   </span>
                )}
             </div>

             <div className="flex-1 w-full min-w-0 h-[350px]">
                <ResponsiveContainer width="100%" height="100%" debounce={200}>
                   <ComposedChart data={omniChartData} margin={{top: 10, right: 10, bottom: 0, left: 0}}>
                      <defs>
                         <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" stroke="#64748b" tickFormatter={(val) => `${currency}${val}`} tick={{fontSize: 10}} tickLine={false} axisLine={false} label={{ value: `Spend (${currency})`, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{fontSize: 10}} tickLine={false} axisLine={false} domain={[0, 100]} />
                      
                      <Tooltip 
                         contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                         labelStyle={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}
                         itemStyle={{ fontSize: '12px' }}
                         formatter={(value: any, name: any) => {
                             if (name === `Spend (${currency})`) return `${currency}${value}`;
                             return value;
                         }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />

                      <Bar yAxisId="left" dataKey="spend" barSize={12} radius={[4, 4, 0, 0]} fill="#f43f5e" opacity={0.6} name={`Spend (${currency})`} />
                      <Bar yAxisId="right" dataKey="productivity" barSize={12} radius={[4, 4, 0, 0]} fill="#8b5cf6" opacity={0.3} name="Productivity" />
                      
                      <Area yAxisId="right" type="monotone" dataKey="mood" stroke="#10b981" strokeWidth={2} fill="url(#colorMood)" name="Mood" />
                      {data.courses.length > 0 && <Line yAxisId="right" type="monotone" dataKey="grade" stroke="#3b82f6" strokeWidth={3} dot={false} name="Grade %" />}
                      <Line yAxisId="right" type="monotone" dataKey="energy" stroke="#fbbf24" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Energy" />
                      
                   </ComposedChart>
                </ResponsiveContainer>
             </div>
         </GlassCard>

         {/* 4. EXECUTIVE AI BRIEF & WIDGETS */}
         <div className="space-y-6 min-w-0">
            
            {/* AI Brief Widget */}
            <GlassCard className="border-t-4 border-t-emerald-500 bg-gradient-to-b from-emerald-900/10 to-transparent">
               <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                     <Sparkles className="text-emerald-400" size={18} />
                  </div>
                  <div>
                     <h3 className="text-sm font-bold text-white uppercase tracking-wider">Executive Brief</h3>
                     <p className="text-[10px] text-slate-400">Context: {timeRange}</p>
                  </div>
               </div>
               
               <div className="min-h-[100px] flex items-center">
                  {loadingBrief ? (
                     <div className="space-y-3 w-full animate-pulse">
                        <div className="h-2 bg-white/5 rounded w-full"/>
                        <div className="h-2 bg-white/5 rounded w-3/4"/>
                        <div className="h-2 bg-white/5 rounded w-5/6"/>
                     </div>
                  ) : (
                     <p className="text-sm text-slate-300 leading-relaxed font-medium">
                        {aiBrief || "System ready. Awaiting data points for briefing."}
                     </p>
                  )}
               </div>
            </GlassCard>

            {/* Deadline Countdown Widget */}
            <GlassCard className="flex flex-col justify-between min-h-[200px] relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6 opacity-5">
                  <Calendar size={100} className="text-white" />
               </div>
               <div className="relative z-10">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Priority Target</h3>
                  {nextAssignment ? (
                     <>
                        <h2 className="text-xl font-bold text-white leading-tight mb-2 line-clamp-2">
                           {nextAssignment.title}
                        </h2>
                        <div className="flex items-center gap-2 mb-6">
                           <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-white/10 text-slate-300 border border-white/5`}>
                              {nextAssignment.type}
                           </span>
                           <span className="text-xs text-slate-500">Weight: {nextAssignment.weight}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
                           <div className="h-full bg-amber-500 w-[75%] shadow-[0_0_10px_rgba(245,158,11,0.5)]"/>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                           <span>Progress</span>
                           <span className="text-amber-400">{daysUntilDeadline} Days Left</span>
                        </div>
                     </>
                  ) : (
                     <div className="text-slate-500 flex flex-col items-center justify-center h-24">
                        <CheckCircleIcon />
                        <span className="text-xs mt-2">All Clear</span>
                     </div>
                  )}
               </div>
            </GlassCard>

         </div>
      </div>

      {/* 5. KONKA NEURAL LAB (Advanced Analytics) */}
      <GlassCard className="border border-white/5 bg-slate-900/60 w-full min-w-0">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-white/5 pb-4">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/30">
                   <FlaskConical size={20} />
                </div>
                <div>
                   <h3 className="text-lg font-bold text-white">KONKA Neural Lab</h3>
                   <p className="text-xs text-slate-500">Advanced Correlation & Predictive Modeling Engine</p>
                </div>
             </div>
             <div className="flex bg-black/20 p-1 rounded-lg mt-4 md:mt-0">
                <button 
                  onClick={() => setLabTab('Correlator')} 
                  className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${labTab === 'Correlator' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                   Correlator
                </button>
                <button 
                  onClick={() => setLabTab('Simulator')} 
                  className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${labTab === 'Simulator' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                   Simulator
                </button>
             </div>
          </div>

          {labTab === 'Correlator' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
                <div className="space-y-6">
                   <p className="text-sm text-slate-300 leading-relaxed">
                      Select variables to visualize hidden relationships in your data. The Correlation Engine identifies how physical, financial, and academic vectors influence each other.
                   </p>
                   
                   <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase">X-Axis Variable</label>
                         <div className="grid grid-cols-3 gap-2">
                            {['spend', 'sleep', 'study'].map(v => (
                               <button 
                                 key={v} 
                                 onClick={() => setCorrelationX(v as any)}
                                 className={`py-2 rounded border text-xs font-bold uppercase transition-all ${correlationX === v ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-slate-500 hover:bg-white/5'}`}
                               >
                                  {v}
                               </button>
                            ))}
                         </div>
                      </div>
                      <div className="flex justify-center text-slate-600"><ArrowUpRight size={16}/></div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase">Y-Axis Variable</label>
                         <div className="grid grid-cols-3 gap-2">
                            {['mood', 'grade', 'energy'].map(v => (
                               <button 
                                 key={v} 
                                 onClick={() => setCorrelationY(v as any)}
                                 className={`py-2 rounded border text-xs font-bold uppercase transition-all ${correlationY === v ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-slate-500 hover:bg-white/5'}`}
                               >
                                  {v}
                               </button>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>

                <div className="lg:col-span-2 h-[300px] bg-black/20 rounded-2xl border border-white/5 relative overflow-hidden">
                   <div className="absolute top-4 left-4 z-10">
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                         {correlationX.toUpperCase()} vs {correlationY.toUpperCase()}
                      </span>
                   </div>
                   <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                         <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                         <XAxis type="number" dataKey="x" name={correlationX} stroke="#64748b" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                         <YAxis type="number" dataKey="y" name={correlationY} stroke="#64748b" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                         <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                         <Scatter name="Correlation" data={scatterData} fill="#8b5cf6" />
                      </ScatterChart>
                   </ResponsiveContainer>
                </div>
             </div>
          )}

          {labTab === 'Simulator' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-w-0">
                <div className="space-y-6">
                   <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                         <Sliders size={16} className="text-emerald-400" />
                         <h4 className="font-bold text-white text-sm">Variable Control Board</h4>
                      </div>
                      
                      <div className="space-y-4">
                         <div>
                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                               <span>Study Hours / Week</span>
                               <span className="text-white">+{simStudyHours} hrs</span>
                            </div>
                            <input 
                              type="range" min="0" max="20" step="1" 
                              value={simStudyHours} onChange={(e) => setSimStudyHours(Number(e.target.value))}
                              className="w-full accent-emerald-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                         </div>
                         <div>
                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                               <span>Sleep / Night</span>
                               <span className="text-white">{simSleep > 0 ? '+' : ''}{simSleep} hrs</span>
                            </div>
                            <input 
                              type="range" min="-2" max="2" step="0.5" 
                              value={simSleep} onChange={(e) => setSimSleep(Number(e.target.value))}
                              className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                         </div>
                         <div>
                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                               <span>Spending Habits</span>
                               <span className="text-white">{simSpending}%</span>
                            </div>
                            <input 
                              type="range" min="-50" max="50" step="5" 
                              value={simSpending} onChange={(e) => setSimSpending(Number(e.target.value))}
                              className="w-full accent-rose-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                         </div>
                      </div>

                      <button 
                        onClick={runSimulation}
                        disabled={isSimulating}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                         {isSimulating ? <RotateCcw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                         Run Predictive Model
                      </button>
                   </div>
                </div>

                <GlassCard className="bg-gradient-to-br from-indigo-900/20 to-slate-900 border-indigo-500/20 flex flex-col">
                   <h4 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                      <Zap size={16} className="text-amber-400" /> Impact Projection
                   </h4>
                   <div className="flex-1 flex items-center justify-center p-4">
                      {simAnalysis ? (
                         <div className="prose prose-invert prose-sm">
                            <p className="text-slate-300 leading-relaxed font-mono text-xs">
                               {simAnalysis}
                            </p>
                         </div>
                      ) : (
                         <div className="text-center text-slate-500 text-xs">
                            Adjust variables and run the model to see projected impact on GPA and Net Worth.
                         </div>
                      )}
                   </div>
                </GlassCard>
             </div>
          )}
      </GlassCard>

      {/* 6. BOTTOM METRIC STRIP (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-w-0">
         {/* Balance Radar */}
         <GlassCard title="Holistic Balance">
            <div className="h-[200px] w-full min-w-0" style={{ minHeight: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                   <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                      { subject: 'Health', A: data.wellbeing[0]?.energyLevel ? data.wellbeing[0].energyLevel * 10 : 50, fullMark: 100 },
                      { subject: 'Wealth', A: 65, fullMark: 100 },
                      { subject: 'Wisdom', A: data.wellbeing[0]?.mood ? data.wellbeing[0].mood * 10 : 60, fullMark: 100 },
                      { subject: 'Social', A: data.wellbeing[0]?.socialSatisfaction ? data.wellbeing[0].socialSatisfaction * 10 : 70, fullMark: 100 },
                      { subject: 'Spirit', A: 85, fullMark: 100 },
                   ]}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                      <Radar name="Balance" dataKey="A" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.3} />
                   </RadarChart>
                </ResponsiveContainer>
            </div>
         </GlassCard>

         {/* Grade Distribution */}
         <GlassCard title="Grade Distribution">
             {data.courses.length > 0 ? (
                <div className="space-y-4 mt-2">
                    {data.courses.slice(0, 4).map(course => (
                       <div key={course.id} className="flex items-center gap-3">
                          <div className="w-8 text-xs font-bold text-slate-500">{course.code.substring(0,4)}</div>
                          <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                             <div 
                               className="h-full rounded-full" 
                               style={{ width: `${course.grade}%`, backgroundColor: course.color }} 
                             />
                          </div>
                          <div className="w-8 text-right text-xs font-mono text-white">{course.grade}</div>
                       </div>
                    ))}
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                    <GraduationCap size={32} className="mb-2 opacity-50"/>
                    <span className="text-xs">No grades recorded</span>
                </div>
             )}
         </GlassCard>

         {/* Quick Actions (Expanded Grid) */}
         <GlassCard className="flex flex-col h-full">
             <h3 className="text-sm font-bold text-white mb-4">Quick Action Deck</h3>
             <div className="grid grid-cols-2 gap-3 flex-1">
                 <button 
                    onClick={() => setActiveModal('expense')}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 transition-all group"
                 >
                    <Wallet size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase">Add Expense</span>
                 </button>
                 
                 <button 
                    onClick={() => setActiveModal('wellbeing')}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 transition-all group"
                 >
                    <Activity size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase">Log Activity</span>
                 </button>

                 <button 
                    onClick={() => setActiveModal('assignment')}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-400 transition-all group"
                 >
                    <BookOpen size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase">New Assignment</span>
                 </button>

                 <button 
                    onClick={() => setActiveModal('asset')}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 transition-all group"
                 >
                    <Landmark size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase">Add Asset</span>
                 </button>

                 <button 
                    onClick={() => setActiveModal('course')}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50 text-slate-300 transition-all group"
                 >
                    <GraduationCap size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase">Add Course</span>
                 </button>

                 <button 
                    onClick={() => setActiveModal('budget')}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 transition-all group"
                 >
                    <Target size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase">Set Budget</span>
                 </button>
             </div>
         </GlassCard>
      </div>

      {/* --- MODAL INJECTIONS --- */}
      {activeModal === 'expense' && (
         <AddExpenseModal onClose={() => setActiveModal(null)} onSave={handleSaveExpense} />
      )}
      {activeModal === 'wellbeing' && (
         <ActivityLogModal onClose={() => setActiveModal(null)} onSave={handleSaveWellbeing} />
      )}
      {activeModal === 'assignment' && (
         <AddAssignmentModal 
            onClose={() => setActiveModal(null)} 
            onSave={handleSaveAssignment} 
            courses={data.courses}
            preSelectedCourseId={null}
         />
      )}
      {activeModal === 'asset' && (
         <AddAssetModal 
            onClose={() => setActiveModal(null)} 
            onSave={handleSaveAsset} 
            institutions={data.user.institutions} 
         />
      )}
      {activeModal === 'course' && (
         <AddCourseModal 
            onClose={() => setActiveModal(null)} 
            onSave={handleSaveCourse} 
            institutions={data.user.institutions} 
            preSelectedInstId={null}
         />
      )}
      {activeModal === 'budget' && (
         <AddBudgetModal onClose={() => setActiveModal(null)} onSave={handleSaveBudget} />
      )}

    </div>
  );
};

// Helper Component for Top Stats
const KPICard = ({ title, value, trend, isNegativeTrend, icon, color, bg, subtext }: any) => (
  <GlassCard className="p-5 flex items-start justify-between group hover:border-white/20 transition-all min-w-0">
     <div className="min-w-0">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">{title}</p>
        <h3 className="text-3xl font-extrabold text-white tracking-tight mb-2 truncate">{value}</h3>
        {trend && (
           <div className="flex items-center gap-1.5">
              {isNegativeTrend ? <TrendingDown size={14} className="text-rose-400" /> : <TrendingUp size={14} className="text-emerald-400" />}
              <span className={`text-xs font-bold ${isNegativeTrend ? 'text-rose-400' : 'text-emerald-400'}`}>{trend}</span>
              <span className="text-[10px] text-slate-500 ml-1 truncate max-w-[100px]">{subtext}</span>
           </div>
        )}
        {!trend && <span className="text-[10px] text-slate-500 truncate max-w-[150px] block">{subtext}</span>}
     </div>
     <div className={`p-3 rounded-xl ${bg} ${color} group-hover:scale-110 transition-transform flex-shrink-0`}>
        {icon}
     </div>
  </GlassCard>
);

const CheckCircleIcon = () => (
   <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
