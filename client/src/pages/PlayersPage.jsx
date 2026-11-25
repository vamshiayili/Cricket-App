import React, { useState, useEffect } from 'react';
import {
  Users, Flame, Award, Search, PlusCircle, Shield, ChevronRight,
  Activity, X, Zap, Trophy, Target, Star
} from 'lucide-react';

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [leaderboard, setLeaderboard] = useState({
    topRuns: [],
    topWickets: [],
    topStrikeRates: [],
    manOfTheMatches: [],
    leadingRunScorer: null,
    leadingWicketTaker: null
  });
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerModalData, setPlayerModalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardTab, setLeaderboardTab] = useState('ALL_STARS'); // 'ALL_STARS', 'RUNS', 'WICKETS', 'MOM', 'STRIKE_RATE'

  // Add player modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [teams, setTeams] = useState([]);
  const [addForm, setAddForm] = useState({
    name: '',
    team_id: '',
    jersey_number: '',
    role: 'All-Rounder',
    batting_style: 'Right-hand bat',
    bowling_style: 'Right-arm medium',
    village: ''
  });

  const fetchPlayersData = async () => {
    try {
      setLoading(true);
      const [pRes, lRes] = await Promise.all([
        fetch(`/api/players?search=${encodeURIComponent(search)}`),
        fetch('/api/players/leaderboard')
      ]);
      const pData = await pRes.json();
      const lData = await lRes.json();
      setPlayers(pData.players || []);
      setLeaderboard(lData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlayersData();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Load player profile
  const handleOpenPlayerProfile = async (id) => {
    setSelectedPlayer(id);
    try {
      const res = await fetch(`/api/players/${id}`);
      const data = await res.json();
      setPlayerModalData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAddModal = async () => {
    setShowAddModal(true);
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      setTeams(data.teams || []);
      if (data.teams?.length > 0) {
        setAddForm(prev => ({ ...prev, team_id: data.teams[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPlayerSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add player');
      setShowAddModal(false);
      fetchPlayersData();
    } catch (err) {
      alert(err.message);
    }
  };

  const leadingWicket = leaderboard.leadingWicketTaker || leaderboard.topWickets?.[0];
  const leadingRun = leaderboard.leadingRunScorer || leaderboard.topRuns?.[0];
  const latestMOM = leaderboard.manOfTheMatches?.[0];
  const topStriker = leaderboard.topStrikeRates?.[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400" />
            <span>Players, Wickets & Match MVPs</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Most Wickets Leader, Man of the Match Stars, Strike Rates, and Orange/Purple Cap Standings
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-md transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register Player</span>
        </button>
      </div>

      {/* TOP SPOTLIGHT TRIO: 1. Most Wickets Person, 2. Man of the Match Person, 3. Highest Strike Rate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Spotlight 1: MOST WICKETS PERSON (Purple Cap King) */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-purple-950/80 via-slate-900 to-indigo-950/60 border border-purple-500/40 p-6 shadow-2xl space-y-4 group">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-black uppercase tracking-wider">
              <span>⚡</span> Leading Wicket Taker
            </div>
            <Award className="w-5 h-5 text-purple-400" />
          </div>

          {leadingWicket ? (
            <div className="space-y-3">
              <div>
                <h3 className="text-2xl font-black text-white group-hover:text-purple-300 transition-colors">
                  {leadingWicket.name}
                </h3>
                <p className="text-xs text-slate-300 font-semibold mt-0.5">
                  {leadingWicket.team_name} ({leadingWicket.team_short}) • {leadingWicket.village}
                </p>
                <p className="text-[11px] text-slate-400">{leadingWicket.bowling_style || 'Right-arm medium'}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-purple-500/20">
                <div className="bg-purple-950/60 p-2 rounded-xl border border-purple-500/30">
                  <span className="text-[10px] text-purple-300 uppercase font-black block">Wickets</span>
                  <span className="text-2xl font-black text-purple-400">{leadingWicket.wickets}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Economy</span>
                  <span className="text-base font-extrabold text-emerald-400">{leadingWicket.economy}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Strike Rate</span>
                  <span className="text-base font-extrabold text-amber-400">{leadingWicket.bowling_strike_rate} <span className="text-[10px] text-slate-400">b/w</span></span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Overs: <strong className="text-slate-200">{leadingWicket.overs}</strong> ({leadingWicket.maidens || 0} Maidens)</span>
                <span>Runs: <strong className="text-slate-200">{leadingWicket.runs_conceded}</strong></span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-6 text-center">No bowling figures recorded yet</p>
          )}
        </div>

        {/* Spotlight 2: MAN OF THE MATCH HERO (Total Runs & Strike Rate) */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-950/80 via-slate-900 to-yellow-950/60 border border-amber-500/40 p-6 shadow-2xl space-y-4 group">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-black uppercase tracking-wider">
              <span>🏆</span> Man of the Match Hero
            </div>
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>

          {latestMOM ? (
            <div className="space-y-3">
              <div>
                <h3 className="text-2xl font-black text-white group-hover:text-amber-300 transition-colors">
                  {latestMOM.player_name}
                </h3>
                <p className="text-xs text-slate-300 font-semibold mt-0.5">
                  {latestMOM.player_team_name} ({latestMOM.player_team_short}) • {latestMOM.village}
                </p>
                <div className="text-[11px] text-amber-400/90 font-medium mt-1 truncate">
                  vs {latestMOM.team_a_short === latestMOM.player_team_short ? latestMOM.team_b_short : latestMOM.team_a_short} ({latestMOM.result_statement})
                </div>
              </div>

              {/* Total runs and Strike Rate of MOM */}
              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-amber-500/20">
                <div className="bg-amber-950/60 p-2 rounded-xl border border-amber-500/30">
                  <span className="text-[10px] text-amber-300 uppercase font-black block">Total Runs</span>
                  <span className="text-2xl font-black text-white">{latestMOM.total_runs}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">({latestMOM.balls_faced}b)</span>
                </div>
                <div className="bg-amber-950/40 p-2 rounded-xl border border-amber-500/20">
                  <span className="text-[10px] text-amber-300 uppercase font-black block">Strike Rate</span>
                  <span className="text-lg font-black text-amber-400">{latestMOM.strike_rate}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">SR</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Bowling</span>
                  <span className="text-sm font-black text-purple-400 block mt-1">
                    {latestMOM.bowling_figures ? `${latestMOM.wickets_taken} Wkts` : 'DNB'}
                  </span>
                  <span className="text-[10px] text-slate-400">{latestMOM.economy ? `${latestMOM.economy} Econ` : ''}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Boundaries: <strong className="text-white">{latestMOM.match_fours || 0}×4s, {latestMOM.match_sixes || 0}×6s</strong></span>
                <span className="text-emerald-400 font-bold">Match Winning Star</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-6 text-center">No completed matches with MOTM yet</p>
          )}
        </div>

        {/* Spotlight 3: HIGHEST STRIKE RATE (Power Hitter) */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-950/80 via-slate-900 to-teal-950/60 border border-emerald-500/40 p-6 shadow-2xl space-y-4 group">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider">
              <span>🚀</span> Super Striker
            </div>
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>

          {topStriker ? (
            <div className="space-y-3">
              <div>
                <h3 className="text-2xl font-black text-white group-hover:text-emerald-300 transition-colors">
                  {topStriker.name}
                </h3>
                <p className="text-xs text-slate-300 font-semibold mt-0.5">
                  {topStriker.team_name} ({topStriker.team_short}) • {topStriker.village}
                </p>
                <p className="text-[11px] text-slate-400">Tournament Highest Strike Rate</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-emerald-500/20">
                <div className="bg-emerald-950/60 p-2 rounded-xl border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-300 uppercase font-black block">Strike Rate</span>
                  <span className="text-2xl font-black text-emerald-400">{topStriker.strike_rate}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Runs</span>
                  <span className="text-base font-extrabold text-white">{topStriker.runs}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Balls</span>
                  <span className="text-base font-extrabold text-slate-300">{topStriker.balls}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Sixes: <strong className="text-purple-400">{topStriker.sixes}</strong></span>
                <span>Fours: <strong className="text-emerald-400">{topStriker.fours}</strong></span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-6 text-center">No qualifying strikers yet</p>
          )}
        </div>
      </div>

      {/* TABS FOR LEADERBOARDS & STATS */}
      <div className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'ALL_STARS', label: '⭐ All-Stars Grid' },
              { id: 'WICKETS', label: '⚡ Most Wickets (Purple Cap)' },
              { id: 'RUNS', label: '🧢 Most Runs & Strike Rate (Orange Cap)' },
              { id: 'MOM', label: '🏆 Man of the Match Awards' },
              { id: 'STRIKE_RATE', label: '🚀 Super Strikers' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setLeaderboardTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  leaderboardTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search player or village..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* TAB 1: ALL-STARS GRID */}
        {leaderboardTab === 'ALL_STARS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {players.map((p) => (
              <div
                key={p.id}
                onClick={() => handleOpenPlayerProfile(p.id)}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 cursor-pointer hover:shadow-xl transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                    style={{ backgroundColor: p.team_color || '#16a34a' }}
                  >
                    #{p.jersey_number || p.id}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-extrabold text-white group-hover:text-emerald-400 truncate text-sm transition-colors">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{p.team_name} • {p.village}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Runs</span>
                    <span className="font-bold text-emerald-400">{p.total_runs}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Strike Rate</span>
                    <span className="font-bold text-amber-400">{p.strike_rate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Wkts</span>
                    <span className="font-bold text-purple-400">{p.total_wickets}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: MOST WICKETS (PURPLE CAP TABLE) */}
        {leaderboardTab === 'WICKETS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="bg-purple-950/40 px-6 py-3 border-b border-purple-500/20 flex items-center justify-between">
              <span className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <span>⚡</span> Purple Cap: Leading Tournament Wicket Takers
              </span>
              <span className="text-xs text-slate-400">Ranked by Wickets & Economy</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-6">Rank & Bowler</th>
                    <th className="py-3 px-4">Village Team</th>
                    <th className="py-3 px-4 text-center">Overs</th>
                    <th className="py-3 px-4 text-center">Maidens</th>
                    <th className="py-3 px-4 text-center">Runs</th>
                    <th className="py-3 px-4 text-center text-purple-400 font-black">Wickets</th>
                    <th className="py-3 px-4 text-center">Econ</th>
                    <th className="py-3 px-6 text-right font-black text-amber-400">Bowling SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {leaderboard.topWickets?.map((bw, idx) => (
                    <tr
                      key={bw.id}
                      onClick={() => handleOpenPlayerProfile(bw.id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-6 font-bold text-white flex items-center gap-3">
                        <span className={`w-5 text-xs font-mono font-bold ${idx === 0 ? 'text-purple-400 font-black' : 'text-slate-500'}`}>
                          {idx === 0 ? '⚡ 1' : idx + 1}
                        </span>
                        <div>
                          <span className="font-extrabold text-white hover:text-purple-400 transition-colors">{bw.name}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">{bw.bowling_style}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">{bw.team_name} ({bw.village})</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">{bw.overs}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">{bw.maidens || 0}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">{bw.runs_conceded}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-purple-400 text-base">{bw.wickets}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-emerald-400 font-semibold">{bw.economy}</td>
                      <td className="py-3.5 px-6 text-right font-mono font-black text-amber-400">{bw.bowling_strike_rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MOST RUNS & STRIKE RATE (ORANGE CAP TABLE) */}
        {leaderboardTab === 'RUNS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="bg-amber-950/40 px-6 py-3 border-b border-amber-500/20 flex items-center justify-between">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <span>🧢</span> Orange Cap: Top Run Scorers with Strike Rates
              </span>
              <span className="text-xs text-slate-400">Ranked by Total Runs & Boundaries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-6">Rank & Batsman</th>
                    <th className="py-3 px-4">Village Team</th>
                    <th className="py-3 px-4 text-center">Innings</th>
                    <th className="py-3 px-4 text-center text-amber-400 font-black">Runs</th>
                    <th className="py-3 px-4 text-center">Balls</th>
                    <th className="py-3 px-4 text-center">4s</th>
                    <th className="py-3 px-4 text-center">6s</th>
                    <th className="py-3 px-6 text-right font-black text-emerald-400">Strike Rate (SR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {leaderboard.topRuns?.map((bt, idx) => (
                    <tr
                      key={bt.id}
                      onClick={() => handleOpenPlayerProfile(bt.id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-6 font-bold text-white flex items-center gap-3">
                        <span className={`w-5 text-xs font-mono font-bold ${idx === 0 ? 'text-amber-400 font-black' : 'text-slate-500'}`}>
                          {idx === 0 ? '🧢 1' : idx + 1}
                        </span>
                        <span>{bt.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">{bt.team_name} ({bt.village})</td>
                      <td className="py-3.5 px-4 text-center text-slate-400">{bt.innings}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-amber-400 text-base">{bt.runs}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">{bt.balls}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">{bt.fours}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-purple-400 font-bold">{bt.sixes}</td>
                      <td className="py-3.5 px-6 text-right font-mono font-black text-emerald-400 text-base">{bt.strike_rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: MAN OF THE MATCH AWARDS (TOTAL RUNS & STRIKE RATE) */}
        {leaderboardTab === 'MOM' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span>Man of the Match Honor Roll (Total Runs & Strike Rate)</span>
              </h3>
              <span className="text-xs text-slate-400">Match-by-Match Award Winners</span>
            </div>

            {leaderboard.manOfTheMatches?.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl text-slate-400">
                No completed matches yet. Complete matches in the Scorer Keypad to generate Man of the Match awards!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {leaderboard.manOfTheMatches.map((mom) => (
                  <div
                    key={mom.match_id}
                    className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 rounded-3xl p-5 space-y-4 shadow-xl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                        <span>🏆 Man of the Match</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 font-normal">{mom.match_date}</span>
                      </div>
                      <span className="text-xs text-slate-400">{mom.venue}</span>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-xl font-black text-white">{mom.player_name}</h4>
                        <p className="text-xs text-slate-300 font-semibold">
                          {mom.player_team_name} ({mom.player_team_short}) • {mom.village}
                        </p>
                        <p className="text-xs text-emerald-400 font-medium mt-1">
                          {mom.result_statement}
                        </p>
                      </div>

                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-md shrink-0"
                        style={{ backgroundColor: mom.player_team_color || '#d97706' }}
                      >
                        {mom.player_team_short}
                      </div>
                    </div>

                    {/* Performance breakdown: Total Runs, Balls, Strike Rate, Bowling */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Runs</span>
                        <span className="text-lg font-black text-white">{mom.total_runs}</span>
                        <span className="text-[10px] text-slate-400 block">({mom.balls_faced} balls)</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-400 uppercase font-black block">Strike Rate</span>
                        <span className="text-lg font-black text-amber-400">{mom.strike_rate}</span>
                        <span className="text-[10px] text-slate-400 block">{mom.match_fours}×4, {mom.match_sixes}×6</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-purple-400 uppercase font-bold block">Bowling</span>
                        <span className="text-sm font-black text-purple-300 block mt-1">
                          {mom.bowling_figures || '0 Wkts'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{mom.economy ? `${mom.economy} Econ` : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SUPER STRIKERS (HIGHEST STRIKE RATE) */}
        {leaderboardTab === 'STRIKE_RATE' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="bg-emerald-950/40 px-6 py-3 border-b border-emerald-500/20 flex items-center justify-between">
              <span className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                <span>🚀</span> Super Strikers: Highest Batting Strike Rate
              </span>
              <span className="text-xs text-slate-400">Min 5 Runs Scored</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-6">Rank & Power Hitter</th>
                    <th className="py-3 px-4">Village Team</th>
                    <th className="py-3 px-4 text-center">Runs</th>
                    <th className="py-3 px-4 text-center">Balls Faced</th>
                    <th className="py-3 px-4 text-center">Sixes</th>
                    <th className="py-3 px-6 text-right font-black text-emerald-400 text-sm">Batting Strike Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {leaderboard.topStrikeRates?.map((st, idx) => (
                    <tr
                      key={st.id}
                      onClick={() => handleOpenPlayerProfile(st.id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-6 font-bold text-white flex items-center gap-3">
                        <span className={`w-5 text-xs font-mono font-bold ${idx === 0 ? 'text-emerald-400 font-black' : 'text-slate-500'}`}>
                          {idx === 0 ? '🚀 1' : idx + 1}
                        </span>
                        <span>{st.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">{st.team_name} ({st.village})</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white">{st.runs}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">{st.balls}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-purple-400 font-black">{st.sixes}</td>
                      <td className="py-3.5 px-6 text-right font-mono font-black text-emerald-400 text-base">{st.strike_rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Player Career Profile Modal */}
      {selectedPlayer && playerModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => { setSelectedPlayer(null); setPlayerModalData(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg"
                style={{ backgroundColor: playerModalData.player.team_color || '#16a34a' }}
              >
                #{playerModalData.player.jersey_number || playerModalData.player.id}
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{playerModalData.player.name}</h3>
                <div className="text-xs text-slate-400">
                  {playerModalData.player.team_name} ({playerModalData.player.team_short}) • {playerModalData.player.village}
                </div>
                <div className="inline-block mt-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  {playerModalData.player.role}
                </div>
              </div>
            </div>

            {/* Batting Career Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Batting Performance
              </h4>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Innings</span>
                  <span className="text-base font-black text-white">{playerModalData.batting.innings}</span>
                </div>
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Runs</span>
                  <span className="text-base font-black text-emerald-400">{playerModalData.batting.runs}</span>
                </div>
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">HS</span>
                  <span className="text-base font-black text-white">{playerModalData.batting.high_score}</span>
                </div>
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-amber-400 uppercase font-black block">Strike Rate</span>
                  <span className="text-base font-black text-amber-400">{playerModalData.batting.strike_rate}</span>
                </div>
              </div>
            </div>

            {/* Bowling Career Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Bowling Performance
              </h4>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Overs</span>
                  <span className="text-base font-black text-white">{playerModalData.bowling.overs}</span>
                </div>
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-purple-400 uppercase font-black block">Wickets</span>
                  <span className="text-base font-black text-purple-400">{playerModalData.bowling.wickets}</span>
                </div>
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Runs Conc</span>
                  <span className="text-base font-black text-white">{playerModalData.bowling.runs_conceded}</span>
                </div>
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Economy</span>
                  <span className="text-base font-black text-emerald-400">{playerModalData.bowling.economy}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Player Modal (for Scorers) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              Register New Player
            </h3>

            <form onSubmit={handleAddPlayerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Shiva Kumar"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Village Team</label>
                  <select
                    value={addForm.team_id}
                    onChange={(e) => setAddForm({ ...addForm, team_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    required
                  >
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Role</label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicket Keeper">Wicket Keeper</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Batting Style</label>
                  <select
                    value={addForm.batting_style}
                    onChange={(e) => setAddForm({ ...addForm, batting_style: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="Right-hand bat">Right-hand bat</option>
                    <option value="Left-hand bat">Left-hand bat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Jersey #</label>
                  <input
                    type="number"
                    placeholder="7"
                    value={addForm.jersey_number}
                    onChange={(e) => setAddForm({ ...addForm, jersey_number: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Village Origin</label>
                <input
                  type="text"
                  placeholder="e.g. Rampur"
                  value={addForm.village}
                  onChange={(e) => setAddForm({ ...addForm, village: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
