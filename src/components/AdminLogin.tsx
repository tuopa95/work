import React, { useState } from "react";
import { Lock, User, AlertCircle, Sparkles, KeyRound } from "lucide-react";

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
  onCancel: () => void;
}

export default function AdminLogin({ onLoginSuccess, onCancel }: AdminLoginProps) {
  const [username, setUsername] = useState("admin");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("请输入账号");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() })
      });

      const result = await response.json();
      if (result.success) {
        onLoginSuccess(result.token);
      } else {
        setError(result.error || "账号错误");
      }
    } catch (err) {
      setError("连接网络超时，请检查服务状态");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto" id="admin-login-card-container">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-zinc-800 shadow-md transition-all duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/20 mb-3">
            <KeyRound className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">管理员登录</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            免密码安全通道，直接输入账号即可登录后台
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2 border border-rose-100/50 dark:border-rose-950/40">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                管理员账号
              </label>
              <span className="text-[10px] text-emerald-500 font-medium bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">免密登录已启用</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <User className="w-4 h-4" />
              </span>
              <input
                id="admin-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#121214] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              id="admin-login-submit-btn"
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                isLoading
                  ? "bg-blue-400 dark:bg-blue-600/70 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 active:scale-[0.99] hover:shadow-lg hover:shadow-blue-500/10"
              }`}
            >
              {isLoading ? "正在验证..." : "免密一键登录"}
            </button>
            
            <button
              id="admin-login-cancel-btn"
              type="button"
              onClick={onCancel}
              className="w-full py-3 px-4 rounded-xl text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 text-sm font-semibold transition-all cursor-pointer"
            >
              返回员工报销提交页
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-zinc-850 text-center">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" /> 输入默认账号 <span className="font-bold text-gray-700 dark:text-gray-300">admin</span> 即可直接安全进入
          </p>
        </div>
      </div>
    </div>
  );
}
