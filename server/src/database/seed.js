const db = require('./db');
const bcrypt = require('bcryptjs');

function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  // 1. Users
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('admin123', salt);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, email, password, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertUser.run(1, 'scorer', 'scorer@village.com', hash, 'SCORER');
  insertUser.run(2, 'admin', 'admin@village.com', hash, 'ADMIN');
  insertUser.run(3, 'spectator', 'viewer@village.com', hash, 'VIEWER');

  // 2. Tournaments
  const insertTournament = db.prepare(`
    INSERT OR IGNORE INTO tournaments (id, name, village_location, start_date, end_date, status, banner_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertTournament.run(
    1,
    'Sankranti Premier League (SPL 2026)',
    'Kalyanpur Gram Panchayat Ground',
    '2026-01-14',
    '2026-01-18',
    'ONGOING',
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80'
  );

  insertTournament.run(
    2,
    'Gully Champions Cup 2026',
    'Rampur High School Ground',
    '2026-02-01',
    '2026-02-05',
    'UPCOMING',
    'https://images.unsplash.com/photo-1531415074868-036b107e775a?auto=format&fit=crop&w=1200&q=80'
  );

  // 3. Teams
  const insertTeam = db.prepare(`
    INSERT OR IGNORE INTO teams (id, name, short_name, village, primary_color, logo_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertTeam.run(1, 'Rampur Royals', 'RR', 'Rampur', '#16a34a', '🏏');
  insertTeam.run(2, 'Kalyanpur Kings', 'KK', 'Kalyanpur', '#2563eb', '👑');
  insertTeam.run(3, 'Shivpur Strikers', 'SS', 'Shivpur', '#dc2626', '⚡');
  insertTeam.run(4, 'Gopalpur Gladiators', 'GG', 'Gopalpur', '#d97706', '🛡️');

  // Connect teams to tournament
  const insertTournTeam = db.prepare(`
    INSERT OR IGNORE INTO tournament_teams (tournament_id, team_id) VALUES (?, ?)
  `);
  [1, 2, 3, 4].forEach(teamId => insertTournTeam.run(1, teamId));

  // 4. Players
  const playersData = [
    // Rampur Royals (Team 1)
    { id: 1, team_id: 1, name: 'Suresh Kumar (C)', jersey: 7, role: 'All-Rounder', bat: 'Right-hand bat', bowl: 'Right-arm medium', village: 'Rampur' },
    { id: 2, team_id: 1, name: 'Ramesh Naidu', jersey: 18, role: 'Batsman', bat: 'Right-hand bat', bowl: 'None', village: 'Rampur' },
    { id: 3, team_id: 1, name: 'Mahesh Babu', jersey: 45, role: 'Batsman', bat: 'Left-hand bat', bowl: 'None', village: 'Rampur' },
    { id: 4, team_id: 1, name: 'Kalyan Varma (WK)', jersey: 99, role: 'Wicket Keeper', bat: 'Right-hand bat', bowl: 'None', village: 'Rampur' },
    { id: 5, team_id: 1, name: 'Venkatesh Rao', jersey: 10, role: 'All-Rounder', bat: 'Left-hand bat', bowl: 'Left-arm orthodox', village: 'Rampur' },
    { id: 6, team_id: 1, name: 'Anil Yadav', jersey: 23, role: 'Bowler', bat: 'Right-hand bat', bowl: 'Right-arm fast', village: 'Rampur' },
    { id: 7, team_id: 1, name: 'Shiva Reddy', jersey: 8, role: 'Bowler', bat: 'Right-hand bat', bowl: 'Right-arm fast medium', village: 'Rampur' },
    { id: 8, team_id: 1, name: 'Ganesh Naik', jersey: 14, role: 'Bowler', bat: 'Right-hand bat', bowl: 'Right-arm off break', village: 'Rampur' },
    { id: 9, team_id: 1, name: 'Prasad Ch', jersey: 17, role: 'All-Rounder', bat: 'Right-hand bat', bowl: 'Right-arm medium', village: 'Rampur' },
    { id: 10, team_id: 1, name: 'Sunil Goud', jersey: 21, role: 'Batsman', bat: 'Right-hand bat', bowl: 'None', village: 'Rampur' },
    { id: 11, team_id: 1, name: 'Naveen Kumar', jersey: 33, role: 'Bowler', bat: 'Right-hand bat', bowl: 'Right-arm leg spin', village: 'Rampur' },

    // Kalyanpur Kings (Team 2)
    { id: 12, team_id: 2, name: 'Vijay Devaraj (C)', jersey: 11, role: 'All-Rounder', bat: 'Right-hand bat', bowl: 'Right-arm fast', village: 'Kalyanpur' },
    { id: 13, team_id: 2, name: 'Ravi Teja', jersey: 9, role: 'Batsman', bat: 'Right-hand bat', bowl: 'None', village: 'Kalyanpur' },
    { id: 14, team_id: 2, name: 'Sai Krishna', jersey: 27, role: 'Batsman', bat: 'Left-hand bat', bowl: 'Right-arm off spin', village: 'Kalyanpur' },
    { id: 15, team_id: 2, name: 'Ajay Varma (WK)', jersey: 1, role: 'Wicket Keeper', bat: 'Right-hand bat', bowl: 'None', village: 'Kalyanpur' },
    { id: 16, team_id: 2, name: 'Chandra Shekar', jersey: 5, role: 'All-Rounder', bat: 'Right-hand bat', bowl: 'Right-arm medium fast', village: 'Kalyanpur' },
    { id: 17, team_id: 2, name: 'Madhu Sudhan', jersey: 3, role: 'Bowler', bat: 'Right-hand bat', bowl: 'Left-arm fast', village: 'Kalyanpur' },
    { id: 18, team_id: 2, name: 'Srinivas Murthy', jersey: 24, role: 'Bowler', bat: 'Right-hand bat', bowl: 'Right-arm leg spin', village: 'Kalyanpur' },
    { id: 19, team_id: 2, name: 'Kiran Patel', jersey: 19, role: 'Batsman', bat: 'Right-hand bat', bowl: 'None', village: 'Kalyanpur' },
    { id: 20, team_id: 2, name: 'Santosh Kumar', jersey: 55, role: 'All-Rounder', bat: 'Left-hand bat', bowl: 'Right-arm medium', village: 'Kalyanpur' },
    { id: 21, team_id: 2, name: 'Bhanu Prakash', jersey: 88, role: 'Bowler', bat: 'Right-hand bat', bowl: 'Right-arm off break', village: 'Kalyanpur' },
    { id: 22, team_id: 2, name: 'Nani Reddy', jersey: 12, role: 'Bowler', bat: 'Right-hand bat', bowl: 'Right-arm medium', village: 'Kalyanpur' },

    // Shivpur Strikers (Team 3)
    { id: 23, team_id: 3, name: 'Tarun Varma (C)', jersey: 10, role: 'All-Rounder', bat: 'Right-hand bat', bowl: 'Right-arm fast', village: 'Shivpur' },
    { id: 24, team_id: 3, name: 'Pawan Kalyan', jersey: 25, role: 'Batsman', bat: 'Left-hand bat', bowl: 'None', village: 'Shivpur' },
    { id: 25, team_id: 3, name: 'Vamshi Krishna', jersey: 16, role: 'Bowler', bat: 'Right-hand bat', bowl: 'Right-arm leg spin', village: 'Shivpur' },
    { id: 26, team_id: 3, name: 'Dinesh Karthik (WK)', jersey: 2, role: 'Wicket Keeper', bat: 'Right-hand bat', bowl: 'None', village: 'Shivpur' },

    // Gopalpur Gladiators (Team 4)
    { id: 27, team_id: 4, name: 'Harish Rao (C)', jersey: 6, role: 'Batsman', bat: 'Right-hand bat', bowl: 'Right-arm off spin', village: 'Gopalpur' },
    { id: 28, team_id: 4, name: 'Manoj Kumar', jersey: 31, role: 'Bowler', bat: 'Right-hand bat', bowl: 'Right-arm fast', village: 'Gopalpur' },
    { id: 29, team_id: 4, name: 'Rajesh Goud', jersey: 4, role: 'All-Rounder', bat: 'Right-hand bat', bowl: 'Right-arm medium', village: 'Gopalpur' }
  ];

  const insertPlayer = db.prepare(`
    INSERT OR IGNORE INTO players (id, team_id, name, jersey_number, role, batting_style, bowling_style, village)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  playersData.forEach(p => {
    insertPlayer.run(p.id, p.team_id, p.name, p.jersey, p.role, p.bat, p.bowl, p.village);
  });

  // 5. Sample Matches
  // Match 1: LIVE match (Rampur Royals vs Kalyanpur Kings - 10 Overs)
  const insertMatch = db.prepare(`
    INSERT OR REPLACE INTO matches (
      id, tournament_id, team_a_id, team_b_id, overs, venue, match_date,
      status, toss_winner_id, toss_decision, current_innings, winner_id, player_of_match_id, result_statement
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMatch.run(
    1,
    1,
    1, // Rampur Royals
    2, // Kalyanpur Kings
    10,
    'Kalyanpur Main Pitch Ground',
    new Date().toISOString().split('T')[0],
    'LIVE',
    1,
    'BAT',
    1,
    null,
    null,
    'Rampur Royals opted to bat first'
  );

  // Match 2: COMPLETED match
  insertMatch.run(
    2,
    1,
    3, // Shivpur Strikers
    4, // Gopalpur Gladiators
    8,
    'Rampur North Ground',
    '2026-01-14',
    'COMPLETED',
    3,
    'BAT',
    2,
    3,
    23, // Player of the Match: Tarun Varma (C)
    'Shivpur Strikers won by 14 runs 🏆'
  );

  // Match 3: UPCOMING match
  insertMatch.run(
    3,
    1,
    1,
    4,
    10,
    'Kalyanpur Main Pitch Ground',
    '2026-01-16',
    'SCHEDULED',
    null,
    null,
    1,
    null,
    null,
    null
  );

  // 6. Innings for Match 1 (LIVE)
  const insertInnings = db.prepare(`
    INSERT OR IGNORE INTO innings (
      id, match_id, innings_number, batting_team_id, bowling_team_id,
      total_runs, wickets, total_legal_balls, extras_wides, extras_noballs,
      extras_byes, extras_legbyes, target_runs, is_completed,
      current_striker_id, current_non_striker_id, current_bowler_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Rampur Royals are 54/2 in 5.3 overs (33 legal balls)
  insertInnings.run(
    1,
    1,
    1,
    1, // Rampur Royals
    2, // Kalyanpur Kings
    54, // total_runs
    2,  // wickets
    33, // 5 overs (30 balls) + 3 balls = 33 legal balls
    3,  // wides
    1,  // noballs
    0,
    0,
    null,
    0,
    3, // Mahesh Babu (striker)
    1, // Suresh Kumar (non-striker)
    17 // Madhu Sudhan (bowler)
  );

  // Batting stats for match 1
  const insertBatting = db.prepare(`
    INSERT OR IGNORE INTO match_batting (
      match_id, innings_id, player_id, team_id, runs, balls, fours, sixes,
      is_out, wicket_type, bowler_id, fielder_id, batting_order
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBatting.run(1, 1, 2, 1, 14, 11, 2, 0, 1, 'CAUGHT', 12, 14, 1); // Ramesh Naidu c Sai Krishna b Vijay Devaraj 14(11)
  insertBatting.run(1, 1, 4, 1, 8, 6, 1, 0, 1, 'BOWLED', 17, null, 2); // Kalyan Varma b Madhu Sudhan 8(6)
  insertBatting.run(1, 1, 3, 1, 22, 12, 3, 1, 0, null, null, null, 3); // Mahesh Babu* 22(12)
  insertBatting.run(1, 1, 1, 1, 7, 5, 0, 0, 0, null, null, null, 4); // Suresh Kumar* 7(5)

  // Bowling stats for match 1
  const insertBowling = db.prepare(`
    INSERT OR IGNORE INTO match_bowling (
      match_id, innings_id, player_id, team_id, legal_balls, maiden_overs,
      runs_conceded, wickets, wides, no_balls
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBowling.run(1, 1, 12, 2, 12, 0, 18, 1, 1, 0); // Vijay Devaraj: 2.0 overs, 18 runs, 1 wkt
  insertBowling.run(1, 1, 16, 2, 12, 0, 20, 0, 2, 1); // Chandra Shekar: 2.0 overs, 20 runs, 0 wkt
  insertBowling.run(1, 1, 17, 2, 9, 0, 13, 1, 0, 0);  // Madhu Sudhan: 1.3 overs, 13 runs, 1 wkt

  // Match 2 Innings
  // Innings 2: Shivpur Strikers (78/3 in 8.0 ov)
  insertInnings.run(2, 2, 1, 3, 4, 78, 3, 48, 2, 1, 0, 0, null, 1, 23, 24, 28);
  // Innings 3: Gopalpur Gladiators (64/6 in 8.0 ov, Chasing 79)
  insertInnings.run(3, 2, 2, 4, 3, 64, 6, 48, 4, 0, 0, 0, 79, 1, 27, 29, 23);

  // Match 2 Batting (Tarun Varma MOTM: 42 runs in 19 balls, SR 221.1)
  insertBatting.run(2, 2, 23, 3, 42, 19, 4, 3, 0, null, null, null, 1);
  insertBatting.run(2, 2, 24, 3, 20, 15, 2, 1, 1, 'CAUGHT', 28, 27, 2);
  insertBatting.run(2, 2, 26, 3, 12, 10, 1, 0, 1, 'BOWLED', 28, null, 3);
  insertBatting.run(2, 3, 27, 4, 28, 20, 3, 1, 1, 'BOWLED', 23, null, 1);
  insertBatting.run(2, 3, 29, 4, 16, 14, 1, 1, 1, 'CAUGHT', 23, 26, 2);

  // Match 2 Bowling (Tarun Varma MOTM: 3 wickets for 12 runs in 2.0 overs)
  insertBowling.run(2, 2, 28, 4, 12, 0, 22, 2, 1, 0); // Manoj Kumar 2 wkts
  insertBowling.run(2, 3, 23, 3, 12, 1, 12, 3, 0, 0); // Tarun Varma 3 wkts (MOTM)
  insertBowling.run(2, 3, 25, 3, 12, 0, 18, 2, 2, 0); // Vamshi Krishna 2 wkts
  const insertBall = db.prepare(`
    INSERT OR IGNORE INTO balls (
      id, match_id, innings_id, over_number, ball_in_over, is_legal_ball,
      striker_id, non_striker_id, bowler_id, runs_batter, runs_extra, extra_type,
      is_wicket, wicket_type, dismissed_player_id, commentary, badge_text
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBall.run(1, 1, 1, 4, 5, 1, 3, 1, 16, 4, 0, 'NONE', 0, 'NONE', null, 'Over 4.5: Chandra Shekar to Mahesh Babu, FOUR! Driven elegantly past mid-off!', '4');
  insertBall.run(2, 1, 1, 4, 6, 1, 3, 1, 16, 1, 0, 'NONE', 0, 'NONE', null, 'Over 4.6: Single down to third man to retain strike.', '1');
  insertBall.run(3, 1, 1, 5, 1, 1, 3, 1, 17, 6, 0, 'NONE', 0, 'NONE', null, 'Over 5.1: Madhu Sudhan to Mahesh Babu, SIX! Launched high over long-on for a monster hit!', '6');
  insertBall.run(4, 1, 1, 5, 2, 1, 3, 1, 17, 0, 0, 'NONE', 0, 'NONE', null, 'Over 5.2: Good dot ball, defended on the front foot.', '0');
  insertBall.run(5, 1, 1, 5, 3, 1, 3, 1, 17, 1, 0, 'NONE', 0, 'NONE', null, 'Over 5.3: Pushed into the gap at covers for a quick single.', '1');

  console.log('✅ Database seeded successfully with village tournament data, players, and live match!');
}

seedDatabase();
