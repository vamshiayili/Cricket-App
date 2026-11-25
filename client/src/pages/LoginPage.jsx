import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogIn, UserPlus, Shield, Sparkles, CheckCircle,
  Eye, EyeOff, AlertCircle, LogOut, ArrowRight, Check
} from 'lucide-react';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('SCORER');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, login, register, logout } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const loggedUser = await login(emailOrUsername.trim(), password);
      setSuccess(`Welcome back, ${loggedUser.username}!`);
      setTimeout(() => {
        navigate('/scorer');
      }, 600);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const newUser = await register(username.trim(), email.trim(), password, role);
      setSuccess(`Account created for ${newUser.username}!`);
      setTimeout(() => {
        navigate('/teams');
      }, 600);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Immediate 1-Click Demo Login
  const handleInstantDemoLogin = async (demoEmail, demoPass) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const loggedUser = await login(demoEmail, demoPass);
      setSuccess(`Logged in instantly as ${loggedUser.username} (${loggedUser.role})!`);
      setTimeout(() => {
        navigate('/scorer');
      }, 600);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-6">
      {/* If already logged in, show status & quick navigation banner */}
      {user && (
        <div className="bg-emerald-950/80 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold shadow-md">
            ✓
          </div>
          <div>
            <div className="inline-block text-[11px] font-black uppercase tracking-wider bg-emerald-800 text-emerald-200 px-2.5 py-0.5 rounded-full mb-1">
              Active Session
            </div>
            <h3 className="text-xl font-black text-white">Signed in as {user.username}</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Role: <strong className="text-emerald-400">{user.role}</strong> ({user.email})
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link
              to="/scorer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
            >
              <span>Scorer Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              to="/teams"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Teams & Squads</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="pt-2 border-t border-emerald-900/40">
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 py-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out / Switch to another account</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Login / Register Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-2xl mx-auto shadow-lg shadow-emerald-500/20">
            🏏
          </div>
          <h2 className="text-2xl font-black text-white">
            {isRegister ? 'Create Village Account' : 'Village Cricket Sign In'}
          </h2>
          <p className="text-xs text-slate-400">
            {isRegister
              ? 'Join as a scorer to enter live scores or manage teams'
              : 'Log in with your username or email address'}
          </p>
        </div>

        {/* 1-Click Instant Demo Login Buttons */}
        {!isRegister && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant 1-Click Demo Logins</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">No password needed</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleInstantDemoLogin('scorer@village.com', 'admin123')}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold py-2.5 rounded-xl text-xs transition-all active:scale-95 text-center flex flex-col items-center"
              >
                <span className="font-black text-sm text-white">🏏 Scorer (Dev)</span>
                <span className="text-[10px] text-emerald-400">Full score entry access</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleInstantDemoLogin('admin@village.com', 'admin123')}
                className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold py-2.5 rounded-xl text-xs transition-all active:scale-95 text-center flex flex-col items-center"
              >
                <span className="font-black text-sm text-white">👑 Admin</span>
                <span className="text-[10px] text-blue-400">Tournament manager</span>
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="bg-red-950/70 border border-red-500/40 text-red-200 text-xs font-semibold p-3.5 rounded-2xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-semibold p-3.5 rounded-2xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form: Login */}
        {!isRegister ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                Username or Email
              </label>
              <input
                type="text"
                placeholder="e.g. scorer or scorer@village.com"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Case-insensitive: you can type in lowercase or uppercase
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </form>
        ) : (
          /* Form: Register */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                Username *
              </label>
              <input
                type="text"
                placeholder="e.g. vamshi_scorer"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">
                Email Address *
              </label>
              <input
                type="email"
                placeholder="e.g. vamshi@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300 uppercase">
                  Password *
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                Select Your Role *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('SCORER')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-left ${
                    role === 'SCORER'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="font-black text-sm">🏏 Scorer</div>
                  <div className="text-[10px] opacity-80">Enter live scores & teams</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('VIEWER')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-left ${
                    role === 'VIEWER'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="font-black text-sm">👁️ Spectator</div>
                  <div className="text-[10px] opacity-80">Watch live scores & stats</div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
            </button>
          </form>
        )}

        {/* Toggle Login / Register */}
        <div className="pt-2 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
          >
            {isRegister
              ? 'Already registered? Click here to Sign In'
              : "Don't have an account? Click here to Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
