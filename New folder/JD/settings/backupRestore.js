const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('better-sqlite3'); // Move this to the top

// Update this to the absolute path of your main database file
const dbPath = path.join(__dirname, '../library.db');

let isDialogOpen = false;

// Export database to a file
ipcMain.handle('exportDatabase', async () => {
    if (isDialogOpen) {
        return { success: false, message: 'Backup is already open.' };
    }
    
    isDialogOpen = true;

    try {
        const { filePath } = await dialog.showSaveDialog({
            title: 'Save Database Backup',
            defaultPath: 'database-backup.sqlite',
            buttonLabel: 'Save',
            filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
        });

        console.log('Backup filePath:', filePath);

        if (filePath) {
            fs.copyFileSync(dbPath, filePath);
            console.log('Backup successful:', filePath);
            return { success: true, message: 'Database backup was successful!' };
        }

        console.log('Backup cancelled');
        return { success: false, message: 'Backup cancelled.' };
    } catch (error) {
        console.error('Error exporting database:', error);
        return { success: false, message: `Error: ${error.message}` };
    } finally {
        isDialogOpen = false;
    }
});

// Import database from a file and merge it with the main database
ipcMain.handle('importDatabase', async () => {
    if (isDialogOpen) {
        return { success: false, message: 'Restore is already open.' };
    }

    isDialogOpen = true;

    try {
        const { filePaths } = await dialog.showOpenDialog({
            title: 'Select Database Backup',
            buttonLabel: 'Open',
            filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
            properties: ['openFile']
        });

        if (!filePaths || filePaths.length === 0) {
            console.log('Restore cancelled');
            await dialog.showMessageBox({
                type: 'warning',
                title: 'Restore Cancelled',
                message: 'No file was selected. Database restore was cancelled.',
                buttons: ['OK']
            });
            return { success: false, message: 'Restore cancelled.' };
        }

        const importedDbPath = filePaths[0];
        await mergeDatabases(importedDbPath, dbPath);
        console.log('Restore successful:', importedDbPath);

        await dialog.showMessageBox({
            type: 'info',
            title: 'Restore Successful',
            message: 'The database restore was completed successfully!',
            buttons: ['OK']
        });

        return { success: true, message: 'Database restore was successful!' };
    } catch (error) {
        console.error('Error importing database:', error);
        await dialog.showMessageBox({
            type: 'error',
            title: 'Restore Failed',
            message: `An error occurred during database restore: ${error.message}`,
            buttons: ['OK']
        });
        return { success: false, message: `Error: ${error.message}` };
    } finally {
        isDialogOpen = false;
    }
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
            continue; // Skip these internal SQLite tables
        }

        const importedRows = importedDb.prepare(`SELECT * FROM ${tableName}`).all();

        if (importedRows.length === 0) {
            // If there are no rows in the imported table, skip this table
            console.log(`No rows to merge in table: ${tableName}`);
            continue;
        }

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
