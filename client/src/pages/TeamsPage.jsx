import React, { useState, useEffect } from 'react';
import {
  Shield, Users, PlusCircle, Trash2, Check, UserPlus,
  MapPin, Trophy, Sparkles, ChevronRight, X, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Create Team Modal
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: '',
    short_name: '',
    village: '',
    primary_color: '#16a34a',
    logo_url: '🏏',
    tournament_id: ''
  });

  // Dynamic player rows for team creation
  const [playerRows, setPlayerRows] = useState([
    { name: '', jersey_number: '7', role: 'All-Rounder', batting_style: 'Right-hand bat', bowling_style: 'Right-arm medium' },
    { name: '', jersey_number: '18', role: 'Batsman', batting_style: 'Right-hand bat', bowling_style: 'None' },
    { name: '', jersey_number: '45', role: 'Batsman', batting_style: 'Left-hand bat', bowling_style: 'None' },
    { name: '', jersey_number: '99', role: 'Wicket Keeper', batting_style: 'Right-hand bat', bowling_style: 'None' },
    { name: '', jersey_number: '23', role: 'Bowler', batting_style: 'Right-hand bat', bowling_style: 'Right-arm fast' }
  ]);

  // Add Single Player to existing team modal
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [singlePlayerForm, setSinglePlayerForm] = useState({
    name: '',
    jersey_number: '',
    role: 'All-Rounder',
    batting_style: 'Right-hand bat',
    bowling_style: 'Right-arm medium',
    village: ''
  });

  const colorPresets = [
    { label: 'Emerald Green', hex: '#16a34a' },
    { label: 'Royal Blue', hex: '#2563eb' },
    { label: 'Scarlet Red', hex: '#dc2626' },
    { label: 'Sunset Amber', hex: '#d97706' },
    { label: 'Deep Purple', hex: '#7c3aed' },
    { label: 'Cyan Teal', hex: '#0891b2' },
    { label: 'Crimson Rose', hex: '#e11d48' },
    { label: 'Midnight Slate', hex: '#475569' }
  ];

  const logoPresets = ['🏏', '👑', '⚡', '🛡️', '🦅', '🦁', '🐯', '🔥', '🏆', '🏹', '⚔️', '⭐'];

  // Fetch all teams
  const fetchTeams = async () => {
    try {
      setLoading(true);
      const [tmRes, trRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/tournaments')
      ]);
      const tmData = await tmRes.json();
      const trData = await trRes.json();
      setTeams(tmData.teams || []);
      setTournaments(trData.tournaments || []);

      if (tmData.teams?.length > 0) {
        loadTeamDetails(tmData.teams[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  // Fetch single team squad
  const loadTeamDetails = async (id) => {
    setSelectedTeam(id);
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/teams/${id}`);
      const data = await res.json();
      setTeamDetails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Add player row in team creation
  const handleAddPlayerRow = () => {
    setPlayerRows([
      ...playerRows,
      {
        name: '',
        jersey_number: (playerRows.length + 1).toString(),
        role: 'All-Rounder',
        batting_style: 'Right-hand bat',
        bowling_style: 'Right-arm medium'
      }
    ]);
  };

  const handleRemovePlayerRow = (index) => {
    if (playerRows.length <= 1) return;
    setPlayerRows(playerRows.filter((_, i) => i !== index));
  };

  const handlePlayerRowChange = (index, field, value) => {
    const updated = [...playerRows];
    updated[index][field] = value;
    setPlayerRows(updated);
  };

  // Submit new team with members
  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Filter valid player rows
    const validPlayers = playerRows.filter(p => p.name && p.name.trim() !== '');

    const payload = {
      ...teamForm,
      players: validPlayers
    };

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create team');

      setSuccessMsg(data.message || 'Team created successfully!');
      setShowCreateTeamModal(false);

      // Reset form
      setTeamForm({
        name: '',
        short_name: '',
        village: '',
        primary_color: '#16a34a',
        logo_url: '🏏',
        tournament_id: ''
      });

      // Reload teams and select newly created team
      await fetchTeams();
      if (data.team?.id) {
        loadTeamDetails(data.team.id);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Add single player to current squad
  const handleAddSinglePlayerSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/teams/${selectedTeam}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(singlePlayerForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add player');

      setSuccessMsg(data.message);
      setShowAddPlayerModal(false);
      setSinglePlayerForm({
        name: '',
        jersey_number: '',
        role: 'All-Rounder',
        batting_style: 'Right-hand bat',
        bowling_style: 'Right-arm medium',
        village: ''
      });
      loadTeamDetails(selectedTeam);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Delete player from team
  const handleDeletePlayer = async (playerId, playerName) => {
    if (!window.confirm(`Are you sure you want to remove "${playerName}" from the squad?`)) return;

    try {
      const res = await fetch(`/api/teams/${selectedTeam}/players/${playerId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove player');
      setSuccessMsg(data.message);
      loadTeamDetails(selectedTeam);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Delete an entire team
  const handleDeleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`⚠️ Are you sure you want to delete the team "${teamName}"?\n\nThis will permanently delete the team, its players, and any scheduled matches.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete team');

      setSuccessMsg(data.message);

      // Refresh list
      const refreshedRes = await fetch('/api/teams');
      const refreshedData = await refreshedRes.json();
      const remaining = refreshedData.teams || [];
      setTeams(remaining);

      if (remaining.length > 0) {
        loadTeamDetails(remaining[0].id);
      } else {
        setSelectedTeam(null);
        setTeamDetails(null);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-400" />
            <span>Village Teams & Squads</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create your own team, customize jersey colors, and add your local village players & friends!
          </p>
        </div>

        <button
          onClick={() => setShowCreateTeamModal(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all self-start sm:self-auto active:scale-95"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Create My Own Team</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="bg-red-950/60 border border-red-500/40 text-red-200 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Teams Grid Selector */}
      <div className="space-y-3">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">
          Registered Teams ({teams.length})
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {teams.map((tm) => (
            <div
              key={tm.id}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                selectedTeam === tm.id
                  ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
              onClick={() => loadTeamDetails(tm.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md"
                  style={{ backgroundColor: tm.primary_color || '#16a34a' }}
                >
                  {tm.logo_url && tm.logo_url !== '🏏' ? tm.logo_url : tm.short_name}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                    {tm.player_count}p
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTeam(tm.id, tm.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 rounded-md transition-all hover:bg-slate-800"
                    title={`Delete ${tm.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="font-extrabold text-sm text-white truncate group-hover:text-emerald-400 transition-colors">
                {tm.name}
              </div>
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-500" />
                {tm.village}
              </div>
            </div>
          ))}

          {/* Quick Add Team Tile */}
          <button
            type="button"
            onClick={() => setShowCreateTeamModal(true)}
            className="p-3.5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-900/30 hover:bg-slate-900/70 text-slate-400 hover:text-emerald-400 flex flex-col items-center justify-center text-center gap-1.5 transition-all group min-h-[100px]"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-800 group-hover:bg-emerald-600/20 flex items-center justify-center text-slate-300 group-hover:text-emerald-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div className="font-bold text-xs">+ Add Team</div>
          </button>
        </div>
      </div>

      {/* Selected Team Squad View */}
      {teamDetails && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-6 p-6">
          {/* Team Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-xl"
                style={{ backgroundColor: teamDetails.team.primary_color || '#16a34a' }}
              >
                {teamDetails.team.logo_url || teamDetails.team.short_name}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-white">{teamDetails.team.name}</h2>
                  <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700">
                    {teamDetails.team.short_name}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    Village: <strong className="text-slate-200">{teamDetails.team.village}</strong>
                  </span>
                  <span>•</span>
                  <span>{teamDetails.players?.length || 0} Squad Members</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => {
                  setSinglePlayerForm(prev => ({ ...prev, village: teamDetails.team.village }));
                  setShowAddPlayerModal(true);
                }}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add Player to Squad</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteTeam(teamDetails.team.id, teamDetails.team.name)}
                className="inline-flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-3.5 py-2 rounded-xl text-xs font-bold border border-red-500/30 transition-all active:scale-95"
                title="Delete this team"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Team</span>
              </button>

              <Link
                to="/scorer"
                className="inline-flex items-center gap-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl font-bold border border-slate-700 transition-colors"
              >
                <span>Scorer Keypad</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
              </Link>
            </div>
          </div>

          {/* Squad Members Roster */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Official Squad Roster</span>
              </h3>
              <span className="text-xs text-slate-500">
                Playing XI & Bench Members
              </span>
            </div>

            {teamDetails.players?.length === 0 ? (
              <div className="text-center py-12 bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-300 font-bold text-sm">No players added to this squad yet.</p>
                <p className="text-xs text-slate-500 mt-1">Click "+ Add Player to Squad" above to add your team members!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {teamDetails.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex items-start justify-between gap-3 group transition-all"
                  >
                    <div className="flex items-start gap-3 overflow-hidden">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-white text-sm shrink-0 shadow-sm"
                        style={{ backgroundColor: teamDetails.team.primary_color || '#16a34a' }}
                      >
                        #{p.jersey_number || idx + 1}
                      </div>

                      <div className="overflow-hidden">
                        <div className="font-extrabold text-sm text-white group-hover:text-emerald-400 truncate transition-colors">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-emerald-400 font-semibold">{p.role}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {p.batting_style} • {p.bowling_style}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeletePlayer(p.id, p.name)}
                      className="text-slate-600 hover:text-red-400 p-1 rounded-lg transition-colors shrink-0"
                      title="Remove player from squad"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE TEAM WITH INITIAL MEMBERS */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-xl">
                  🛡️
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Create Your Own Village Team</h3>
                  <p className="text-xs text-slate-400">Set up your team details and add squad members</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateTeamModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="space-y-6">
              {/* Part 1: Team Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>1.</span> Team Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rampur Warriors"
                      value={teamForm.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const words = name.trim().split(' ');
                        const autoShort = words.length > 1
                          ? (words[0][0] + words[1][0]).toUpperCase()
                          : name.slice(0, 3).toUpperCase();
                        setTeamForm({ ...teamForm, name, short_name: teamForm.short_name || autoShort });
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                      Short Code (2-4 letters) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RW"
                      maxLength={5}
                      value={teamForm.short_name}
                      onChange={(e) => setTeamForm({ ...teamForm, short_name: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono font-bold uppercase"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                      Village / Locality *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rampur Village"
                      value={teamForm.village}
                      onChange={(e) => setTeamForm({ ...teamForm, village: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                      Add to Tournament
                    </label>
                    <select
                      value={teamForm.tournament_id}
                      onChange={(e) => setTeamForm({ ...teamForm, tournament_id: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Select Tournament (Optional) --</option>
                      {tournaments.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.village_location})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Color & Emblem Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                      Jersey / Team Color
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {colorPresets.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setTeamForm({ ...teamForm, primary_color: c.hex })}
                          className={`w-7 h-7 rounded-xl transition-all ${
                            teamForm.primary_color === c.hex ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                      Team Emblem / Logo
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {logoPresets.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setTeamForm({ ...teamForm, logo_url: emoji })}
                          className={`w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-sm transition-all ${
                            teamForm.logo_url === emoji ? 'border-2 border-emerald-400 bg-emerald-950/50 scale-110' : 'hover:bg-slate-700'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Part 2: Team Members Builder */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>2.</span> Add Squad Members (Players)
                    </h4>
                    <p className="text-[11px] text-slate-400">Enter your village friends and team players</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPlayerRow}
                    className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Add Player Row</span>
                  </button>
                </div>

                {/* Player input rows */}
                <div className="space-y-2">
                  {playerRows.map((player, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs"
                    >
                      <span className="w-6 text-slate-500 font-mono font-bold text-center hidden sm:block">
                        #{idx + 1}
                      </span>

                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder={`Player Name (e.g. ${idx === 0 ? 'Captain Name' : 'Ravi Kumar'})`}
                          value={player.name}
                          onChange={(e) => handlePlayerRowChange(idx, 'name', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 text-xs font-bold"
                        />
                      </div>

                      <div className="w-20">
                        <input
                          type="number"
                          placeholder="Jrsy #"
                          value={player.jersey_number}
                          onChange={(e) => handlePlayerRowChange(idx, 'jersey_number', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-center focus:outline-none focus:border-emerald-500 text-xs"
                        />
                      </div>

                      <div className="w-32">
                        <select
                          value={player.role}
                          onChange={(e) => handlePlayerRowChange(idx, 'role', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-emerald-500 text-xs"
                        >
                          <option value="All-Rounder">All-Rounder</option>
                          <option value="Batsman">Batsman</option>
                          <option value="Bowler">Bowler</option>
                          <option value="Wicket Keeper">Wicket Keeper</option>
                        </select>
                      </div>

                      <div className="w-32">
                        <select
                          value={player.batting_style}
                          onChange={(e) => handlePlayerRowChange(idx, 'batting_style', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-emerald-500 text-xs"
                        >
                          <option value="Right-hand bat">Right-hand bat</option>
                          <option value="Left-hand bat">Left-hand bat</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemovePlayerRow(idx)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition-colors self-end sm:self-auto"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Create Team & Save Squad</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD SINGLE PLAYER TO EXISTING TEAM */}
      {showAddPlayerModal && teamDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Add Player to {teamDetails.team.name}
              </h3>
              <button
                onClick={() => setShowAddPlayerModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSinglePlayerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Player Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sai Teja"
                  value={singlePlayerForm.name}
                  onChange={(e) => setSinglePlayerForm({ ...singlePlayerForm, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Jersey #</label>
                  <input
                    type="number"
                    placeholder="7"
                    value={singlePlayerForm.jersey_number}
                    onChange={(e) => setSinglePlayerForm({ ...singlePlayerForm, jersey_number: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Role</label>
                  <select
                    value={singlePlayerForm.role}
                    onChange={(e) => setSinglePlayerForm({ ...singlePlayerForm, role: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="Wicket Keeper">Wicket Keeper</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Batting Style</label>
                  <select
                    value={singlePlayerForm.batting_style}
                    onChange={(e) => setSinglePlayerForm({ ...singlePlayerForm, batting_style: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="Right-hand bat">Right-hand bat</option>
                    <option value="Left-hand bat">Left-hand bat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Bowling Style</label>
                  <select
                    value={singlePlayerForm.bowling_style}
                    onChange={(e) => setSinglePlayerForm({ ...singlePlayerForm, bowling_style: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="Right-arm fast">Right-arm fast</option>
                    <option value="Right-arm medium">Right-arm medium</option>
                    <option value="Right-arm off break">Off break</option>
                    <option value="Right-arm leg spin">Leg spin</option>
                    <option value="Left-arm fast">Left-arm fast</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Village / Origin</label>
                <input
                  type="text"
                  placeholder="e.g. Rampur"
                  value={singlePlayerForm.village}
                  onChange={(e) => setSinglePlayerForm({ ...singlePlayerForm, village: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPlayerModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm shadow-md"
                >
                  Add Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
