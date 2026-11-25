const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireScorerOrAdmin } = require('../middleware/auth');

// Get all players (with team info and career summary)
router.get('/', (req, res) => {
  try {
    const { team_id, search } = req.query;
    let query = `
      SELECT p.*, t.name as team_name, t.short_name as team_short, t.primary_color as team_color,
        COALESCE(SUM(mb.runs), 0) as total_runs,
        COALESCE(SUM(mb.balls), 0) as total_balls,
        COALESCE(SUM(mb.fours), 0) as total_fours,
        COALESCE(SUM(mb.sixes), 0) as total_sixes,
        COALESCE(SUM(mbw.wickets), 0) as total_wickets,
        COUNT(DISTINCT mb.match_id) as matches_batted,
        COUNT(DISTINCT mbw.match_id) as matches_bowled
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.id
      LEFT JOIN match_batting mb ON p.id = mb.player_id
      LEFT JOIN match_bowling mbw ON p.id = mbw.player_id
      WHERE 1=1
    `;
    const params = [];

    if (team_id) {
      query += ` AND p.team_id = ?`;
      params.push(team_id);
    }
    if (search) {
      query += ` AND (p.name LIKE ? OR p.village LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` GROUP BY p.id ORDER BY total_runs DESC, total_wickets DESC`;

    const players = db.prepare(query).all(...params);

    const formatted = players.map(p => {
      const strikeRate = p.total_balls > 0 ? ((p.total_runs / p.total_balls) * 100).toFixed(1) : '0.0';
      const matches = Math.max(p.matches_batted || 0, p.matches_bowled || 0);
      return {
        ...p,
        matches,
        strike_rate: strikeRate
      };
    });

    res.json({ players: formatted });
  } catch (err) {
    console.error('Fetch players error:', err);
    res.status(500).json({ message: 'Failed to fetch players' });
  }
});

// Leaderboards: Top Run Scorers (Orange Cap), Top Wickets (Purple Cap), Highest Strike Rate, Man of the Match
router.get('/leaderboard', (req, res) => {
  try {
    // 1. Top Batsmen (Orange Cap)
    const topRuns = db.prepare(`
      SELECT p.id, p.name, p.village, p.role, t.name as team_name, t.short_name as team_short, t.primary_color as team_color,
        COALESCE(SUM(mb.runs), 0) as runs,
        COALESCE(SUM(mb.balls), 0) as balls,
        COALESCE(SUM(mb.fours), 0) as fours,
        COALESCE(SUM(mb.sixes), 0) as sixes,
        COUNT(DISTINCT mb.match_id) as innings,
        MAX(mb.runs) as high_score
      FROM players p
      JOIN teams t ON p.team_id = t.id
      JOIN match_batting mb ON p.id = mb.player_id
      GROUP BY p.id
      HAVING runs > 0
      ORDER BY runs DESC, sixes DESC
      LIMIT 10
    `).all().map(p => ({
      ...p,
      strike_rate: p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0'
    }));

    // 2. Top Bowlers (Purple Cap / Most Wickets Person)
    const topWickets = db.prepare(`
      SELECT p.id, p.name, p.village, p.role, p.bowling_style, t.name as team_name, t.short_name as team_short, t.primary_color as team_color,
        COALESCE(SUM(mbw.wickets), 0) as wickets,
        COALESCE(SUM(mbw.runs_conceded), 0) as runs_conceded,
        COALESCE(SUM(mbw.legal_balls), 0) as legal_balls,
        COALESCE(SUM(mbw.maiden_overs), 0) as maidens,
        COUNT(DISTINCT mbw.match_id) as matches
      FROM players p
      JOIN teams t ON p.team_id = t.id
      JOIN match_bowling mbw ON p.id = mbw.player_id
      GROUP BY p.id
      HAVING wickets > 0 OR legal_balls > 0
      ORDER BY wickets DESC, runs_conceded ASC
      LIMIT 10
    `).all().map(p => {
      const overs = `${Math.floor(p.legal_balls / 6)}.${p.legal_balls % 6}`;
      const oversDecimal = (p.legal_balls / 6) || 0.001;
      const economy = ((p.runs_conceded / oversDecimal) || 0).toFixed(2);
      const bowlingStrikeRate = p.wickets > 0 ? (p.legal_balls / p.wickets).toFixed(1) : '0.0';
      return {
        ...p,
        overs,
        economy,
        bowling_strike_rate: bowlingStrikeRate
      };
    });

    // 3. Highest Strike Rate Stars (Super Strikers)
    const topStrikeRates = db.prepare(`
      SELECT p.id, p.name, p.village, t.name as team_name, t.short_name as team_short, t.primary_color as team_color,
        COALESCE(SUM(mb.runs), 0) as runs,
        COALESCE(SUM(mb.balls), 0) as balls,
        COALESCE(SUM(mb.fours), 0) as fours,
        COALESCE(SUM(mb.sixes), 0) as sixes
      FROM players p
      JOIN teams t ON p.team_id = t.id
      JOIN match_batting mb ON p.id = mb.player_id
      GROUP BY p.id
      HAVING runs >= 5 AND balls > 0
      ORDER BY ((CAST(SUM(mb.runs) AS REAL) / SUM(mb.balls)) * 100) DESC
      LIMIT 8
    `).all().map(p => ({
      ...p,
      strike_rate: ((p.runs / p.balls) * 100).toFixed(1)
    }));

    // 4. Man of the Match Awards (from completed matches)
    const manOfTheMatches = db.prepare(`
      SELECT m.id as match_id, m.match_date, m.result_statement, m.venue,
        ta.name as team_a_name, ta.short_name as team_a_short,
        tb.name as team_b_name, tb.short_name as team_b_short,
        p.id as player_id, p.name as player_name, p.village, p.role,
        pt.name as player_team_name, pt.short_name as player_team_short, pt.primary_color as player_team_color,
        (SELECT runs FROM match_batting WHERE match_id = m.id AND player_id = p.id) as match_runs,
        (SELECT balls FROM match_batting WHERE match_id = m.id AND player_id = p.id) as match_balls,
        (SELECT fours FROM match_batting WHERE match_id = m.id AND player_id = p.id) as match_fours,
        (SELECT sixes FROM match_batting WHERE match_id = m.id AND player_id = p.id) as match_sixes,
        (SELECT wickets FROM match_bowling WHERE match_id = m.id AND player_id = p.id) as match_wickets,
        (SELECT runs_conceded FROM match_bowling WHERE match_id = m.id AND player_id = p.id) as match_runs_conceded,
        (SELECT legal_balls FROM match_bowling WHERE match_id = m.id AND player_id = p.id) as match_legal_balls
      FROM matches m
      JOIN players p ON m.player_of_match_id = p.id
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      JOIN teams pt ON p.team_id = pt.id
      WHERE m.status = 'COMPLETED'
      ORDER BY m.id DESC
    `).all().map(mom => {
      const runs = mom.match_runs || 0;
      const balls = mom.match_balls || 0;
      const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';
      const wickets = mom.match_wickets || 0;
      const legalBalls = mom.match_legal_balls || 0;
      const runsConceded = mom.match_runs_conceded || 0;
      const overs = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
      const economy = legalBalls > 0 ? ((runsConceded / (legalBalls / 6))).toFixed(1) : '0.0';

      return {
        ...mom,
        total_runs: runs,
        balls_faced: balls,
        strike_rate: strikeRate,
        wickets_taken: wickets,
        bowling_figures: legalBalls > 0 ? `${wickets}/${runsConceded} (${overs} ov)` : null,
        economy
      };
    });

    // Leaders
    const leadingRunScorer = topRuns[0] || null;
    const leadingWicketTaker = topWickets[0] || null;

    res.json({
      topRuns,
      topWickets,
      topStrikeRates,
      manOfTheMatches,
      leadingRunScorer,
      leadingWicketTaker
    });
  } catch (err) {
    console.error('Fetch leaderboard error:', err);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
});

// Single Player Profile & Career Breakdown
router.get('/:id', (req, res) => {
  try {
    const player = db.prepare(`
      SELECT p.*, t.name as team_name, t.short_name as team_short, t.primary_color as team_color
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // Batting stats
    const battingTotals = db.prepare(`
      SELECT
        COUNT(id) as innings,
        COALESCE(SUM(runs), 0) as runs,
        COALESCE(SUM(balls), 0) as balls,
        COALESCE(SUM(fours), 0) as fours,
        COALESCE(SUM(sixes), 0) as sixes,
        COALESCE(MAX(runs), 0) as high_score,
        COALESCE(SUM(CASE WHEN is_out = 1 THEN 1 ELSE 0 END), 0) as dismissals
      FROM match_batting
      WHERE player_id = ?
    `).get(player.id);

    const average = battingTotals.dismissals > 0
      ? (battingTotals.runs / battingTotals.dismissals).toFixed(1)
      : battingTotals.runs > 0 ? `${battingTotals.runs}*` : '0.0';

    const strikeRate = battingTotals.balls > 0
      ? ((battingTotals.runs / battingTotals.balls) * 100).toFixed(1)
      : '0.0';

    // Bowling stats
    const bowlingTotals = db.prepare(`
      SELECT
        COUNT(id) as innings,
        COALESCE(SUM(legal_balls), 0) as legal_balls,
        COALESCE(SUM(runs_conceded), 0) as runs_conceded,
        COALESCE(SUM(wickets), 0) as wickets,
        COALESCE(SUM(maiden_overs), 0) as maidens
      FROM match_bowling
      WHERE player_id = ?
    `).get(player.id);

    const bowlingOvers = `${Math.floor(bowlingTotals.legal_balls / 6)}.${bowlingTotals.legal_balls % 6}`;
    const economy = bowlingTotals.legal_balls > 0
      ? (bowlingTotals.runs_conceded / (bowlingTotals.legal_balls / 6)).toFixed(2)
      : '0.00';

    // Recent match batting log
    const matchHistory = db.prepare(`
      SELECT m.id as match_id, m.match_date, m.venue,
        ta.short_name as team_a_short, tb.short_name as team_b_short,
        mb.runs, mb.balls, mb.fours, mb.sixes, mb.is_out, mb.wicket_type
      FROM match_batting mb
      JOIN matches m ON mb.match_id = m.id
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      WHERE mb.player_id = ?
      ORDER BY m.id DESC
      LIMIT 10
    `).all(player.id);

    res.json({
      player,
      batting: {
        ...battingTotals,
        average,
        strike_rate: strikeRate
      },
      bowling: {
        ...bowlingTotals,
        overs: bowlingOvers,
        economy
      },
      matchHistory
    });
  } catch (err) {
    console.error('Fetch player error:', err);
    res.status(500).json({ message: 'Failed to fetch player details' });
  }
});

// Add player
router.post('/', authenticateToken, requireScorerOrAdmin, (req, res) => {
  try {
    const { name, team_id, jersey_number, role, batting_style, bowling_style, village, avatar_url } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Player name is required.' });
    }

    const result = db.prepare(`
      INSERT INTO players (team_id, name, jersey_number, role, batting_style, bowling_style, village, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      team_id || null,
      name,
      jersey_number || 0,
      role || 'All-Rounder',
      batting_style || 'Right-hand bat',
      bowling_style || 'Right-arm medium',
      village || null,
      avatar_url || null
    );

    res.status(201).json({
      message: 'Player created successfully',
      player: { id: result.lastInsertRowid, name, team_id, role }
    });
  } catch (err) {
    console.error('Create player error:', err);
    res.status(500).json({ message: 'Failed to create player' });
  }
});

module.exports = router;
