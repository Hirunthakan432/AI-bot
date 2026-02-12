const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("intelix.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      model TEXT DEFAULT 'gpt-4o-mini'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      role TEXT,
      content TEXT
    )
  `);
});

module.exports = db;