
import React, { useState, useEffect } from 'react';
import { AppState, Course, Assignment, Institution, StudyResource } from '../types';
import { GlassCard } from '../components/GlassCard';
import { analyzeCoursePerformance } from '../services/geminiService';
import { 
  FileText, Clock, Award, Building2, ChevronRight, X, 
  BookOpen, Video, Link as LinkIcon, Download, Sparkles,
  Calendar, Loader2, AlertCircle, CheckCircle, TrendingUp, Plus,
  Target, ChevronDown, Zap, Hash, Flag, Layers, Sliders, Trash2, Pencil,
  ArrowRight, ArrowLeft, Settings
} from 'lucide-react';
import { 
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis 
} from 'recharts';

interface AcademicViewProps {
  data: AppState;
  onUpdateData: (data: AppState) => void;
}

export const AcademicView = ({ data, onUpdateData }: AcademicViewProps) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isAddAssignmentOpen, setIsAddAssignmentOpen] = useState(false);
  
  // Edit States
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  
  const [preSelectedInstId, setPreSelectedInstId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selectedCourse = data.courses.find(c => c.id === selectedCourseId);
  const selectedInstitution = selectedCourse ? data.user.institutions.find(i => i.id === selectedCourse?.institutionId) : null;
  const courseAssignments = selectedCourseId ? data.assignments.filter(a => a.courseId === selectedCourseId) : [];
  const courseResources = selectedCourseId ? data.resources.filter(r => r.courseId === selectedCourseId) : [];

  // --- AUTO-COMPLETE LOGIC ---
  useEffect(() => {
     const now = new Date();
     const assignmentsToUpdate = data.assignments.filter(a => 
        a.status !== 'completed' && new Date(a.dueDate) <= now
     );

     if (assignmentsToUpdate.length > 0) {
        const updatedAssignments = data.assignments.map(a => 
           (a.status !== 'completed' && new Date(a.dueDate) <= now)
           ? { ...a, status: 'completed' as const }
           : a
        );
        onUpdateData({ ...data, assignments: updatedAssignments });
     }
  }, [data.assignments, onUpdateData]);

  // --- CALCULATION ENGINE ---
  const calculateCourseGrade = (assignments: Assignment[]): number => {
      const completed = assignments.filter(a => a.status === 'completed');
      if (completed.length === 0) return 100; // Default if nothing done yet

      let totalWeightedScore = 0;
      let totalWeightAttempted = 0;

      completed.forEach(a => {
          const score = (a.grade || 0) / (a.maxGrade || 100);
          totalWeightedScore += score * a.weight;
          totalWeightAttempted += a.weight;
      });

      if (totalWeightAttempted === 0) return 100;

      // Normalize to 0-100 scale
      return (totalWeightedScore / totalWeightAttempted) * 100;
  };

  const handleSaveCourse = (course: Course) => {
    let updatedCourses = [...data.courses];
    if (editingCourse) {
        updatedCourses = updatedCourses.map(c => c.id === course.id ? course : c);
    } else {
        updatedCourses.push(course);
    }
    onUpdateData({ ...data, courses: updatedCourses });
    setIsAddCourseOpen(false);
    setEditingCourse(null);
  };

  const handleSaveAssignment = (assignment: Assignment) => {
    let updatedAssignments = [...data.assignments];
    
    // 1. Update/Add Assignment
    if (editingAssignment) {
        updatedAssignments = updatedAssignments.map(a => a.id === assignment.id ? assignment : a);
    } else {
        updatedAssignments.push(assignment);
    }

    // 2. Recalculate Course Grade automatically
    const targetCourseId = assignment.courseId;
    const courseAssignments = updatedAssignments.filter(a => a.courseId === targetCourseId);
    const newGrade = calculateCourseGrade(courseAssignments);

    // 3. Update Course
    const updatedCourses = data.courses.map(c => 
        c.id === targetCourseId ? { ...c, grade: Number(newGrade.toFixed(2)) } : c
    );

    onUpdateData({ ...data, assignments: updatedAssignments, courses: updatedCourses });
    setIsAddAssignmentOpen(false);
    setEditingAssignment(null);
  };

  const handleDeleteAssignment = () => {
      if (!deleteId) return;
      const assignment = data.assignments.find(a => a.id === deleteId);
      if (!assignment) return;
      
      const updatedAssignments = data.assignments.filter(a => a.id !== deleteId);
      
      // Recalculate course grade after deletion
      const targetCourseId = assignment.courseId;
      const courseAssignments = updatedAssignments.filter(a => a.courseId === targetCourseId);
      const newGrade = calculateCourseGrade(courseAssignments);

      const updatedCourses = data.courses.map(c => 
          c.id === targetCourseId ? { ...c, grade: Number(newGrade.toFixed(2)) } : c
      );

      onUpdateData({ ...data, assignments: updatedAssignments, courses: updatedCourses });
      setDeleteId(null);
  };

  const handleStatusChange = (assignment: Assignment, direction: 'forward' | 'backward') => {
      const statuses: Assignment['status'][] = ['pending', 'in-progress', 'completed'];
      const currentIndex = statuses.indexOf(assignment.status);
      let newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
      
      // Bounds check
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= statuses.length) newIndex = statuses.length - 1;
      
      const newStatus = statuses[newIndex];
      
      // If moving to completed, we should ideally open the edit modal to ask for grades
      // For now, we update status, but user can edit later for grade
      if (newStatus === 'completed' && assignment.grade === undefined) {
         // Optionally trigger edit modal here, but for smooth UX, we just update status
         // User will see "Pending" grade or 0/100
      }

      if (newStatus !== assignment.status) {
         const updated = { ...assignment, status: newStatus };
         handleSaveAssignment(updated); // Re-use logic to recalc grades
      }
  };

  const openAddModal = (instId?: string) => {
     setPreSelectedInstId(instId || null);
     setEditingCourse(null);
     setIsAddCourseOpen(true);
  };

  const openEditCourse = (course: Course) => {
      setEditingCourse(course);
      setIsAddCourseOpen(true);
  };

  const openEditAssignment = (a: Assignment) => {
      setEditingAssignment(a);
      setIsAddAssignmentOpen(true);
  };

  // Helper to display grade based on scale
  const displayGrade = (percentage: number, scale: number = 4.0) => {
      if (scale === 100) return `${percentage.toFixed(1)}%`;
      const converted = (percentage / 100) * scale;
      return converted.toFixed(2);
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 relative min-h-screen">
      
      {/* HEADER SECTION */}
      <header className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Academics</h1>
          <p className="text-slate-400">Manage courses across your institutions.</p>
        </div>
        <button 
          onClick={() => openAddModal()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-900/20"
        >
          + Add Course
        </button>
      </header>

      {/* INSTITUTION GROUPING */}
      {!selectedCourseId && data.user.institutions.map(inst => {
        const instCourses = data.courses.filter(c => c.institutionId === inst.id);
        
        return (
          <div key={inst.id} className="space-y-4 mb-10">
            <div className="flex items-center gap-3 border-b border-white/5 pb-2">
               <div className="p-2 rounded-lg bg-white/5 text-emerald-400">
                  <Building2 size={20} />
               </div>
               <div>
                 <h2 className="text-xl font-bold text-white">{inst.name}</h2>
                 <p className="text-xs text-slate-400 uppercase tracking-wider">{inst.program}</p>
               </div>
               {inst.primary && <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold rounded-full">Primary</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {instCourses.map(course => (
                <GlassCard 
                  key={course.id} 
                  className="group cursor-pointer hover:border-emerald-500/30 transition-all duration-300"
                  onClick={() => setSelectedCourseId(course.id)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: course.color }}
                    >
                      {course.code.substring(0, 2)}
                    </div>
                    <div className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold border border-white/10 group-hover:bg-white/20">
                      {course.credits} Cr
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-1">{course.name}</h3>
                  <div className="flex justify-between items-center mb-6">
                     <p className="text-slate-400 text-sm">{course.code}</p>
                     <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar size={12} /> {course.schedule}
                     </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Current Standing</span>
                      <span className="text-white font-mono font-bold text-lg">
                          {displayGrade(course.grade, course.gpaScale || 4.0)} 
                          <span className="text-xs text-slate-500 ml-1">/ {course.gpaScale || 4.0}</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 group-hover:brightness-125"
                        style={{ width: `${course.grade}%`, backgroundColor: course.color }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex justify-between text-slate-400 group-hover:text-emerald-300 transition-colors">
                      <span className="text-xs">View Details</span>
                      <ChevronRight size={16} />
                  </div>
                </GlassCard>
              ))}
              
               {/* Add New Placeholder specific to this institution */}
               <div 
                  onClick={() => openAddModal(inst.id)}
                  className="border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-600 hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all cursor-pointer min-h-[220px]"
                >
                <span className="text-2xl mb-2 font-light">+</span>
                <span className="text-sm font-medium">Add Course to {inst.name}</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Empty State if no institutions */}
      {!selectedCourseId && data.user.institutions.length === 0 && (
         <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <Building2 size={64} className="text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Institutions Found</h3>
            <p className="text-slate-400">Please go to your Profile to add a University or School.</p>
         </div>
      )}


      {/* COURSE DETAIL OVERLAY (MODAL-LIKE) */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-6xl h-full max-h-full bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
             {/* Modal Header */}
             <div className="relative h-48 bg-slate-800 shrink-0">
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{ 
                    backgroundImage: `linear-gradient(to bottom right, ${selectedCourse.color}, transparent)`, 
                    backgroundSize: 'cover' 
                  }}
                />
                
                <div className="absolute top-6 right-6 z-20 flex gap-2">
                    <button 
                        onClick={() => openEditCourse(selectedCourse)}
                        className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
                    >
                        <Settings size={24} />
                    </button>
                    <button 
                      onClick={() => setSelectedCourseId(null)}
                      className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
                    >
                      <X size={24} />
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-slate-900 to-transparent">
                   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                           <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/10 uppercase tracking-wider">
                              {selectedInstitution?.name}
                           </span>
                           <span className="text-emerald-400 flex items-center gap-1 text-sm font-medium">
                              <Calendar size={14} /> {selectedCourse.schedule}
                           </span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-white">{selectedCourse.name}</h1>
                        <p className="text-xl text-slate-300">{selectedCourse.code} • {selectedCourse.professor}</p>
                      </div>
                      <div className="flex items-end gap-6">
                         <div className="text-right">
                            <span className="block text-sm text-slate-400 mb-1">Current Standing</span>
                            <span className="text-5xl font-mono font-bold text-white tracking-tighter" style={{ textShadow: `0 0 20px ${selectedCourse.color}40` }}>
                               {displayGrade(selectedCourse.grade, selectedCourse.gpaScale || 4.0)}
                            </span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Modal Content */}
             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   
                   {/* Left Column: Stats & AI */}
                   <div className="lg:col-span-2 space-y-8">
                      {/* Analysis Section */}
                      <CourseAIAnalysis course={selectedCourse} assignments={courseAssignments} />

                      {/* Assignments Kanban */}
                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                               <Award className="text-amber-400" /> Assignments
                            </h3>
                            <button 
                                onClick={() => { setEditingAssignment(null); setIsAddAssignmentOpen(true); }}
                                className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
                            >
                                + New Task
                            </button>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {['pending', 'in-progress', 'completed'].map(status => (
                               <div key={status} className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col h-full min-h-[200px]">
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-white/5 pb-2 flex justify-between">
                                     {status.replace('-', ' ')}
                                     <span className="bg-white/10 px-2 rounded-full text-white">{courseAssignments.filter(a => a.status === status).length}</span>
                                  </h4>
                                  <div className="space-y-3 flex-1">
                                     {courseAssignments.filter(a => a.status === status).map(assignment => {
                                        const isOverdue = new Date(assignment.dueDate) < new Date() && status !== 'completed';
                                        
                                        return (
                                        <div key={assignment.id} className="bg-slate-800 p-3 rounded-lg border border-white/5 hover:border-emerald-500/50 transition-colors shadow-sm relative group">
                                           {/* Action Buttons */}
                                           <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                                               <button onClick={(e) => { e.stopPropagation(); openEditAssignment(assignment); }} className="p-1.5 bg-slate-900 rounded hover:bg-white/10 text-slate-300 hover:text-white"><Pencil size={12}/></button>
                                               <button onClick={(e) => { e.stopPropagation(); setDeleteId(assignment.id); }} className="p-1.5 bg-slate-900 rounded hover:bg-rose-500/20 text-slate-300 hover:text-rose-400"><Trash2 size={12}/></button>
                                           </div>
                                           
                                           <div className="flex justify-between items-start mb-2">
                                              <div className="flex gap-1 flex-wrap pr-8">
                                                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                                    assignment.type === 'Exam' ? 'bg-rose-500/20 text-rose-300' : 
                                                    assignment.type === 'Project' ? 'bg-purple-500/20 text-purple-300' : 
                                                    'bg-blue-500/20 text-blue-300'
                                                  }`}>{assignment.type}</span>
                                                  {assignment.tags?.slice(0,2).map(t => (
                                                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{t}</span>
                                                  ))}
                                              </div>
                                              <span className="text-[10px] text-slate-500">{assignment.weight}%</span>
                                           </div>
                                           <p className="font-medium text-white text-sm leading-tight mb-2">{assignment.title}</p>
                                           <div className="flex justify-between items-center text-xs text-slate-400">
                                              <span className={isOverdue ? 'text-rose-400 font-bold' : ''}>
                                                 {new Date(assignment.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
                                                 <span className="opacity-60 ml-1">{new Date(assignment.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                              </span>
                                              {assignment.status === 'completed' ? (
                                                  <span className="font-mono text-emerald-400 font-bold">
                                                      {assignment.grade !== undefined ? assignment.grade : '-'}/{assignment.maxGrade}
                                                  </span>
                                              ) : (
                                                  <span className="text-slate-600 italic">--</span>
                                              )}
                                           </div>
                                           
                                           {/* Status Change Arrows */}
                                           <div className="flex justify-between mt-3 pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button 
                                                 disabled={status === 'pending'}
                                                 onClick={() => handleStatusChange(assignment, 'backward')} 
                                                 className="p-1 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 text-slate-500"
                                              >
                                                 <ArrowLeft size={14} />
                                              </button>
                                              <span className="text-[9px] uppercase font-bold text-slate-600">Move</span>
                                              <button 
                                                 disabled={status === 'completed'}
                                                 onClick={() => handleStatusChange(assignment, 'forward')}
                                                 className="p-1 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 text-slate-500"
                                              >
                                                 <ArrowRight size={14} />
                                              </button>
                                           </div>
                                        </div>
                                     )})}
                                     {courseAssignments.filter(a => a.status === status).length === 0 && (
                                        <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">
                                           Empty
                                        </div>
                                     )}
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>

                   {/* Right Column: Resources & Syllabus */}
                   <div className="space-y-8">
                      <GlassCard title="Study Resources" icon={<BookOpen size={18} />}>
                         <div className="space-y-3">
                            {courseResources.map(res => (
                               <a key={res.id} href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
                                  <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition-colors">
                                     {res.type === 'Video' ? <Video size={16} /> : res.type === 'Link' ? <LinkIcon size={16} /> : <FileText size={16} />}
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                     <p className="text-sm font-medium text-white truncate">{res.title}</p>
                                     <p className="text-xs text-slate-500">{res.type}</p>
                                  </div>
                                  <Download size={14} className="text-slate-600 group-hover:text-white" />
                               </a>
                            ))}
                            <button className="w-full py-2 border border-dashed border-white/10 rounded-lg text-xs text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-all">
                               + Add Resource
                            </button>
                         </div>
                      </GlassCard>

                      <GlassCard title="Grade Distribution" icon={<TrendingUp size={18} />}>
                         {/* Mock Mini Chart */}
                         <div className="h-32 w-full mt-2 min-w-0" style={{ minHeight: '128px' }}>
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={[
                                 { name: 'W1', grade: 85 }, { name: 'W2', grade: 88 }, 
                                 { name: 'W3', grade: 82 }, { name: 'W4', grade: 90 }, 
                                 { name: 'W5', grade: selectedCourse.grade }
                              ]}>
                                 <defs>
                                    <linearGradient id="colorGrade" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor={selectedCourse.color} stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor={selectedCourse.color} stopOpacity={0}/>
                                    </linearGradient>
                                 </defs>
                                 <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', fontSize: '12px'}} />
                                 <XAxis dataKey="name" hide />
                                 <Area type="monotone" dataKey="grade" stroke={selectedCourse.color} fillOpacity={1} fill="url(#colorGrade)" />
                              </AreaChart>
                           </ResponsiveContainer>
                         </div>
                         <div className="mt-4 flex justify-between items-center text-sm">
                            <span className="text-slate-400">Target</span>
                            <span className="text-white font-bold">95%</span>
                         </div>
                      </GlassCard>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT COURSE MODAL */}
      {isAddCourseOpen && (
         <AddCourseModal 
            onClose={() => setIsAddCourseOpen(false)}
            onSave={handleSaveCourse}
            institutions={data.user.institutions}
            preSelectedInstId={preSelectedInstId}
            initialData={editingCourse}
         />
      )}

      {/* ADD ASSIGNMENT MODAL */}
      {(isAddAssignmentOpen && selectedCourse) && (
          <AddAssignmentModal
             courses={[selectedCourse]}
             onClose={() => { setIsAddAssignmentOpen(false); setEditingAssignment(null); }}
             onSave={handleSaveAssignment}
             preSelectedCourseId={selectedCourseId}
             initialData={editingAssignment}
          />
      )}

      {/* DELETE CONFIRMATION */}
      {deleteId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <GlassCard className="w-auto min-w-[320px] max-w-md border border-white/10 text-center p-6 shadow-2xl bg-slate-900/80 backdrop-blur-xl rounded-2xl">
              <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-400 border border-rose-500/20">
                  <AlertCircle size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Assignment?</h3>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                 Are you sure you want to delete this assignment? The course GPA will be automatically recalculated.
              </p>
              <div className="flex gap-3 justify-center">
                 <button onClick={() => setDeleteId(null)} className="px-6 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 font-medium text-sm transition-all">
                    Cancel
                 </button>
                 <button onClick={handleDeleteAssignment} className="px-6 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-900/20 transition-all">
                    Delete
                 </button>
              </div>
           </GlassCard>
        </div>
      )}
    </div>
  );
};

// Sub-component for AI Analysis
const CourseAIAnalysis = ({ course, assignments }: { course: Course, assignments: Assignment[] }) => {
   const [analysis, setAnalysis] = useState<string | null>(null);
   const [loading, setLoading] = useState(false);

   const handleAnalyze = async () => {
      setLoading(true);
      const result = await analyzeCoursePerformance(course, assignments);
      setAnalysis(result);
      setLoading(false);
   };

   return (
      <div className="bg-gradient-to-r from-emerald-900/30 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden">
         <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="text-emerald-400" /> AI Course Strategist
               </h3>
               {!analysis && (
                  <button 
                     onClick={handleAnalyze} 
                     disabled={loading}
                     className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 flex items-center gap-2"
                  >
                     {loading ? <Loader2 className="animate-spin" size={14} /> : 'Generate SMART Goals'}
                  </button>
               )}
            </div>
            
            {!analysis && !loading && (
               <p className="text-slate-300 text-sm">
                  Click generate to get a personalized strategy to improve your grade in {course.name} based on your current assignment performance.
               </p>
            )}

            {loading && (
               <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-white/5 rounded w-3/4"></div>
                  <div className="h-4 bg-white/5 rounded w-1/2"></div>
               </div>
            )}

            {analysis && (
               <div className="prose prose-invert prose-sm max-w-none">
                  {/* Simple markdown rendering */}
                  {analysis.split('\n').map((line, i) => (
                     <p key={i} className={`mb-1 ${line.startsWith('-') ? 'pl-4 text-slate-300' : 'text-white'}`}>
                        {line}
                     </p>
                  ))}
               </div>
            )}
         </div>
         {/* Background Decoration */}
         <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
      </div>
   );
};

export interface AddCourseModalProps {
   onClose: () => void;
   onSave: (course: Course) => void;
   institutions: Institution[];
   preSelectedInstId: string | null;
   initialData?: Course | null;
}

export const AddCourseModal = ({ onClose, onSave, institutions, preSelectedInstId, initialData }: AddCourseModalProps) => {
   const [form, setForm] = useState<Partial<Course>>(initialData || {
      institutionId: preSelectedInstId || (institutions.length > 0 ? institutions[0].id : ''),
      color: '#10b981',
      grade: 100,
      credits: 3,
      gpaScale: 4.0
   });

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name || !form.code || !form.institutionId) return;

      const newCourse: Course = {
         id: initialData ? initialData.id : Date.now().toString(),
         institutionId: form.institutionId,
         name: form.name,
         code: form.code,
         credits: Number(form.credits),
         grade: Number(form.grade),
         color: form.color || '#10b981',
         professor: form.professor || 'TBA',
         schedule: form.schedule || 'TBA',
         gpaScale: Number(form.gpaScale) || 4.0
      };
      onSave(newCourse);
   };

   return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
         <div className="w-full max-w-md">
            <GlassCard className="border-t-4 border-t-emerald-500">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">{initialData ? 'Edit Course' : 'Add New Course'}</h3>
                  <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
               </div>

               <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Institution</label>
                     <select 
                        required
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 appearance-none"
                        value={form.institutionId || ''}
                        onChange={e => setForm({...form, institutionId: e.target.value})}
                     >
                        <option value="">Select Institution...</option>
                        {institutions.map(inst => (
                           <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                     </select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                     <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Course Name</label>
                        <input 
                           required
                           className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                           placeholder="e.g. Intro to CS"
                           value={form.name || ''}
                           onChange={e => setForm({...form, name: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Code</label>
                        <input 
                           required
                           className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                           placeholder="CS101"
                           value={form.code || ''}
                           onChange={e => setForm({...form, code: e.target.value})}
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Professor</label>
                        <input 
                           className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                           placeholder="Dr. Smith"
                           value={form.professor || ''}
                           onChange={e => setForm({...form, professor: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Schedule</label>
                        <input 
                           className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                           placeholder="Mon/Wed 10am"
                           value={form.schedule || ''}
                           onChange={e => setForm({...form, schedule: e.target.value})}
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Credits</label>
                        <input 
                           type="number"
                           className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                           value={form.credits || ''}
                           onChange={e => setForm({...form, credits: Number(e.target.value)})}
                        />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">GPA Scale</label>
                        <select 
                           className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 appearance-none"
                           value={form.gpaScale || 4.0}
                           onChange={e => setForm({...form, gpaScale: Number(e.target.value)})}
                        >
                           <option value={4.0}>4.0 Scale</option>
                           <option value={5.0}>5.0 Scale</option>
                           <option value={10.0}>10.0 Scale</option>
                           <option value={100}>100% Scale</option>
                        </select>
                     </div>
                  </div>
                  
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Theme Color</label>
                      <input 
                         type="color"
                         className="w-full h-12 bg-slate-900/50 border border-white/10 rounded-xl px-2 py-2 cursor-pointer"
                         value={form.color || '#10b981'}
                         onChange={e => setForm({...form, color: e.target.value})}
                      />
                  </div>

                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-4">
                     {initialData ? 'Update Course' : 'Save Course'}
                  </button>
               </form>
            </GlassCard>
         </div>
      </div>
   );
};

// --- NEW FUTURISTIC ASSIGNMENT MODAL ---
export interface AddAssignmentModalProps {
    onClose: () => void;
    onSave: (assignment: Assignment) => void;
    courses: Course[];
    preSelectedCourseId: string | null;
    initialData?: Assignment | null;
}

export const AddAssignmentModal = ({ onClose, onSave, courses, preSelectedCourseId, initialData }: AddAssignmentModalProps) => {
    const [form, setForm] = useState<Partial<Assignment>>(initialData || {
        courseId: preSelectedCourseId || (courses.length > 0 ? courses[0].id : ''),
        type: 'Homework',
        status: 'pending',
        weight: 10,
        maxGrade: 100,
        difficulty: 3,
        tags: []
    });

    const [tagInput, setTagInput] = useState('');
    const [isCustomType, setIsCustomType] = useState(false);
    const [customTypeInput, setCustomTypeInput] = useState('');

    useEffect(() => {
        // If initial data has a type that is not in standard list, allow custom
        const standard = ['Homework', 'Exam', 'Project', 'Quiz'];
        if (initialData?.type && !standard.includes(initialData.type)) {
            setIsCustomType(true);
            setCustomTypeInput(initialData.type);
        }
    }, [initialData]);

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!form.tags?.includes(tagInput.trim())) {
                setForm(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
            }
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setForm(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.courseId || !form.dueDate) return;

        // Auto-classify based on logic if new, or keep existing status if editing
        let finalStatus = form.status || 'pending';
        // Logic: If user specifically sets status in form (not implemented in UI yet, but model supports it), respect it.
        // If not, use default 'pending'.
        
        // Use custom type if active
        const finalType = isCustomType ? customTypeInput : form.type;

        const newAssignment: Assignment = {
            id: initialData ? initialData.id : Date.now().toString(),
            courseId: form.courseId,
            title: form.title,
            dueDate: form.dueDate,
            status: finalStatus,
            type: finalType || 'Homework',
            weight: Number(form.weight) || 0,
            maxGrade: Number(form.maxGrade) || 100,
            difficulty: form.difficulty,
            tags: form.tags,
            description: form.description,
            grade: form.grade ? Number(form.grade) : undefined
        };
        onSave(newAssignment);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
             <div className="w-full max-w-2xl relative">
                {/* Decorative Elements */}
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-[80px]" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-[80px]" />
                
                <GlassCard className="!bg-slate-900/90 !border-white/10 !shadow-2xl overflow-hidden relative border-t-0">
                    {/* Header with Cyberpunk feel */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-cyan-500 to-emerald-500" />
                    
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div>
                            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 uppercase tracking-tighter">
                                {initialData ? 'Update Mission' : 'New Mission'}
                            </h2>
                            <p className="text-slate-400 text-xs font-mono mt-1 tracking-widest">
                                ASSIGNMENT_PROTOCOL_V2 // {initialData ? 'MODIFY' : 'INITIATE'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="text-slate-400 hover:text-white" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        {/* Left Column: Core Data */}
                        <div className="space-y-6">
                            {/* Course Select - Stylized */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-widest flex items-center gap-2">
                                    <Target size={12} /> Target Course
                                </label>
                                <div className="relative group">
                                    <select 
                                        required
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-cyan-500 appearance-none transition-all font-medium"
                                        value={form.courseId || ''}
                                        onChange={e => setForm({...form, courseId: e.target.value})}
                                    >
                                        <option value="">Select Course...</option>
                                        {courses.map(c => (
                                           <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <ChevronDown size={16} className="text-slate-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Title Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-widest">Mission Objective</label>
                                <input 
                                    required
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700 font-bold text-lg"
                                    placeholder="Enter assignment title..."
                                    value={form.title || ''}
                                    onChange={e => setForm({...form, title: e.target.value})}
                                />
                            </div>

                            {/* Type Selector - Pills */}
                             <div className="space-y-2">
                                <label className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-widest">Classification</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Homework', 'Exam', 'Project', 'Quiz'].map(t => (
                                        <button 
                                            key={t}
                                            type="button"
                                            onClick={() => { setForm({...form, type: t}); setIsCustomType(false); }}
                                            className={`
                                                relative overflow-hidden py-3 px-2 rounded-lg text-xs font-bold uppercase transition-all border flex items-center justify-center gap-2
                                                ${form.type === t && !isCustomType
                                                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                                                    : 'bg-slate-950/30 border-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300'}
                                            `}
                                        >
                                           {t === 'Exam' && <AlertCircle size={12}/>}
                                           {t === 'Homework' && <BookOpen size={12}/>}
                                           {t === 'Project' && <Layers size={12}/>}
                                           {t === 'Quiz' && <Clock size={12}/>}
                                           {t}
                                        </button>
                                    ))}
                                    {/* Custom Type Toggle */}
                                    <button 
                                        type="button"
                                        onClick={() => setIsCustomType(true)}
                                        className={`
                                            col-span-2 relative overflow-hidden py-2 px-2 rounded-lg text-xs font-bold uppercase transition-all border flex items-center justify-center gap-2
                                            ${isCustomType
                                                ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' 
                                                : 'bg-slate-950/30 border-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300'}
                                        `}
                                    >
                                        <Plus size={12} /> Custom Type
                                    </button>
                                    
                                    {isCustomType && (
                                        <div className="col-span-2 animate-fade-in">
                                            <input 
                                                value={customTypeInput}
                                                onChange={(e) => setCustomTypeInput(e.target.value)}
                                                placeholder="Enter type name (e.g. Lab, Presentation)..."
                                                className="w-full bg-slate-950 border border-cyan-500/50 rounded-lg px-3 py-2 text-white text-xs focus:outline-none"
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Parameters */}
                        <div className="space-y-6">
                            
                            {/* Dynamic Grade Input if Completed */}
                            {form.status === 'completed' && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2 animate-fade-in">
                                    <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                        <CheckCircle size={12} /> Mission Marks (Received)
                                    </label>
                                    <div className="flex gap-2 items-center">
                                        <input 
                                            type="number"
                                            placeholder="Score"
                                            className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-4 py-2 text-white font-mono font-bold text-lg focus:outline-none focus:border-emerald-500"
                                            value={form.grade !== undefined ? form.grade : ''}
                                            onChange={(e) => setForm({...form, grade: Number(e.target.value)})}
                                        />
                                        <span className="text-slate-500">/</span>
                                        <input 
                                            type="number"
                                            className="w-20 bg-slate-950/30 border border-white/5 rounded-lg px-2 py-2 text-slate-400 font-mono text-sm focus:outline-none"
                                            value={form.maxGrade || 100}
                                            onChange={(e) => setForm({...form, maxGrade: Number(e.target.value)})}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Date & Weight Grid */}
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-purple-500/80 uppercase tracking-widest">Deadline (Time)</label>
                                    <input 
                                        type="datetime-local"
                                        required
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-purple-500 transition-all text-sm font-mono"
                                        value={form.dueDate || ''}
                                        onChange={e => setForm({...form, dueDate: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-purple-500/80 uppercase tracking-wider">Impact (%)</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-purple-500 transition-all text-sm font-mono"
                                        value={form.weight || ''}
                                        onChange={e => setForm({...form, weight: Number(e.target.value)})}
                                    />
                                </div>
                             </div>

                             {/* Status Select */}
                             <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</label>
                                <select 
                                   className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 appearance-none"
                                   value={form.status}
                                   onChange={e => setForm({...form, status: e.target.value as any})}
                                >
                                   <option value="pending">Pending</option>
                                   <option value="in-progress">In Progress</option>
                                   <option value="completed">Completed</option>
                                </select>
                             </div>
                             
                             {/* Difficulty Slider */}
                             <div className="space-y-3 bg-slate-950/30 p-4 rounded-xl border border-white/5">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-purple-500/80 uppercase tracking-widest flex items-center gap-2"><Zap size={12}/> Complexity Load</label>
                                    <span className={`text-xs font-black ${form.difficulty! > 3 ? 'text-rose-400' : 'text-emerald-400'}`}>LVL {form.difficulty}</span>
                                </div>
                                <input 
                                    type="range" min="1" max="5" 
                                    value={form.difficulty || 3} 
                                    onChange={(e) => setForm({...form, difficulty: Number(e.target.value)})}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                                <div className="flex justify-between text-[10px] text-slate-600 font-mono tracking-wider">
                                    <span>TRIVIAL</span>
                                    <span>EXTREME</span>
                                </div>
                             </div>

                             {/* Tags Input */}
                             <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Hash size={12}/> Tactical Tags</label>
                                <div className="bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 min-h-[52px] flex flex-wrap gap-2 items-center focus-within:border-white/30 transition-colors">
                                    {form.tags?.map(tag => (
                                        <span key={tag} className="bg-white/10 border border-white/10 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                                            {tag} <X size={10} className="cursor-pointer hover:text-red-400" onClick={() => removeTag(tag)}/>
                                        </span>
                                    ))}
                                    <input 
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={handleAddTag}
                                        placeholder={form.tags?.length ? "" : "Type & Enter..."}
                                        className="bg-transparent text-sm text-white focus:outline-none flex-1 min-w-[60px]"
                                    />
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-end gap-4 relative z-10">
                        <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all tracking-widest">
                            ABORT
                        </button>
                        <button 
                            onClick={handleSubmit}
                            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 tracking-wide"
                        >
                            <Sparkles size={16} /> {initialData ? 'UPDATE MISSION' : 'CONFIRM MISSION'}
                        </button>
                    </div>
                </GlassCard>
             </div>
        </div>
    );
};
