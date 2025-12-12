

import React, { useState } from 'react';
import { AppState, Expense, Subscription, Asset, Budget, AssetCategory } from '../types';
import { GlassCard } from '../components/GlassCard';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from 'recharts';
import { 
  DollarSign, Wallet, CreditCard, TrendingUp, TrendingDown, 
  Layers, ShoppingBag, Landmark, Laptop, GraduationCap, 
  Bike, LineChart, Plus, Search, Calendar, ChevronRight, ArrowUpRight,
  RefreshCw, ShieldCheck, Tag, Zap, Building2, Target, CheckCircle2, X,
  Pencil, Trash2, MoreHorizontal, AlertTriangle
} from 'lucide-react';

interface FinanceViewProps {
  data: AppState;
  onUpdateData: (data: AppState) => void;
}

type Tab = 'overview' | 'wallet' | 'assets' | 'planning';

// Track what we are deleting
type DeleteTarget = {
    type: 'expense' | 'asset' | 'subscription' | 'budget';
    id: string; // ID or Category name for budgets
    name: string; // Display name for the modal
};

export const FinanceView = ({ data, onUpdateData }: FinanceViewProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  
  // Modal States
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  
  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Edit States (Hold the item being edited, or null if adding new)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const currency = data.user.currency || '$';

  // --- DERIVED DATA ---
  const totalAssets = data.assets.reduce((sum, a) => sum + a.value, 0);
  const monthlyExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0); 
  const monthlySubscriptions = data.subscriptions.filter(s => s.period === 'Monthly').reduce((sum, s) => sum + s.cost, 0);
  const yearlySubscriptionsDiv12 = data.subscriptions.filter(s => s.period === 'Yearly').reduce((sum, s) => sum + s.cost, 0) / 12;
  const totalFlow = monthlyExpenses + monthlySubscriptions + yearlySubscriptionsDiv12;
  
  const netWorth = totalAssets; // Strictly assets, no mock liabilities

  // --- SAVE HANDLERS (Create or Update) ---
  const handleSaveAsset = (asset: Asset) => {
    if (editingAsset) {
        // Update existing
        onUpdateData({ 
            ...data, 
            assets: data.assets.map(a => a.id === asset.id ? asset : a) 
        });
    } else {
        // Create new
        onUpdateData({ ...data, assets: [...data.assets, asset] });
    }
    setEditingAsset(null);
    setIsAssetModalOpen(false);
  };

  const handleSaveExpense = (expense: Expense) => {
    let newExpenses = [...data.expenses];
    let newBudgets = [...data.budgets];

    if (editingExpense) {
        // Update Logic
        const oldAmount = editingExpense.amount;
        const diff = expense.amount - oldAmount;
        
        newExpenses = newExpenses.map(e => e.id === expense.id ? expense : e);
        
        // Adjust budget if category matches
        newBudgets = newBudgets.map(b => {
             // Handle category change logic if needed, simple version here:
             if (b.category === expense.category) {
                 return { ...b, spent: b.spent + diff };
             }
             return b;
        });

    } else {
        // Create Logic
        newExpenses = [expense, ...newExpenses];
        newBudgets = newBudgets.map(b => {
            if (b.category === expense.category) {
              return { ...b, spent: b.spent + expense.amount };
            }
            return b;
        });
    }

    onUpdateData({ ...data, expenses: newExpenses, budgets: newBudgets });
    setEditingExpense(null);
    setIsExpenseModalOpen(false);
  };

  const handleSaveSubscription = (sub: Subscription) => {
    if (editingSubscription) {
        onUpdateData({
            ...data,
            subscriptions: data.subscriptions.map(s => s.id === sub.id ? sub : s)
        });
    } else {
        onUpdateData({ ...data, subscriptions: [...data.subscriptions, sub] });
    }
    setEditingSubscription(null);
    setIsSubscriptionModalOpen(false);
  };

  const handleSaveBudget = (budget: Budget) => {
    if (editingBudget) {
        // Update existing budget (match by category as ID substitute for budgets)
        onUpdateData({
            ...data,
            budgets: data.budgets.map(b => b.category === budget.category ? budget : b)
        });
    } else {
        // Prevent duplicate categories
        if (data.budgets.some(b => b.category === budget.category)) {
            alert('Budget for this category already exists. Please edit the existing one.');
            return;
        }
        onUpdateData({ ...data, budgets: [...data.budgets, budget] });
    }
    setEditingBudget(null);
    setIsBudgetModalOpen(false);
  };

  // --- DELETE LOGIC ---
  const confirmDeleteAsset = (id: string, name: string) => setDeleteTarget({ type: 'asset', id, name });
  const confirmDeleteExpense = (id: string, name: string) => setDeleteTarget({ type: 'expense', id, name });
  const confirmDeleteSubscription = (id: string, name: string) => setDeleteTarget({ type: 'subscription', id, name });
  const confirmDeleteBudget = (category: string) => setDeleteTarget({ type: 'budget', id: category, name: `${category} Budget` });

  const executeDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'asset') {
         onUpdateData({ ...data, assets: data.assets.filter(a => a.id !== deleteTarget.id) });
    } 
    else if (deleteTarget.type === 'expense') {
        const expense = data.expenses.find(e => e.id === deleteTarget.id);
        if (expense) {
            // Revert budget impact
            const updatedBudgets = data.budgets.map(b => 
                b.category === expense.category ? { ...b, spent: b.spent - expense.amount } : b
            );
            onUpdateData({ 
                ...data, 
                expenses: data.expenses.filter(e => e.id !== deleteTarget.id),
                budgets: updatedBudgets
            });
        }
    }
    else if (deleteTarget.type === 'subscription') {
         onUpdateData({ ...data, subscriptions: data.subscriptions.filter(s => s.id !== deleteTarget.id) });
    }
    else if (deleteTarget.type === 'budget') {
         onUpdateData({ ...data, budgets: data.budgets.filter(b => b.category !== deleteTarget.id) });
    }

    setDeleteTarget(null);
  };

  // --- OPEN MODAL HANDLERS ---
  const openEditAsset = (asset: Asset) => { setEditingAsset(asset); setIsAssetModalOpen(true); };
  const openEditExpense = (expense: Expense) => { setEditingExpense(expense); setIsExpenseModalOpen(true); };
  const openEditSubscription = (sub: Subscription) => { setEditingSubscription(sub); setIsSubscriptionModalOpen(true); };
  const openEditBudget = (budget: Budget) => { setEditingBudget(budget); setIsBudgetModalOpen(true); };

  return (
    <div className="space-y-8 animate-fade-in p-2 min-h-screen pb-20 relative">
       {/* FINANCE HEADER */}
       <header className="flex flex-col xl:flex-row justify-between items-end gap-6 mb-10">
        <div>
          <h1 className="text-5xl font-extrabold text-white mb-3 flex items-center gap-3 tracking-tight">
             Financial OS<span className="text-emerald-500">.</span>
          </h1>
          <div className="flex items-center gap-4 text-sm font-medium">
             <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400">
                Net Worth: <span className="text-white font-mono font-bold">{currency}{netWorth.toLocaleString()}</span>
             </div>
             <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400">
                Monthly Outflow: <span className="text-white font-mono font-bold">-{currency}{totalFlow.toFixed(2)}</span>
             </div>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
           {[
             { id: 'overview', label: 'Overview', icon: <LineChart size={18} /> },
             { id: 'wallet', label: 'Wallet', icon: <Wallet size={18} /> },
             { id: 'assets', label: 'Assets', icon: <Landmark size={18} /> },
             { id: 'planning', label: 'Planning', icon: <Layers size={18} /> },
           ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`
                   flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300
                   ${activeTab === tab.id 
                     ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-100' 
                     : 'text-slate-400 hover:text-white hover:bg-white/5 scale-95 hover:scale-100'}
                `}
              >
                 {tab.icon}
                 <span className="hidden md:inline">{tab.label}</span>
              </button>
           ))}
        </div>
      </header>

      {/* --- OVERVIEW TAB --- */}
      {activeTab === 'overview' && <OverviewTab data={data} totalAssets={totalAssets} totalFlow={totalFlow} currency={currency} />}

      {/* --- WALLET TAB (Transactions & Subs) --- */}
      {activeTab === 'wallet' && (
        <WalletTab 
          data={data} 
          monthlySubscriptions={monthlySubscriptions + yearlySubscriptionsDiv12} 
          onAddExpense={() => { setEditingExpense(null); setIsExpenseModalOpen(true); }}
          onAddSubscription={() => { setEditingSubscription(null); setIsSubscriptionModalOpen(true); }}
          onEditExpense={openEditExpense}
          onDeleteExpense={confirmDeleteExpense}
          onEditSubscription={openEditSubscription}
          onDeleteSubscription={confirmDeleteSubscription}
          currency={currency}
        />
      )}

      {/* --- ASSETS TAB --- */}
      {activeTab === 'assets' && (
         <AssetsTab 
            assets={data.assets} 
            institutions={data.user.institutions} 
            onOpenAddModal={() => { setEditingAsset(null); setIsAssetModalOpen(true); }}
            onEditAsset={openEditAsset}
            onDeleteAsset={confirmDeleteAsset}
            currency={currency}
         />
      )}

      {/* --- PLANNING TAB (Budgets) --- */}
      {activeTab === 'planning' && (
        <PlanningTab 
          budgets={data.budgets} 
          expenses={data.expenses} 
          assets={data.assets} 
          onAddBudget={() => { setEditingBudget(null); setIsBudgetModalOpen(true); }}
          onAddSavings={() => { setEditingAsset(null); setIsAssetModalOpen(true); }}
          onEditBudget={openEditBudget}
          onDeleteBudget={confirmDeleteBudget}
          currency={currency}
        />
      )}

      {/* --- MODALS --- */}
      {isAssetModalOpen && (
         <AddAssetModal 
            onClose={() => { setIsAssetModalOpen(false); setEditingAsset(null); }} 
            onSave={handleSaveAsset}
            institutions={data.user.institutions}
            initialData={editingAsset}
         />
      )}
      {isExpenseModalOpen && (
         <AddExpenseModal 
            onClose={() => { setIsExpenseModalOpen(false); setEditingExpense(null); }}
            onSave={handleSaveExpense}
            initialData={editingExpense}
         />
      )}
      {isSubscriptionModalOpen && (
         <AddSubscriptionModal 
            onClose={() => { setIsSubscriptionModalOpen(false); setEditingSubscription(null); }}
            onSave={handleSaveSubscription}
            initialData={editingSubscription}
         />
      )}
      {isBudgetModalOpen && (
         <AddBudgetModal 
            onClose={() => { setIsBudgetModalOpen(false); setEditingBudget(null); }}
            onSave={handleSaveBudget}
            initialData={editingBudget}
         />
      )}
      
      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteTarget && (
        <DeleteConfirmationModal 
            target={deleteTarget}
            onConfirm={executeDelete}
            onCancel={() => setDeleteTarget(null)}
        />
      )}

    </div>
  );
};

// --- SUB-COMPONENTS ---

const DeleteConfirmationModal = ({ target, onConfirm, onCancel }: { target: DeleteTarget, onConfirm: () => void, onCancel: () => void }) => {
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <GlassCard className="w-auto min-w-[320px] max-w-md border border-white/10 text-center p-6 shadow-2xl bg-slate-900/80 backdrop-blur-xl rounded-2xl">
              <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-400 border border-rose-500/20">
                  <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Item?</h3>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                 Permanently remove <br/>
                 <span className="text-white font-bold text-base">"{target.name}"</span>?
              </p>
              <div className="flex gap-3 justify-center">
                 <button onClick={onCancel} className="px-6 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 font-medium text-sm transition-all">
                    Cancel
                 </button>
                 <button onClick={onConfirm} className="px-6 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-900/20 transition-all">
                    Delete
                 </button>
              </div>
           </GlassCard>
        </div>
    );
};

const OverviewTab = ({ data, totalAssets, totalFlow, currency }: { data: AppState, totalAssets: number, totalFlow: number, currency: string }) => {
   // Dynamic Trend Data (Flat if 0)
   const netWorthData = totalAssets > 0 ? [
      { month: 'Start', value: totalAssets * 0.9 },
      { month: 'Now', value: totalAssets },
   ] : [
      { month: 'Start', value: 0 },
      { month: 'Now', value: 0 },
   ];

   const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
   // Aggregate expenses by category
   const categoryMap = new Map<string, number>();
   data.expenses.forEach(e => {
       const curr = categoryMap.get(e.category) || 0;
       categoryMap.set(e.category, curr + e.amount);
   });
   const expenseData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
   if (expenseData.length === 0) expenseData.push({ name: 'No Data', value: 1 }); // Placeholder for chart shape

   // Academic Spend Calculation
   const academicSpend = data.expenses
      .filter(e => e.category === 'Academic' || e.category === 'Education' || e.category === 'Tuition')
      .reduce((s, e) => s + e.amount, 0);

   const savingsAssets = data.assets
      .filter(a => a.category === 'Savings' || a.category === 'Investment')
      .reduce((s, a) => s + a.value, 0);

   return (
      <div className="space-y-6">
         {/* Top Grid: Main Chart + Side Stats */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto">
            
            {/* Net Worth Chart */}
            <GlassCard className="lg:col-span-2 relative overflow-hidden flex flex-col min-h-[400px]">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                  <TrendingUp size={200} className="text-emerald-400" />
               </div>
               <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                     <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                           <TrendingUp size={20} className="text-emerald-400"/> Net Worth Trajectory
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">Current Asset Value</p>
                     </div>
                     <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase border border-emerald-500/20">
                        Live
                     </span>
                  </div>
                  
                  <div className="h-[280px] w-full min-w-0" style={{ minHeight: '280px' }}>
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={netWorthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                           <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <XAxis dataKey="month" stroke="#475569" tickLine={false} axisLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                           <YAxis hide domain={['auto', 'auto']} />
                           <RechartsTooltip 
                              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }} 
                              itemStyle={{ color: '#10b981' }} 
                              labelStyle={{ color: '#94a3b8' }}
                              formatter={(value: any) => `${currency}${value}`}
                           />
                           <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </GlassCard>

            {/* Right Column Stack */}
            <div className="grid grid-rows-2 gap-6 h-full min-h-[400px]">
               <GlassCard className="flex flex-col justify-center h-full">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Outflow Distribution</h3>
                  <div className="flex items-center gap-4">
                     <div className="h-32 w-32 flex-shrink-0 relative" style={{ minWidth: '128px', minHeight: '128px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie data={expenseData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
                                 {expenseData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.name === 'No Data' ? '#334155' : COLORS[index % COLORS.length]} />)}
                              </Pie>
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="flex-1 space-y-2 text-xs">
                        {data.expenses.length > 0 ? expenseData.slice(0, 3).map((e, i) => (
                           <div key={i} className="flex justify-between items-center">
                              <span className="flex items-center gap-2 text-slate-300">
                                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} /> 
                                 <span className="truncate max-w-[80px]">{e.name}</span>
                              </span>
                              <span className="font-mono text-white font-bold">{currency}{e.value.toLocaleString()}</span>
                           </div>
                        )) : (
                           <div className="text-slate-500 italic">No expenses recorded yet</div>
                        )}
                     </div>
                  </div>
               </GlassCard>

               <GlassCard className="bg-gradient-to-r from-blue-600 to-blue-800 border-none relative overflow-hidden flex flex-col justify-center h-full">
                   <div className="absolute top-0 right-0 p-4 opacity-20">
                      <GraduationCap size={80} className="text-white transform rotate-12" />
                   </div>
                   <div className="relative z-10">
                       <div className="flex items-center justify-between mb-2">
                          <div>
                             <p className="text-blue-200 text-xs font-bold uppercase">Academic Spend</p>
                             <h3 className="text-2xl font-bold text-white">Total Education</h3>
                          </div>
                       </div>
                       <div className="w-full bg-black/20 rounded-full h-2 mt-2 overflow-hidden backdrop-blur-sm">
                          <div className="h-full bg-white w-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                       </div>
                       <div className="flex justify-between mt-3 text-xs text-blue-100 font-medium">
                          <span>Recorded: {currency}{academicSpend.toLocaleString()}</span>
                       </div>
                   </div>
               </GlassCard>
            </div>
         </div>

         {/* Bottom Row Stats */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard className="bg-emerald-900/20 border-emerald-500/20 flex items-center gap-4 p-6">
               <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                  <ArrowUpRight size={24}/>
               </div>
               <div>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Total Assets</p>
                  <p className="text-2xl font-mono font-bold text-white">{currency}{totalAssets.toLocaleString()}</p>
               </div>
            </GlassCard>

            <GlassCard className="bg-rose-900/20 border-rose-500/20 flex items-center gap-4 p-6">
               <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400">
                  <TrendingDown size={24}/>
               </div>
               <div>
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Total Outflow</p>
                  <p className="text-2xl font-mono font-bold text-white">-{currency}{totalFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
               </div>
            </GlassCard>
            
            <GlassCard className="bg-indigo-900/20 border-indigo-500/20 flex items-center gap-4 p-6">
               <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
                  <Target size={24}/>
               </div>
               <div>
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Savings</p>
                  <p className="text-2xl font-mono font-bold text-white">{currency}{savingsAssets.toLocaleString()}</p>
               </div>
            </GlassCard>

            <GlassCard className="bg-amber-900/20 border-amber-500/20 flex items-center gap-4 p-6">
               <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                  <ShieldCheck size={24}/>
               </div>
               <div>
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Financial Ratio</p>
                  <p className="text-2xl font-mono font-bold text-white">
                     {totalFlow > 0 ? (totalAssets / totalFlow).toFixed(1) : '∞'}x
                  </p>
               </div>
            </GlassCard>
         </div>
      </div>
   );
};

interface WalletTabProps {
  data: AppState;
  monthlySubscriptions: number;
  onAddExpense: () => void;
  onAddSubscription: () => void;
  onEditExpense: (e: Expense) => void;
  onDeleteExpense: (id: string, name: string) => void;
  onEditSubscription: (s: Subscription) => void;
  onDeleteSubscription: (id: string, name: string) => void;
  currency: string;
}

const WalletTab = ({ data, monthlySubscriptions, onAddExpense, onAddSubscription, onEditExpense, onDeleteExpense, onEditSubscription, onDeleteSubscription, currency }: WalletTabProps) => {
   return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
         
         {/* LEFT COL: Transactions Table */}
         <div className="xl:col-span-2 space-y-4">
            <div className="flex justify-between items-center px-2">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CreditCard className="text-emerald-400" /> Transaction History
               </h3>
               <div className="flex gap-3">
                  <button 
                    onClick={onAddExpense}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all"
                  >
                    <Plus size={16} /> New Transaction
                  </button>
                  <div className="relative group hidden sm:block">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                     <input 
                        placeholder="Search..." 
                        className="bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-black/40 transition-all w-40 focus:w-56" 
                     />
                  </div>
               </div>
            </div>

            <GlassCard className="p-0 overflow-hidden min-h-[600px] border border-white/10 shadow-2xl">
               <div className="overflow-x-auto h-full custom-scrollbar">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-black/40 text-[11px] text-slate-400 uppercase font-bold sticky top-0 backdrop-blur-md z-10 border-b border-white/10">
                       <tr>
                          <th className="px-6 py-4 tracking-wider w-2/5">Merchant & Details</th>
                          <th className="px-6 py-4 tracking-wider">Date</th>
                          <th className="px-6 py-4 tracking-wider">Category</th>
                          <th className="px-6 py-4 tracking-wider text-right">Amount</th>
                          <th className="px-6 py-4 tracking-wider text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {data.expenses.length > 0 ? data.expenses.map(expense => (
                          <tr key={expense.id} className="hover:bg-white/5 transition-colors group">
                             <td className="px-6 py-5">
                                <div className="flex items-center gap-4">
                                   <div className={`
                                      w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg border border-white/5
                                      ${expense.category === 'Food' ? 'bg-orange-500/10 text-orange-400' : 
                                        expense.category === 'Transport' ? 'bg-blue-500/10 text-blue-400' :
                                        'bg-slate-700/50 text-slate-300'}
                                      group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-400
                                   `}>
                                      <ShoppingBag size={18} />
                                   </div>
                                   <div>
                                      <p className="font-bold text-white text-sm mb-0.5">{expense.merchant || 'Unknown'}</p>
                                      <p className="text-xs text-slate-500">{expense.note}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-5 text-sm text-slate-400 font-medium">
                                {new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                             </td>
                             <td className="px-6 py-5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 text-slate-300 border border-white/5 group-hover:border-white/20 transition-colors">
                                   <Tag size={10} />
                                   {expense.category}
                                </span>
                             </td>
                             <td className="px-6 py-5 text-right">
                                <span className="font-mono font-bold text-white group-hover:text-emerald-400 transition-colors">
                                   {currency}{expense.amount.toFixed(2)}
                                </span>
                             </td>
                             <td className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onEditExpense(expense)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"><Pencil size={14}/></button>
                                    <button onClick={() => onDeleteExpense(expense.id, expense.merchant || 'Transaction')} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"><Trash2 size={14}/></button>
                                </div>
                             </td>
                          </tr>
                       )) : (
                          <tr>
                             <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No transactions found.</td>
                          </tr>
                       )}
                    </tbody>
                 </table>
               </div>
            </GlassCard>
         </div>

         {/* RIGHT COL: Subscriptions List */}
         <div className="xl:col-span-1 space-y-4">
            <div className="flex justify-between items-center px-2">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <RefreshCw className="text-indigo-400" /> Subscriptions
               </h3>
               <button 
                  onClick={onAddSubscription}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors px-3 py-1.5 rounded-lg border border-indigo-500/20"
               >
                  + Add
               </button>
            </div>

            <GlassCard className="min-h-[600px] flex flex-col p-0 border border-white/10">
               <div className="p-4 border-b border-white/5 bg-white/5">
                  <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                     <span>Service</span>
                     <span>Cost / Period</span>
                  </div>
               </div>
               
               <div className="divide-y divide-white/5 flex-1 overflow-y-auto custom-scrollbar">
                  {data.subscriptions.length > 0 ? data.subscriptions.map(sub => (
                     <div key={sub.id} className="p-4 hover:bg-white/5 transition-colors group relative">
                        <div className="flex justify-between items-center mb-2">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/10">
                                 <RefreshCw size={14} />
                              </div>
                              <div>
                                 <p className="font-bold text-white text-sm">{sub.name}</p>
                                 <p className="text-[10px] text-slate-500 uppercase">{sub.category}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="font-mono font-bold text-white">{currency}{sub.cost}</p>
                              <p className="text-[10px] text-slate-500">{sub.period}</p>
                           </div>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                           <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <Calendar size={10} />
                              Next: {new Date(sub.nextBillingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                           </div>
                           
                           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEditSubscription(sub)} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"><Pencil size={12}/></button>
                                <button onClick={() => onDeleteSubscription(sub.id, sub.name)} className="p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"><Trash2 size={12}/></button>
                           </div>
                        </div>
                     </div>
                  )) : (
                     <div className="p-8 text-center text-slate-500 italic text-sm">No subscriptions active.</div>
                  )}
               </div>

               <div className="p-4 border-t border-white/10 bg-indigo-900/10">
                  <div className="flex justify-between items-center">
                     <span className="text-xs font-bold text-slate-400 uppercase">Total Monthly</span>
                     <span className="text-lg font-mono font-bold text-white">{currency}{monthlySubscriptions.toFixed(2)}</span>
                  </div>
               </div>
            </GlassCard>
         </div>
      </div>
   );
};

interface AssetsTabProps {
   assets: Asset[];
   institutions: any[];
   onOpenAddModal: () => void;
   onEditAsset: (a: Asset) => void;
   onDeleteAsset: (id: string, name: string) => void;
   currency: string;
}

const AssetsTab = ({ assets, institutions, onOpenAddModal, onEditAsset, onDeleteAsset, currency }: AssetsTabProps) => {
   const categories = ['Tech', 'Academic', 'Savings', 'Investment', 'Transport'];

   const getIcon = (cat: string) => {
      switch(cat) {
         case 'Tech': return <Laptop size={20} />;
         case 'Academic': return <GraduationCap size={20} />;
         case 'Transport': return <Bike size={20} />;
         case 'Investment': return <TrendingUp size={20} />;
         default: return <ShieldCheck size={20} />;
      }
   };

   return (
      <div className="space-y-10">
         {/* Featured Asset Stats Strip */}
         <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => {
               const val = assets.filter(a => a.category === cat).reduce((s, a) => s + a.value, 0);
               if (val === 0) return null;
               return (
                  <GlassCard key={cat} className="min-w-[160px] flex-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group">
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 group-hover:text-emerald-400 transition-colors">{cat}</p>
                     <p className="text-xl font-mono font-bold text-white">{currency}{val.toLocaleString()}</p>
                  </GlassCard>
               );
            })}
             <GlassCard 
               onClick={onOpenAddModal}
               className="min-w-[160px] flex items-center justify-center cursor-pointer hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-dashed border-white/10 group"
             >
                <span className="text-slate-500 group-hover:text-emerald-400 font-bold text-sm flex items-center gap-2">
                   <Plus size={16} /> Add Asset
                </span>
             </GlassCard>
         </div>

         {/* Asset Gallery (Masonry Layout) */}
         {assets.length > 0 ? (
            <div className="columns-1 md:columns-2 xl:columns-4 gap-6 space-y-6">
               {assets.map(asset => {
                  const institution = asset.institutionId ? institutions.find(i => i.id === asset.institutionId) : null;
                  
                  return (
                     <div key={asset.id} className="break-inside-avoid mb-6">
                       <GlassCard className="group hover:border-emerald-500/40 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/20">
                           {/* Dynamic Background Glow based on Category */}
                           <div className={`
                              absolute -right-12 -top-12 w-40 h-40 rounded-full blur-3xl transition-all opacity-20 group-hover:opacity-30
                              ${asset.category === 'Savings' ? 'bg-emerald-500' : 
                                asset.category === 'Tech' ? 'bg-blue-500' :
                                asset.category === 'Academic' ? 'bg-purple-500' : 'bg-slate-500'}
                           `}></div>
                           
                           <div className="relative z-10 flex flex-col">
                               <div className="flex justify-between items-start mb-6">
                                  <div className={`
                                     w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg border border-white/10
                                     ${asset.category === 'Academic' ? 'bg-purple-600' : 
                                         asset.category === 'Savings' ? 'bg-emerald-600' : 
                                         asset.category === 'Tech' ? 'bg-blue-600' : 'bg-slate-700'}
                                  `}>
                                     {getIcon(asset.category)}
                                  </div>
                                  <div className="text-right">
                                     <p className="text-2xl font-mono font-bold text-white tracking-tight">{currency}{asset.value.toLocaleString()}</p>
                                     {asset.originalValue && (
                                         <p className={`text-xs font-bold mt-1 ${asset.value > asset.originalValue ? 'text-emerald-400' : 'text-rose-400'}`}>
                                             {asset.value > asset.originalValue ? '+' : ''}{((asset.value - asset.originalValue) / asset.originalValue * 100).toFixed(1)}%
                                         </p>
                                     )}
                                  </div>
                                </div>
                               
                               <div className="space-y-2">
                                  <h3 className="text-xl font-bold text-white leading-tight group-hover:text-emerald-300 transition-colors">{asset.name}</h3>
                                  <div className="flex flex-wrap gap-2">
                                     <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-[10px] font-bold border border-white/10 uppercase">
                                        {asset.category}
                                     </span>
                                     {institution && (
                                         <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/20 uppercase flex items-center gap-1">
                                            <Building2 size={10} /> {institution.name}
                                         </span>
                                     )}
                                  </div>
                                  
                                  {asset.notes && (
                                    <div className="mt-4 p-3 rounded-lg bg-black/20 border border-white/5">
                                       <p className="text-sm text-slate-400 leading-relaxed italic">"{asset.notes}"</p>
                                    </div>
                                  )}
                               </div>

                               <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => onDeleteAsset(asset.id, asset.name)} className="text-xs font-bold text-rose-400 flex items-center gap-1 hover:text-rose-300">
                                      <Trash2 size={12} /> Delete
                                  </button>
                                  <button onClick={() => onEditAsset(asset)} className="text-xs font-bold text-white hover:text-emerald-400 flex items-center gap-1">
                                     Edit Details <ChevronRight size={12} />
                                  </button>
                               </div>
                           </div>
                       </GlassCard>
                     </div>
                  );
               })}
            </div>
         ) : (
            <div className="text-center py-20 bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
               <Landmark size={48} className="text-slate-600 mx-auto mb-4" />
               <h3 className="text-xl font-bold text-white mb-2">No Assets Tracked</h3>
               <p className="text-slate-400 mb-6">Start tracking your savings, tech, or academic investments.</p>
               <button onClick={onOpenAddModal} className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                  + Add First Asset
               </button>
            </div>
         )}
      </div>
   );
};

interface PlanningTabProps {
  budgets: Budget[];
  expenses: Expense[];
  assets: Asset[];
  onAddBudget: () => void;
  onAddSavings: () => void;
  onEditBudget: (b: Budget) => void;
  onDeleteBudget: (cat: string) => void;
  currency: string;
}

const PlanningTab = ({ budgets, expenses, assets, onAddBudget, onAddSavings, onEditBudget, onDeleteBudget, currency }: PlanningTabProps) => {
   const savingsTotal = assets.filter(a => a.category === 'Savings' || a.category === 'Investment').reduce((s,a) => s + a.value, 0);

   return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
         {/* LEFT COL: Budgets Grid */}
         <div className="space-y-6">
            <div className="flex justify-between items-end pb-2 px-1">
               <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Layers className="text-emerald-400" /> Smart Budgets
               </h3>
               <button 
                  onClick={onAddBudget}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20"
               >
                  + Create Budget
               </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {budgets.map((budget, idx) => {
                  const percentage = budget.limit > 0 ? Math.min(100, (budget.spent / budget.limit) * 100) : 100;
                  const isOver = budget.spent > budget.limit;
                  
                  return (
                     <GlassCard key={idx} className={`relative p-5 border hover:border-white/30 transition-all group ${isOver ? 'border-rose-500/30 bg-rose-900/10' : 'border-white/10'}`}>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button onClick={() => onEditBudget(budget)} className="p-1.5 bg-black/20 rounded hover:bg-white/10 text-slate-300 hover:text-white"><Pencil size={12}/></button>
                            <button onClick={() => onDeleteBudget(budget.category)} className="p-1.5 bg-black/20 rounded hover:bg-rose-500/20 text-slate-300 hover:text-rose-400"><Trash2 size={12}/></button>
                        </div>
                        
                        <div className="flex justify-between items-start mb-4">
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                 <h4 className="font-bold text-lg text-white">{budget.category}</h4>
                              </div>
                              <span className="text-[10px] uppercase font-bold bg-white/10 px-2 py-0.5 rounded text-slate-300">{budget.period}</span>
                           </div>
                           <div className={`text-right ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                              <span className="text-2xl font-bold">{percentage.toFixed(0)}%</span>
                           </div>
                        </div>
                        
                        <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden mb-3">
                           <div 
                              className={`h-full rounded-full ${isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${percentage}%` }}
                           />
                        </div>

                        <div className="flex justify-between items-center text-xs">
                           <span className="text-slate-400">Spent: <span className="text-white font-mono">{currency}{budget.spent.toFixed(0)}</span></span>
                           <span className="text-slate-500">Limit: {currency}{budget.limit.toLocaleString()}</span>
                        </div>
                     </GlassCard>
                  );
               })}
               <GlassCard 
                  onClick={onAddBudget}
                  className="border-2 border-dashed border-white/5 flex items-center justify-center min-h-[160px] text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all cursor-pointer"
               >
                  <div className="flex flex-col items-center gap-2">
                     <Plus size={24} />
                     <span className="font-bold text-sm">Add Category</span>
                  </div>
               </GlassCard>
            </div>
         </div>

         {/* RIGHT COL: Goals & Insights */}
         <div className="space-y-6 sticky top-6">
            <div className="flex justify-between items-end pb-2 px-1">
               <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Target className="text-indigo-400" /> Goals & Insights
               </h3>
            </div>

            <GlassCard className="bg-gradient-to-br from-indigo-900/80 via-slate-900 to-slate-900 border-indigo-500/30 overflow-hidden relative min-h-[340px] flex flex-col items-center justify-center text-center p-8">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
               
               <h3 className="text-lg font-bold text-white mb-6 relative z-10">Total Savings Accumulation</h3>
               
               <div className="relative w-48 h-48 mb-6">
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-4xl font-extrabold text-white tracking-tighter">{currency}{savingsTotal.toLocaleString()}</span>
                     <span className="text-[10px] text-indigo-300 uppercase font-bold mt-1 tracking-widest">Liquid Assets</span>
                  </div>
               </div>
               
               <div className="w-full max-w-xs relative z-10">
                  <button 
                    onClick={onAddSavings}
                    className="bg-white text-indigo-900 w-full py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95"
                  >
                     + Add Savings
                  </button>
               </div>
            </GlassCard>
         </div>
      </div>
   );
};

// --- MODAL EXPORTS ---

export interface AddAssetModalProps {
   onClose: () => void;
   onSave: (asset: Asset) => void;
   institutions: any[];
   initialData?: Asset | null;
}

export const AddAssetModal = ({ onClose, onSave, institutions, initialData }: AddAssetModalProps) => {
   const [form, setForm] = useState<Partial<Asset>>(initialData || {
      category: 'Tech'
   });

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name || form.value === undefined) return;

      const newAsset: Asset = {
         id: initialData ? initialData.id : Date.now().toString(),
         name: form.name,
         category: form.category as AssetCategory,
         value: Number(form.value),
         originalValue: form.originalValue ? Number(form.originalValue) : undefined,
         notes: form.notes,
         institutionId: form.institutionId
      };
      onSave(newAsset);
   };

   return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
         <div className="w-full max-w-md">
            <GlassCard className="border-t-4 border-t-emerald-500">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">{initialData ? 'Edit Asset' : 'Add New Asset'}</h3>
                  <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
               </div>

               <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Asset Name</label>
                     <input 
                        required
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                        placeholder="e.g. MacBook Air, Tuition Credit..."
                        value={form.name || ''}
                        onChange={e => setForm({...form, name: e.target.value})}
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Current Value</label>
                        <input 
                           required
                           type="number"
                           className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                           placeholder="0.00"
                           value={form.value || ''}
                           onChange={e => setForm({...form, value: Number(e.target.value)})}
                        />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Original Value</label>
                        <input 
                           type="number"
                           className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                           placeholder="Optional"
                           value={form.originalValue || ''}
                           onChange={e => setForm({...form, originalValue: Number(e.target.value)})}
                        />
                     </div>
                  </div>

                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Category</label>
                     <div className="grid grid-cols-3 gap-2">
                        {['Tech', 'Academic', 'Savings', 'Investment', 'Transport', 'Real Estate'].map(cat => (
                           <button
                              type="button"
                              key={cat}
                              onClick={() => setForm({...form, category: cat as AssetCategory})}
                              className={`
                                 py-2 text-xs font-bold rounded-lg border transition-all
                                 ${form.category === cat 
                                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg' 
                                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}
                              `}
                           >
                              {cat}
                           </button>
                        ))}
                     </div>
                  </div>

                  {form.category === 'Academic' && (
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Linked Institution</label>
                        <select 
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
                  )}

                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Notes</label>
                     <textarea 
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                        placeholder="Additional details..."
                        rows={2}
                        value={form.notes || ''}
                        onChange={e => setForm({...form, notes: e.target.value})}
                     />
                  </div>

                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-4">
                     {initialData ? 'Update Asset' : 'Save Asset'}
                  </button>
               </form>
            </GlassCard>
         </div>
      </div>
   );
};

export interface AddExpenseModalProps {
  onClose: () => void;
  onSave: (expense: Expense) => void;
  initialData?: Expense | null;
}

export const AddExpenseModal = ({ onClose, onSave, initialData }: AddExpenseModalProps) => {
  const [form, setForm] = useState<Partial<Expense>>(initialData || {
    category: 'Food',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (!form.amount || !form.category) return;

     onSave({
        id: initialData ? initialData.id : Date.now().toString(),
        amount: Number(form.amount),
        category: form.category,
        date: form.date || new Date().toISOString().split('T')[0],
        note: form.note || '',
        merchant: form.merchant || ''
     });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
       <div className="w-full max-w-md">
          <GlassCard className="border-t-4 border-t-emerald-500">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{initialData ? 'Edit Transaction' : 'New Transaction'}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Amount</label>
                      <input 
                         required
                         type="number"
                         autoFocus={!initialData}
                         className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                         placeholder="0.00"
                         value={form.amount || ''}
                         onChange={e => setForm({...form, amount: Number(e.target.value)})}
                      />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Date</label>
                      <input 
                         type="date"
                         required
                         className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                         value={form.date}
                         onChange={e => setForm({...form, date: e.target.value})}
                      />
                   </div>
                </div>

                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Merchant / Title</label>
                   <input 
                      required
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. Starbucks, Amazon"
                      value={form.merchant || ''}
                      onChange={e => setForm({...form, merchant: e.target.value})}
                   />
                </div>

                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Category</label>
                   <div className="grid grid-cols-3 gap-2">
                      {['Food', 'Transport', 'Shopping', 'Academic', 'Entertainment', 'Health'].map(cat => (
                         <button
                            type="button"
                            key={cat}
                            onClick={() => setForm({...form, category: cat})}
                            className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${form.category === cat ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}
                         >
                            {cat}
                         </button>
                      ))}
                   </div>
                </div>

                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg mt-2">
                   {initialData ? 'Update Expense' : 'Log Expense'}
                </button>
             </form>
          </GlassCard>
       </div>
    </div>
  );
};

export interface AddSubscriptionModalProps {
  onClose: () => void;
  onSave: (sub: Subscription) => void;
  initialData?: Subscription | null;
}

export const AddSubscriptionModal = ({ onClose, onSave, initialData }: AddSubscriptionModalProps) => {
  const [form, setForm] = useState<Partial<Subscription>>(initialData || {
    period: 'Monthly',
    category: 'Software',
    nextBillingDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.cost) return;

    onSave({
       id: initialData ? initialData.id : Date.now().toString(),
       name: form.name,
       cost: Number(form.cost),
       period: form.period || 'Monthly',
       nextBillingDate: form.nextBillingDate || '',
       category: form.category || 'Utility'
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
       <div className="w-full max-w-md">
          <GlassCard className="border-t-4 border-t-indigo-500">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{initialData ? 'Edit Subscription' : 'Add Subscription'}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Service Name</label>
                   <input 
                      required
                      autoFocus={!initialData}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. Netflix, Spotify"
                      value={form.name || ''}
                      onChange={e => setForm({...form, name: e.target.value})}
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Cost</label>
                      <input 
                         required
                         type="number"
                         className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                         placeholder="0.00"
                         value={form.cost || ''}
                         onChange={e => setForm({...form, cost: Number(e.target.value)})}
                      />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Billing Cycle</label>
                      <select 
                         className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 appearance-none"
                         value={form.period}
                         onChange={e => setForm({...form, period: e.target.value as any})}
                      >
                         <option>Monthly</option>
                         <option>Yearly</option>
                      </select>
                   </div>
                </div>

                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Next Billing Date</label>
                   <input 
                      type="date"
                      required
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                      value={form.nextBillingDate}
                      onChange={e => setForm({...form, nextBillingDate: e.target.value})}
                   />
                </div>

                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Category</label>
                   <div className="grid grid-cols-2 gap-2">
                      {['Software', 'Entertainment', 'Utility', 'Academic'].map(cat => (
                         <button
                            type="button"
                            key={cat}
                            onClick={() => setForm({...form, category: cat as any})}
                            className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${form.category === cat ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}
                         >
                            {cat}
                         </button>
                      ))}
                   </div>
                </div>

                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg mt-2">
                   {initialData ? 'Update Subscription' : 'Save Subscription'}
                </button>
             </form>
          </GlassCard>
       </div>
    </div>
  );
};

export interface AddBudgetModalProps {
  onClose: () => void;
  onSave: (budget: Budget) => void;
  initialData?: Budget | null;
}

export const AddBudgetModal = ({ onClose, onSave, initialData }: AddBudgetModalProps) => {
  const [form, setForm] = useState<Partial<Budget>>(initialData || {
    period: 'Monthly',
    category: 'Food',
    spent: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.limit || !form.category) return;
    onSave({
       category: form.category,
       limit: Number(form.limit),
       spent: form.spent || 0,
       period: form.period || 'Monthly'
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
       <div className="w-full max-w-md">
          <GlassCard className="border-t-4 border-t-emerald-500">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{initialData ? 'Edit Budget' : 'Create Budget'}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Category</label>
                   <select 
                      disabled={!!initialData} // Cannot change category of existing budget, must delete
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 appearance-none disabled:opacity-50"
                      value={form.category}
                      onChange={e => setForm({...form, category: e.target.value})}
                   >
                      {['Food', 'Transport', 'Shopping', 'Academic', 'Entertainment', 'Health'].map(c => (
                         <option key={c} value={c}>{c}</option>
                      ))}
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Spending Limit</label>
                      <input 
                         required
                         type="number"
                         autoFocus={!initialData}
                         className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                         placeholder="0.00"
                         value={form.limit || ''}
                         onChange={e => setForm({...form, limit: Number(e.target.value)})}
                      />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Period</label>
                      <select 
                         className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 appearance-none"
                         value={form.period}
                         onChange={e => setForm({...form, period: e.target.value as any})}
                      >
                         <option>Monthly</option>
                         <option>Semester</option>
                      </select>
                   </div>
                </div>

                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg mt-2">
                   {initialData ? 'Update Budget' : 'Set Budget'}
                </button>
             </form>
          </GlassCard>
       </div>
    </div>
  );
};
