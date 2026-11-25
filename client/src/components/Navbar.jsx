import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Radio, Trophy, Users, Edit3, LogIn, LogOut, Menu, X, Shield, Activity } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isScorer } = useAuth();
  const { isConnected } = useSocket();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                🏏
              </div>
              <div>
                <div className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
                  VILLAGE <span className="text-emerald-400">CRICKET</span>
                </div>
                <div className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Gully & Panchayat Live
                </div>
              </div>
            </Link>

            {/* Socket connection status dot */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span>{isConnected ? 'Live Sync' : 'Connecting...'}</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive('/')
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Radio className="w-4 h-4 text-red-500 animate-pulse" />
              <span>Live Matches</span>
            </Link>

            <Link
              to="/tournaments"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive('/tournaments')
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Tournaments</span>
            </Link>

            <Link
              to="/teams"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive('/teams')
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Teams & Squads</span>
            </Link>

            <Link
              to="/players"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive('/players')
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4 text-blue-400" />
              <span>Players & Stats</span>
            </Link>

            {/* Scorer Console tab */}
            <Link
              to="/scorer"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive('/scorer')
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Scorer Console</span>
              {isScorer && (
                <span className="text-[10px] bg-emerald-800 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                  Active
                </span>
              )}
            </Link>
          </div>

          {/* Desktop User Section */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-emerald-400 text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white leading-tight">{user.username}</div>
                  <div className="text-[10px] font-semibold text-emerald-400 tracking-wide flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" />
                    {user.role}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="ml-2 text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>Scorer / Dev Login</span>
              </Link>
            )}
          </div>

          {/* Mobile hamburger menu */}
          <div className="md:hidden flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="truncate max-w-[90px]">{user.username}</span>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-xl text-xs font-bold"
              >
                Sign In
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/80"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            <Radio className="w-4 h-4 text-red-500" />
            <span>Live Matches</span>
          </Link>
          <Link
            to="/tournaments"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Tournaments</span>
          </Link>
          <Link
            to="/teams"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Teams & Squads</span>
          </Link>
          <Link
            to="/players"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>Players & Stats</span>
          </Link>
          <Link
            to="/scorer"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
          >
            <Edit3 className="w-4 h-4 text-emerald-400" />
            <span>Scorer Console</span>
          </Link>
          <div className="pt-2 border-t border-slate-800">
            {user ? (
              <div className="flex items-center justify-between px-3 py-2">
                <div>
                  <div className="text-sm font-bold text-white">{user.username}</div>
                  <div className="text-xs text-emerald-400">{user.role}</div>
                </div>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold"
              >
                <LogIn className="w-4 h-4" /> Sign In / Scorer Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
