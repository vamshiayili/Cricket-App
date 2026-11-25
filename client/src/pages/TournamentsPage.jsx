import React, { useState, useEffect } from 'react';
import { Trophy, MapPin, Calendar, Users, Award, ChevronRight, PlusCircle, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournamentDetails, setTournamentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Create tournament modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allTeams, setAllTeams] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    village_location: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    banner_url: '',
    team_ids: []
  });

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tournaments');
      const data = await res.json();
      setTournaments(data.tournaments || []);
      if (data.tournaments?.length > 0) {
        loadTournamentDetails(data.tournaments[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const loadTournamentDetails = async (id) => {
    setSelectedTournament(id);
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      const data = await res.json();
      setTournamentDetails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      setAllTeams(data.teams || []);
      setFormData(prev => ({ ...prev, team_ids: data.teams?.map(t => t.id) || [] }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create tournament');
      setShowCreateModal(false);
      fetchTournaments();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400" />
            <span>Village Tournaments</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gram Panchayat tournaments, Sankranti trophies, and local league tables
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            to="/teams"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold px-4 py-2.5 rounded-xl text-sm border border-emerald-500/30 transition-all shadow-sm"
          >
            <Shield className="w-4 h-4" />
            <span>Create My Team & Squad</span>
          </Link>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Tournament</span>
          </button>
        </div>
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((t) => (
          <div
            key={t.id}
            onClick={() => loadTournamentDetails(t.id)}
            className={`cursor-pointer rounded-3xl p-5 border transition-all duration-300 relative overflow-hidden group ${
              selectedTournament === t.id
                ? 'bg-slate-900 border-emerald-500/80 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {t.status}
              </span>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1 font-semibold">
                  <Users className="w-3.5 h-3.5 text-slate-500" /> {t.team_count} Teams
                </span>
                <span>•</span>
                <span className="font-semibold">{t.match_count} Matches</span>
              </div>
            </div>

            <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
              {t.name}
            </h3>

            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{t.village_location}</span>
            </p>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400">
              <span>View Standings & Fixtures</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-emerald-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Selected Tournament Details (Points Table & Matches) */}
      {tournamentDetails && (
        <div className="space-y-6 pt-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">
                {tournamentDetails.tournament.name} Standings
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Points table computed from completed matches</p>
            </div>
          </div>

          {/* Points Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-6">Pos & Team</th>
                    <th className="py-3 px-4">Village</th>
                    <th className="py-3 px-4 text-center">Played</th>
                    <th className="py-3 px-4 text-center">Won</th>
                    <th className="py-3 px-4 text-center">Lost</th>
                    <th className="py-3 px-4 text-center">Tied</th>
                    <th className="py-3 px-6 text-right font-black text-white">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {tournamentDetails.pointsTable?.map((team, idx) => (
                    <tr key={team.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-6 font-bold text-white flex items-center gap-3">
                        <span className="w-5 text-xs text-slate-500 font-mono font-bold">{idx + 1}</span>
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                          style={{ backgroundColor: team.primary_color || '#16a34a' }}
                        >
                          {team.short_name}
                        </div>
                        <span>{team.name}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">{team.village}</td>
                      <td className="py-3 px-4 text-center text-slate-300 font-semibold">{team.played}</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">{team.won}</td>
                      <td className="py-3 px-4 text-center text-red-400 font-semibold">{team.lost}</td>
                      <td className="py-3 px-4 text-center text-slate-400">{team.tied}</td>
                      <td className="py-3 px-6 text-right font-black text-amber-400 text-base">{team.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Tournament Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Create Village Tournament
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Tournament Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ugadi Premier League 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Village Ground / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Rampur Gram Panchayat Stadium"
                  value={formData.village_location}
                  onChange={(e) => setFormData({ ...formData, village_location: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm shadow-md"
                >
                  Create Tournament
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
