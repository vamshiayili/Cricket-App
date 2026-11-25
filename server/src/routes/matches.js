const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireScorerOrAdmin } = require('../middleware/auth');

// Helper to get socket.io instance
function getIO(req) {
  return req.app.get('io');
}

// Get all matches (with filters for status: LIVE, SCHEDULED, COMPLETED, or tournament_id)
router.get('/', (req, res) => {
  try {
    const { status, tournament_id } = req.query;
    let query = `
      SELECT m.*,
        t.name as tournament_name, t.village_location,
        ta.name as team_a_name, ta.short_name as team_a_short, ta.primary_color as team_a_color, ta.logo_url as team_a_logo,
        tb.name as team_b_name, tb.short_name as team_b_short, tb.primary_color as team_b_color, tb.logo_url as team_b_logo,
        tw.short_name as toss_winner_short,
        win.name as winner_name, win.short_name as winner_short,
        pom.name as player_of_match_name,
        (SELECT runs FROM match_batting WHERE match_id = m.id AND player_id = m.player_of_match_id) as pom_runs,
        (SELECT balls FROM match_batting WHERE match_id = m.id AND player_id = m.player_of_match_id) as pom_balls
      FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      LEFT JOIN teams tw ON m.toss_winner_id = tw.id
      LEFT JOIN teams win ON m.winner_id = win.id
      LEFT JOIN players pom ON m.player_of_match_id = pom.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND m.status = ?`;
      params.push(status);
    }
    if (tournament_id) {
      query += ` AND m.tournament_id = ?`;
      params.push(tournament_id);
    }

    query += ` ORDER BY CASE WHEN m.status = 'LIVE' THEN 1 WHEN m.status = 'SCHEDULED' THEN 2 ELSE 3 END, m.id DESC`;

    const matches = db.prepare(query).all(...params);

    // Attach current scores to each match
    const enriched = matches.map(m => {
      const pRuns = m.pom_runs || 0;
      const pBalls = m.pom_balls || 0;
      const pom_strike_rate = pBalls > 0 ? ((pRuns / pBalls) * 100).toFixed(1) : '0.0';

      const innings = db.prepare(`
        SELECT inn.*,
          bt.name as batting_team_name, bt.short_name as batting_team_short
        FROM innings inn
        JOIN teams bt ON inn.batting_team_id = bt.id
        WHERE inn.match_id = ?
        ORDER BY inn.innings_number ASC
      `).all(m.id);

      return {
        ...m,
        pom_strike_rate,
        innings: innings.map(inn => ({
          ...inn,
          overs: `${Math.floor(inn.total_legal_balls / 6)}.${inn.total_legal_balls % 6}`
        }))
      };
    });

    res.json({ matches: enriched });
  } catch (err) {
    console.error('Fetch matches error:', err);
    res.status(500).json({ message: 'Failed to fetch matches' });
  }
});

// Helper function to build complete live match state
function getFullMatchState(matchId) {
  const match = db.prepare(`
    SELECT m.*,
      t.name as tournament_name, t.village_location,
      ta.name as team_a_name, ta.short_name as team_a_short, ta.primary_color as team_a_color, ta.logo_url as team_a_logo,
      tb.name as team_b_name, tb.short_name as team_b_short, tb.primary_color as team_b_color, tb.logo_url as team_b_logo,
      tw.name as toss_winner_name, tw.short_name as toss_winner_short,
      win.name as winner_name, win.short_name as winner_short,
      pom.name as player_of_match_name, pom.village as player_of_match_village,
      pomt.short_name as player_of_match_team,
      (SELECT runs FROM match_batting WHERE match_id = m.id AND player_id = m.player_of_match_id) as pom_runs,
      (SELECT balls FROM match_batting WHERE match_id = m.id AND player_id = m.player_of_match_id) as pom_balls,
      (SELECT fours FROM match_batting WHERE match_id = m.id AND player_id = m.player_of_match_id) as pom_fours,
      (SELECT sixes FROM match_batting WHERE match_id = m.id AND player_id = m.player_of_match_id) as pom_sixes,
      (SELECT wickets FROM match_bowling WHERE match_id = m.id AND player_id = m.player_of_match_id) as pom_wickets,
      (SELECT runs_conceded FROM match_bowling WHERE match_id = m.id AND player_id = m.player_of_match_id) as pom_runs_conceded,
      (SELECT legal_balls FROM match_bowling WHERE match_id = m.id AND player_id = m.player_of_match_id) as pom_legal_balls
    FROM matches m
    JOIN tournaments t ON m.tournament_id = t.id
    JOIN teams ta ON m.team_a_id = ta.id
    JOIN teams tb ON m.team_b_id = tb.id
    LEFT JOIN teams tw ON m.toss_winner_id = tw.id
    LEFT JOIN teams win ON m.winner_id = win.id
    LEFT JOIN players pom ON m.player_of_match_id = pom.id
    LEFT JOIN teams pomt ON pom.team_id = pomt.id
    WHERE m.id = ?
  `).get(matchId);

  if (!match) return null;

  if (match.player_of_match_id) {
    const pRuns = match.pom_runs || 0;
    const pBalls = match.pom_balls || 0;
    match.pom_strike_rate = pBalls > 0 ? ((pRuns / pBalls) * 100).toFixed(1) : '0.0';
    const pWkts = match.pom_wickets || 0;
    const pBallsBowled = match.pom_legal_balls || 0;
    const pRunsConc = match.pom_runs_conceded || 0;
    match.pom_bowling_figures = pBallsBowled > 0 ? `${pWkts}/${pRunsConc} (${Math.floor(pBallsBowled/6)}.${pBallsBowled%6} ov)` : null;
  }

  // Fetch both innings
  const inningsList = db.prepare(`
    SELECT inn.*,
      bt.name as batting_team_name, bt.short_name as batting_team_short, bt.primary_color as batting_team_color,
      bwt.name as bowling_team_name, bwt.short_name as bowling_team_short, bwt.primary_color as bowling_team_color
    FROM innings inn
    JOIN teams bt ON inn.batting_team_id = bt.id
    JOIN teams bwt ON inn.bowling_team_id = bwt.id
    WHERE inn.match_id = ?
    ORDER BY inn.innings_number ASC
  `).all(matchId);

  const formattedInnings = inningsList.map(inn => {
    const overs = `${Math.floor(inn.total_legal_balls / 6)}.${inn.total_legal_balls % 6}`;
    const oversDecimal = (inn.total_legal_balls / 6) || 0.001;
    const runRate = ((inn.total_runs / oversDecimal) || 0).toFixed(2);

    // Batting scorecard
    const batting = db.prepare(`
      SELECT mb.*, p.name as player_name, p.jersey_number, p.role,
        bowler.name as bowler_name, fielder.name as fielder_name
      FROM match_batting mb
      JOIN players p ON mb.player_id = p.id
      LEFT JOIN players bowler ON mb.bowler_id = bowler.id
      LEFT JOIN players fielder ON mb.fielder_id = fielder.id
      WHERE mb.innings_id = ?
      ORDER BY mb.batting_order ASC, mb.id ASC
    `).all(inn.id).map(b => ({
      ...b,
      strike_rate: b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'
    }));

    // Bowling scorecard
    const bowling = db.prepare(`
      SELECT mbw.*, p.name as player_name, p.jersey_number, p.bowling_style
      FROM match_bowling mbw
      JOIN players p ON mbw.player_id = p.id
      WHERE mbw.innings_id = ?
      ORDER BY mbw.legal_balls DESC, mbw.id ASC
    `).all(inn.id).map(bw => {
      const bOvers = `${Math.floor(bw.legal_balls / 6)}.${bw.legal_balls % 6}`;
      const bOversDecimal = (bw.legal_balls / 6) || 0.001;
      const economy = ((bw.runs_conceded / bOversDecimal) || 0).toFixed(2);
      return {
        ...bw,
        overs: bOvers,
        economy
      };
    });

    return {
      ...inn,
      overs,
      run_rate: runRate,
      batting,
      bowling
    };
  });

  // Active Innings details
  const activeInnings = formattedInnings.find(inn => inn.innings_number === match.current_innings) || formattedInnings[0] || null;

  let currentStriker = null;
  let currentNonStriker = null;
  let currentBowler = null;
  let recentBalls = [];
  let recentOverBalls = [];

  if (activeInnings) {
    if (activeInnings.current_striker_id) {
      currentStriker = activeInnings.batting.find(b => b.player_id === activeInnings.current_striker_id) || null;
    }
    if (activeInnings.current_non_striker_id) {
      currentNonStriker = activeInnings.batting.find(b => b.player_id === activeInnings.current_non_striker_id) || null;
    }
    if (activeInnings.current_bowler_id) {
      currentBowler = activeInnings.bowling.find(b => b.player_id === activeInnings.current_bowler_id) || null;
    }

    // Recent 12 balls for live bar
    recentBalls = db.prepare(`
      SELECT b.*,
        sp.name as striker_name,
        nsp.name as non_striker_name,
        bp.name as bowler_name
      FROM balls b
      JOIN players sp ON b.striker_id = sp.id
      JOIN players nsp ON b.non_striker_id = nsp.id
      JOIN players bp ON b.bowler_id = bp.id
      WHERE b.innings_id = ?
      ORDER BY b.id DESC
      LIMIT 12
    `).all(activeInnings.id);

    // Current over balls (for the over tracker at the top)
    const currentOverNum = Math.floor(activeInnings.total_legal_balls / 6);
    recentOverBalls = db.prepare(`
      SELECT badge_text, is_wicket, extra_type, runs_batter, runs_extra
      FROM balls
      WHERE innings_id = ? AND over_number = ?
      ORDER BY id ASC
    `).all(activeInnings.id, currentOverNum);
  }

  // Calculate Required Run Rate if 2nd innings
  let requiredRunRate = null;
  let runsNeeded = null;
  let ballsRemaining = null;

  if (match.status === 'LIVE' && activeInnings && activeInnings.innings_number === 2 && activeInnings.target_runs) {
    runsNeeded = Math.max(0, activeInnings.target_runs - activeInnings.total_runs);
    const totalMatchBalls = match.overs * 6;
    ballsRemaining = Math.max(0, totalMatchBalls - activeInnings.total_legal_balls);
    if (ballsRemaining > 0) {
      requiredRunRate = ((runsNeeded / (ballsRemaining / 6))).toFixed(2);
    } else {
      requiredRunRate = runsNeeded > 0 ? 'Infinite' : '0.00';
    }
  }

  return {
    match,
    innings: formattedInnings,
    activeInnings,
    currentStriker,
    currentNonStriker,
    currentBowler,
    recentBalls,
    recentOverBalls,
    requiredRunRate,
    runsNeeded,
    ballsRemaining
  };
}

// Get single match full details
router.get('/:id', (req, res) => {
  try {
    const fullState = getFullMatchState(req.params.id);
    if (!fullState) {
      return res.status(404).json({ message: 'Match not found' });
    }
    res.json(fullState);
  } catch (err) {
    console.error('Fetch match details error:', err);
    res.status(500).json({ message: 'Failed to fetch match details' });
  }
});

// Create new match (Scorer / Admin)
router.post('/', authenticateToken, requireScorerOrAdmin, (req, res) => {
  try {
    const { tournament_id, team_a_id, team_b_id, overs, venue, match_date } = req.body;
    if (!tournament_id || !team_a_id || !team_b_id) {
      return res.status(400).json({ message: 'Tournament and both teams are required.' });
    }
    if (team_a_id === team_b_id) {
      return res.status(400).json({ message: 'Team A and Team B cannot be the same team.' });
    }

    const matchOvers = parseInt(overs) || 10;
    const matchVenue = venue || 'Village Cricket Ground';
    const matchDate = match_date || new Date().toISOString().split('T')[0];

    const result = db.prepare(`
      INSERT INTO matches (tournament_id, team_a_id, team_b_id, overs, venue, match_date, status)
      VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED')
    `).run(tournament_id, team_a_id, team_b_id, matchOvers, matchVenue, matchDate);

    const matchId = result.lastInsertRowid;
    const fullState = getFullMatchState(matchId);

    const io = getIO(req);
    if (io) io.emit('match_created', fullState);

    res.status(201).json({ message: 'Match created successfully', matchId, fullState });
  } catch (err) {
    console.error('Create match error:', err);
    res.status(500).json({ message: 'Failed to create match' });
  }
});

// Record Toss & Choice
router.post('/:id/toss', authenticateToken, requireScorerOrAdmin, (req, res) => {
  try {
    const matchId = req.params.id;
    const { toss_winner_id, toss_decision } = req.body; // 'BAT' or 'BOWL'

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const tossWinner = db.prepare('SELECT name, short_name FROM teams WHERE id = ?').get(toss_winner_id);
    const resultStatement = `${tossWinner.short_name} won the toss and elected to ${toss_decision.toLowerCase()}`;

    db.prepare(`
      UPDATE matches
      SET toss_winner_id = ?, toss_decision = ?, result_statement = ?
      WHERE id = ?
    `).run(toss_winner_id, toss_decision, resultStatement, matchId);

    const fullState = getFullMatchState(matchId);
    const io = getIO(req);
    if (io) io.emit('score_update', fullState);

    res.json({ message: 'Toss recorded successfully', fullState });
  } catch (err) {
    console.error('Record toss error:', err);
    res.status(500).json({ message: 'Failed to record toss' });
  }
});

// Start Match / Innings 1 (Select Openers & Opening Bowler)
router.post('/:id/start', authenticateToken, requireScorerOrAdmin, (req, res) => {
  try {
    const matchId = req.params.id;
    const { striker_id, non_striker_id, bowler_id } = req.body;

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    if (!match.toss_winner_id || !match.toss_decision) {
      return res.status(400).json({ message: 'Please record toss before starting the match.' });
    }

    // Determine batting & bowling teams
    let battingTeamId, bowlingTeamId;
    if (match.toss_decision === 'BAT') {
      battingTeamId = match.toss_winner_id;
      bowlingTeamId = match.toss_winner_id === match.team_a_id ? match.team_b_id : match.team_a_id;
    } else {
      bowlingTeamId = match.toss_winner_id;
      battingTeamId = match.toss_winner_id === match.team_a_id ? match.team_b_id : match.team_a_id;
    }

    // Create or get Innings 1
    let innings = db.prepare('SELECT * FROM innings WHERE match_id = ? AND innings_number = 1').get(matchId);
    let inningsId;

    if (!innings) {
      const innRes = db.prepare(`
        INSERT INTO innings (
          match_id, innings_number, batting_team_id, bowling_team_id,
          current_striker_id, current_non_striker_id, current_bowler_id
        )
        VALUES (?, 1, ?, ?, ?, ?, ?)
      `).run(matchId, battingTeamId, bowlingTeamId, striker_id, non_striker_id, bowler_id);
      inningsId = innRes.lastInsertRowid;
    } else {
      inningsId = innings.id;
      db.prepare(`
        UPDATE innings
        SET current_striker_id = ?, current_non_striker_id = ?, current_bowler_id = ?
        WHERE id = ?
      `).run(striker_id, non_striker_id, bowler_id, inningsId);
    }

    // Initialize batting entries for opening batsmen
    db.prepare(`
      INSERT OR IGNORE INTO match_batting (match_id, innings_id, player_id, team_id, batting_order)
      VALUES (?, ?, ?, ?, 1)
    `).run(matchId, inningsId, striker_id, battingTeamId);

    db.prepare(`
      INSERT OR IGNORE INTO match_batting (match_id, innings_id, player_id, team_id, batting_order)
      VALUES (?, ?, ?, ?, 2)
    `).run(matchId, inningsId, non_striker_id, battingTeamId);

    // Initialize bowling entry for opening bowler
    db.prepare(`
      INSERT OR IGNORE INTO match_bowling (match_id, innings_id, player_id, team_id)
      VALUES (?, ?, ?, ?)
    `).run(matchId, inningsId, bowler_id, bowlingTeamId);

    // Update match to LIVE
    db.prepare(`UPDATE matches SET status = 'LIVE', current_innings = 1 WHERE id = ?`).run(matchId);

    const fullState = getFullMatchState(matchId);
    const io = getIO(req);
    if (io) io.emit('score_update', fullState);

    res.json({ message: 'Match started live!', fullState });
  } catch (err) {
    console.error('Start match error:', err);
    res.status(500).json({ message: 'Failed to start match' });
  }
});

// Start Innings 2 (Select 2nd Innings Openers & Opening Bowler)
router.post('/:id/start-second-innings', authenticateToken, requireScorerOrAdmin, (req, res) => {
  try {
    const matchId = req.params.id;
    const { striker_id, non_striker_id, bowler_id } = req.body;

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const inn1 = db.prepare('SELECT * FROM innings WHERE match_id = ? AND innings_number = 1').get(matchId);
    if (!inn1) return res.status(400).json({ message: '1st innings must exist.' });

    // Mark 1st innings complete if not already
    db.prepare('UPDATE innings SET is_completed = 1 WHERE id = ?').run(inn1.id);

    const targetRuns = inn1.total_runs + 1;
    const battingTeamId = inn1.bowling_team_id;
    const bowlingTeamId = inn1.batting_team_id;

    let inn2 = db.prepare('SELECT * FROM innings WHERE match_id = ? AND innings_number = 2').get(matchId);
    let inningsId;

    if (!inn2) {
      const innRes = db.prepare(`
        INSERT INTO innings (
          match_id, innings_number, batting_team_id, bowling_team_id,
          target_runs, current_striker_id, current_non_striker_id, current_bowler_id
        )
        VALUES (?, 2, ?, ?, ?, ?, ?, ?)
      `).run(matchId, battingTeamId, bowlingTeamId, targetRuns, striker_id, non_striker_id, bowler_id);
      inningsId = innRes.lastInsertRowid;
    } else {
      inningsId = inn2.id;
      db.prepare(`
        UPDATE innings
        SET target_runs = ?, current_striker_id = ?, current_non_striker_id = ?, current_bowler_id = ?
        WHERE id = ?
      `).run(targetRuns, striker_id, non_striker_id, bowler_id, inningsId);
    }

    db.prepare(`
      INSERT OR IGNORE INTO match_batting (match_id, innings_id, player_id, team_id, batting_order)
      VALUES (?, ?, ?, ?, 1)
    `).run(matchId, inningsId, striker_id, battingTeamId);

    db.prepare(`
      INSERT OR IGNORE INTO match_batting (match_id, innings_id, player_id, team_id, batting_order)
      VALUES (?, ?, ?, ?, 2)
    `).run(matchId, inningsId, non_striker_id, battingTeamId);

    db.prepare(`
      INSERT OR IGNORE INTO match_bowling (match_id, innings_id, player_id, team_id)
      VALUES (?, ?, ?, ?)
    `).run(matchId, inningsId, bowler_id, bowlingTeamId);

    db.prepare(`UPDATE matches SET current_innings = 2, status = 'LIVE' WHERE id = ?`).run(matchId);

    const fullState = getFullMatchState(matchId);
    const io = getIO(req);
    if (io) io.emit('score_update', fullState);

    res.json({ message: '2nd innings started!', fullState });
  } catch (err) {
    console.error('Start 2nd innings error:', err);
    res.status(500).json({ message: 'Failed to start 2nd innings' });
  }
});

// Core Scoring Engine: Record a Ball
router.post('/:id/score-ball', authenticateToken, requireScorerOrAdmin, (req, res) => {
  try {
    const matchId = req.params.id;
    let {
      runs_batter = 0,
      extra_type = 'NONE', // 'NONE', 'WIDE', 'NOBALL', 'BYE', 'LEGBYE'
      runs_extra = 0,
      is_wicket = false,
      wicket_type = 'NONE', // 'BOWLED', 'CAUGHT', 'RUN_OUT', 'STUMPED', 'LBW', 'HIT_WICKET'
      dismissed_player_id = null,
      fielder_id = null,
      custom_commentary = null
    } = req.body;

    runs_batter = parseInt(runs_batter) || 0;
    runs_extra = parseInt(runs_extra) || 0;
    is_wicket = Boolean(is_wicket);

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match || match.status !== 'LIVE') {
      return res.status(400).json({ message: 'Match is not currently LIVE' });
    }

    const innings = db.prepare(`
      SELECT * FROM innings WHERE match_id = ? AND innings_number = ?
    `).get(matchId, match.current_innings);

    if (!innings || innings.is_completed) {
      return res.status(400).json({ message: 'Active innings not found or already completed.' });
    }

    if (!innings.current_striker_id || !innings.current_non_striker_id || !innings.current_bowler_id) {
      return res.status(400).json({ message: 'Active striker, non-striker, and bowler must be set!' });
    }

    const strikerId = innings.current_striker_id;
    const nonStrikerId = innings.current_non_striker_id;
    const bowlerId = innings.current_bowler_id;

    // Delivery rules
    const isLegalBall = (extra_type !== 'WIDE' && extra_type !== 'NOBALL') ? 1 : 0;
    if (!isLegalBall && runs_extra === 0) {
      runs_extra = 1; // standard penalty run for wide or no-ball
    }

    const currentOver = Math.floor(innings.total_legal_balls / 6);
    const ballInOver = (innings.total_legal_balls % 6) + (isLegalBall ? 1 : 0);

    // Build badge text for live widget
    let badgeText = '';
    if (is_wicket) {
      badgeText = 'W';
    } else if (extra_type === 'WIDE') {
      badgeText = runs_extra > 1 ? `Wd+${runs_extra - 1}` : 'Wd';
    } else if (extra_type === 'NOBALL') {
      badgeText = runs_batter > 0 ? `Nb+${runs_batter}` : 'Nb';
    } else if (extra_type === 'BYE') {
      badgeText = `B${runs_extra}`;
    } else if (extra_type === 'LEGBYE') {
      badgeText = `Lb${runs_extra}`;
    } else {
      badgeText = runs_batter.toString();
    }

    // Auto generate descriptive commentary if not provided
    let commentary = custom_commentary;
    if (!commentary) {
      const striker = db.prepare('SELECT name FROM players WHERE id = ?').get(strikerId);
      const bowler = db.prepare('SELECT name FROM players WHERE id = ?').get(bowlerId);
      const overDisplay = `${currentOver}.${ballInOver}`;

      if (is_wicket) {
        if (wicket_type === 'CAUGHT') {
          const fielder = fielder_id ? db.prepare('SELECT name FROM players WHERE id = ?').get(fielder_id) : null;
          commentary = `Over ${overDisplay}: OUT! ${striker.name} is caught by ${fielder ? fielder.name : 'the fielder'} off ${bowler.name}! Huge wicket for the village!`;
        } else if (wicket_type === 'BOWLED') {
          commentary = `Over ${overDisplay}: BOWLED HIM! ${bowler.name} crashes into the stumps! ${striker.name} has to walk back!`;
        } else if (wicket_type === 'RUN_OUT') {
          commentary = `Over ${overDisplay}: RUN OUT! Brilliant direct hit, disaster in running between wickets!`;
        } else {
          commentary = `Over ${overDisplay}: WICKET! ${striker.name} departs (${wicket_type})!`;
        }
      } else if (runs_batter === 6) {
        commentary = `Over ${overDisplay}: SIX! Smashed out of the village ground! What an enormous hit by ${striker.name}!`;
      } else if (runs_batter === 4) {
        commentary = `Over ${overDisplay}: FOUR! Drilled through the covers, races away to the boundary rope!`;
      } else if (extra_type === 'WIDE') {
        commentary = `Over ${overDisplay}: Wide ball called by the umpire. Free run conceded by ${bowler.name}.`;
      } else if (extra_type === 'NOBALL') {
        commentary = `Over ${overDisplay}: No ball signaled! Overstepping the crease, free hit upcoming!`;
      } else if (runs_batter === 0) {
        commentary = `Over ${overDisplay}: Dot ball. Solid defensive shot by ${striker.name}.`;
      } else {
        commentary = `Over ${overDisplay}: ${runs_batter} run${runs_batter > 1 ? 's' : ''} taken by ${striker.name}.`;
      }
    }

    // Record ball delivery
    db.prepare(`
      INSERT INTO balls (
        match_id, innings_id, over_number, ball_in_over, is_legal_ball,
        striker_id, non_striker_id, bowler_id, runs_batter, runs_extra,
        extra_type, is_wicket, wicket_type, dismissed_player_id, fielder_id,
        commentary, badge_text
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      matchId,
      innings.id,
      currentOver,
      ballInOver,
      isLegalBall,
      strikerId,
      nonStrikerId,
      bowlerId,
      runs_batter,
      runs_extra,
      extra_type,
      is_wicket ? 1 : 0,
      wicket_type,
      is_wicket ? (dismissed_player_id || strikerId) : null,
      fielder_id || null,
      commentary,
      badgeText
    );

    // Update Batter Match Record
    if (isLegalBall || extra_type === 'NOBALL') {
      db.prepare(`
        UPDATE match_batting
        SET runs = runs + ?,
            balls = balls + 1,
            fours = fours + ?,
            sixes = sixes + ?
        WHERE innings_id = ? AND player_id = ?
      `).run(runs_batter, runs_batter === 4 ? 1 : 0, runs_batter === 6 ? 1 : 0, innings.id, strikerId);
    } else {
      // Wide doesn't count as ball faced, but if batsman took runs on wide? (rare in village cricket, but handle)
      if (runs_batter > 0) {
        db.prepare(`
          UPDATE match_batting
          SET runs = runs + ?
          WHERE innings_id = ? AND player_id = ?
        `).run(runs_batter, innings.id, strikerId);
      }
    }

    // If wicket, mark batsman out
    if (is_wicket) {
      const outPlayerId = dismissed_player_id || strikerId;
      db.prepare(`
        UPDATE match_batting
        SET is_out = 1,
            wicket_type = ?,
            bowler_id = ?,
            fielder_id = ?
        WHERE innings_id = ? AND player_id = ?
      `).run(wicket_type, wicket_type !== 'RUN_OUT' ? bowlerId : null, fielder_id || null, innings.id, outPlayerId);
    }

    // Update Bowler Match Record
    // Bowler is credited with wicket unless it's RUN_OUT
    const bowlerWicket = (is_wicket && wicket_type !== 'RUN_OUT') ? 1 : 0;
    // Bowler conceded runs = runs_batter + (wide/noball extra runs). Byes and Leg-byes don't count against bowler!
    const bowlerRunsConceded = runs_batter + ((extra_type === 'WIDE' || extra_type === 'NOBALL') ? runs_extra : 0);

    db.prepare(`
      UPDATE match_bowling
      SET legal_balls = legal_balls + ?,
          runs_conceded = runs_conceded + ?,
          wickets = wickets + ?,
          wides = wides + ?,
          no_balls = no_balls + ?
      WHERE innings_id = ? AND player_id = ?
    `).run(
      isLegalBall,
      bowlerRunsConceded,
      bowlerWicket,
      extra_type === 'WIDE' ? 1 : 0,
      extra_type === 'NOBALL' ? 1 : 0,
      innings.id,
      bowlerId
    );

    // Update Innings Totals
    const totalDeliveryRuns = runs_batter + runs_extra;
    const newTotalRuns = innings.total_runs + totalDeliveryRuns;
    const newWickets = innings.wickets + (is_wicket ? 1 : 0);
    const newLegalBalls = innings.total_legal_balls + isLegalBall;

    let widesInc = extra_type === 'WIDE' ? runs_extra : 0;
    let noballsInc = extra_type === 'NOBALL' ? runs_extra : 0;
    let byesInc = extra_type === 'BYE' ? runs_extra : 0;
    let legbyesInc = extra_type === 'LEGBYE' ? runs_extra : 0;

    db.prepare(`
      UPDATE innings
      SET total_runs = ?,
          wickets = ?,
          total_legal_balls = ?,
          extras_wides = extras_wides + ?,
          extras_noballs = extras_noballs + ?,
          extras_byes = extras_byes + ?,
          extras_legbyes = extras_legbyes + ?
      WHERE id = ?
    `).run(newTotalRuns, newWickets, newLegalBalls, widesInc, noballsInc, byesInc, legbyesInc, innings.id);

    // Strike Rotation Logic
    let nextStrikerId = strikerId;
    let nextNonStrikerId = nonStrikerId;

    // Odd runs swap strike
    const runsForRotation = runs_batter + (extra_type === 'BYE' || extra_type === 'LEGBYE' ? runs_extra : 0);
    if (runsForRotation % 2 !== 0) {
      nextStrikerId = nonStrikerId;
      nextNonStrikerId = strikerId;
    }

    // Over completion check (6 legal balls)
    const overCompleted = isLegalBall && (newLegalBalls % 6 === 0);
    let nextBowlerId = bowlerId;

    if (overCompleted) {
      // Strike rotates at end of over
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
      nextBowlerId = null; // Forces scorer to select bowler for next over
    }

    // If wicket fell, clear dismissed player from crease so scorer selects next batsman
    if (is_wicket) {
      const outPlayerId = dismissed_player_id || strikerId;
      if (outPlayerId === nextStrikerId) {
        nextStrikerId = null;
      } else if (outPlayerId === nextNonStrikerId) {
        nextNonStrikerId = null;
      }
    }

    // Save striker/non-striker/bowler state
    db.prepare(`
      UPDATE innings
      SET current_striker_id = ?,
          current_non_striker_id = ?,
          current_bowler_id = ?
      WHERE id = ?
    `).run(nextStrikerId, nextNonStrikerId, nextBowlerId, innings.id);

    // Check Match / Innings End Conditions
    const totalMatchBalls = match.overs * 6;
    const isAllOut = newWickets >= 10;
    const isOversFinished = newLegalBalls >= totalMatchBalls;

    if (innings.innings_number === 1) {
      if (isAllOut || isOversFinished) {
        db.prepare('UPDATE innings SET is_completed = 1 WHERE id = ?').run(innings.id);
        const target = newTotalRuns + 1;
        db.prepare(`
          UPDATE matches
          SET result_statement = 'Innings 1 Completed. Target: ' || ? || ' runs'
          WHERE id = ?
        `).run(target, matchId);
      }
    } else if (innings.innings_number === 2) {
      // 2nd innings result check
      const battingTeam = db.prepare('SELECT name, short_name FROM teams WHERE id = ?').get(innings.batting_team_id);
      const bowlingTeam = db.prepare('SELECT name, short_name FROM teams WHERE id = ?').get(innings.bowling_team_id);

      if (innings.target_runs && newTotalRuns >= innings.target_runs) {
        // Batting team won
        const wicketsRemaining = 10 - newWickets;
        const resultStmt = `${battingTeam.short_name} won by ${wicketsRemaining} wicket${wicketsRemaining > 1 ? 's' : ''}! 🏆`;
        db.prepare(`
          UPDATE matches
          SET status = 'COMPLETED', winner_id = ?, result_statement = ?
          WHERE id = ?
        `).run(battingTeam.id || innings.batting_team_id, resultStmt, matchId);
        db.prepare('UPDATE innings SET is_completed = 1 WHERE id = ?').run(innings.id);
      } else if (isAllOut || isOversFinished) {
        db.prepare('UPDATE innings SET is_completed = 1 WHERE id = ?').run(innings.id);
        if (innings.target_runs && newTotalRuns === (innings.target_runs - 1)) {
          const resultStmt = 'Match Tied! Thrilling finish in the village tournament!';
          db.prepare(`
            UPDATE matches
            SET status = 'COMPLETED', winner_id = NULL, result_statement = ?
            WHERE id = ?
          `).run(resultStmt, matchId);
        } else {
          const runsDeficit = (innings.target_runs ? innings.target_runs - 1 : 0) - newTotalRuns;
          const resultStmt = `${bowlingTeam.short_name} won by ${runsDeficit} runs! 🏆`;
          db.prepare(`
            UPDATE matches
            SET status = 'COMPLETED', winner_id = ?, result_statement = ?
            WHERE id = ?
          `).run(bowlingTeam.id || innings.bowling_team_id, resultStmt, matchId);
        }
      }
    }

    const fullState = getFullMatchState(matchId);
    const io = getIO(req);
    if (io) {
      io.emit('score_update', fullState);
    }

    res.json({
      message: 'Ball recorded',
      overCompleted,
      wicketFell: is_wicket,
      fullState
    });
  } catch (err) {
    console.error('Score ball error:', err);
    res.status(500).json({ message: 'Failed to record ball' });
  }
});

// Set / Change Current Bowler (e.g. for next over)
router.post('/:id/change-bowler', authenticateToken, requireScorerOrAdmin, (req, res) => {
  try {
    const matchId = req.params.id;
    const { bowler_id } = req.body;
    if (!bowler_id) return res.status(400).json({ message: 'Bowler ID is required' });

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    const innings = db.prepare('SELECT * FROM innings WHERE match_id = ? AND innings_number = ?').get(matchId, match.current_innings);

    // Initialize bowling record if not exists
    db.prepare(`
      INSERT OR IGNORE INTO match_bowling (match_id, innings_id, player_id, team_id)
      VALUES (?, ?, ?, ?)
    `).run(matchId, innings.id, bowler_id, innings.bowling_team_id);

    db.prepare('UPDATE innings SET current_bowler_id = ? WHERE id = ?').run(bowler_id, innings.id);

    const fullState = getFullMatchState(matchId);
    const io = getIO(req);
    if (io) io.emit('score_update', fullState);

    res.json({ message: 'Bowler updated', fullState });
  } catch (err) {
    console.error('Change bowler error:', err);
    res.status(500).json({ message: 'Failed to update bowler' });
  }
});

// Set / Change Batsman (e.g. after wicket or retired hurt)
router.post('/:id/change-batsman', authenticateToken, requireScorerOrAdmin, (req, res) => {
  try {
    const matchId = req.params.id;
    const { player_id, position } = req.body; // position: 'striker' or 'non_striker'

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    const innings = db.prepare('SELECT * FROM innings WHERE match_id = ? AND innings_number = ?').get(matchId, match.current_innings);

    const nextOrder = (db.prepare('SELECT COUNT(*) as count FROM match_batting WHERE innings_id = ?').get(innings.id).count) + 1;

    // Create batting record
    db.prepare(`
      INSERT OR IGNORE INTO match_batting (match_id, innings_id, player_id, team_id, batting_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(matchId, innings.id, player_id, innings.batting_team_id, nextOrder);

    if (position === 'striker') {
      db.prepare('UPDATE innings SET current_striker_id = ? WHERE id = ?').run(player_id, innings.id);
    } else {
      db.prepare('UPDATE innings SET current_non_striker_id = ? WHERE id = ?').run(player_id, innings.id);
    }

    const fullState = getFullMatchState(matchId);
    const io = getIO(req);
    if (io) io.emit('score_update', fullState);

    res.json({ message: 'Batsman set', fullState });
  } catch (err) {
    console.error('Change batsman error:', err);
    res.status(500).json({ message: 'Failed to set batsman' });
  }
});

// Undo Last Ball
router.post('/:id/undo', authenticateToken, requireScorerOrAdmin, (req, res) => {
  try {
    const matchId = req.params.id;
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const innings = db.prepare('SELECT * FROM innings WHERE match_id = ? AND innings_number = ?').get(matchId, match.current_innings);
    if (!innings) return res.status(404).json({ message: 'Active innings not found' });

    // Find the latest ball
    const lastBall = db.prepare('SELECT * FROM balls WHERE innings_id = ? ORDER BY id DESC LIMIT 1').get(innings.id);
    if (!lastBall) {
      return res.status(400).json({ message: 'No balls to undo in this innings!' });
    }

    // Revert Batter stats
    if (lastBall.is_legal_ball || lastBall.extra_type === 'NOBALL') {
      db.prepare(`
        UPDATE match_batting
        SET runs = MAX(0, runs - ?),
            balls = MAX(0, balls - 1),
            fours = MAX(0, fours - ?),
            sixes = MAX(0, sixes - ?)
        WHERE innings_id = ? AND player_id = ?
      `).run(
        lastBall.runs_batter,
        lastBall.runs_batter === 4 ? 1 : 0,
        lastBall.runs_batter === 6 ? 1 : 0,
        innings.id,
        lastBall.striker_id
      );
    } else if (lastBall.runs_batter > 0) {
      db.prepare(`
        UPDATE match_batting
        SET runs = MAX(0, runs - ?)
        WHERE innings_id = ? AND player_id = ?
      `).run(lastBall.runs_batter, innings.id, lastBall.striker_id);
    }

    // Revert Wicket if any
    if (lastBall.is_wicket) {
      const outPlayerId = lastBall.dismissed_player_id || lastBall.striker_id;
      db.prepare(`
        UPDATE match_batting
        SET is_out = 0, wicket_type = NULL, bowler_id = NULL, fielder_id = NULL
        WHERE innings_id = ? AND player_id = ?
      `).run(innings.id, outPlayerId);
    }

    // Revert Bowler stats
    const bowlerWicket = (lastBall.is_wicket && lastBall.wicket_type !== 'RUN_OUT') ? 1 : 0;
    const bowlerRunsConceded = lastBall.runs_batter + ((lastBall.extra_type === 'WIDE' || lastBall.extra_type === 'NOBALL') ? lastBall.runs_extra : 0);

    db.prepare(`
      UPDATE match_bowling
      SET legal_balls = MAX(0, legal_balls - ?),
          runs_conceded = MAX(0, runs_conceded - ?),
          wickets = MAX(0, wickets - ?),
          wides = MAX(0, wides - ?),
          no_balls = MAX(0, no_balls - ?)
      WHERE innings_id = ? AND player_id = ?
    `).run(
      lastBall.is_legal_ball,
      bowlerRunsConceded,
      bowlerWicket,
      lastBall.extra_type === 'WIDE' ? 1 : 0,
      lastBall.extra_type === 'NOBALL' ? 1 : 0,
      innings.id,
      lastBall.bowler_id
    );

    // Revert Innings totals
    const totalDeliveryRuns = lastBall.runs_batter + lastBall.runs_extra;
    const widesDec = lastBall.extra_type === 'WIDE' ? lastBall.runs_extra : 0;
    const noballsDec = lastBall.extra_type === 'NOBALL' ? lastBall.runs_extra : 0;
    const byesDec = lastBall.extra_type === 'BYE' ? lastBall.runs_extra : 0;
    const legbyesDec = lastBall.extra_type === 'LEGBYE' ? lastBall.runs_extra : 0;

    db.prepare(`
      UPDATE innings
      SET total_runs = MAX(0, total_runs - ?),
          wickets = MAX(0, wickets - ?),
          total_legal_balls = MAX(0, total_legal_balls - ?),
          extras_wides = MAX(0, extras_wides - ?),
          extras_noballs = MAX(0, extras_noballs - ?),
          extras_byes = MAX(0, extras_byes - ?),
          extras_legbyes = MAX(0, extras_legbyes - ?),
          current_striker_id = ?,
          current_non_striker_id = ?,
          current_bowler_id = ?
      WHERE id = ?
    `).run(
      totalDeliveryRuns,
      lastBall.is_wicket ? 1 : 0,
      lastBall.is_legal_ball,
      widesDec,
      noballsDec,
      byesDec,
      legbyesDec,
      lastBall.striker_id,
      lastBall.non_striker_id,
      lastBall.bowler_id,
      innings.id
    );

    // Delete the ball
    db.prepare('DELETE FROM balls WHERE id = ?').run(lastBall.id);

    // Revert match status if it was completed
    if (match.status === 'COMPLETED') {
      db.prepare(`UPDATE matches SET status = 'LIVE', winner_id = NULL WHERE id = ?`).run(matchId);
      db.prepare('UPDATE innings SET is_completed = 0 WHERE id = ?').run(innings.id);
    }

    const fullState = getFullMatchState(matchId);
    const io = getIO(req);
    if (io) io.emit('score_update', fullState);

    res.json({ message: 'Last ball undone successfully', fullState });
  } catch (err) {
    console.error('Undo ball error:', err);
    res.status(500).json({ message: 'Failed to undo ball' });
  }
});

// Swap Batsman Strike manually
router.post('/:id/swap-strike', authenticateToken, requireScorerOrAdmin, (req, res) => {
  try {
    const matchId = req.params.id;
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    const innings = db.prepare('SELECT * FROM innings WHERE match_id = ? AND innings_number = ?').get(matchId, match.current_innings);

    const temp = innings.current_striker_id;
    db.prepare('UPDATE innings SET current_striker_id = ?, current_non_striker_id = ? WHERE id = ?').run(
      innings.current_non_striker_id,
      temp,
      innings.id
    );

    const fullState = getFullMatchState(matchId);
    const io = getIO(req);
    if (io) io.emit('score_update', fullState);

    res.json({ message: 'Strike swapped', fullState });
  } catch (err) {
    console.error('Swap strike error:', err);
    res.status(500).json({ message: 'Failed to swap strike' });
  }
});

module.exports = router;
