import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MatchDetailsPage from './pages/MatchDetailsPage';
import ScorerConsolePage from './pages/ScorerConsolePage';
import TournamentsPage from './pages/TournamentsPage';
import TeamsPage from './pages/TeamsPage';
import PlayersPage from './pages/PlayersPage';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/match/:id" element={<MatchDetailsPage />} />
          <Route path="/scorer" element={<ScorerConsolePage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/players" element={<PlayersPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🏏</span>
            <span className="font-bold text-slate-400">Village Cricket Live Scorer</span>
            <span className="text-slate-600">|</span>
            <span>Gram Panchayat & Gully Tournament System</span>
          </div>

          <div className="text-slate-500">
            Full-Stack Project: React + Node.js + Express + SQLite + Socket.IO Realtime
          </div>
        </div>
      </footer>
    </div>
  );
}
