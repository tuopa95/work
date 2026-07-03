import { useState } from 'react';
import EmployeeForm from './components/EmployeeForm';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import ThemeToggle from './components/ThemeToggle';
import { ShieldAlert, Receipt, ShieldCheck } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'employee' | 'admin_login' | 'admin_dashboard'>('employee');
  const [adminToken, setAdminToken] = useState<string>(() => sessionStorage.getItem('admin_token') || '');

  const handleAdminLoginSuccess = (token: string) => {
    sessionStorage.setItem('admin_token', token);
    setAdminToken(token);
    setView('admin_dashboard');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setAdminToken('');
    setView('employee');
  };

  // Determine current main view
  const renderMainView = () => {
    if (view === 'admin_dashboard' && adminToken) {
      return <AdminDashboard token={adminToken} onLogout={handleLogout} />;
    }
    if (view === 'admin_login') {
      return (
        <AdminLogin
          onLoginSuccess={handleAdminLoginSuccess}
        />
      );
    }
    return (
      <EmployeeForm
        onSuccess={() => {
          // Can show a nice success notification or stay
        }}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 dark:bg-zinc-950 dark:text-zinc-100 transition-colors duration-200">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-150 dark:border-zinc-850 px-4 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setView('employee')}
            className="flex items-center gap-2 text-left group"
          >
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-600/15">
              <Receipt className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">AI 智能团队报销收纳助手</span>
              </h1>
              <p className="text-[10px] md:text-xs text-slate-500 dark:text-zinc-400 font-bold mt-1.5 uppercase tracking-wide">智能财务票据分类与收集平台</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {/* View Switch Button */}
            {view === 'employee' ? (
              <button
                onClick={() => {
                  if (adminToken) {
                    setView('admin_dashboard');
                  } else {
                    setView('admin_login');
                  }
                }}
                className="flex items-center gap-1 px-3.5 py-2 bg-slate-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors text-xs font-bold text-gray-700 dark:text-gray-300 rounded-xl"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>财务管理后台</span>
              </button>
            ) : (
              <button
                onClick={() => setView('employee')}
                className="flex items-center gap-1 px-3.5 py-2 bg-slate-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors text-xs font-bold text-gray-700 dark:text-gray-300 rounded-xl"
              >
                <Receipt className="w-4 h-4" />
                <span>填写报销单</span>
              </button>
            )}

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        {renderMainView()}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-150 dark:border-zinc-850 bg-white dark:bg-zinc-900 py-6 px-4 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            &copy; 2026 AI 团队报销收集系统. All Rights Reserved.
          </p>
          <div className="flex items-center gap-4 text-[11px] font-semibold text-gray-400">
            <button onClick={() => setView('employee')} className="hover:text-blue-500 transition-colors">
              员工提交
            </button>
            <span>&bull;</span>
            <button
              onClick={() => {
                if (adminToken) {
                  setView('admin_dashboard');
                } else {
                  setView('admin_login');
                }
              }}
              className="hover:text-blue-500 transition-colors flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>财务入口</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
