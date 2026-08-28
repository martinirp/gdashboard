const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Table for guilds we are tracking
        db.run(`CREATE TABLE IF NOT EXISTS tracked_guilds (
            name TEXT PRIMARY KEY,
            added_at INTEGER
        )`);

        // Table for player sessions
        db.run(`CREATE TABLE IF NOT EXISTS player_sessions (
            player_name TEXT PRIMARY KEY,
            guild_name TEXT,
            login_time INTEGER,
            is_online BOOLEAN
        )`);

        // Table for per-guild alert configuration
        db.run(`CREATE TABLE IF NOT EXISTS guild_alerts (
            guild_name TEXT PRIMARY KEY,
            enabled INTEGER DEFAULT 1,
            threshold INTEGER DEFAULT 0,
            interval_minutes INTEGER DEFAULT 10,
            last_alert_count INTEGER,
            webhook_url TEXT
        )`);

        // Table for fired alert events
        db.run(`CREATE TABLE IF NOT EXISTS alert_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_name TEXT,
            online_count INTEGER,
            triggered_at INTEGER
        )`);

        // Table for login events (used by masslog detection)
        db.run(`CREATE TABLE IF NOT EXISTS login_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_name TEXT,
            player_name TEXT,
            logged_at INTEGER
        )`);

        // Migration for older databases without interval_minutes
        db.all(`PRAGMA table_info(guild_alerts)`, (err, cols) => {
            if (!err && cols && !cols.some(c => c.name === 'interval_minutes')) {
                db.run(`ALTER TABLE guild_alerts ADD COLUMN interval_minutes INTEGER DEFAULT 10`);
                console.log('[DB] Migration: adicionado interval_minutes em guild_alerts');
            }
        });
    });
}

// Promises wrappers
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

module.exports = {
    db,
    run,
    get,
    all
};
