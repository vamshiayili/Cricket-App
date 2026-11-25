import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import {
  Radio, MapPin, Calendar, Clock, Award, Shield, Edit3,
  RefreshCw, MessageSquare, ListOrdered, Info, ArrowLeft,
  Flame, Activity, Target
} from 'lucide-react';

export default function MatchDetailsPage() {
  const { id } = useParams();
  const { socket, isConnected } = useSocket();

  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('LIVE'); // 'LIVE', 'SCORECARD', 'INFO'

  const fetchMatchDetails = async () => {
    try {
      const res = await fetch(`/api/matches/${id}`);
      if (!res.ok) throw new Error('Match not found');
      const data = await res.json();
      setMatchData(data);
    } catch (err) {
      console.error('Error fetching match details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchDetails();
  }, [id]);

  // Socket.IO real-time subscription
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('join_match', id);

    socket.on('score_update', (updatedData) => {
      if (updatedData.match?.id === parseInt(id)) {
        setMatchData(updatedData);
      }
    });

    return () => {
      socket.emit('leave_match', id);
      socket.off('score_update');
    };
  }, [socket, id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <RefreshCw className="w-10 h-10 animate-spin mx-auto text-emerald-400 mb-4" />
        <p className="text-slate-300 font-bold">Connecting to ground live stream...</p>
      </div>
    );
  }

  if (!matchData || !matchData.match) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-xl font-bold text-red-400 mb-2">Match not found</p>
        <Link to="/" className="text-emerald-400 font-semibold hover:underline">
          Return to All Matches
        </Link>
      </div>
    );
  }

  const { match, activeInnings, innings = [], currentStriker, currentNonStriker, currentBowler, recentBalls = [], recentOverBalls = [], requiredRunRate, runsNeeded, ballsRemaining } = matchData;
  const isLive = match.status === 'LIVE';

  // Helper for badge color styling
  const getBadgeStyle = (badge) => {
    if (!badge) return 'bg-slate-700 text-slate-300';
    if (badge === '4') return 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400';
    if (badge === '6') return 'bg-purple-600 text-white font-black shadow-md shadow-purple-600/30 ring-1 ring-purple-400';
    if (badge.includes('W') && !badge.includes('Wd')) return 'bg-red-600 text-white font-black shadow-md shadow-red-600/40 ring-1 ring-red-400 animate-bounce';
    if (badge.includes('Wd') || badge.includes('Nb')) return 'bg-amber-600 text-white font-bold ring-1 ring-amber-400';
    if (badge === '0') return 'bg-slate-800 text-slate-400 border border-slate-700';
    return 'bg-blue-900/60 text-blue-200 border border-blue-700/50';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Matches</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to={`/scorer?match=${match.id}`}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-md transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Open Scorer Console</span>
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className="font-medium">{isConnected ? 'Live WebSocket' : 'Connecting'}</span>
          </div>
        </div>
      </div>

      {/* Main Stadium Scoreboard Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 border border-slate-700/80 shadow-2xl">
        {/* Header Bar */}
        <div className="bg-slate-800/70 border-b border-slate-700/60 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-400 tracking-wide">
              {match.tournament_name}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-300 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-500" />
              {match.venue}
            </span>
          </div>

          <div>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 text-red-400 px-3 py-0.5 rounded-full text-xs font-black tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-red-500 live-pulse"></span>
                LIVE
              </span>
            ) : match.status === 'COMPLETED' ? (
              <span className="bg-slate-700 text-slate-200 px-3 py-0.5 rounded-full text-xs font-bold">
                COMPLETED
              </span>
            ) : (
              <span className="bg-blue-500/20 text-blue-300 px-3 py-0.5 rounded-full text-xs font-bold">
                SCHEDULED
              </span>
            )}
          </div>
        </div>

        {/* Live Big Score Showcase */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Team 1 Score Card */}
            <div className={`p-4 rounded-2xl border transition-all ${
              activeInnings?.batting_team_id === match.team_a_id
                ? 'bg-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-950/50'
                : 'bg-slate-800/40 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-white text-lg shadow-md"
                    style={{ backgroundColor: match.team_a_color || '#16a34a' }}
                  >
                    {match.team_a_short}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-white">{match.team_a_name}</h3>
                    <div className="text-xs text-slate-400">
                      {activeInnings?.batting_team_id === match.team_a_id ? 'Batting Now' : 'Fielding'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {innings.find(i => i.batting_team_id === match.team_a_id) ? (
                    <div>
                      <div className="text-3xl font-black text-white">
                        {innings.find(i => i.batting_team_id === match.team_a_id).total_runs}
                        <span className="text-emerald-400">/</span>
                        {innings.find(i => i.batting_team_id === match.team_a_id).wickets}
                      </div>
                      <div className="text-xs text-slate-400 font-semibold">
                        ({innings.find(i => i.batting_team_id === match.team_a_id).overs} / {match.overs} ov)
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-500 uppercase">Yet to bat</span>
                  )}
                </div>
              </div>
            </div>

            {/* Team 2 Score Card */}
            <div className={`p-4 rounded-2xl border transition-all ${
              activeInnings?.batting_team_id === match.team_b_id
                ? 'bg-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-950/50'
                : 'bg-slate-800/40 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-white text-lg shadow-md"
                    style={{ backgroundColor: match.team_b_color || '#2563eb' }}
                  >
                    {match.team_b_short}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-white">{match.team_b_name}</h3>
                    <div className="text-xs text-slate-400">
                      {activeInnings?.batting_team_id === match.team_b_id ? 'Batting Now' : 'Fielding'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {innings.find(i => i.batting_team_id === match.team_b_id) ? (
                    <div>
                      <div className="text-3xl font-black text-white">
                        {innings.find(i => i.batting_team_id === match.team_b_id).total_runs}
                        <span className="text-emerald-400">/</span>
                        {innings.find(i => i.batting_team_id === match.team_b_id).wickets}
                      </div>
                      <div className="text-xs text-slate-400 font-semibold">
                        ({innings.find(i => i.batting_team_id === match.team_b_id).overs} / {match.overs} ov)
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-500 uppercase">Yet to bat</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Target & Equation Banner (Innings 2) */}
          {activeInnings && activeInnings.innings_number === 2 && runsNeeded !== null && (
            <div className="bg-gradient-to-r from-amber-950/70 via-slate-800 to-amber-950/70 border border-amber-500/30 rounded-2xl p-4 text-center">
              <div className="text-sm font-bold text-amber-200 flex items-center justify-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span>
                  Target: <strong className="text-white text-base">{activeInnings.target_runs}</strong> runs |
                  Need <strong className="text-white text-base">{runsNeeded}</strong> runs in <strong className="text-white text-base">{ballsRemaining}</strong> balls
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-1 font-semibold">
                Required Run Rate (RRR): <span className="text-amber-400">{requiredRunRate}</span> | Current Run Rate (CRR): <span className="text-emerald-400">{activeInnings.run_rate}</span>
              </div>
            </div>
          )}

          {/* Toss or Match Result Statement */}
          <div className="text-center pt-2 space-y-3">
            {match.result_statement ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm font-bold text-slate-200">
                <Award className="w-4 h-4 text-amber-400" />
                <span>{match.result_statement}</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400">Match in progress</span>
            )}

            {/* Man of the Match Award Highlight */}
            {match.player_of_match_name && (
              <div className="max-w-md mx-auto bg-gradient-to-r from-amber-950/70 via-slate-800 to-amber-950/70 border border-amber-500/40 rounded-2xl p-4 text-center shadow-lg space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                  <span>🏆</span> Man of the Match
                </div>
                <div className="text-lg font-black text-white">{match.player_of_match_name}</div>
                <div className="text-xs text-slate-300 font-semibold">
                  {match.player_of_match_team} ({match.player_of_match_village || 'Village Star'})
                </div>
                <div className="flex items-center justify-center gap-4 text-xs font-mono pt-1 text-slate-200">
                  {match.pom_runs !== null && match.pom_runs !== undefined && (
                    <span>
                      Runs: <strong className="text-amber-400 font-black">{match.pom_runs}</strong> ({match.pom_balls}b, SR: <strong className="text-emerald-400 font-black">{match.pom_strike_rate}</strong>)
                    </span>
                  )}
                  {match.pom_bowling_figures && (
                    <span>
                      Bowling: <strong className="text-purple-400 font-black">{match.pom_bowling_figures}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Current Over Tracker Ball Badges */}
          {isLive && activeInnings && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">This Over:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {recentOverBalls.length === 0 ? (
                      <span className="text-xs text-slate-500 italic">Starting over...</span>
                    ) : (
                      recentOverBalls.map((b, idx) => (
                        <span
                          key={idx}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${getBadgeStyle(b.badge_text)}`}
                        >
                          {b.badge_text}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-slate-300">
                  <div>CRR: <span className="text-emerald-400 font-extrabold">{activeInnings.run_rate}</span></div>
                  <div>Extras: <span className="text-slate-200 font-extrabold">{activeInnings.extras_wides + activeInnings.extras_noballs + activeInnings.extras_byes + activeInnings.extras_legbyes}</span> (wd {activeInnings.extras_wides}, nb {activeInnings.extras_noballs})</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Crease Live Status (Batsmen & Bowler) */}
      {isLive && activeInnings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Batsmen */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🏏</span> Batsmen at Crease
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">R (B) 4s 6s SR</span>
            </div>

            <div className="space-y-2">
              {currentStriker ? (
                <div className="flex items-center justify-between text-sm bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-black">▶</span>
                    <span className="font-extrabold text-white">{currentStriker.player_name}</span>
                    <span className="text-[10px] bg-emerald-800/80 text-emerald-200 px-1.5 py-0.5 rounded font-bold uppercase">Striker</span>
                  </div>
                  <div className="font-mono font-bold text-white flex items-center gap-3">
                    <span className="text-emerald-300 font-extrabold">{currentStriker.runs}</span>
                    <span className="text-slate-400 text-xs">({currentStriker.balls})</span>
                    <span className="text-slate-400 text-xs">{currentStriker.fours}</span>
                    <span className="text-slate-400 text-xs">{currentStriker.sixes}</span>
                    <span className="text-slate-300 text-xs font-semibold">{currentStriker.strike_rate}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-400 italic p-2 bg-amber-950/20 rounded-lg">Select next batsman to take strike</div>
              )}

              {currentNonStriker ? (
                <div className="flex items-center justify-between text-sm bg-slate-800/40 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono">•</span>
                    <span className="font-bold text-slate-200">{currentNonStriker.player_name}</span>
                  </div>
                  <div className="font-mono font-bold text-white flex items-center gap-3">
                    <span className="text-slate-200">{currentNonStriker.runs}</span>
                    <span className="text-slate-400 text-xs">({currentNonStriker.balls})</span>
                    <span className="text-slate-400 text-xs">{currentNonStriker.fours}</span>
                    <span className="text-slate-400 text-xs">{currentNonStriker.sixes}</span>
                    <span className="text-slate-300 text-xs font-semibold">{currentNonStriker.strike_rate}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-400 italic p-2 bg-amber-950/20 rounded-lg">Select non-striker batsman</div>
              )}
            </div>
          </div>

          {/* Current Bowler */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎯</span> Bowling
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">O M R W ECON</span>
            </div>

            {currentBowler ? (
              <div className="flex items-center justify-between text-sm bg-slate-800/40 p-3 rounded-xl">
                <div>
                  <div className="font-extrabold text-white">{currentBowler.player_name}</div>
                  <div className="text-[11px] text-slate-400">{currentBowler.bowling_style || 'Right-arm medium'}</div>
                </div>
                <div className="font-mono font-bold text-white flex items-center gap-3">
                  <span className="text-slate-300">{currentBowler.overs}</span>
                  <span className="text-slate-400 text-xs">{currentBowler.maiden_overs || 0}</span>
                  <span className="text-slate-200">{currentBowler.runs_conceded}</span>
                  <span className="text-red-400 font-extrabold text-base">{currentBowler.wickets}</span>
                  <span className="text-emerald-400 text-xs font-semibold">{currentBowler.economy}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-400 italic p-3 bg-amber-950/20 rounded-xl">
                End of over. Scorer needs to select next bowler.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pt-2">
        <button
          onClick={() => setActiveTab('LIVE')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'LIVE'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Live Commentary</span>
        </button>

        <button
          onClick={() => setActiveTab('SCORECARD')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'SCORECARD'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Full Scorecard</span>
        </button>

        <button
          onClick={() => setActiveTab('INFO')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'INFO'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>Match Info</span>
        </button>
      </div>

      {/* Tab 1: Live Ball-by-ball Commentary Feed */}
      {activeTab === 'LIVE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Ball-by-Ball Feed
            </h4>
            <span className="text-xs text-slate-400">Updates live in real-time</span>
          </div>

          {recentBalls.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-sm">
              Waiting for the first ball to be bowled...
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentBalls.map((ball) => (
                <div
                  key={ball.id}
                  className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 flex items-start gap-4 transition-all"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-xs shadow-md ${getBadgeStyle(ball.badge_text)}`}>
                    {ball.badge_text}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400">
                        {ball.bowler_name} to {ball.striker_name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Over {ball.over_number}.{ball.ball_in_over}
                      </span>
                    </div>

                    <p className="text-sm text-slate-200 leading-snug font-medium">
                      {ball.commentary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Full Scorecard */}
      {activeTab === 'SCORECARD' && (
        <div className="space-y-8">
          {innings.map((inn) => (
            <div key={inn.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              {/* Innings Banner */}
              <div className="bg-slate-800/80 px-6 py-4 flex items-center justify-between border-b border-slate-700/80">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                    style={{ backgroundColor: inn.batting_team_color || '#16a34a' }}
                  >
                    {inn.batting_team_short}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">
                      {inn.batting_team_name} Innings
                    </h3>
                    <div className="text-xs text-slate-400">Innings {inn.innings_number}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black text-white">{inn.total_runs}/{inn.wickets}</span>
                  <span className="text-xs text-slate-400 ml-2 font-semibold">({inn.overs} Overs)</span>
                </div>
              </div>

              {/* Batting Scorecard Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-6">Batter</th>
                      <th className="py-3 px-4">Dismissal</th>
                      <th className="py-3 px-4 text-right">R</th>
                      <th className="py-3 px-4 text-right">B</th>
                      <th className="py-3 px-4 text-right">4s</th>
                      <th className="py-3 px-4 text-right">6s</th>
                      <th className="py-3 px-6 text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {inn.batting?.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-6 font-bold text-white flex items-center gap-2">
                          <span>{b.player_name}</span>
                          {b.player_id === inn.current_striker_id && isLive && (
                            <span className="text-emerald-400 font-extrabold text-xs">🏏*</span>
                          )}
                          {b.player_id === inn.current_non_striker_id && isLive && (
                            <span className="text-slate-400 text-xs">*</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          {b.is_out ? (
                            <span>
                              {b.wicket_type === 'BOWLED' && `b ${b.bowler_name}`}
                              {b.wicket_type === 'CAUGHT' && `c ${b.fielder_name || 'sub'} b ${b.bowler_name}`}
                              {b.wicket_type === 'RUN_OUT' && `run out (${b.fielder_name || 'direct'})`}
                              {b.wicket_type === 'LBW' && `lbw b ${b.bowler_name}`}
                              {b.wicket_type === 'STUMPED' && `st b ${b.bowler_name}`}
                              {!['BOWLED', 'CAUGHT', 'RUN_OUT', 'LBW', 'STUMPED'].includes(b.wicket_type) && b.wicket_type}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">not out</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-white">{b.runs}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{b.balls}</td>
                        <td className="py-3 px-4 text-right text-slate-400">{b.fours}</td>
                        <td className="py-3 px-4 text-right text-slate-400">{b.sixes}</td>
                        <td className="py-3 px-6 text-right font-mono text-slate-300">{b.strike_rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bowling Table */}
              <div className="border-t border-slate-800">
                <div className="bg-slate-950/40 px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Bowling Analysis
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-6">Bowler</th>
                        <th className="py-2.5 px-4 text-right">O</th>
                        <th className="py-2.5 px-4 text-right">M</th>
                        <th className="py-2.5 px-4 text-right">R</th>
                        <th className="py-2.5 px-4 text-right">W</th>
                        <th className="py-2.5 px-6 text-right">ECON</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-sm">
                      {inn.bowling?.map((bw) => (
                        <tr key={bw.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-6 font-bold text-white">{bw.player_name}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-200">{bw.overs}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">{bw.maiden_overs || 0}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-200">{bw.runs_conceded}</td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-red-400">{bw.wickets}</td>
                          <td className="py-3 px-6 text-right font-mono text-emerald-400">{bw.economy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Match Info */}
      {activeTab === 'INFO' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-black text-white">Match Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Tournament</span>
              <span className="font-bold text-white">{match.tournament_name}</span>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Venue / Ground</span>
              <span className="font-bold text-white">{match.venue}</span>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Match Format</span>
              <span className="font-bold text-white">{match.overs} Overs per side</span>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Toss</span>
              <span className="font-bold text-white">
                {match.toss_winner_name ? `${match.toss_winner_name} won the toss and elected to ${match.toss_decision?.toLowerCase()}` : 'Not yet conducted'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
