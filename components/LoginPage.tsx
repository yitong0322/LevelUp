import React, { useState } from 'react';
import { UserRole } from '../types';
import { PASSWORDS } from '../constants';
import { Button } from './Button';
import { ShieldCheck, User, LayoutDashboard, Lock, Sparkles } from 'lucide-react';

interface LoginPageProps {
  onLogin: (role: UserRole) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CLIENT);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PASSWORDS[selectedRole]) {
      onLogin(selectedRole);
    } else {
      setError('Invalid password 🚫');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border-2 border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-8 text-center border-b-2 border-slate-100">
            <div className="inline-flex p-3 bg-indigo-50 rounded-xl mb-4 text-indigo-500">
              <LayoutDashboard className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight flex items-center justify-center gap-2">
              LevelUp <Sparkles className="text-yellow-400" />
            </h1>
            <p className="text-slate-500 font-bold tracking-wide uppercase text-sm">Gamified Task Management</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <div className="flex bg-slate-50 p-1 rounded-xl mb-6 border border-slate-100">
            <button
              onClick={() => { setSelectedRole(UserRole.CLIENT); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${
                selectedRole === UserRole.CLIENT
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <User size={18} /> CLIENT
            </button>
            <button
              onClick={() => { setSelectedRole(UserRole.ADMIN); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${
                selectedRole === UserRole.ADMIN
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <ShieldCheck size={18} /> ADMIN
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-wider">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-indigo-300" size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="block w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-all font-bold text-slate-700 placeholder-slate-300"
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center gap-2">
                <span className="text-sm text-rose-600 font-bold">{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full text-lg py-3 rounded-xl" size="lg">
              Login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};