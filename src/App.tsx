import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { 
  subscribeExpenses, 
  subscribeBudgets, 
  subscribeCategories,
  getCategories, 
  addCategory,
  deleteCategory,
  addExpense,
  deleteExpense,
  updateProfile,
  addBudget
} from './services/dataService';
import { generateSpendingInsights, predictNextMonth } from './services/aiService';
import { Expense, Category, Budget } from './types';
import { 
  LayoutDashboard, 
  Plus, 
  LogOut, 
  TrendingUp, 
  Wallet, 
  PieChart as PieIcon, 
  AlertCircle,
  BrainCircuit,
  Calendar,
  IndianRupee,
  BarChart as BarChartIcon,
  Coffee,
  ShoppingBag,
  Zap,
  Heart,
  Plane,
  Home,
  Utensils,
  Car,
  Settings
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function App() {
  return (
    <AuthProvider>
      <SmartExpenseApp />
    </AuthProvider>
  );
}

function SmartExpenseApp() {
  const { user, profile, signIn, signOut, loading: authLoading } = useAuth();
  const hasCheckedSeed = React.useRef(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [prediction, setPrediction] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'analytics' | 'budgeting'>('dashboard');
  const [notifications, setNotifications] = useState<{ id: string, message: string, type: 'warning' | 'error' }[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Alert Checking Logic
  useEffect(() => {
    if (!user || expenses.length === 0) return;

    const alerts: { id: string, message: string, type: 'warning' | 'error' }[] = [];
    
    // 1. Check Total Budget
    const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalLimit = profile?.monthlyBudget || 0;
    if (totalLimit > 0) {
      if (totalSpent >= totalLimit) {
        alerts.push({ id: 'total-exceeded', message: `Critical: Global monthly budget of ₹${totalLimit} has been exceeded!`, type: 'error' });
      } else if (totalSpent >= totalLimit * 0.85) {
        alerts.push({ id: 'total-near', message: `Warning: You have used ${((totalSpent/totalLimit)*100).toFixed(0)}% of your monthly budget.`, type: 'warning' });
      }
    }

    // 2. Check Category Budgets
    categories.forEach(cat => {
      const catSpent = currentMonthExpenses.filter(e => e.categoryId === cat.id).reduce((sum, e) => sum + e.amount, 0);
      const budget = budgets.find(b => b.categoryId === cat.id);
      
      if (budget && catSpent > budget.limit) {
        alerts.push({ id: `cat-${cat.id}`, message: `Budget alert: Spending in "${cat.name}" has exceeded your ₹${budget.limit} limit.`, type: 'error' });
      } else if (budget && catSpent > budget.limit * 0.8) {
        alerts.push({ id: `cat-near-${cat.id}`, message: `Approaching limit: "${cat.name}" is at ${((catSpent/budget.limit)*100).toFixed(0)}% of budget.`, type: 'warning' });
      }
    });

    setNotifications(alerts);
  }, [expenses, budgets, categories, profile]);

  useEffect(() => {
    if (!user) {
      hasCheckedSeed.current = false;
      return;
    }

    const unsubExpenses = subscribeExpenses(user.uid, setExpenses);
    const unsubBudgets = subscribeBudgets(user.uid, setBudgets);
    const unsubCategories = subscribeCategories(user.uid, (cats) => {
      setCategories(cats);
      // Only seed if empty and we haven't checked yet this session
      if (cats.length === 0 && !hasCheckedSeed.current) {
        hasCheckedSeed.current = true;
        const defaults = [
          { name: 'Food', color: '#3b82f6', icon: 'utensils' },
          { name: 'Rent', color: '#10b981', icon: 'home' },
          { name: 'Transport', color: '#f59e0b', icon: 'car' },
        ];
        defaults.forEach(cat => addCategory(user.uid, cat));
      }
    });

    return () => {
      unsubExpenses();
      unsubBudgets();
      unsubCategories();
    };
  }, [user]);

  // AI Logic
  const fetchAiData = async () => {
    if (!user || expenses.length < 3) return;
    const insights = await generateSpendingInsights(expenses, categories, profile?.monthlyBudget || 1000);
    setAiInsights(insights);
    const pred = await predictNextMonth(expenses);
    setPrediction(pred);
  };

  useEffect(() => {
    if (expenses.length > 5) {
      fetchAiData();
    }
  }, [expenses.length]);

  if (authLoading) return <div className="h-screen grid place-items-center"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-8 text-center"
        >
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-blue-500/10 rounded-3xl border border-blue-500/20">
              <BrainCircuit className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl">
            Smart <span className="text-blue-500">Expense</span> Analytics
          </h1>
          <p className="text-gray-400 text-lg">
            A next-generation financial platform powered by Gemini AI. Track, analyze, and predict your spending with precision.
          </p>
          <button 
            onClick={signIn}
            className="w-full py-4 px-6 bg-white text-black font-semibold rounded-2xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-3 text-lg"
          >
            <Plus className="w-5 h-5" /> Sign in with Google
          </button>
          <div className="text-xs text-gray-500 uppercase tracking-widest font-mono">
            SECURE CLOUD ANALYTICS v1.0
          </div>
        </motion.div>
      </div>
    );
  }

  const currentMonthExpenses = expenses.filter(e => 
    isWithinInterval(new Date(e.date), {
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date())
    })
  );

  const totalSpentMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetLimit = profile?.monthlyBudget || 0;
  const remainingBudget = Math.max(0, budgetLimit - totalSpentMonth);
  const budgetUsage = Math.min(100, (totalSpentMonth / budgetLimit) * 100);

  // Group by category for Pie Chart & Analytics (Current Month)
  const pieData = [
    ...categories.map(cat => ({
      name: cat.name,
      icon: cat.icon,
      value: currentMonthExpenses.filter(e => e.categoryId === cat.id).reduce((sum, e) => sum + e.amount, 0)
    })),
    {
      name: 'Uncategorized',
      icon: 'dollar-sign',
      value: currentMonthExpenses.filter(e => !e.categoryId || !categories.some(c => c.id === e.categoryId)).reduce((sum, e) => sum + e.amount, 0)
    }
  ].filter(d => d.value > 0);

  // Group by category for All-Time 
  const allTimePieData = [
    ...categories.map(cat => ({
      name: cat.name,
      value: expenses.filter(e => e.categoryId === cat.id).reduce((sum, e) => sum + e.amount, 0)
    })),
    {
      name: 'Uncategorized',
      value: expenses.filter(e => !e.categoryId || !categories.some(c => c.id === e.categoryId)).reduce((sum, e) => sum + e.amount, 0)
    }
  ].filter(d => d.value > 0);

  // Group by day for Line Chart (last 7 days)
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dayStr = format(d, 'MMM dd');
    const amount = expenses
      .filter(e => format(new Date(e.date), 'MMM dd') === dayStr)
      .reduce((sum, e) => sum + e.amount, 0);
    return { name: dayStr, amount };
  });

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">Σ</div>
          <span className="text-white font-semibold text-lg tracking-tight">FinIntell AI</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Dashboard"
          />
          <NavItem 
            active={activeTab === 'expenses'} 
            onClick={() => setActiveTab('expenses')}
            icon={<TrendingUp className="w-4 h-4" />}
            label="Expenses"
          />
          <NavItem 
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')}
            icon={<BarChartIcon className="w-4 h-4" />}
            label="Analytics"
          />
          <NavItem 
            active={activeTab === 'budgeting'} 
            onClick={() => setActiveTab('budgeting')}
            icon={<PieIcon className="w-4 h-4" />}
            label="Budgeting"
          />
        </nav>

        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
              {profile?.displayName?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.displayName || 'User'}</p>
              <p className="text-xs text-slate-500 capitalize">Member</p>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors w-full p-2 rounded-lg hover:bg-white/5 text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold text-slate-800">
            {activeTab === 'dashboard' && 'Financial Oversight Dashboard'}
            {activeTab === 'expenses' && 'Transaction History'}
            {activeTab === 'analytics' && 'Detailed Spending Analytics'}
            {activeTab === 'budgeting' && 'Monthly Budget Management'}
          </h1>
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors relative"
              >
                <AlertCircle className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsNotifOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <span className="font-bold text-xs uppercase tracking-widest text-slate-500">Alerts & Notifications</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600">{notifications.length}</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                        {notifications.length > 0 ? notifications.map(alert => (
                          <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-3 items-start">
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-1.5 shrink-0",
                              alert.type === 'error' ? "bg-rose-500" : "bg-amber-400"
                            )} />
                            <p className="text-xs text-slate-600 leading-normal font-medium">{alert.message}</p>
                          </div>
                        )) : (
                          <div className="p-8 text-center text-slate-400 text-xs font-medium italic">
                            All systems normal. No active alerts.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setIsBudgetModalOpen(true)}
              className="px-4 py-2 text-slate-600 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Budget Settings
            </button>
            <div className="flex items-center text-[10px] font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-600 tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span> SYSTEM ONLINE
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              + Add Expense
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-12 gap-6">
              {/* Summary Cards */}
              <div className="col-span-12 md:col-span-3">
                <StatCard 
                  title="Monthly Spending"
                  value={`₹${totalSpentMonth.toLocaleString()}`}
                  trend={totalSpentMonth > 0 ? "↑ 12.5% from last month" : "No activity"}
                  trendColor={totalSpentMonth > budgetLimit ? "text-rose-600" : "text-emerald-600"}
                  progress={budgetUsage}
                />
              </div>
              
              <div className="col-span-12 md:col-span-3">
                <StatCard 
                  title="Remaining Budget"
                  value={`₹${remainingBudget.toLocaleString()}`}
                  trend={budgetUsage > 90 ? "Critical limit reached" : "Available for use"}
                  progress={budgetUsage}
                  isRemaining
                />
              </div>

              <div className="col-span-12 md:col-span-3">
                <StatCard 
                  title="Predicted Next Month"
                  value={prediction ? `₹${prediction.toLocaleString()}` : "Analyzing..."}
                  trend="Based on current trends"
                  isPrediction
                />
              </div>

              <div className="col-span-12 md:col-span-3 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm text-white">
                <div className="flex items-center gap-2 mb-2">
                  <BrainCircuit className="w-4 h-4 text-indigo-400" />
                  <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider italic">Smart Insight</p>
                </div>
                <div className="text-sm leading-snug font-medium text-slate-100">
                  {aiInsights || "Collecting data to generate your personalized financial forecast..."}
                </div>
              </div>

              {/* Analytics Section Preview */}
              <div className="col-span-12 lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-bold text-slate-800">Spending Trends (7 Days)</h4>
                  <button onClick={() => setActiveTab('analytics')} className="text-xs text-indigo-600 font-bold hover:underline">View Detailed Analytics</button>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={last7Days}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#4f46e5" 
                        strokeWidth={2} 
                        dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Categories & Alerts */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4">Category Distribution</h4>
                  <div className="space-y-4">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium">{d.name}</span>
                          <span className="font-bold text-slate-900">₹{d.value.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(d.value / totalSpentMonth) * 100}%` }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    ))}
                    {pieData.length === 0 && <p className="text-xs text-slate-400">No data available</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h4 className="font-bold text-slate-800">Recent Transactions</h4>
                <div className="flex gap-3">
                   <button className="text-indigo-600 text-xs font-bold hover:underline">Export CSV</button>
                   <div className="w-px h-4 bg-slate-200" />
                   <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{expenses.length} TOTAL</div>
                </div>
              </div>
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-50">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-3 text-slate-500">
                        {format(new Date(expense.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-900">{expense.description}</td>
                      <td className="px-6 py-3">
                        <CategoryBadge category={categories.find(c => c.id === expense.categoryId)} />
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-slate-900">
                        -₹{expense.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button 
                          onClick={() => deleteExpense(user.uid, expense.id)}
                          className="text-rose-500 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'analytics' && (
             <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <h4 className="font-bold text-slate-800 mb-6">Spending vs Budget</h4>
                   <div className="h-[300px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={pieData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                         <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                         <Tooltip cursor={{fill: '#f8fafc'}} />
                         <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <h4 className="font-bold text-slate-800 mb-6">Highest Spending Category</h4>
                   <div className="flex flex-col items-center justify-center h-full">
                     {pieData.length > 0 ? (
                       (() => {
                         const sorted = [...pieData].sort((a, b) => b.value - a.value);
                         return (
                           <>
                             <div className="p-4 bg-rose-50 rounded-full mb-4">
                               <CategoryIcon name={sorted[0].icon || 'dollar-sign'} className="w-12 h-12 text-rose-600" />
                             </div>
                             <div className="text-4xl font-black text-rose-600 mb-2">
                               {sorted[0].name}
                             </div>
                             <p className="text-slate-500 font-medium">
                               Total: ₹{sorted[0].value.toLocaleString()}
                             </p>
                           </>
                         );
                       })()
                     ) : (
                       <p className="text-slate-400">No data available yet</p>
                     )}
                   </div>
                 </div>
               </div>
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4">Historical Transactions Heatmap (Mockup)</h4>
                  <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 italic">
                    Grid visualization coming soon...
                  </div>
               </div>
             </div>
          )}

          {activeTab === 'budgeting' && (
            <div className="space-y-6">
               <div className="flex justify-between items-center bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                 <div>
                   <h4 className="font-bold text-slate-800 mb-2">Monthly Spending Limit</h4>
                   <p className="text-slate-500 text-sm mb-6">Set your global monthly budget to track overall progress.</p>
                   <div className="flex items-center gap-4">
                      <div className="text-3xl font-black text-slate-900">₹{budgetLimit.toLocaleString()}</div>
                      <button 
                        onClick={() => setIsBudgetModalOpen(true)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
                      >
                        Update Limit
                      </button>
                   </div>
                 </div>
                 <button 
                   onClick={() => setIsCategoryModalOpen(true)}
                   className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center gap-2"
                 >
                   <Plus className="w-4 h-4" /> Add Category
                 </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {categories.map((cat, i) => {
                   const spent = expenses.filter(e => e.categoryId === cat.id).reduce((sum, e) => sum + e.amount, 0);
                   const budget = budgets.find(b => b.categoryId === cat.id);
                   const limit = budget?.limit || 1000;
                   const color = COLORS[i % COLORS.length];
                   const usage = (spent / limit) * 100;

                   return (
                     <div key={cat.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                       <div className="absolute -right-4 -top-4 opacity-5 rotate-12">
                          <CategoryIcon name={cat.icon || 'dollar-sign'} className="w-24 h-24" />
                       </div>
                       <div className="flex justify-between items-start mb-4 relative z-10">
                         <div className="flex items-center gap-2">
                           <div className="p-2 rounded-lg" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                             <CategoryIcon name={cat.icon || 'dollar-sign'} className="w-4 h-4" />
                           </div>
                           <div className="font-bold text-slate-800">{cat.name}</div>
                         </div>
                          <div className="flex items-center gap-2 relative z-10" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete "${cat.name}"? expenses will be safe but uncategorized.`)) {
                                  try {
                                    console.log('[App] Deleting category:', cat.id);
                                    await deleteCategory(user.uid, cat.id);
                                    showToast("Category removed");
                                  } catch (err) {
                                    console.error('[App] Deletion failed:', err);
                                    showToast("Could not delete category", "error");
                                  }
                                }
                              }}
                              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-widest transition-colors p-1"
                            >
                              Delete
                            </button>
                            <span className="text-slate-200">|</span>
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                const newVal = prompt(`Set budget for ${cat.name}:`, limit.toString());
                                if (newVal && user) {
                                   try {
                                     await addBudget(user.uid, { 
                                       categoryId: cat.id, 
                                       limit: parseFloat(newVal), 
                                       month: format(new Date(), 'yyyy-MM') 
                                     });
                                     showToast(`Budget updated for ${cat.name}`);
                                   } catch (err) {
                                     showToast('Failed to set budget', 'error');
                                   }
                                }
                              }}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest transition-colors p-1"
                            >
                              Set Goal
                            </button>
                          </div>
                       </div>
                       <div className="text-2xl font-bold mb-2">₹{spent.toLocaleString()}</div>
                       <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, usage)}%` }} 
                            className={cn("h-full rounded-full transition-colors", usage > 90 ? 'bg-rose-500' : 'bg-indigo-500')}
                            style={usage <= 90 ? { backgroundColor: color } : {}}
                          />
                       </div>
                       <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest">
                         Limit: ₹{limit.toLocaleString()} ({usage.toFixed(0)}%)
                       </p>
                     </div>
                   );
                 })}
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">New Expense</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <AddExpenseForm 
                  userId={user.uid} 
                  categories={categories} 
                  onSuccess={() => setIsModalOpen(false)} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Budget Settings Modal */}
      <AnimatePresence>
        {isBudgetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBudgetModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-xl font-bold mb-4">Set Monthly Budget</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const val = new FormData(e.currentTarget).get('budget');
                  if (val && user) {
                    await updateProfile(user.uid, { monthlyBudget: parseFloat(val as string) });
                    setIsBudgetModalOpen(false);
                  }
                }} className="space-y-4">
                  <input 
                    required
                    name="budget"
                    type="number"
                    defaultValue={profile?.monthlyBudget}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                  <button className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold">
                    Save Budget
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">New Category</h3>
                    <p className="text-sm text-slate-500">Create a personalized tracking category</p>
                  </div>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  if (user) {
                    await addCategory(user.uid, {
                      name: formData.get('name') as string,
                      color: formData.get('color') as string,
                      icon: formData.get('icon') as string,
                    });
                    setIsCategoryModalOpen(false);
                  }
                }} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Category Name</label>
                    <input 
                      required
                      name="name"
                      placeholder="e.g. Subscriptions"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Primary Color</label>
                      <input 
                        required
                        name="color"
                        type="color"
                        defaultValue="#4f46e5"
                        className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer p-1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Interface Icon</label>
                      <select 
                        required
                        name="icon"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                      >
                        <option value="utensils">Food & Dining</option>
                        <option value="home">Housing / Rent</option>
                        <option value="car">Transport</option>
                        <option value="coffee">Coffee / Cafe</option>
                        <option value="shopping">Shopping</option>
                        <option value="health">Health & Wellness</option>
                        <option value="travel">Travel</option>
                        <option value="bills">Utility Bills</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsCategoryModalOpen(false)}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                      Create Category
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 border backdrop-blur-md",
              toast.type === 'error' ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              toast.type === 'error' ? "bg-rose-500" : "bg-emerald-500"
            )} />
            <span className="text-sm font-bold tracking-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center px-4 py-3 rounded-lg font-medium transition-all text-sm w-full",
        active 
          ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500" 
          : "text-slate-400 hover:text-white hover:bg-white/5"
      )}
    >
      <span className="mr-3">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function StatCard({ title, value, trend, trendColor = 'text-slate-500', progress, isRemaining, isPrediction }: { title: string, value: string, trend: string, trendColor?: string, progress?: number, isRemaining?: boolean, isPrediction?: boolean }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
      <h3 className={cn(
        "text-2xl font-bold tracking-tight",
        isPrediction ? "text-indigo-600" : "text-slate-900"
      )}>
        {value}
      </h3>
      {isRemaining && progress !== undefined ? (
        <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${100 - progress}%` }} 
            className="bg-emerald-500 h-full"
          />
        </div>
      ) : (
        <p className={cn("text-xs mt-2 font-semibold", trendColor)}>{trend}</p>
      )}
    </div>
  );
}

function CategoryIcon({ name, className, style }: { name: string, className?: string, style?: React.CSSProperties }) {
  const icons: Record<string, any> = {
    utensils: Utensils,
    home: Home,
    car: Car,
    coffee: Coffee,
    shopping: ShoppingBag,
    health: Heart,
    travel: Plane,
    bills: Zap,
  };
  const Icon = icons[name] || IndianRupee;
  return <Icon className={className} style={style} />;
}

function CategoryBadge({ category }: { category?: Category }) {
  if (!category) return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] uppercase font-bold tracking-tighter">Misc</span>;
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100/50 w-fit">
      <CategoryIcon 
        name={category.icon || 'dollar-sign'} 
        className="w-3 h-3" 
        style={{ color: category.color }} 
      />
      <span className="text-slate-600 text-[10px] uppercase font-bold tracking-tighter">
        {category.name}
      </span>
    </div>
  );
}

function AddExpenseForm({ userId, categories, onSuccess }: { userId: string, categories: Category[], onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      await addExpense(userId, {
        amount: parseFloat(formData.get('amount') as string),
        categoryId: formData.get('categoryId') as string,
        date: new Date(formData.get('date') as string).getTime(),
        description: formData.get('description') as string,
        createdAt: Date.now()
      });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs uppercase font-bold tracking-widest text-gray-400">Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
          <input 
            required 
            name="amount"
            type="number" 
            step="0.01" 
            placeholder="0.00" 
            className="w-full pl-8 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-xl font-bold"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase font-bold tracking-widest text-gray-400">Category</label>
        <select name="categoryId" required className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-semibold appearance-none">
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase font-bold tracking-widest text-gray-400">Date</label>
        <input 
          required 
          name="date"
          type="date" 
          defaultValue={format(new Date(), 'yyyy-MM-dd')}
          className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-semibold"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase font-bold tracking-widest text-gray-400">Description</label>
        <input 
          required 
          name="description"
          type="text" 
          placeholder="What was it for?" 
          className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-semibold"
        />
      </div>

      <button 
        disabled={loading}
        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all text-lg"
      >
        {loading ? 'Adding...' : 'Confirm Transaction'}
      </button>
    </form>
  );
}
