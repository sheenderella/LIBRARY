const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'library.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`
            CREATE TABLE IF NOT EXISTS borrow (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                borrowerName TEXT,
                bookTitle TEXT,
                borrowDate TEXT,
                borrowStatus TEXT
            )
        `);
    }
});

module.exports = db;
