const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

// Update this to the absolute path of your main database file
const dbPath = path.join(__dirname, '../library.db');

// Export database to a file
ipcMain.handle('exportDatabase', async () => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'Save Database Backup',
        defaultPath: 'database-backup.sqlite',
        buttonLabel: 'Save',
        filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
    });

    console.log('Backup filePath:', filePath);

    if (filePath) {
        try {
            fs.copyFileSync(dbPath, filePath);
            console.log('Backup successful:', filePath);
            return { success: true, message: 'Database backup was successful!' };
        } catch (error) {
            console.error('Error exporting database:', error);
            return { success: false, message: `Error: ${error.message}` };
        }
    }

    console.log('Backup cancelled');
    return { success: false, message: 'Backup cancelled.' };
});

// Import database from a file and merge it with the main database
ipcMain.handle('importDatabase', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        title: 'Open Database Backup',
        buttonLabel: 'Open',
        filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
        properties: ['openFile']
    });

    console.log('Restore filePaths:', filePaths);

    if (filePaths && filePaths.length > 0) {
        try {
            const importedDbPath = filePaths[0];
            await mergeDatabases(importedDbPath, dbPath);
            console.log('Restore successful:', importedDbPath);
            return { success: true, message: 'Database restore was successful!' };
        } catch (error) {
            console.error('Error importing database:', error);
            return { success: false, message: `Error: ${error.message}` };
        }
    }

    console.log('Restore cancelled');
    return { success: false, message: 'Restore cancelled.' };
});

// Merge data from the imported database into the main database for all tables
async function mergeDatabases(importedDbPath, mainDbPath) {
    const sqlite3 = require('better-sqlite3');
    const importedDb = sqlite3(importedDbPath);
    const mainDb = sqlite3(mainDbPath);

    const tables = importedDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

    for (const table of tables) {
        const tableName = table.name;

        if (tableName === 'sqlite_sequence' || tableName === 'sqlite_stat1') {
            continue;
        }

        const importedRows = importedDb.prepare(`SELECT * FROM ${tableName}`).all();
        const mainRows = mainDb.prepare(`SELECT * FROM ${tableName}`).all();
        const mainRowIds = new Set(mainRows.map(row => row.id));

        const columns = Object.keys(importedRows[0]).join(', ');
        const placeholders = Object.keys(importedRows[0]).map(() => '?').join(', ');
        const insertStmt = mainDb.prepare(
            `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`
        );

        for (const row of importedRows) {
            if (!mainRowIds.has(row.id)) {
                insertStmt.run(...Object.values(row));
            }
        }
    }

    importedDb.close();
    mainDb.close();
}
