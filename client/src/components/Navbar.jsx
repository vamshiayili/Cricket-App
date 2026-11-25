import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Radio, Trophy, Users, Edit3, Menu, X, Shield } from 'lucide-react';

export default function Navbar() {
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
            </Link>
          </div>

          {/* Mobile hamburger menu */}
          <div className="md:hidden flex items-center gap-2">
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
        </div>
      )}
    </nav>
  );
}
