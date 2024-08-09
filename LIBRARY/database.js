const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'library.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS user (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");
    db.get("SELECT COUNT(*) AS count FROM user", (err, row) => {
        if (err) {
            console.error('Error checking user table:', err.message);
        } else if (row.count === 0) {
            db.run("INSERT INTO user (username, password) VALUES ('admin', 'admin')"); // Initial user
        }
    });
});

module.exports = db;
