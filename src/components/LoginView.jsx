import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User, KeyRound, AlertCircle } from 'lucide-react';
import AnimatedRGULogo from './AnimatedRGULogo';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8005/api' : '/maintenance/api');

export default function LoginView({ onLoginSuccess, theme, setTheme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/token/`, {
        username,
        password
      });

      // Save using namespace specifically for Maintenance Tracker (mt_)
      localStorage.setItem('mt_token', res.data.access);
      localStorage.setItem('mt_refresh', res.data.refresh);
      localStorage.setItem('mt_user', username);
      localStorage.setItem('mt_is_admin', res.data.is_superuser || res.data.is_staff);

      onLoginSuccess(res.data.access);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Invalid username or password.');
      } else {
        setError('Failed to connect to the server.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50/5 relative overflow-hidden theme-app-bg">
      {/* Decorative background blur */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/20 blur-[100px] pointer-events-none"></div>

      {/* Theme Toggle Top Right */}
      {theme && setTheme && (
        <div className="absolute top-6 right-6 z-20">
          <button
            type="button"
            onClick={() => {
              const nextTheme = theme === 'bright' ? 'dark' :
                theme === 'dark' ? 'adobe3d' :
                theme === 'adobe3d' ? '3dsurface' :
                theme === '3dsurface' ? 'glass' :
                theme === 'glass' ? 'two-reflections' :
                theme === 'two-reflections' ? 'dark-glass' :
                theme === 'dark-glass' ? 'rathinam-light' :
                theme === 'rathinam-light' ? 'rathinam-dark' : 'bright';
              setTheme(nextTheme);
              localStorage.setItem('mt_theme', nextTheme);
            }}
            className="flex items-center gap-2 p-2 rounded-xl theme-panel theme-hover border theme-border shadow-md transition-all"
            title="Change Theme"
          >
            <div className={`w-4 h-4 rounded-full border-2 theme-border ${
              theme === 'bright' ? 'bg-white' : 
              theme === 'dark' ? 'bg-gray-800' : 
              theme === 'adobe3d' ? 'bg-slate-300' : 
              theme === '3dsurface' ? 'bg-neutral-600' : 
              theme === 'glass' ? 'bg-indigo-500' :
              theme === 'two-reflections' ? 'bg-blue-300' :
              theme === 'dark-glass' ? 'bg-cyan-400' :
              theme === 'rathinam-light' ? 'bg-purple-600' :
              theme === 'rathinam-dark' ? 'bg-purple-900' : 'bg-indigo-500'
            }`}></div>
            <span className="text-xs font-semibold theme-text mr-1">
              {theme === 'bright' && 'Bright'}
              {theme === 'dark' && 'Dark'}
              {theme === 'adobe3d' && 'Matte'}
              {theme === '3dsurface' && '3D Surf'}
              {theme === 'glass' && 'Glass'}
              {theme === 'two-reflections' && '2 Reflect'}
              {theme === 'dark-glass' && 'Neon'}
              {theme === 'rathinam-light' && 'RGU L'}
              {theme === 'rathinam-dark' && 'RGU D'}
            </span>
          </button>
        </div>
      )}

      <div className="theme-panel w-full max-w-md p-8 rounded-3xl shadow-2xl relative z-10 border theme-border">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-56 h-auto">
              <AnimatedRGULogo animated={true} />
            </div>
          </div>
          <h1 className="text-3xl font-bold theme-text mb-2">Maintenance Portal</h1>
          <p className="theme-text-muted">Sign in to access budget tracker</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium theme-text-muted ml-1">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50/5 border theme-border theme-text focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium theme-text-muted ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <KeyRound size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50/5 border theme-border theme-text focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs theme-text-muted">Secured with namespaced token authentication</p>
        </div>
      </div>
    </div>
  );
}
