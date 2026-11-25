import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import LiveScoreCard from '../components/LiveScoreCard';
import { Radio, PlusCircle, Filter, Trophy, Calendar, Sparkles, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'LIVE', 'SCHEDULED', 'COMPLETED'
  const { socket } = useSocket();
  const { isScorer } = useAuth();

  // Create match modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [formData, setFormData] = useState({
    tournament_id: '',
    team_a_id: '',
    team_b_id: '',
    overs: 10,
    venue: '',
    match_date: new Date().toISOString().split('T')[0]
  });

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/matches');
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  // Listen to live socket score updates to refresh match cards in real time!
  useEffect(() => {
    if (!socket) return;

    socket.on('score_update', () => {
      fetchMatches();
    });

    socket.on('match_created', () => {
      fetchMatches();
    });

    return () => {
      socket.off('score_update');
      socket.off('match_created');
    };
  }, [socket]);

  // Load tournaments and teams for match creation modal
  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    try {
      const [tRes, tmRes] = await Promise.all([
        fetch('/api/tournaments'),
        fetch('/api/teams')
      ]);
      const tData = await tRes.json();
      const tmData = await tmRes.json();
      setTournaments(tData.tournaments || []);
      setTeams(tmData.teams || []);
      if (tData.tournaments?.length > 0) {
        setFormData(prev => ({
          ...prev,
          tournament_id: tData.tournaments[0].id,
          venue: tData.tournaments[0].village_location
        }));
      }
      if (tmData.teams?.length >= 2) {
        setFormData(prev => ({
          ...prev,
          team_a_id: tmData.teams[0].id,
          team_b_id: tmData.teams[1].id
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateMatchSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('cricket_auth_token');
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create match');
      setShowCreateModal(false);
      fetchMatches();
    } catch (err) {
      alert(err.message);
    }
  };

  const liveMatches = matches.filter(m => m.status === 'LIVE');
  const filteredMatches = matches.filter(m => {
    if (filter === 'LIVE') return m.status === 'LIVE';
    if (filter === 'SCHEDULED') return m.status === 'SCHEDULED';
    if (filter === 'COMPLETED') return m.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-900/40 p-6 sm:p-10 shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-400 via-transparent to-transparent pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Gram Panchayat & Village Cricket Platform
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Village Tournament <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
              Live Scoring & Commentary
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Follow gully and village cricket matches ball-by-ball in real-time. Scorers can enter live balls, wickets, extras, and commentary directly from the ground!
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/scorer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
            >
              <span>Go to Scorer Keypad</span>
            </Link>

            {isScorer && (
              <button
                onClick={handleOpenCreateModal}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm border border-slate-700 transition-all flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Create New Match</span>
              </button>
            )}

            <button
              onClick={fetchMatches}
              className="text-slate-400 hover:text-white p-2.5 rounded-xl hover:bg-slate-800 transition-colors"
              title="Refresh matches"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Live Now Quick Strip */}
      {liveMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 live-pulse"></span>
              <h2 className="text-xl font-extrabold text-white tracking-tight">Happening Right Now (LIVE)</h2>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{liveMatches.length} active match</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveMatches.map(match => (
              <LiveScoreCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs & Matches List */}
      <div className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-black text-white">All Tournament Matches</h2>
            <p className="text-xs text-slate-400 mt-1">Sankranti cups, village derbies, and weekend fixtures</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            {['ALL', 'LIVE', 'SCHEDULED', 'COMPLETED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === tab
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab === 'ALL' && 'All'}
                {tab === 'LIVE' && '🔴 Live'}
                {tab === 'SCHEDULED' && 'Upcoming'}
                {tab === 'COMPLETED' && 'Finished'}
              </button>
            ))}
          </div>
        </div>

        {/* Matches Grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-400" />
            <p className="font-semibold text-sm">Loading village cricket matches...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 border border-slate-800/80 rounded-2xl">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="font-bold text-slate-300">No matches found in this category.</p>
            <p className="text-xs text-slate-500 mt-1">Check other tabs or create a new village tournament match.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map(match => (
              <LiveScoreCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </div>

      {/* Create Match Modal (for Scorers/Devs) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Schedule Village Match
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMatchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">Select Tournament</label>
                <select
                  value={formData.tournament_id}
                  onChange={(e) => setFormData({ ...formData, tournament_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.village_location})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">Team A</label>
                  <select
                    value={formData.team_a_id}
                    onChange={(e) => setFormData({ ...formData, team_a_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  >
                    {teams.map(tm => (
                      <option key={tm.id} value={tm.id}>{tm.name} ({tm.short_name})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">Team B</label>
                  <select
                    value={formData.team_b_id}
                    onChange={(e) => setFormData({ ...formData, team_b_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  >
                    {teams.map(tm => (
                      <option key={tm.id} value={tm.id}>{tm.name} ({tm.short_name})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">Overs per Side</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.overs}
                    onChange={(e) => setFormData({ ...formData, overs: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">Match Date</label>
                  <input
                    type="date"
                    value={formData.match_date}
                    onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">Ground / Venue</label>
                <input
                  type="text"
                  placeholder="e.g. Rampur Village High School Ground"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm shadow-md"
                >
                  Create Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
