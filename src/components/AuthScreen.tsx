import React, { useState } from 'react';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import backendService, { AuthUserDTO } from '../services/backendService.js';

interface AuthScreenProps {
  onSuccess: (user: AuthUserDTO) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateLogin = (val: string): string | null => {
    const trimmed = val.trim();
    if (trimmed.length < 2 || trimmed.length > 24) {
      return 'Логин должен содержать от 2 до 24 символов.';
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      return 'Используйте только латинские буквы, цифры и символы _ . -';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const loginErr = validateLogin(login);
    if (loginErr) {
      setError(loginErr);
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен быть не короче 6 символов.');
      return;
    }

    setLoading(true);
    try {
      const user =
        tab === 'login'
          ? await backendService.login(login.trim(), password)
          : await backendService.register(login.trim(), password);
      onSuccess(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка подключения к серверу.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-slate-900">
      <div
        className="absolute inset-0 bg-cover bg-center scale-105 opacity-45 blur-[3px]"
        style={{ backgroundImage: 'url(/assets/aistudio/________________92594eb2.jpg)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-900/50 to-slate-950/80" />

      <div className="relative z-10 w-full max-w-[440px] bg-white rounded-3xl shadow-2xl border-4 border-slate-900 overflow-hidden">
        <div className="bg-amber-400 px-6 py-5 border-b-4 border-slate-900 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">ЛапкоГрад</h1>
          <p className="text-sm font-bold text-amber-950 mt-1">
            Уютный 2D аватар-чат · Центральная улица и Dog Style
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-5 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                tab === 'login'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Вход
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                tab === 'register'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Логин (латиницей или цифрами)
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="например, barsik"
                autoComplete="username"
                maxLength={24}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 focus:outline-none text-slate-900 font-semibold bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Пароль (минимум 6 символов)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 focus:outline-none text-slate-900 font-semibold bg-slate-50"
              />
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-200 text-rose-800 text-sm">
                <div className="flex items-start gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-5 bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 disabled:opacity-60 text-slate-950 font-extrabold text-base rounded-xl border-2 border-slate-900 shadow-[0_3px_0_#0f172a] transition-all cursor-pointer"
            >
              {loading
                ? 'Подключаемся...'
                : tab === 'login'
                ? 'Войти в город'
                : 'Создать аккаунт и персонажа'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
