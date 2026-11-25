const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'cricket.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for concurrency and performance
db.exec('PRAGMA foreign_keys = ON;');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'VIEWER',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      village_location TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'ONGOING',
      banner_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      village TEXT NOT NULL,
      primary_color TEXT DEFAULT '#16a34a',
      logo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tournament_teams (
      tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      PRIMARY KEY (tournament_id, team_id)
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      jersey_number INTEGER DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'All-Rounder',
      batting_style TEXT DEFAULT 'Right-hand bat',
      bowling_style TEXT DEFAULT 'Right-arm medium',
      village TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
      team_a_id INTEGER NOT NULL REFERENCES teams(id),
      team_b_id INTEGER NOT NULL REFERENCES teams(id),
      overs INTEGER NOT NULL DEFAULT 10,
      venue TEXT NOT NULL,
      match_date TEXT NOT NULL,
      status TEXT DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'LIVE', 'COMPLETED'
      toss_winner_id INTEGER REFERENCES teams(id),
      toss_decision TEXT, -- 'BAT', 'BOWL'
      current_innings INTEGER DEFAULT 1,
      winner_id INTEGER REFERENCES teams(id),
      player_of_match_id INTEGER REFERENCES players(id),
      result_statement TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS innings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      innings_number INTEGER NOT NULL, -- 1 or 2
      batting_team_id INTEGER NOT NULL REFERENCES teams(id),
      bowling_team_id INTEGER NOT NULL REFERENCES teams(id),
      total_runs INTEGER DEFAULT 0,
      wickets INTEGER DEFAULT 0,
      total_legal_balls INTEGER DEFAULT 0,
      extras_wides INTEGER DEFAULT 0,
      extras_noballs INTEGER DEFAULT 0,
      extras_byes INTEGER DEFAULT 0,
      extras_legbyes INTEGER DEFAULT 0,
      target_runs INTEGER DEFAULT NULL,
      is_completed INTEGER DEFAULT 0,
      current_striker_id INTEGER REFERENCES players(id),
      current_non_striker_id INTEGER REFERENCES players(id),
      current_bowler_id INTEGER REFERENCES players(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(match_id, innings_number)
    );

    CREATE TABLE IF NOT EXISTS match_batting (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      innings_id INTEGER NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id),
      team_id INTEGER NOT NULL REFERENCES teams(id),
      runs INTEGER DEFAULT 0,
      balls INTEGER DEFAULT 0,
      fours INTEGER DEFAULT 0,
      sixes INTEGER DEFAULT 0,
      is_out INTEGER DEFAULT 0,
      wicket_type TEXT,
      bowler_id INTEGER REFERENCES players(id),
      fielder_id INTEGER REFERENCES players(id),
      batting_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(innings_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS match_bowling (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      innings_id INTEGER NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id),
      team_id INTEGER NOT NULL REFERENCES teams(id),
      legal_balls INTEGER DEFAULT 0,
      maiden_overs INTEGER DEFAULT 0,
      runs_conceded INTEGER DEFAULT 0,
      wickets INTEGER DEFAULT 0,
      wides INTEGER DEFAULT 0,
      no_balls INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(innings_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS balls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      innings_id INTEGER NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
      over_number INTEGER NOT NULL, -- 0-based over index (0 for 1st over)
      ball_in_over INTEGER NOT NULL, -- 1-6 for legal balls, or 0 for pre-ball extra
      is_legal_ball INTEGER NOT NULL DEFAULT 1,
      striker_id INTEGER NOT NULL REFERENCES players(id),
      non_striker_id INTEGER NOT NULL REFERENCES players(id),
      bowler_id INTEGER NOT NULL REFERENCES players(id),
      runs_batter INTEGER NOT NULL DEFAULT 0,
      runs_extra INTEGER NOT NULL DEFAULT 0,
      extra_type TEXT DEFAULT 'NONE', -- 'NONE', 'WIDE', 'NOBALL', 'BYE', 'LEGBYE'
      is_wicket INTEGER NOT NULL DEFAULT 0,
      wicket_type TEXT DEFAULT 'NONE', -- 'BOWLED', 'CAUGHT', 'RUN_OUT', 'STUMPED', 'LBW', 'HIT_WICKET'
      dismissed_player_id INTEGER REFERENCES players(id),
      fielder_id INTEGER REFERENCES players(id),
      commentary TEXT,
      badge_text TEXT, -- '0', '1', '2', '4', '6', 'W', 'Wd', 'Nb+1' etc
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  try {
    db.exec('ALTER TABLE matches ADD COLUMN player_of_match_id INTEGER REFERENCES players(id);');
  } catch (e) {
    // Column already exists
  }
}

initSchema();

module.exports = db;
