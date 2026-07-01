import { useState, useEffect } from "react";
import { Shield, Sparkles, Receipt, ArrowRight, CornerDownLeft } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import EmployeeForm from "./components/EmployeeForm";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [mode, setMode] = useState<"employee" | "admin">("employee");
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem("admin_session_token");
  });

  // Track if session token changed to save locally
  useEffect(() => {
    if (adminToken) {
      localStorage.setItem("admin_session_token", adminToken);
    } else {
      localStorage.removeItem("admin_session_token");
    }
  }, [adminToken]);

  const handleLoginSuccess = (token: string) => {
    setAdminToken(token);
  };

  const handleLogout = () => {
    setAdminToken(null);
    setMode("employee");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-black transition-colors duration-300 flex flex-col selection:bg-blue-500/20" id="reimbursement-app-root">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#f5f5f7]/85 dark:bg-black/85 backdrop-blur-md border-b border-gray-200/40 dark:border-zinc-900/40 px-4 py-4 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setMode("employee")}>
            <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">AI 团队报销收集系统</h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-semibold">高效 · 极简 · 智能化收集</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle link depending on current mode */}
            {mode === "employee" ? (
              <button
                id="header-admin-portal-btn"
                onClick={() => setMode("admin")}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 bg-white dark:bg-[#1c1c1e] border border-gray-200/70 dark:border-zinc-800 shadow-xs flex items-center gap-1 cursor-pointer transition-all hover:scale-102"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>管理员端</span>
              </button>
            ) : (
              <button
                id="header-employee-portal-btn"
                onClick={() => setMode("employee")}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 bg-white dark:bg-[#1c1c1e] border border-gray-200/70 dark:border-zinc-800 shadow-xs flex items-center gap-1 cursor-pointer transition-all hover:scale-102"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>员工报销页</span>
              </button>
            )}

            {/* Dark Mode Theme Switcher */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-10 px-4 max-w-6xl w-full mx-auto flex flex-col justify-center animate-fade-in">
        {mode === "employee" ? (
          /* Employee Submission Form View */
          <div className="space-y-8 animate-slide-up">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-100/30">
                <Sparkles className="w-3 h-3" /> 2026 团队自助工具
              </span>
              <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                一键提交，凭证即刻汇总
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                输入您的报销详情并追加电子发票、付款截图，系统将实时对齐报销账目，大幅缩短财务报销周期。
              </p>
            </div>

            <EmployeeForm onSuccess={() => {}} />
          </div>
        ) : (
          /* Admin View (with authentication guard) */
          <div className="animate-slide-up">
            {!adminToken ? (
              <AdminLogin onLoginSuccess={handleLoginSuccess} onCancel={() => setMode("employee")} />
            ) : (
              <AdminDashboard onLogout={handleLogout} />
            )}
          </div>
        )}
      </main>

      {/* Modern Minimalistic Footer */}
      <footer className="border-t border-gray-200/40 dark:border-zinc-900/40 py-8 px-4 mt-16 text-center text-xs text-gray-400 dark:text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 AI 团队报销收集系统. 保留所有权利。</p>
          <div className="flex items-center gap-4">
            {mode === "employee" && (
              <button
                id="footer-admin-login-link"
                onClick={() => setMode("admin")}
                className="hover:text-blue-500 dark:hover:text-blue-400 font-semibold cursor-pointer flex items-center gap-0.5 transition-colors"
              >
                <span>管理员后台入口</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <span className="text-gray-300 dark:text-zinc-800">|</span>
            <span>适配手机 & 电脑</span>
            <span className="text-gray-300 dark:text-zinc-800">|</span>
            <span className="font-mono text-[10px]">v1.0.0 Stable</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
