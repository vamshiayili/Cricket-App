const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireScorerOrAdmin } = require('../middleware/auth');

// Get all tournaments with team & match counts
router.get('/', (req, res) => {
  try {
    const tournaments = db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM tournament_teams WHERE tournament_id = t.id) as team_count,
        (SELECT COUNT(*) FROM matches WHERE tournament_id = t.id) as match_count,
        (SELECT COUNT(*) FROM matches WHERE tournament_id = t.id AND status = 'LIVE') as live_match_count
      FROM tournaments t
      ORDER BY t.created_at DESC
    `).all();

    res.json({ tournaments });
  } catch (err) {
    console.error('Fetch tournaments error:', err);
    res.status(500).json({ message: 'Failed to fetch tournaments' });
  }
});

// Get single tournament details (including teams, matches, points table)
router.get('/:id', (req, res) => {
  try {
    const tournamentId = req.params.id;
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const teams = db.prepare(`
      SELECT tm.* FROM teams tm
      JOIN tournament_teams tt ON tm.id = tt.team_id
      WHERE tt.tournament_id = ?
    `).all(tournamentId);

    const matches = db.prepare(`
      SELECT m.*,
        ta.name as team_a_name, ta.short_name as team_a_short, ta.primary_color as team_a_color,
        tb.name as team_b_name, tb.short_name as team_b_short, tb.primary_color as team_b_color,
        (SELECT total_runs || '/' || wickets FROM innings WHERE match_id = m.id AND innings_number = 1) as score_innings_1,
        (SELECT (total_legal_balls / 6) || '.' || (total_legal_balls % 6) FROM innings WHERE match_id = m.id AND innings_number = 1) as overs_innings_1,
        (SELECT total_runs || '/' || wickets FROM innings WHERE match_id = m.id AND innings_number = 2) as score_innings_2,
        (SELECT (total_legal_balls / 6) || '.' || (total_legal_balls % 6) FROM innings WHERE match_id = m.id AND innings_number = 2) as overs_innings_2
      FROM matches m
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      WHERE m.tournament_id = ?
      ORDER BY m.id DESC
    `).all(tournamentId);

    // Compute simple points table from completed matches
    const pointsTable = teams.map(team => {
      let played = 0;
      let won = 0;
      let lost = 0;
      let tied = 0;
      let points = 0;

      matches.forEach(m => {
        if (m.status === 'COMPLETED' && (m.team_a_id === team.id || m.team_b_id === team.id)) {
          played++;
          if (m.winner_id === team.id) {
            won++;
            points += 2;
          } else if (m.winner_id === null) {
            tied++;
            points += 1;
          } else {
            lost++;
          }
        }
      });

      return {
        ...team,
        played,
        won,
        lost,
        tied,
        points
      };
    }).sort((a, b) => b.points - a.points || b.won - a.won);

    res.json({ tournament, teams, matches, pointsTable });
  } catch (err) {
    console.error('Fetch tournament details error:', err);
    res.status(500).json({ message: 'Failed to fetch tournament details' });
  }
});

// Create tournament (Scorer / Admin)
router.post('/', authenticateToken, requireScorerOrAdmin, (req, res) => {
  try {
    const { name, village_location, start_date, end_date, banner_url, team_ids } = req.body;
    if (!name || !village_location) {
      return res.status(400).json({ message: 'Tournament name and village location are required.' });
    }

    const result = db.prepare(`
      INSERT INTO tournaments (name, village_location, start_date, end_date, status, banner_url)
      VALUES (?, ?, ?, ?, 'ONGOING', ?)
    `).run(name, village_location, start_date || null, end_date || null, banner_url || null);

    const tournamentId = result.lastInsertRowid;

    if (Array.isArray(team_ids)) {
      const insertTeamRel = db.prepare('INSERT OR IGNORE INTO tournament_teams (tournament_id, team_id) VALUES (?, ?)');
      team_ids.forEach(tid => insertTeamRel.run(tournamentId, tid));
    }

    res.status(201).json({
      message: 'Tournament created successfully',
      tournament: { id: tournamentId, name, village_location }
    });
  } catch (err) {
    console.error('Create tournament error:', err);
    res.status(500).json({ message: 'Failed to create tournament' });
  }
});

module.exports = router;
