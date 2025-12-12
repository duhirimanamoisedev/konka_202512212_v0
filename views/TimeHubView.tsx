
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, CalendarEvent, WellbeingLog, WellbeingActivity, Task, RecurrenceType } from '../types';
import { GlassCard } from '../components/GlassCard';
import { getUnifiedEvents, getISOWeek, getISOWeekRange } from '../services/timeService';
import { 
  Clock, Calendar as CalendarIcon, Play, Pause, Square, 
  RotateCcw, Zap, List, ChevronLeft, ChevronRight, 
  Target, Coffee, Flame, CheckCircle2, MoreVertical, Plus, 
  Repeat, CalendarDays, X, Check, Trash2, Tag, Flag, Hash, 
  CalendarRange, LayoutGrid, AlignLeft, ChevronDown, Layers, Timer,
  Trophy, Mountain, Map, CheckSquare
} from 'lucide-react';

interface TimeHubViewProps {
  data: AppState;
  onUpdateData: (data: AppState) => void;
}

type ViewMode = 'Day' | 'Week' | 'Month' | 'Year';
type TaskIntent = 'quick' | 'routine' | 'plan';

// Helper to format date as YYYY-MM-DD in LOCAL time
const toLocalISOString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- TASK INTENT SELECTOR COMPONENT ---
interface TaskIntentSelectorProps {
    onSelect: (intent: TaskIntent) => void;
    viewMode: ViewMode;
}

const TaskIntentSelector = ({ onSelect, viewMode }: TaskIntentSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-900/20"
            >
                <Plus size={16} />
                <span>Add Task</span>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in p-2">
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">
                            Select Planning Intent
                        </div>
                        
                        <button 
                            onClick={() => { onSelect('quick'); setIsOpen(false); }}
                            className="w-full text-left p-3 hover:bg-white/5 rounded-xl transition-colors group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Zap size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-white text-sm">Quick Task</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight pl-6">Single-occurrence actions. Immediate execution.</p>
                        </button>

                        <button 
                            onClick={() => { onSelect('routine'); setIsOpen(false); }}
                            className="w-full text-left p-3 hover:bg-white/5 rounded-xl transition-colors group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Repeat size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-white text-sm">Scheduled Routine</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight pl-6">Recurring habits, meetings, or repeated blocks.</p>
                        </button>

                        <button 
                            onClick={() => { onSelect('plan'); setIsOpen(false); }}
                            className="w-full text-left p-3 hover:bg-white/5 rounded-xl transition-colors group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Layers size={16} className="text-purple-400 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-white text-sm">Structured Plan</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight pl-6">Long-term goals, projects, and horizons.</p>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export const TimeHubView = ({ data, onUpdateData }: TimeHubViewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('Day');
  const [displayMode, setDisplayMode] = useState<'Grid' | 'List'>('Grid');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  // New Modal State System
  const [activeModal, setActiveModal] = useState<TaskIntent | null>(null);
  const [modalInitialData, setModalInitialData] = useState<Partial<Task> | null>(null);

  // Focus Engine State
  const [timerActive, setTimerActive] = useState(false);
  const [timerMode, setTimerMode] = useState<'Focus' | 'Short' | 'Long'>('Focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Seconds
  const [focusTask, setFocusTask] = useState('');

  // View Range Calculation
  const viewRange = useMemo(() => {
      const start = new Date(selectedDate);
      const end = new Date(selectedDate);
      
      if (viewMode === 'Day') {
          start.setHours(0,0,0,0);
          end.setHours(23,59,59,999);
      } else if (viewMode === 'Week') {
          const { start: s, end: e } = getISOWeekRange(selectedDate);
          return { start: s, end: e };
      } else if (viewMode === 'Month') {
          start.setDate(1);
          end.setMonth(end.getMonth() + 1);
          end.setDate(0);
          end.setHours(23,59,59,999);
      } else if (viewMode === 'Year') {
          start.setMonth(0, 1);
          end.setMonth(11, 31);
          end.setHours(23,59,59,999);
      }
      return { start, end };
  }, [viewMode, selectedDate]);

  useEffect(() => {
    const genStart = new Date(viewRange.start);
    genStart.setDate(genStart.getDate() - 7);
    const genEnd = new Date(viewRange.end);
    genEnd.setDate(genEnd.getDate() + 7);
    
    setEvents(getUnifiedEvents(data, genStart, genEnd));
  }, [data, viewRange]);

  // Enhanced Registry Filtering
  const registryTasks = useMemo(() => {
      const dateKey = toLocalISOString(selectedDate);
      
      return (data.tasks || []).filter(task => {
          if (viewMode === 'Day') {
              // Show daily recurrent tasks OR one-time tasks for this specific day
              return task.recurrence === 'daily' || (task.recurrence === 'once' && task.startDate === dateKey);
          }
          if (viewMode === 'Week') return task.recurrence === 'weekly';
          if (viewMode === 'Month') return task.recurrence === 'monthly';
          if (viewMode === 'Year') {
              // Show yearly recurrent tasks OR Structured Plans
              return task.recurrence === 'yearly' || task.tags.includes('Plan');
          }
          return false;
      });
  }, [data.tasks, viewMode, selectedDate]);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const handleTimerComplete = () => {
    setTimerActive(false);
    resetTimer(timerMode === 'Focus' ? 'Short' : 'Focus'); 
  };

  const resetTimer = (mode: 'Focus' | 'Short' | 'Long') => {
      setTimerActive(false);
      setTimerMode(mode);
      setTimeLeft(mode === 'Focus' ? 25 * 60 : mode === 'Short' ? 5 * 60 : 15 * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Navigation Logic
  const navigateDate = (dir: number) => {
      const newDate = new Date(selectedDate);
      if (viewMode === 'Day') newDate.setDate(selectedDate.getDate() + dir);
      if (viewMode === 'Week') newDate.setDate(selectedDate.getDate() + (dir * 7));
      if (viewMode === 'Month') newDate.setMonth(selectedDate.getMonth() + dir);
      if (viewMode === 'Year') newDate.setFullYear(selectedDate.getFullYear() + dir);
      setSelectedDate(newDate);
  };

  // --- NEW HANDLERS ---

  const handleIntentSelect = (intent: TaskIntent) => {
      setModalInitialData({
          startDate: toLocalISOString(selectedDate)
      });
      setActiveModal(intent);
  };

  const handleGridDoubleClick = (date: Date, hour?: number) => {
      const timeStr = hour !== undefined 
          ? `${hour < 10 ? '0' : ''}${hour}:00` 
          : undefined;

      setModalInitialData({
          startDate: toLocalISOString(date),
          time: timeStr
      });
      // Context Aware: Double click always implies a quick task in Day/Week view
      setActiveModal('quick'); 
  };

  const handleSaveTask = (task: Task) => {
      const updatedTasks = [...(data.tasks || []), task];
      onUpdateData({ ...data, tasks: updatedTasks });
      setActiveModal(null);
      setModalInitialData(null);
  };

  const toggleTaskCompletion = (taskId: string, dateKey: string) => {
      const taskIndex = data.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;

      const task = data.tasks[taskIndex];
      const isCompleted = task.completionHistory.includes(dateKey);
      
      let newHistory;
      if (isCompleted) {
          newHistory = task.completionHistory.filter(d => d !== dateKey);
      } else {
          newHistory = [...task.completionHistory, dateKey];
      }

      const updatedTasks = [...data.tasks];
      updatedTasks[taskIndex] = { ...task, completionHistory: newHistory };
      onUpdateData({ ...data, tasks: updatedTasks });
  };

  const deleteTask = (taskId: string) => {
      const updatedTasks = data.tasks.filter(t => t.id !== taskId);
      onUpdateData({ ...data, tasks: updatedTasks });
  };

  // Render Helpers
  const renderHeader = () => {
      const year = selectedDate.getFullYear();
      let title = "";
      let subtitle = "";

      if (viewMode === 'Day') {
          title = selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
          subtitle = selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric' });
      } else if (viewMode === 'Week') {
          const weekNum = getISOWeek(selectedDate);
          title = `Week ${weekNum}, ${year}`;
          const { start, end } = getISOWeekRange(selectedDate);
          subtitle = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      } else if (viewMode === 'Month') {
          title = selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      } else if (viewMode === 'Year') {
          title = year.toString();
          subtitle = "Strategic Overview";
      }

      return (
        <div className="flex flex-col md:flex-row justify-between items-center p-6 border-b border-white/5 gap-4">
            <div className="flex items-center gap-4">
                <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"><ChevronLeft /></button>
                <div className="text-center w-48">
                    <h2 className="text-2xl font-bold text-white leading-none">{title}</h2>
                    {subtitle && <span className="block text-sm text-emerald-400 font-medium mt-1">{subtitle}</span>}
                </div>
                <button onClick={() => navigateDate(1)} className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"><ChevronRight /></button>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
                    <button 
                        onClick={() => setDisplayMode('Grid')}
                        className={`p-2 rounded-md transition-all ${displayMode === 'Grid' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-white'}`}
                        title="Grid View"
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button 
                        onClick={() => setDisplayMode('List')}
                        className={`p-2 rounded-md transition-all ${displayMode === 'List' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-white'}`}
                        title="List View"
                    >
                        <AlignLeft size={16} />
                    </button>
                </div>
                <button onClick={() => setSelectedDate(new Date())} className="text-xs font-bold text-slate-400 hover:text-white border border-white/10 px-3 py-2 rounded-lg transition-all">
                    Today
                </button>
                
                <TaskIntentSelector onSelect={handleIntentSelect} viewMode={viewMode} />
            </div>
        </div>
      );
  };

  // Master List View
  const renderListView = () => {
      // Configuration for different scopes
      const config = {
          'Year': { title: selectedDate.getFullYear().toString(), subtitle: 'Yearly Milestones', icon: <Mountain size={24}/>, color: 'text-purple-400' },
          'Month': { title: selectedDate.toLocaleDateString(undefined, {month: 'long'}), subtitle: 'Monthly Goals', icon: <Map size={24}/>, color: 'text-blue-400' },
          'Week': { title: `Week ${getISOWeek(selectedDate)}`, subtitle: 'Weekly Objectives', icon: <Trophy size={24}/>, color: 'text-amber-400' },
          'Day': { title: selectedDate.toLocaleDateString(undefined, {weekday: 'long'}), subtitle: 'Daily Priorities', icon: <CheckSquare size={24}/>, color: 'text-emerald-400' }
      }[viewMode];

      const tasks = registryTasks;
      const completedCount = tasks.filter(t => t.completionHistory.includes(toLocalISOString(selectedDate))).length;
      const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

      return (
          <div className="p-8">
              {/* Header Banner */}
              <div className="flex items-end gap-6 mb-8 border-b border-white/5 pb-6">
                  <div className={`p-4 rounded-2xl bg-white/5 border border-white/5 ${config.color}`}>
                      {config.icon}
                  </div>
                  <div>
                      <h2 className="text-5xl font-black text-white tracking-tight">{config.title}</h2>
                      <p className={`text-lg font-medium ${config.color} mt-1 opacity-90 uppercase tracking-widest`}>{config.subtitle}</p>
                  </div>
                  <div className="ml-auto text-right">
                      <div className="text-3xl font-bold text-white">{completedCount}/{tasks.length}</div>
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Completed</div>
                  </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full mb-8 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${viewMode === 'Year' ? 'bg-purple-500' : viewMode === 'Month' ? 'bg-blue-500' : viewMode === 'Week' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{width: `${progress}%`}} />
              </div>

              {/* Task List */}
              <div className="grid grid-cols-1 gap-3">
                  {tasks.length > 0 ? (
                      tasks.map(task => {
                          const dateKey = toLocalISOString(selectedDate);
                          const isDone = task.completionHistory.includes(dateKey);
                          
                          return (
                              <div key={task.id} className="group p-4 bg-white/5 border border-white/5 hover:border-white/20 rounded-2xl transition-all relative flex items-center gap-4">
                                  <button 
                                      onClick={() => toggleTaskCompletion(task.id, dateKey)}
                                      className={`
                                          w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all
                                          ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 text-transparent hover:border-white'}
                                      `}
                                  >
                                      <Check size={16} strokeWidth={4} />
                                  </button>
                                  
                                  <div className="flex-1">
                                      <p className={`text-lg font-bold transition-all ${isDone ? 'text-slate-500 line-through' : 'text-white'}`}>{task.title}</p>
                                      <div className="flex gap-2 mt-1">
                                          {task.priority === 'high' && (
                                              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded uppercase">High Priority</span>
                                          )}
                                          <span className="text-[10px] font-bold text-slate-500 bg-black/20 px-2 py-0.5 rounded uppercase">{task.recurrence}</span>
                                          {task.time && <span className="text-[10px] font-bold text-slate-400 bg-black/20 px-2 py-0.5 rounded flex items-center gap-1"><Clock size={10}/> {task.time}</span>}
                                      </div>
                                  </div>

                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => deleteTask(task.id)} className="p-2 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-colors">
                                          <Trash2 size={18} />
                                      </button>
                                  </div>
                              </div>
                          );
                      })
                  ) : (
                      <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                          <div className="inline-flex p-4 bg-white/5 rounded-full text-slate-500 mb-4">
                              <List size={32} />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">No {config.subtitle} Set</h3>
                          <p className="text-slate-400 mb-6">Start planning your {viewMode.toLowerCase()} by adding a task.</p>
                          <button onClick={() => handleIntentSelect(viewMode === 'Year' || viewMode === 'Month' ? 'plan' : 'quick')} className="text-emerald-400 font-bold hover:text-emerald-300">
                              + Add Item
                          </button>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen pb-10 space-y-6 animate-fade-in p-2">
       {/* PAGE HEADER & CONTROLS */}
       <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-6">
          <div>
             <h1 className="text-4xl font-extrabold text-white flex items-center gap-3">
                Time Hub <Clock className="text-emerald-400" />
             </h1>
             <p className="text-slate-400 font-medium mt-1">Temporal Synchronization Module</p>
          </div>
          
          <div className="flex items-center gap-4">
              <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl">
                 {['Day', 'Week', 'Month', 'Year'].map((m) => (
                     <button 
                        key={m}
                        onClick={() => { setViewMode(m as ViewMode); setDisplayMode('Grid'); }} 
                        className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === m ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                     >
                        {m}
                     </button>
                 ))}
              </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COL: FOCUS & CONTEXT REGISTRY */}
          <div className="lg:col-span-3 space-y-6">
             {/* 1. FOCUS ENGINE */}
             <GlassCard className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-black border-emerald-500/30 shadow-2xl shadow-emerald-900/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 animate-pulse" />
                <div className="text-center py-4">
                   <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-[0.2em] mb-4">Focus Reactor</h3>
                   <div className="relative w-40 h-40 mx-auto mb-6 flex items-center justify-center">
                      <div className={`absolute inset-0 rounded-full border-4 ${timerActive ? 'border-emerald-500 animate-spin-slow' : 'border-slate-800'} border-t-transparent`} />
                      <div className="absolute inset-2 rounded-full border-2 border-white/5" />
                      <div className="text-center z-10">
                         <span className="text-4xl font-mono font-black text-white tracking-tighter block">{formatTime(timeLeft)}</span>
                         <span className="text-xs text-slate-500 uppercase font-bold mt-2 block">{timerMode} Mode</span>
                      </div>
                   </div>
                   <div className="space-y-4 px-2">
                      <div className="bg-white/5 rounded-xl p-1 flex">
                         {['Focus', 'Short', 'Long'].map((m) => (
                            <button 
                               key={m}
                               onClick={() => resetTimer(m as any)}
                               className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${timerMode === m ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                               {m}
                            </button>
                         ))}
                      </div>
                      <div className="flex gap-3">
                         <button 
                            onClick={() => setTimerActive(!timerActive)}
                            className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${timerActive ? 'bg-amber-500 hover:bg-amber-400 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                         >
                            {timerActive ? <Pause size={18} /> : <Play size={18} />}
                            {timerActive ? 'Pause' : 'Ignite'}
                         </button>
                         <button onClick={() => resetTimer(timerMode)} className="w-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-slate-300 hover:text-white transition-all">
                            <RotateCcw size={18} />
                         </button>
                      </div>
                   </div>
                </div>
             </GlassCard>

             {/* Simple Stats Widget (Replaces old registry in sidebar) */}
             <GlassCard className="flex flex-col justify-center items-center text-center p-6 space-y-2 border-t-4 border-t-purple-500">
                <Trophy size={32} className="text-purple-400 mb-2" />
                <h3 className="text-lg font-bold text-white">Execution Streak</h3>
                <p className="text-4xl font-black text-white">{data.tasks.filter(t => t.completionHistory.includes(toLocalISOString(new Date()))).length}</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Tasks Completed Today</p>
             </GlassCard>
          </div>

          {/* MAIN COL: CALENDAR GRID OR LIST */}
          <div className="lg:col-span-9">
             <GlassCard className="h-full min-h-[600px] flex flex-col p-0 overflow-hidden bg-black/20">
                {renderHeader()}

                {/* VIEW RENDERER */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                   
                   {displayMode === 'List' && renderListView()}

                   {displayMode === 'Grid' && viewMode === 'Day' && (
                      <div className="relative min-h-[800px] w-full">
                         {/* Time Grid Lines */}
                         {Array.from({ length: 18 }).map((_, i) => {
                            const hour = i + 6; // Start at 6 AM
                            return (
                               <div 
                                  key={hour} 
                                  onDoubleClick={() => handleGridDoubleClick(selectedDate, hour)}
                                  className="flex h-20 border-b border-white/5 relative group hover:bg-white/[0.02] cursor-crosshair transition-colors"
                               >
                                  <div className="w-20 text-right pr-4 py-2 text-xs text-slate-500 font-mono border-r border-white/5 select-none pointer-events-none">
                                     {hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}
                                  </div>
                                  <div className="flex-1 relative">
                                     {events.filter(e => new Date(e.start).getHours() === hour && new Date(e.start).toDateString() === selectedDate.toDateString()).map(e => {
                                        const startMin = new Date(e.start).getMinutes();
                                        const duration = (new Date(e.end).getTime() - new Date(e.start).getTime()) / (1000 * 60);
                                        const height = Math.max(20, (duration / 60) * 80); 
                                        const top = (startMin / 60) * 80;
                                        const isTask = e.type === 'Task';
                                        
                                        return (
                                           <div 
                                              key={e.id}
                                              onClick={(ev) => { ev.stopPropagation(); isTask && toggleTaskCompletion(e.meta?.taskId, e.meta?.dateKey); }}
                                              className={`absolute left-2 right-2 rounded-lg p-2 border-l-4 shadow-lg hover:brightness-110 transition-all cursor-pointer z-10 overflow-hidden group/event
                                                ${e.isCompleted ? 'opacity-50 grayscale' : ''}
                                              `}
                                              style={{ 
                                                 top: `${top}px`, 
                                                 height: `${height}px`, 
                                                 backgroundColor: `${e.color}20`,
                                                 borderColor: e.color
                                              }}
                                           >
                                              <div className="flex justify-between items-start">
                                                 <span className={`font-bold text-xs text-white truncate flex items-center gap-2 ${e.isCompleted ? 'line-through' : ''}`}>
                                                    {isTask && (
                                                        <div className={`w-3 h-3 border rounded-sm flex items-center justify-center ${e.isCompleted ? 'bg-white text-black' : 'border-white/50'}`}>
                                                            {e.isCompleted && <Check size={10} strokeWidth={4} />}
                                                        </div>
                                                    )}
                                                    {e.title}
                                                 </span>
                                                 <span className="text-[9px] font-mono text-slate-300 opacity-80 bg-black/40 px-1 rounded">
                                                    {new Date(e.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                 </span>
                                              </div>
                                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{e.type}</p>
                                           </div>
                                        );
                                     })}
                                  </div>
                               </div>
                            );
                         })}
                         {/* Current Time Line */}
                         {new Date().toDateString() === selectedDate.toDateString() && (
                            <div className="absolute left-20 right-0 h-0.5 bg-red-500 z-20 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.8)]" style={{ top: `${(new Date().getHours() - 6) * 80 + (new Date().getMinutes() / 60) * 80}px` }}>
                               <div className="absolute -left-1.5 -top-1 w-2.5 h-2.5 rounded-full bg-red-500" />
                            </div>
                         )}
                      </div>
                   )}

                   {displayMode === 'Grid' && viewMode === 'Week' && (
                      <div className="flex h-full min-w-[800px] overflow-x-auto">
                          <div className="w-14 flex-shrink-0 border-r border-white/5 bg-slate-900/50 pt-10">
                              {Array.from({ length: 18 }).map((_, i) => (
                                  <div key={i} className="h-20 text-right pr-2 text-[10px] text-slate-500 font-mono relative -top-2">
                                      {(i + 6) > 12 ? (i + 6) - 12 : (i + 6)} {(i + 6) >= 12 ? 'PM' : 'AM'}
                                  </div>
                              ))}
                          </div>
                          <div className="flex-1 grid grid-cols-7 divide-x divide-white/5">
                              {(() => {
                                  const { start } = getISOWeekRange(selectedDate);
                                  const days = Array.from({length: 7}, (_, i) => {
                                      const d = new Date(start);
                                      d.setDate(start.getDate() + i);
                                      return d;
                                  });
                                  return days.map((d, i) => {
                                      const isToday = new Date().toDateString() === d.toDateString();
                                      const dayEvents = events.filter(e => e.start.toDateString() === d.toDateString());
                                      return (
                                          <div key={i} className={`relative min-w-[100px] ${isToday ? 'bg-white/[0.02]' : ''}`}>
                                              <div className={`text-center py-2 border-b border-white/5 sticky top-0 bg-slate-900/90 backdrop-blur z-20 ${isToday ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                  <div className="text-xs font-bold uppercase">{d.toLocaleDateString(undefined, {weekday: 'short'})}</div>
                                                  <div className={`text-sm font-bold w-8 h-8 mx-auto flex items-center justify-center rounded-full mt-1 ${isToday ? 'bg-emerald-500 text-white' : ''}`}>
                                                      {d.getDate()}
                                                  </div>
                                              </div>
                                              <div className="relative h-[1440px]">
                                                  {Array.from({ length: 18 }).map((_, h) => {
                                                      const hour = h + 6;
                                                      return (
                                                          <div 
                                                            key={h} 
                                                            onDoubleClick={() => handleGridDoubleClick(d, hour)}
                                                            className="h-20 border-b border-white/[0.03] hover:bg-white/[0.02] cursor-crosshair transition-colors" 
                                                          />
                                                      );
                                                  })}
                                                  {dayEvents.map(e => {
                                                      const startHour = e.start.getHours();
                                                      if (startHour < 6) return null;
                                                      const top = (startHour - 6) * 80 + (e.start.getMinutes() / 60) * 80;
                                                      const duration = (e.end.getTime() - e.start.getTime()) / (1000 * 60);
                                                      const height = Math.max(24, (duration / 60) * 80);
                                                      const isTask = e.type === 'Task';
                                                      return (
                                                          <div key={e.id} onClick={(ev) => { ev.stopPropagation(); isTask && toggleTaskCompletion(e.meta?.taskId, e.meta?.dateKey); }} className={`absolute left-1 right-1 rounded p-1.5 text-[10px] border-l-2 overflow-hidden hover:brightness-110 hover:z-30 cursor-pointer transition-all ${e.isCompleted ? 'opacity-50 grayscale' : ''}`} style={{ top: `${top}px`, height: `${height}px`, backgroundColor: `${e.color}20`, borderColor: e.color }}>
                                                              <div className="font-bold text-white truncate flex items-center gap-1">{isTask && e.isCompleted && <Check size={8} />} {e.title}</div>
                                                              <div className="opacity-70 truncate">{e.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                                          </div>
                                                      );
                                                  })}
                                              </div>
                                          </div>
                                      );
                                  });
                              })()}
                          </div>
                      </div>
                   )}

                   {displayMode === 'Grid' && viewMode === 'Month' && (
                      <div className="grid grid-cols-7 h-full min-h-[600px] auto-rows-fr">
                         {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="p-2 text-center text-xs font-bold text-slate-500 uppercase border-b border-r border-white/5 bg-white/5">
                               {d}
                            </div>
                         ))}
                         {(() => {
                            const cells = [];
                            const year = selectedDate.getFullYear();
                            const month = selectedDate.getMonth();
                            const firstDay = new Date(year, month, 1).getDay();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} className="border-b border-r border-white/5 bg-black/40" />);
                            for (let d = 1; d <= daysInMonth; d++) {
                               const dateStr = new Date(year, month, d).toDateString();
                               const isToday = new Date().toDateString() === dateStr;
                               const dayEvents = events.filter(e => e.start.toDateString() === dateStr);
                               const dayDate = new Date(year, month, d);
                               
                               cells.push(
                                  <div 
                                    key={d} 
                                    onDoubleClick={() => handleGridDoubleClick(dayDate)}
                                    className={`p-2 border-b border-r border-white/5 min-h-[100px] relative group hover:bg-white/[0.02] transition-colors cursor-pointer ${isToday ? 'bg-emerald-500/5' : ''}`}
                                  >
                                     <span className={`text-sm font-bold ${isToday ? 'text-emerald-400' : 'text-slate-400'}`}>{d}</span>
                                     <div className="mt-2 space-y-1">
                                        {dayEvents.slice(0, 3).map(e => (
                                           <div key={e.id} className={`text-[9px] truncate px-1.5 py-0.5 rounded border-l-2 text-white/80 ${e.isCompleted ? 'opacity-50 line-through' : ''}`} style={{ backgroundColor: `${e.color}15`, borderColor: e.color }}>
                                              {e.title}
                                           </div>
                                        ))}
                                        {dayEvents.length > 3 && <div className="text-[9px] text-slate-500 text-center font-bold">+{dayEvents.length - 3} more</div>}
                                     </div>
                                  </div>
                               );
                            }
                            return cells;
                         })()}
                      </div>
                   )}

                   {displayMode === 'Grid' && viewMode === 'Year' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6 h-full overflow-y-auto">
                          {Array.from({length: 12}, (_, i) => new Date(selectedDate.getFullYear(), i, 1)).map((m, i) => {
                              const monthStart = new Date(selectedDate.getFullYear(), i, 1);
                              const monthEnd = new Date(selectedDate.getFullYear(), i + 1, 0, 23, 59, 59);
                              const monthEvents = events.filter(e => e.start >= monthStart && e.start <= monthEnd);
                              const highPriorityCount = monthEvents.filter(e => e.type === 'Task' && data.tasks.find(t => t.id === e.meta?.taskId)?.priority === 'high').length;
                              return (
                                  <div key={i} className="bg-white/5 rounded-xl border border-white/5 p-4 hover:border-emerald-500/30 transition-colors group relative cursor-pointer" onClick={() => { setSelectedDate(monthStart); setViewMode('Month'); }}>
                                      <h3 className="text-lg font-bold text-white mb-2">{m.toLocaleDateString(undefined, {month: 'long'})}</h3>
                                      <div className="space-y-2 mb-4">
                                          <div className="flex justify-between text-xs text-slate-400"><span>Events</span><span className="text-white">{monthEvents.length}</span></div>
                                          <div className="flex justify-between text-xs text-slate-400"><span>Priorities</span><span className="text-rose-400">{highPriorityCount}</span></div>
                                      </div>
                                      <div className="h-16 w-full bg-black/20 rounded-lg flex items-end p-1 gap-0.5">
                                          {Array.from({length: 10}).map((_, d) => <div key={d} className="flex-1 bg-emerald-500/20 rounded-sm" style={{height: `${Math.random() * 100}%`}} />)}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                   )}

                </div>
             </GlassCard>
          </div>

       </div>

       {/* --- MODAL INJECTIONS BASED ON INTENT --- */}
       {activeModal === 'quick' && (
           <QuickTaskModal 
                onClose={() => { setActiveModal(null); setModalInitialData(null); }}
                onSave={handleSaveTask}
                initialData={modalInitialData}
                viewContext={{ mode: viewMode, date: selectedDate }}
           />
       )}
       {activeModal === 'routine' && (
           <RoutineTaskModal
                onClose={() => { setActiveModal(null); setModalInitialData(null); }}
                onSave={handleSaveTask}
                initialData={modalInitialData}
           />
       )}
       {activeModal === 'plan' && (
           <StructuredPlanModal
                onClose={() => { setActiveModal(null); setModalInitialData(null); }}
                onSave={handleSaveTask}
                appData={data} // Pass data for linking context
                initialData={modalInitialData}
           />
       )}
    </div>
  );
};

// --- SPECIALIZED MODALS ---

interface BaseModalProps {
    onClose: () => void;
    onSave: (task: Task) => void;
    initialData?: Partial<Task> | null;
    viewContext?: { mode: ViewMode, date: Date };
}

// 1. QUICK TASK MODAL
const QuickTaskModal = ({ onClose, onSave, initialData, viewContext }: BaseModalProps) => {
    const [form, setForm] = useState({
        title: '',
        date: initialData?.startDate || toLocalISOString(new Date()),
        time: initialData?.time || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),
        duration: 30,
        priority: 'medium' as const
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Helper to calculate weeks belonging to the selected month for discrete selection
    const getMonthWeeks = (date: Date) => {
        const weeks = [];
        const year = date.getFullYear();
        const month = date.getMonth();
        // Start from 1st of month
        const d = new Date(year, month, 1);
        
        while(d.getMonth() === month) {
            const w = getISOWeek(d);
            if (!weeks.includes(w)) weeks.push(w);
            d.setDate(d.getDate() + 7); // Jump roughly a week
        }
        return weeks;
    };

    // Helper to set date to the Monday of a specific week number
    const setDateFromWeek = (week: number) => {
        if (!viewContext) return;
        const year = viewContext.date.getFullYear();
        // Approximation logic: Jan 4th is always in week 1.
        // We find a date that matches the week and year.
        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const dayOfWeek = simple.getDay();
        const ISOweekStart = simple;
        if (dayOfWeek <= 4)
            ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else
            ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
        
        setForm({...form, date: toLocalISOString(ISOweekStart)});
    };

    // Week view days
    const weekDays = useMemo(() => {
        if (viewContext?.mode === 'Week') {
            const { start } = getISOWeekRange(viewContext.date);
            return Array.from({length: 7}, (_, i) => {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                return d;
            });
        }
        return [];
    }, [viewContext]);

    const handleSubmit = () => {
        if (!form.title) return;
        onSave({
            id: Date.now().toString(),
            title: form.title,
            priority: form.priority,
            status: 'active',
            recurrence: 'once',
            startDate: form.date,
            time: form.time,
            durationMinutes: form.duration,
            completionHistory: [],
            tags: [],
            color: '#fbbf24' // Amber for Quick
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <GlassCard className="w-full max-w-sm border-t-4 border-t-amber-500 !p-0 overflow-hidden">
                <div className="p-6 bg-slate-900">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><Zap size={18} className="text-amber-400"/> Quick Task</h3>
                        <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-white" /></button>
                    </div>
                    <div className="space-y-4">
                        <input 
                            value={form.title}
                            onChange={e => setForm({...form, title: e.target.value})}
                            placeholder="What needs doing?"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                            autoFocus
                        />
                        
                        {/* --- DISCRETE SELECTORS BASED ON VIEW MODE --- */}
                        
                        {/* YEAR MODE: Month Grid */}
                        {viewContext?.mode === 'Year' && (
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                {months.map((m, i) => {
                                    // Check if form.date matches this month (ignoring day)
                                    // We use the month/year from viewContext to ensure we are comparing within the viewed year
                                    // But form.date is string YYYY-MM-DD.
                                    // Simple string parsing is safer than Date object for Y-M matching to avoid timezone shifts on display
                                    const [yStr, mStr] = form.date.split('-');
                                    const isSelected = (parseInt(mStr) - 1) === i && parseInt(yStr) === viewContext.date.getFullYear();

                                    return (
                                        <button 
                                            key={m}
                                            onClick={() => {
                                                const d = new Date(viewContext.date.getFullYear(), i, 1);
                                                setForm({...form, date: toLocalISOString(d)});
                                            }}
                                            className={`
                                                py-2 rounded-lg text-xs font-bold transition-all
                                                ${isSelected ? 'bg-amber-500 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}
                                            `}
                                        >
                                            {m}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* MONTH MODE: Week Buttons */}
                        {viewContext?.mode === 'Month' && (
                            <div className="space-y-2 mb-2">
                                <label className="text-[10px] uppercase font-bold text-slate-500">Select Week</label>
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {getMonthWeeks(viewContext.date).map(w => {
                                        const dateOfWeek = new Date(form.date);
                                        // Very rough check if current selected date falls in this week
                                        const isSelected = getISOWeek(dateOfWeek) === w; 
                                        return (
                                            <button 
                                                key={w}
                                                onClick={() => setDateFromWeek(w)}
                                                className={`
                                                    px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap
                                                    ${isSelected ? 'bg-amber-500 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}
                                                `}
                                            >
                                                Week {w}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* WEEK MODE: Day Buttons */}
                        {viewContext?.mode === 'Week' ? (
                            <div className="flex justify-between gap-1 mb-2">
                                {weekDays.map(d => {
                                    const dateStr = toLocalISOString(d);
                                    const isSelected = form.date === dateStr;
                                    const isToday = toLocalISOString(new Date()) === dateStr;
                                    return (
                                        <button 
                                            key={dateStr}
                                            onClick={() => setForm({...form, date: dateStr})}
                                            className={`
                                                w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                                ${isSelected ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/40 scale-110' : 'bg-white/5 text-slate-400 hover:bg-white/10'}
                                                ${isToday && !isSelected ? 'border border-amber-500/50 text-amber-400' : ''}
                                            `}
                                        >
                                            {d.toLocaleDateString(undefined, {weekday: 'narrow'})}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            /* DAY MODE or Fallback: Standard Date Picker */
                            viewContext?.mode === 'Day' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <input 
                                        type="date"
                                        value={form.date}
                                        onChange={e => setForm({...form, date: e.target.value})}
                                        className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                    />
                                    <input 
                                        type="time"
                                        value={form.time}
                                        onChange={e => setForm({...form, time: e.target.value})}
                                        className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                    />
                                </div>
                            )
                        )}

                        {/* Always show time input for Week/Month/Year if not covered by grid */}
                        {viewContext?.mode !== 'Day' && (
                             <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500">Execution Time</label>
                                <input 
                                    type="time"
                                    value={form.time}
                                    onChange={e => setForm({...form, time: e.target.value})}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                />
                             </div>
                        )}

                        <div className="flex gap-2">
                            {[15, 30, 60].map(m => (
                                <button 
                                    key={m}
                                    onClick={() => setForm({...form, duration: m})}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${form.duration === m ? 'bg-amber-500 text-white border-amber-400' : 'bg-white/5 text-slate-400 border-white/5'}`}
                                >
                                    {m}m
                                </button>
                            ))}
                        </div>
                        <button onClick={handleSubmit} className="w-full mt-4 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-900/20">
                            Commit Task
                        </button>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

// 2. ROUTINE MODAL
const RoutineTaskModal = ({ onClose, onSave, initialData }: BaseModalProps) => {
    const [form, setForm] = useState({
        title: '',
        startDate: initialData?.startDate || toLocalISOString(new Date()),
        endDate: '',
        time: initialData?.time || '09:00',
        duration: 60,
        recurrence: 'weekly' as RecurrenceType,
        customDays: [] as number[],
        color: '#3b82f6'
    });

    const toggleDay = (d: number) => {
        if (form.customDays.includes(d)) setForm(prev => ({...prev, customDays: prev.customDays.filter(x => x !== d)}));
        else setForm(prev => ({...prev, customDays: [...prev.customDays, d]}));
    };

    const handleSubmit = () => {
        if (!form.title) return;
        onSave({
            id: Date.now().toString(),
            title: form.title,
            priority: 'medium',
            status: 'active',
            recurrence: form.recurrence,
            customDays: form.customDays,
            startDate: form.startDate,
            endDate: form.endDate || undefined, // Support end of routine
            time: form.time,
            durationMinutes: form.duration,
            completionHistory: [],
            tags: ['Routine'],
            color: form.color
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <GlassCard className="w-full max-w-md border-t-4 border-t-blue-500 !p-0 overflow-hidden">
                <div className="p-6 bg-slate-900">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white">Define New Routine</h3>
                            <p className="text-xs text-slate-400">Recurring Schedule Protocol</p>
                        </div>
                        <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-white" /></button>
                    </div>

                    <div className="space-y-5">
                        <input 
                            value={form.title}
                            onChange={e => setForm({...form, title: e.target.value})}
                            placeholder="Routine Name (e.g. Weekly Review)"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                        />

                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block flex items-center gap-2"><Repeat size={10}/> Recurrence Pattern</label>
                            <div className="flex bg-black/20 p-1 rounded-xl">
                                {['daily', 'weekly', 'monthly', 'custom'].map(r => (
                                    <button 
                                        key={r}
                                        onClick={() => setForm({...form, recurrence: r as any})}
                                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${form.recurrence === r ? 'bg-blue-500 text-white shadow' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                            {form.recurrence === 'custom' && (
                                <div className="flex gap-2 mt-3 justify-center">
                                    {['S','M','T','W','T','F','S'].map((d, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => toggleDay(i)}
                                            className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${form.customDays.includes(i) ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Start Date</label>
                                <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">End Date (Optional)</label>
                                <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Time</label>
                            <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
                        </div>

                        <button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
                            <CalendarRange size={16} /> Generate Schedule
                        </button>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

// 3. STRUCTURED PLAN MODAL
const StructuredPlanModal = ({ onClose, onSave, appData, initialData }: BaseModalProps & { appData: AppState }) => {
    const [form, setForm] = useState({
        title: '',
        startDate: initialData?.startDate || toLocalISOString(new Date()),
        endDate: '',
        context: '',
        color: '#a855f7'
    });

    const goals = appData?.user?.goals || [];
    const courses = appData?.courses || [];

    const handleSubmit = () => {
        if (!form.title) return;
        // Structured plans are mapped as 'once' recurrence with a long duration or specific tags
        onSave({
            id: Date.now().toString(),
            title: form.title,
            description: `Horizon: ${form.startDate} to ${form.endDate || 'Ongoing'}. Context: ${form.context}`,
            priority: 'high', // Plans imply importance
            status: 'active',
            recurrence: 'once', 
            startDate: form.startDate,
            time: '09:00',
            durationMinutes: 60, // Default slot
            completionHistory: [],
            tags: ['Plan', form.context].filter(Boolean),
            color: form.color
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <GlassCard className="w-full max-w-lg border-t-4 border-t-purple-500 !p-0 overflow-hidden">
                <div className="p-8 bg-slate-900">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-2xl font-bold text-white">Establish Horizon</h3>
                            <p className="text-sm text-slate-400">Strategic Project & Goal Planning</p>
                        </div>
                        <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-white" /></button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2 block">Plan Title</label>
                            <input 
                                value={form.title}
                                onChange={e => setForm({...form, title: e.target.value})}
                                placeholder="e.g. Q1 Exam Prep, Semester Project"
                                className="w-full bg-transparent border-b-2 border-white/10 py-2 text-xl font-bold text-white focus:border-purple-500 focus:outline-none placeholder:text-slate-700"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Start Date</label>
                                <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Target Date</label>
                                <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block flex items-center gap-2"><Target size={10}/> Linked Context</label>
                            <select 
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none"
                                value={form.context}
                                onChange={e => setForm({...form, context: e.target.value})}
                            >
                                <option value="">Select Goal or Course...</option>
                                <optgroup label="Strategic Goals">
                                    {goals.map((g, i) => <option key={`g-${i}`} value={g}>{g}</option>)}
                                </optgroup>
                                <optgroup label="Academic Courses">
                                    {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </optgroup>
                            </select>
                        </div>

                        <button onClick={handleSubmit} className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]">
                            <Layers size={18} /> Map Planning Horizon
                        </button>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};
