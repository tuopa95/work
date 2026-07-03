import { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, Loader2 } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.token);
      } else {
        setError(data.error || '登录失败，密码错误');
      }
    } catch (err) {
      console.error(err);
      setError('网络连接异常');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 rounded-2xl shadow-xl overflow-hidden">
        {/* Banner */}
        <div className="bg-blue-600 p-6 text-center text-white relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-3 backdrop-blur-sm">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">后台管理系统</h2>
          <p className="text-xs text-blue-100 mt-1">
            仅限系统管理员及财务审核人员访问
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              管理后台访问密码
            </label>
            <input
              type="password"
              required
              placeholder="请输入管理密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 px-3 py-2 rounded-lg border border-rose-100 dark:border-rose-900/30">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>正在验证登录...</span>
              </>
            ) : (
              <>
                <span>进入管理后台</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
