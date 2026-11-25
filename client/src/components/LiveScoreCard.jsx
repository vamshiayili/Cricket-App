import React from 'react';
import { Link } from 'react-router-dom';
import { Radio, ChevronRight, MapPin, Calendar, Award } from 'lucide-react';

export default function LiveScoreCard({ match }) {
  const isLive = match.status === 'LIVE';
  const isCompleted = match.status === 'COMPLETED';

  // Get innings scores
  const inn1 = match.innings?.find(i => i.innings_number === 1);
  const inn2 = match.innings?.find(i => i.innings_number === 2);

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/20 group">
      {/* Top Header */}
      <div className="bg-slate-800/60 px-4 py-2.5 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-xs font-semibold text-emerald-400 truncate">
            {match.tournament_name || 'Village Tournament'}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 text-slate-500" />
            {match.venue || match.village_location}
          </span>
        </div>

        <div>
          {isLive && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 live-pulse"></span>
              LIVE
            </div>
          )}
          {isCompleted && (
            <div className="bg-slate-700/50 text-slate-300 border border-slate-600/40 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              Finished
            </div>
          )}
          {!isLive && !isCompleted && (
            <div className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              Upcoming
            </div>
          )}
        </div>
      </div>

      {/* Main Match Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Team A */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-sm"
              style={{ backgroundColor: match.team_a_color || '#16a34a' }}
            >
              {match.team_a_short || 'T1'}
            </div>
            <div>
              <div className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors">
                {match.team_a_name}
              </div>
              <div className="text-[11px] text-slate-400">Village Team</div>
            </div>
          </div>

          <div className="text-right">
            {inn1 && inn1.batting_team_id === match.team_a_id ? (
              <div>
                <span className="text-xl font-black text-white">{inn1.total_runs}/{inn1.wickets}</span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">({inn1.overs} ov)</span>
              </div>
            ) : inn2 && inn2.batting_team_id === match.team_a_id ? (
              <div>
                <span className="text-xl font-black text-white">{inn2.total_runs}/{inn2.wickets}</span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">({inn2.overs} ov)</span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-semibold uppercase">Yet to bat</span>
            )}
          </div>
        </div>

        {/* Team B */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-sm"
              style={{ backgroundColor: match.team_b_color || '#2563eb' }}
            >
              {match.team_b_short || 'T2'}
            </div>
            <div>
              <div className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors">
                {match.team_b_name}
              </div>
              <div className="text-[11px] text-slate-400">Village Team</div>
            </div>
          </div>

          <div className="text-right">
            {inn1 && inn1.batting_team_id === match.team_b_id ? (
              <div>
                <span className="text-xl font-black text-white">{inn1.total_runs}/{inn1.wickets}</span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">({inn1.overs} ov)</span>
              </div>
            ) : inn2 && inn2.batting_team_id === match.team_b_id ? (
              <div>
                <span className="text-xl font-black text-white">{inn2.total_runs}/{inn2.wickets}</span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">({inn2.overs} ov)</span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-semibold uppercase">Yet to bat</span>
            )}
          </div>
        </div>

        {/* Live Note / Result Statement */}
        <div className="pt-2 border-t border-slate-800 text-xs">
          {isLive ? (
            <div className="flex items-center justify-between text-emerald-400 font-semibold bg-emerald-950/40 px-3 py-2 rounded-lg border border-emerald-900/40">
              <span className="truncate">{match.result_statement || 'Match in progress...'}</span>
              <span className="text-[11px] text-slate-400 shrink-0 font-medium">{match.overs} Overs Match</span>
            </div>
          ) : isCompleted ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-amber-300 font-medium bg-amber-950/30 px-3 py-2 rounded-lg border border-amber-900/40">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{match.result_statement || 'Match Completed'}</span>
              </div>
              {match.player_of_match_name && (
                <div className="text-[11px] text-amber-300 font-bold flex items-center justify-between px-2 text-slate-300">
                  <span>🏆 Man of Match: <strong className="text-white">{match.player_of_match_name}</strong></span>
                  <span className="font-mono text-emerald-400">{match.pom_runs} runs (SR {match.pom_strike_rate})</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-400 flex items-center justify-between">
              <span>Starts at {match.match_date}</span>
              <span className="text-slate-500">{match.overs} Overs</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-4 py-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
        <Link
          to={`/match/${match.id}`}
          className="text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1 group-hover:text-emerald-400 transition-colors"
        >
          <span>View Live Scorecard & Commentary</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {isLive && (
          <Link
            to={`/scorer?match=${match.id}`}
            className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            Scorer Console
          </Link>
        )}
      </div>
    </div>
  );
}
