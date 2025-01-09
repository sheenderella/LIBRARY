const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const db = require('./database'); 

// Update this to the absolute path of your main database file
// Determine the database file path
const dbPath = app.isPackaged
  ? path.join(app.getPath('userData'), 'library.db') // For packaged app
  : path.resolve(__dirname, '../library.db'); // For development

// Export database to a file
ipcMain.handle('exportDatabase', async () => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'Save Database Backup',
        defaultPath: 'database-backup.sqlite',
        buttonLabel: 'Save',
        filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
    });

    if (filePath) {
        try {
            fs.copyFileSync(dbPath, filePath);
            return { success: true };
        } catch (error) {
            console.error('Error exporting database:', error);
            return { success: false, error };
        }
    }
    return { success: false };
});

// Import database from a file and merge it with the main database
ipcMain.handle('importDatabase', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        title: 'Open Database Backup',
        buttonLabel: 'Open',
        filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
        properties: ['openFile']
    });

    if (filePaths && filePaths.length > 0) {
        try {
            const importedDbPath = filePaths[0];
            await mergeDatabases(importedDbPath, dbPath);
            return { success: true };
        } catch (error) {
            console.error('Error importing database:', error);
            return { success: false, error };
        }
    }
    return { success: false };
});

// Merge data from the imported database into the main database for all tables
function importDatabase(importPath) {
    if (!fs.existsSync(importPath)) {
      console.error('Import file does not exist.');
      return;
    }
  
    // Open the imported database
    const importedDB = new sqlite3.Database(importPath, (err) => {
      if (err) {
        console.error('Error opening imported database:', err.message);
        return;
      }
      console.log('Opened imported database successfully.');
    });
  
    // Validate the imported database
    importedDB.get('PRAGMA integrity_check;', (err, row) => {
      if (err || row.integrity_check !== 'ok') {
        console.error('Imported database integrity check failed:', err ? err.message : row);
        importedDB.close();
        return;
      }
  
      console.log('Imported database passed integrity check.');
  
      // Merge tables
      const tables = ['user', 'books', 'borrow', 'Profiles']; // Add your tables here
      tables.forEach((table) => {
        importedDB.all(`SELECT * FROM ${table};`, [], (err, rows) => {
          if (err) {
            console.error(`Error reading data from table ${table}:`, err.message);
            return;
          }
  
          // Insert data into the main database
          rows.forEach((row) => {
            const columns = Object.keys(row).join(', ');
            const placeholders = Object.keys(row).map(() => '?').join(', ');
            const values = Object.values(row);
  
            db.run(
              `INSERT OR IGNORE INTO ${table} (${columns}) VALUES (${placeholders});`,
              values,
              (err) => {
                if (err) {
                  console.error(`Error inserting data into table ${table}:`, err.message);
                }
              }
            );
          });
        });
      });
  
      // Close the imported database
      importedDB.close(() => {
        console.log('Imported database closed successfully.');
      });
    });
  }
  
  module.exports = { importDatabase };

  
// Export 'borrow' table to an Excel file
ipcMain.handle('exportBorrowToExcel', async () => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'Save Borrow Records as Excel',
        defaultPath: 'borrow-records.xlsx',
        buttonLabel: 'Save',
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    });

    if (filePath) {
        try {
            const rows = await executeSelectQuery('SELECT * FROM borrow');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Borrow Records');

            // Add headers
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Borrower Name', key: 'borrowerName', width: 30 },
                { header: 'Book Title', key: 'bookTitle', width: 30 },
                { header: 'Borrow Date', key: 'borrowDate', width: 20 },
                { header: 'Borrow Status', key: 'borrowStatus', width: 20 },
                { header: 'Created At', key: 'createdAt', width: 20 },
            ];

            // Add rows
            worksheet.addRows(rows);

            // Save to file
            await workbook.xlsx.writeFile(filePath);
            return { success: true };
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            return { success: false, error };
        }
    }
    return { success: false };
});

// Export 'books' table to an Excel file
ipcMain.handle('exportBooksToExcel', async () => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'Save Books as Excel',
        defaultPath: 'books.xlsx',
        buttonLabel: 'Save',
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    });

    if (filePath) {
        try {
            const rows = await executeSelectQuery('SELECT * FROM books');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Books');

            // Add headers
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Number', key: 'number', width: 15 },
                { header: 'Date Received', key: 'date_received', width: 20 },
                { header: 'Class', key: 'class', width: 20 },
                { header: 'Author', key: 'author', width: 30 },
                { header: 'Title of Book', key: 'title_of_book', width: 30 },
                { header: 'Edition', key: 'edition', width: 15 },
                { header: 'Volume', key: 'volume', width: 15 },
                { header: 'Pages', key: 'pages', width: 10 },
                { header: 'Source of Fund', key: 'source_of_fund', width: 20 },
                { header: 'Cost Price', key: 'cost_price', width: 15 },
                { header: 'Publisher', key: 'publisher', width: 30 },
                { header: 'Remarks', key: 'remarks', width: 40 },
            ];

            // Add rows
            worksheet.addRows(rows);

            // Save to file
            await workbook.xlsx.writeFile(filePath);
            return { success: true };
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            return { success: false, error };
        }
    }
    return { success: false };
});

// Helper function to execute SELECT queries
function executeSelectQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}
