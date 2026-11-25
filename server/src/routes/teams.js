const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireScorerOrAdmin } = require('../middleware/auth');

// Get all teams with player count and tournament connections
router.get('/', (req, res) => {
  try {
    const teams = db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM players WHERE team_id = t.id) as player_count
      FROM teams t
      ORDER BY t.id DESC
    `).all();

    res.json({ teams });
  } catch (err) {
    console.error('Fetch teams error:', err);
    res.status(500).json({ message: 'Failed to fetch teams' });
  }
});

// Get single team details with full squad roster
router.get('/:id', (req, res) => {
  try {
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const players = db.prepare(`
      SELECT p.*,
        COALESCE(SUM(mb.runs), 0) as total_runs,
        COALESCE(SUM(mbw.wickets), 0) as total_wickets
      FROM players p
      LEFT JOIN match_batting mb ON p.id = mb.player_id
      LEFT JOIN match_bowling mbw ON p.id = mbw.player_id
      WHERE p.team_id = ?
      GROUP BY p.id
      ORDER BY p.id ASC
    `).all(team.id);

    // Tournaments this team is registered in
    const tournaments = db.prepare(`
      SELECT tour.*
      FROM tournaments tour
      JOIN tournament_teams tt ON tour.id = tt.tournament_id
      WHERE tt.team_id = ?
    `).all(team.id);

    res.json({ team, players, tournaments });
  } catch (err) {
    console.error('Fetch team details error:', err);
    res.status(500).json({ message: 'Failed to fetch team details' });
  }
});

// Create new team with optional initial players (members) and tournament assignment
router.post('/', authenticateToken, requireScorerOrAdmin, (req, res) => {
  try {
    const { name, short_name, village, primary_color, logo_url, tournament_id, players } = req.body;
    if (!name || !short_name || !village) {
      return res.status(400).json({ message: 'Team name, short code, and village are required.' });
    }

    const cleanShort = short_name.trim().toUpperCase();

    // Insert team
    const result = db.prepare(`
      INSERT INTO teams (name, short_name, village, primary_color, logo_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(name.trim(), cleanShort, village.trim(), primary_color || '#16a34a', logo_url || '🏏');

    const teamId = result.lastInsertRowid;

    // Attach to tournament if specified
    if (tournament_id) {
      db.prepare(`
        INSERT OR IGNORE INTO tournament_teams (tournament_id, team_id)
        VALUES (?, ?)
      `).run(tournament_id, teamId);
    }

    // Insert initial team members / players if provided
    let addedPlayersCount = 0;
    if (Array.isArray(players) && players.length > 0) {
      const insertPlayer = db.prepare(`
        INSERT INTO players (team_id, name, jersey_number, role, batting_style, bowling_style, village)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const p of players) {
        if (p.name && p.name.trim()) {
          insertPlayer.run(
            teamId,
            p.name.trim(),
            parseInt(p.jersey_number) || 0,
            p.role || 'All-Rounder',
            p.batting_style || 'Right-hand bat',
            p.bowling_style || 'Right-arm medium',
            p.village || village.trim()
          );
          addedPlayersCount++;
        }
      }
    }

    const createdTeam = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    const createdPlayers = db.prepare('SELECT * FROM players WHERE team_id = ?').all(teamId);

    res.status(201).json({
      message: `Team "${name}" created successfully with ${addedPlayersCount} player(s)!`,
      team: createdTeam,
      players: createdPlayers
    });
  } catch (err) {
    console.error('Create team error:', err);
    res.status(500).json({ message: 'Failed to create team: ' + err.message });
  }
});

// Add a single player to an existing team's squad
router.post('/:id/players', authenticateToken, requireScorerOrAdmin, (req, res) => {
  try {
    const teamId = req.params.id;
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const { name, jersey_number, role, batting_style, bowling_style, village } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Player name is required.' });
    }

    const result = db.prepare(`
      INSERT INTO players (team_id, name, jersey_number, role, batting_style, bowling_style, village)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      teamId,
      name.trim(),
      parseInt(jersey_number) || 0,
      role || 'All-Rounder',
      batting_style || 'Right-hand bat',
      bowling_style || 'Right-arm medium',
      village ? village.trim() : team.village
    );

    const newPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: `Player "${name.trim()}" added to ${team.name} squad!`,
      player: newPlayer
    });
  } catch (err) {
    console.error('Add player to team error:', err);
    res.status(500).json({ message: 'Failed to add player: ' + err.message });
  }
});

// Delete an entire team and all its squad members & match associations
router.delete('/:id', authenticateToken, requireScorerOrAdmin, (req, res) => {
  const teamId = req.params.id;

  try {
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    db.exec('BEGIN TRANSACTION;');

    try {
      // 1. Find all matches where this team played
      const matches = db.prepare('SELECT id FROM matches WHERE team_a_id = ? OR team_b_id = ?').all(teamId, teamId);
      for (const m of matches) {
        db.prepare('DELETE FROM balls WHERE match_id = ?').run(m.id);
        db.prepare('DELETE FROM match_batting WHERE match_id = ?').run(m.id);
        db.prepare('DELETE FROM match_bowling WHERE match_id = ?').run(m.id);
        db.prepare('DELETE FROM innings WHERE match_id = ?').run(m.id);
        db.prepare('DELETE FROM matches WHERE id = ?').run(m.id);
      }

      // 2. Delete players in this team
      db.prepare('DELETE FROM players WHERE team_id = ?').run(teamId);

      // 3. Delete tournament associations
      db.prepare('DELETE FROM tournament_teams WHERE team_id = ?').run(teamId);

      // 4. Delete the team itself
      db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);

      db.exec('COMMIT;');

      res.json({
        message: `Team "${team.name}" and its squad were deleted successfully.`,
        deletedTeamId: parseInt(teamId)
      });
    } catch (innerErr) {
      db.exec('ROLLBACK;');
      throw innerErr;
    }
  } catch (err) {
    console.error('Delete team error:', err);
    res.status(500).json({ message: 'Failed to delete team: ' + err.message });
  }
});

// Delete a player from a team
router.delete('/:teamId/players/:playerId', authenticateToken, requireScorerOrAdmin, (req, res) => {
  try {
    const { teamId, playerId } = req.params;
    db.prepare('DELETE FROM players WHERE id = ? AND team_id = ?').run(playerId, teamId);
    res.json({ message: 'Player removed from squad successfully' });
  } catch (err) {
    console.error('Delete player error:', err);
    res.status(500).json({ message: 'Failed to remove player' });
  }
});

module.exports = router;
