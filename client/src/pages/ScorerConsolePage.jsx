import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Edit3, Radio, RotateCcw, ArrowRightLeft, UserCheck,
  AlertCircle, ShieldAlert, CheckCircle, ChevronDown, Award,
  Users, RefreshCw, Eye
} from 'lucide-react';

export default function ScorerConsolePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const matchIdParam = searchParams.get('match');

  const { user, isScorer } = useAuth();
  const { socket } = useSocket();

  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(matchIdParam || '');
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [showTossModal, setShowTossModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showBatsmanModal, setShowBatsmanModal] = useState(false);
  const [showInningsModal, setShowInningsModal] = useState(false);

  // Form states
  const [tossForm, setTossForm] = useState({ winner_id: '', decision: 'BAT' });
  const [startForm, setStartForm] = useState({ striker_id: '', non_striker_id: '', bowler_id: '' });
  const [wicketForm, setWicketForm] = useState({
    wicket_type: 'BOWLED',
    out_player_id: '',
    fielder_id: '',
    next_batsman_id: ''
  });
  const [bowlerSelectId, setBowlerSelectId] = useState('');
  const [batsmanSelect, setBatsmanSelect] = useState({ player_id: '', position: 'striker' });

  // Players of current match teams
  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);

  // Fetch list of matches for selector
  const fetchMatchesList = async () => {
    try {
      const res = await fetch('/api/matches');
      const data = await res.json();
      setMatches(data.matches || []);
      if (!selectedMatchId && data.matches?.length > 0) {
        // Default to first live match or first match
        const live = data.matches.find(m => m.status === 'LIVE');
        setSelectedMatchId(live ? live.id : data.matches[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMatchesList();
  }, []);

  // Fetch full match state when selectedMatchId changes
  const fetchSelectedMatch = async (id) => {
    if (!id) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/matches/${id}`);
      if (!res.ok) throw new Error('Failed to load match');
      const data = await res.json();
      setMatchData(data);

      // Load players for both teams
      if (data.match) {
        const [pA, pB] = await Promise.all([
          fetch(`/api/teams/${data.match.team_a_id}`).then(r => r.json()),
          fetch(`/api/teams/${data.match.team_b_id}`).then(r => r.json())
        ]);
        setTeamAPlayers(pA.players || []);
        setTeamBPlayers(pB.players || []);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMatchId) {
      fetchSelectedMatch(selectedMatchId);
    }
  }, [selectedMatchId]);

  // Socket updates
  useEffect(() => {
    if (!socket || !selectedMatchId) return;

    socket.emit('join_match', selectedMatchId);

    socket.on('score_update', (updated) => {
      if (updated.match?.id === parseInt(selectedMatchId)) {
        setMatchData(updated);
      }
    });

    return () => {
      socket.emit('leave_match', selectedMatchId);
      socket.off('score_update');
    };
  }, [socket, selectedMatchId]);

  const token = localStorage.getItem('cricket_auth_token');

  // Generic API caller helper
  const sendScorerAction = async (endpoint, body = {}) => {
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/matches/${selectedMatchId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Action failed');
      setMatchData(data.fullState || data);
      return data;
    } catch (err) {
      setErrorMsg(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // 1. Record Run
  const handleScoreRun = async (runs) => {
    try {
      const res = await sendScorerAction('score-ball', { runs_batter: runs });
      if (res.overCompleted) {
        setShowBowlerModal(true);
      }
    } catch (e) {}
  };

  // 2. Extras
  const handleScoreExtra = async (type) => {
    try {
      let body = { runs_batter: 0, extra_type: type, runs_extra: 1 };
      const res = await sendScorerAction('score-ball', body);
      if (res.overCompleted) {
        setShowBowlerModal(true);
      }
    } catch (e) {}
  };

  // 3. Wicket submission
  const handleWicketSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await sendScorerAction('score-ball', {
        runs_batter: 0,
        is_wicket: true,
        wicket_type: wicketForm.wicket_type,
        dismissed_player_id: wicketForm.out_player_id || matchData.activeInnings?.current_striker_id,
        fielder_id: wicketForm.fielder_id || null
      });

      setShowWicketModal(false);

      // Now set next batsman if chosen
      if (wicketForm.next_batsman_id) {
        await sendScorerAction('change-batsman', {
          player_id: wicketForm.next_batsman_id,
          position: 'striker'
        });
      }

      if (res.overCompleted) {
        setShowBowlerModal(true);
      }
    } catch (e) {}
  };

  // 4. Undo
  const handleUndo = async () => {
    if (!window.confirm('Are you sure you want to undo the last ball?')) return;
    try {
      await sendScorerAction('undo');
      setSuccessMsg('Last ball undone successfully');
    } catch (e) {}
  };

  // 5. Swap strike
  const handleSwapStrike = async () => {
    try {
      await sendScorerAction('swap-strike');
    } catch (e) {}
  };

  // 6. Toss submission
  const handleTossSubmit = async (e) => {
    e.preventDefault();
    try {
      await sendScorerAction('toss', {
        toss_winner_id: tossForm.winner_id,
        toss_decision: tossForm.decision
      });
      setShowTossModal(false);
      setShowStartModal(true);
    } catch (e) {}
  };

  // 7. Start match innings
  const handleStartMatchSubmit = async (e) => {
    e.preventDefault();
    try {
      await sendScorerAction('start', startForm);
      setShowStartModal(false);
    } catch (e) {}
  };

  // 8. Start Innings 2
  const handleStartInnings2Submit = async (e) => {
    e.preventDefault();
    try {
      await sendScorerAction('start-second-innings', startForm);
      setShowInningsModal(false);
    } catch (e) {}
  };

  // 9. Change Bowler
  const handleBowlerSubmit = async (e) => {
    e.preventDefault();
    try {
      await sendScorerAction('change-bowler', { bowler_id: bowlerSelectId });
      setShowBowlerModal(false);
    } catch (e) {}
  };

  // 10. Change Batsman
  const handleBatsmanSubmit = async (e) => {
    e.preventDefault();
    try {
      await sendScorerAction('change-batsman', batsmanSelect);
      setShowBatsmanModal(false);
    } catch (e) {}
  };

  if (!isScorer) {
    return (
      <div className="max-w-md mx-auto my-16 bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xl">
        <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Scorer Access Required</h2>
        <p className="text-sm text-slate-300">
          You must be logged in as a <strong>Scorer</strong> or <strong>Admin</strong> to enter live scores.
        </p>
        <Link
          to="/login"
          className="inline-block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md"
        >
          Sign In with Scorer Credentials
        </Link>
      </div>
    );
  }

  const { match, activeInnings, currentStriker, currentNonStriker, currentBowler, recentOverBalls = [] } = matchData || {};

  // Eligible squads
  const battingTeamPlayers = activeInnings?.batting_team_id === match?.team_a_id ? teamAPlayers : teamBPlayers;
  const bowlingTeamPlayers = activeInnings?.bowling_team_id === match?.team_a_id ? teamAPlayers : teamBPlayers;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner & Match Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">Live Match Scorer Keypad</h1>
            <p className="text-xs text-slate-400">Village Cricket Tournament Scoring Desk</p>
          </div>
        </div>

        {/* Match selector dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            {matches.map(m => (
              <option key={m.id} value={m.id}>
                {m.team_a_short} vs {m.team_b_short} ({m.status})
              </option>
            ))}
          </select>

          {match && (
            <Link
              to={`/match/${match.id}`}
              target="_blank"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl transition-colors"
              title="Open Spectator View in new tab"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="bg-red-950/60 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400 mb-2" />
          <p className="text-sm text-slate-400 font-bold">Loading match console...</p>
        </div>
      ) : !match ? (
        <div className="text-center py-12 text-slate-500">Please select or create a match</div>
      ) : (
        <div className="space-y-6">
          {/* Match Status / Pre-Game Actions */}
          {match.status === 'SCHEDULED' && (
            <div className="bg-gradient-to-r from-blue-950/50 to-slate-900 border border-blue-500/30 rounded-3xl p-6 text-center space-y-4">
              <h3 className="text-lg font-black text-white">Match Setup: Toss & Lineups</h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Before recording balls, conduct the coin toss and select opening batsmen and bowler.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setTossForm({ winner_id: match.team_a_id, decision: 'BAT' });
                    setShowTossModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-600/30"
                >
                  Conduct Coin Toss
                </button>
              </div>
            </div>
          )}

          {/* Innings 1 Completed Banner -> Option to Start Innings 2 */}
          {match.status === 'LIVE' && activeInnings?.is_completed && activeInnings.innings_number === 1 && (
            <div className="bg-gradient-to-r from-amber-950/50 to-slate-900 border border-amber-500/40 rounded-3xl p-6 text-center space-y-4">
              <h3 className="text-lg font-black text-white">1st Innings Completed!</h3>
              <p className="text-sm text-amber-200">
                Target for 2nd innings: <strong className="text-white text-base">{activeInnings.total_runs + 1}</strong> runs in {match.overs} overs.
              </p>
              <button
                onClick={() => {
                  setStartForm({ striker_id: '', non_striker_id: '', bowler_id: '' });
                  setShowInningsModal(true);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-sm shadow-lg"
              >
                Start 2nd Innings Lineup
              </button>
            </div>
          )}

          {/* Match Completed Banner */}
          {match.status === 'COMPLETED' && (
            <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 text-center space-y-2">
              <Award className="w-10 h-10 text-amber-400 mx-auto" />
              <h3 className="text-xl font-black text-white">Match Finished</h3>
              <p className="text-emerald-400 font-bold text-base">{match.result_statement}</p>
            </div>
          )}

          {/* Live Scorer Screen */}
          {match.status === 'LIVE' && !activeInnings?.is_completed && (
            <>
              {/* Scorecard Strip */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black bg-red-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Live Innings {activeInnings.innings_number}
                    </span>
                    <span className="font-extrabold text-white text-lg">
                      {activeInnings.batting_team_name}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-3xl font-black text-emerald-400">
                      {activeInnings.total_runs}/{activeInnings.wickets}
                    </span>
                    <span className="text-xs text-slate-400 ml-2 font-bold">
                      ({activeInnings.overs} / {match.overs} ov)
                    </span>
                  </div>
                </div>

                {/* Over Badges Strip */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400 font-bold mr-2 uppercase">Over Balls:</span>
                    {recentOverBalls.length === 0 ? (
                      <span className="text-xs text-slate-500 italic">No balls bowled in this over yet</span>
                    ) : (
                      recentOverBalls.map((b, idx) => (
                        <span
                          key={idx}
                          className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-white font-extrabold flex items-center justify-center text-xs"
                        >
                          {b.badge_text}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="text-xs font-bold text-slate-400">
                    CRR: <span className="text-emerald-400">{activeInnings.run_rate}</span>
                  </div>
                </div>

                {/* Active Batsmen and Bowler at Crease */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Batsmen */}
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-bold border-b border-slate-800/80 pb-1">
                      <span>Batsmen</span>
                      <button
                        onClick={handleSwapStrike}
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px]"
                        title="Swap Striker"
                      >
                        <ArrowRightLeft className="w-3 h-3" /> Swap Strike
                      </button>
                    </div>

                    <div className="space-y-1 text-xs">
                      {currentStriker ? (
                        <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-xl">
                          <span className="font-extrabold text-white flex items-center gap-1">
                            🏏 {currentStriker.player_name}
                          </span>
                          <span className="font-mono font-bold text-emerald-300">
                            {currentStriker.runs} ({currentStriker.balls})
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setBatsmanSelect({ player_id: '', position: 'striker' });
                            setShowBatsmanModal(true);
                          }}
                          className="w-full text-center text-amber-400 font-bold py-1.5 border border-dashed border-amber-500/50 rounded-xl"
                        >
                          + Select Striker Batsman
                        </button>
                      )}

                      {currentNonStriker ? (
                        <div className="flex items-center justify-between bg-slate-800/40 p-2 rounded-xl">
                          <span className="font-bold text-slate-300">• {currentNonStriker.player_name}</span>
                          <span className="font-mono text-slate-300">
                            {currentNonStriker.runs} ({currentNonStriker.balls})
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setBatsmanSelect({ player_id: '', position: 'non_striker' });
                            setShowBatsmanModal(true);
                          }}
                          className="w-full text-center text-amber-400 font-bold py-1.5 border border-dashed border-amber-500/50 rounded-xl"
                        >
                          + Select Non-Striker Batsman
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bowler */}
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-bold border-b border-slate-800/80 pb-1">
                      <span>Current Bowler</span>
                      <button
                        onClick={() => {
                          setBowlerSelectId('');
                          setShowBowlerModal(true);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 text-[11px]"
                      >
                        Change Bowler
                      </button>
                    </div>

                    {currentBowler ? (
                      <div className="flex items-center justify-between bg-slate-800/40 p-2 rounded-xl text-xs">
                        <span className="font-extrabold text-white">🎯 {currentBowler.player_name}</span>
                        <span className="font-mono text-slate-300">
                          {currentBowler.overs} ov, {currentBowler.runs_conceded} runs, <strong className="text-red-400">{currentBowler.wickets} wkt</strong>
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setBowlerSelectId('');
                          setShowBowlerModal(true);
                        }}
                        className="w-full text-center text-amber-400 font-bold py-2 border border-dashed border-amber-500/50 rounded-xl text-xs"
                      >
                        + Select Bowler for this Over
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Interactive Scoring Keypad */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                    Runs Keypad
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[0, 1, 2, 3, 4, 6].map((run) => (
                      <button
                        key={run}
                        disabled={actionLoading || !currentStriker || !currentBowler}
                        onClick={() => handleScoreRun(run)}
                        className={`h-16 rounded-2xl font-black text-2xl flex flex-col items-center justify-center transition-all active:scale-95 shadow-md ${
                          run === 4
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400'
                            : run === 6
                            ? 'bg-purple-600 hover:bg-purple-500 text-white ring-2 ring-purple-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <span>{run}</span>
                        <span className="text-[10px] font-semibold text-slate-300 tracking-wider uppercase">
                          {run === 0 ? 'Dot' : run === 4 ? 'Four' : run === 6 ? 'Six' : 'Run'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extras & Wicket Keypad */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                    Extras & Wicket Actions
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <button
                      disabled={actionLoading || !currentBowler}
                      onClick={() => handleScoreExtra('WIDE')}
                      className="h-14 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-extrabold text-sm flex flex-col items-center justify-center active:scale-95 disabled:opacity-40"
                    >
                      <span>Wide (Wd)</span>
                      <span className="text-[10px] text-amber-400/80">+1 Extra</span>
                    </button>

                    <button
                      disabled={actionLoading || !currentBowler}
                      onClick={() => handleScoreExtra('NOBALL')}
                      className="h-14 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-extrabold text-sm flex flex-col items-center justify-center active:scale-95 disabled:opacity-40"
                    >
                      <span>No Ball (Nb)</span>
                      <span className="text-[10px] text-amber-400/80">+1 Extra</span>
                    </button>

                    <button
                      disabled={actionLoading || !currentBowler}
                      onClick={() => handleScoreExtra('LEGBYE')}
                      className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm flex flex-col items-center justify-center active:scale-95 disabled:opacity-40"
                    >
                      <span>Leg Bye (Lb)</span>
                      <span className="text-[10px] text-slate-400">+1 Extra</span>
                    </button>

                    <button
                      disabled={actionLoading || !currentBowler}
                      onClick={() => handleScoreExtra('BYE')}
                      className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm flex flex-col items-center justify-center active:scale-95 disabled:opacity-40"
                    >
                      <span>Bye (B)</span>
                      <span className="text-[10px] text-slate-400">+1 Extra</span>
                    </button>

                    <button
                      disabled={actionLoading || !currentStriker || !currentBowler}
                      onClick={() => {
                        setWicketForm({
                          wicket_type: 'BOWLED',
                          out_player_id: currentStriker.player_id,
                          fielder_id: '',
                          next_batsman_id: ''
                        });
                        setShowWicketModal(true);
                      }}
                      className="h-14 col-span-2 sm:col-span-1 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm flex flex-col items-center justify-center shadow-lg shadow-red-600/30 active:scale-95 disabled:opacity-40"
                    >
                      <span>OUT / Wicket</span>
                      <span className="text-[10px] text-red-200 tracking-wider">Dismissal</span>
                    </button>
                  </div>
                </div>

                {/* Scorer Utility Strip (Undo & Swap) */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    disabled={actionLoading}
                    onClick={handleUndo}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Undo Last Delivery</span>
                  </button>

                  <button
                    disabled={actionLoading || !currentStriker || !currentNonStriker}
                    onClick={handleSwapStrike}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Rotate Strike</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL 1: Toss Setup */}
      {showTossModal && match && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Record Match Coin Toss</h3>
            <form onSubmit={handleTossSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Toss Winner</label>
                <select
                  value={tossForm.winner_id}
                  onChange={(e) => setTossForm({ ...tossForm, winner_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
                  required
                >
                  <option value={match.team_a_id}>{match.team_a_name}</option>
                  <option value={match.team_b_id}>{match.team_b_name}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Elected to</label>
                <div className="grid grid-cols-2 gap-3">
                  {['BAT', 'BOWL'].map((dec) => (
                    <button
                      key={dec}
                      type="button"
                      onClick={() => setTossForm({ ...tossForm, decision: dec })}
                      className={`py-2.5 rounded-xl text-sm font-bold border ${
                        tossForm.decision === dec
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {dec === 'BAT' ? 'Bat First' : 'Bowl First'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTossModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm shadow-md"
                >
                  Save & Choose Openers
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Start Innings 1 Lineup */}
      {showStartModal && match && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Select Opening Players (Innings 1)</h3>
            <form onSubmit={handleStartMatchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Opening Striker (Batter 1)</label>
                <select
                  value={startForm.striker_id}
                  onChange={(e) => setStartForm({ ...startForm, striker_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  required
                >
                  <option value="">-- Choose Striker --</option>
                  {(match.toss_decision === 'BAT' ? (match.toss_winner_id === match.team_a_id ? teamAPlayers : teamBPlayers) : (match.toss_winner_id === match.team_a_id ? teamBPlayers : teamAPlayers)).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Non-Striker (Batter 2)</label>
                <select
                  value={startForm.non_striker_id}
                  onChange={(e) => setStartForm({ ...startForm, non_striker_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  required
                >
                  <option value="">-- Choose Non-Striker --</option>
                  {(match.toss_decision === 'BAT' ? (match.toss_winner_id === match.team_a_id ? teamAPlayers : teamBPlayers) : (match.toss_winner_id === match.team_a_id ? teamBPlayers : teamAPlayers)).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Opening Bowler</label>
                <select
                  value={startForm.bowler_id}
                  onChange={(e) => setStartForm({ ...startForm, bowler_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  required
                >
                  <option value="">-- Choose Bowler --</option>
                  {(match.toss_decision === 'BAT' ? (match.toss_winner_id === match.team_a_id ? teamBPlayers : teamAPlayers) : (match.toss_winner_id === match.team_a_id ? teamAPlayers : teamBPlayers)).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.bowling_style || p.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm shadow-md"
                >
                  🚀 Go Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Wicket Dialog */}
      {showWicketModal && activeInnings && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-black text-red-400 flex items-center gap-2">
              <span>⚠️</span> Record Wicket
            </h3>

            <form onSubmit={handleWicketSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Dismissal Type</label>
                <select
                  value={wicketForm.wicket_type}
                  onChange={(e) => setWicketForm({ ...wicketForm, wicket_type: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold"
                >
                  <option value="BOWLED">Bowled</option>
                  <option value="CAUGHT">Caught</option>
                  <option value="RUN_OUT">Run Out</option>
                  <option value="STUMPED">Stumped</option>
                  <option value="LBW">LBW</option>
                  <option value="HIT_WICKET">Hit Wicket</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Dismissed Player</label>
                <select
                  value={wicketForm.out_player_id}
                  onChange={(e) => setWicketForm({ ...wicketForm, out_player_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  required
                >
                  {currentStriker && (
                    <option value={currentStriker.player_id}>
                      Striker: {currentStriker.player_name} ({currentStriker.runs} runs)
                    </option>
                  )}
                  {currentNonStriker && (
                    <option value={currentNonStriker.player_id}>
                      Non-Striker: {currentNonStriker.player_name} ({currentNonStriker.runs} runs)
                    </option>
                  )}
                </select>
              </div>

              {['CAUGHT', 'RUN_OUT'].includes(wicketForm.wicket_type) && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Fielder (Catcher / Thrower)</label>
                  <select
                    value={wicketForm.fielder_id}
                    onChange={(e) => setWicketForm({ ...wicketForm, fielder_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  >
                    <option value="">-- Select Fielder (Optional) --</option>
                    {bowlingTeamPlayers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-emerald-400 mb-1.5 uppercase">Next Batsman Coming In</label>
                <select
                  value={wicketForm.next_batsman_id}
                  onChange={(e) => setWicketForm({ ...wicketForm, next_batsman_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-bold"
                >
                  <option value="">-- Choose Next Batsman (or select later) --</option>
                  {battingTeamPlayers
                    .filter(p => p.id !== currentStriker?.player_id && p.id !== currentNonStriker?.player_id)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWicketModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-500 text-white font-black px-5 py-2 rounded-xl text-sm shadow-md"
                >
                  Confirm Wicket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Select Next Bowler */}
      {showBowlerModal && bowlingTeamPlayers.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🎯</span> Select Bowler for the Over
            </h3>
            <form onSubmit={handleBowlerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Bowler</label>
                <select
                  value={bowlerSelectId}
                  onChange={(e) => setBowlerSelectId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold"
                  required
                >
                  <option value="">-- Select Bowler --</option>
                  {bowlingTeamPlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.bowling_style || p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBowlerModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm shadow-md"
                >
                  Set Bowler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Select Batsman */}
      {showBatsmanModal && battingTeamPlayers.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🏏</span> Select {batsmanSelect.position === 'striker' ? 'Striker' : 'Non-Striker'} Batsman
            </h3>
            <form onSubmit={handleBatsmanSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Player</label>
                <select
                  value={batsmanSelect.player_id}
                  onChange={(e) => setBatsmanSelect({ ...batsmanSelect, player_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold"
                  required
                >
                  <option value="">-- Select Batsman --</option>
                  {battingTeamPlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBatsmanModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm shadow-md"
                >
                  Set Batsman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Start 2nd Innings Lineup */}
      {showInningsModal && match && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Start 2nd Innings</h3>
            <form onSubmit={handleStartInnings2Submit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Opening Striker (Chasing Team)</label>
                <select
                  value={startForm.striker_id}
                  onChange={(e) => setStartForm({ ...startForm, striker_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  required
                >
                  <option value="">-- Choose Striker --</option>
                  {bowlingTeamPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Opening Non-Striker</label>
                <select
                  value={startForm.non_striker_id}
                  onChange={(e) => setStartForm({ ...startForm, non_striker_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  required
                >
                  <option value="">-- Choose Non-Striker --</option>
                  {bowlingTeamPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Opening Bowler (Defending Team)</label>
                <select
                  value={startForm.bowler_id}
                  onChange={(e) => setStartForm({ ...startForm, bowler_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  required
                >
                  <option value="">-- Choose Bowler --</option>
                  {battingTeamPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.bowling_style || p.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInningsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm shadow-md"
                >
                  Begin 2nd Innings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
