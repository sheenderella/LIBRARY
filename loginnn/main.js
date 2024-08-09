const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const db = require('./database.js');

let mainWindow, loginWindow, addBorrowWindow, updateBorrowWindow, addBookWindow, editBookWindow;

function createWindow(options) {
    const window = new BrowserWindow({
        width: options.width || 800,
        height: options.height || 600,
        parent: options.parent || null,
        minWidth: options.minWidth || 400, // Set minimum width
        minHeight: options.minHeight || 300, // Set minimum height
        maxWidth: options.maxWidth || 1920, // Set maximum width
        maxHeight: options.maxHeight || 1080, // Set maximum height
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    if (options.maximize) {
        window.maximize(); // Maximize the window
    }

    window.loadFile(options.filePath);

    window.on('closed', () => {
        if (options.onClose) options.onClose();
    });

    return window;
}

// DASHBOARD
function createMainWindow() {
    mainWindow = createWindow({
        filePath: 'index.html',
        maximize: true, // Maximize the main window on start
        minWidth: 800, // Set minimum width (adjust as needed)
        minHeight: 600, // Set minimum height (adjust as needed)
    });
}

// LOGIN
function createLoginWindow() {
    loginWindow = createWindow({
        filePath: 'login.html',
        minWidth: 400, // Set minimum width (adjust as needed)
        minHeight: 300, // Set minimum height (adjust as needed)
    });
}

// BORROWER
function createAddBorrowWindow() {
    addBorrowWindow = createWindow({
        filePath: path.join(__dirname, 'borrow', 'addBorrow.html'),
        width: 400,
        height: 600,
        parent: mainWindow,
        onClose: () => (addBorrowWindow = null),
    });
}

function createUpdateBorrowWindow(record) {
    updateBorrowWindow = createWindow({
        filePath: path.join(__dirname, 'borrow', 'updateBorrow.html'),
        width: 400,
        height: 600,
        parent: mainWindow,
        onClose: () => (updateBorrowWindow = null),
    });

    updateBorrowWindow.webContents.on('did-finish-load', () => {
        updateBorrowWindow.webContents.send('fill-update-form', record);
    });
}

// BOOKS
function createAddBookWindow() {
    addBookWindow = createWindow({
        filePath: path.join(__dirname, 'books', 'addBook.html'),
        width: 500,
        height: 600,
        maxWidth: 500,
        maxHeight: 600,
        minWidth: 500,
        minHeight: 600,
        parent: mainWindow,
        onClose: () => (addBookWindow = null),
    });
}

function createEditBookWindow(record) {
    editBookWindow = createWindow({
        filePath: path.join(__dirname, 'books', 'editBook.html'),
        width: 500,
        height: 600,
        maxWidth: 500,
        maxHeight: 600,
        minWidth: 500,
        minHeight: 600,
        parent: mainWindow,
        onClose: () => (editBookWindow = null),
    });

    editBookWindow.webContents.on('did-finish-load', () => {
        editBookWindow.webContents.send('fill-edit-form', record);
    });
}

app.whenReady().then(createLoginWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

// Handle IPC calls
// LOGIN
ipcMain.handle('login', async (_event, obj) => await validatelogin(obj));

ipcMain.handle('logout', async () => {
    createLoginWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
});

// BORROW
ipcMain.handle('addBorrow', async (_event, record) => executeQuery(
    'INSERT INTO borrow (borrowerName, bookTitle, borrowDate, borrowStatus, createdAt) VALUES (?, ?, ?, ?, datetime("now"))',
    [record.borrowerName, record.bookTitle, record.borrowDate, record.borrowStatus],
    function () {
        record.id = this.lastID;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('borrow-record-added', record);
        }
    }
));

ipcMain.handle('updateBorrow', async (_event, record) => {
    try {
        await executeQuery(
            'UPDATE borrow SET borrowerName = ?, bookTitle = ?, borrowDate = ?, borrowStatus = ? WHERE id = ?',
            [record.borrowerName, record.bookTitle, record.borrowDate, record.borrowStatus, record.id]
        );

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('borrow-record-updated', record);
        }

        if (updateBorrowWindow && !updateBorrowWindow.isDestroyed()) {
            updateBorrowWindow.close();
        }
    } catch (error) {
        console.error('Error updating borrow record:', error);
    }
});

ipcMain.handle('deleteBorrow', async (_event, id) => {
    await executeQuery(
        'DELETE FROM borrow WHERE id = ?',
        [id],
        function () {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('borrow-record-deleted', id); // Notify renderer process
            }
        }
    );
});

ipcMain.handle('getBorrows', async () => executeSelectQuery(
    'SELECT * FROM borrow ORDER BY createdAt DESC'
));

ipcMain.handle('getBorrowerLog', async (_event, name) => executeSelectQuery(
    'SELECT * FROM borrow WHERE borrowerName = ?',
    [name]
));

ipcMain.on('open-add-borrow-window', createAddBorrowWindow);
ipcMain.on('open-update-window', (_event, record) => createUpdateBorrowWindow(record));
ipcMain.on('close-form-window', closeAllFormWindows);

function validatelogin({ username, password }) {
    const sql = "SELECT * FROM user WHERE username = ? AND password = ?";
    return new Promise((resolve, reject) => {
        db.get(sql, [username, password], (error, row) => {
            if (error) {
                console.error('Error querying database:', error);
                reject(error);
            } else if (row) {
                createMainWindow();
                if (mainWindow) mainWindow.show();
                if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close();
                resolve({ success: true, userId: row.id });
            } else {
                resolve({ success: false });
            }
        });
    });
}



function executeQuery(sql, params, callback) {
    console.log('Executing SQL Query:', sql);
    console.log('With Parameters:', params);
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                console.error('Database Error:', err);
                reject(err);
            } else {
                console.log('Query executed successfully.');
                if (callback) callback.call(this);
                resolve();
            }
        });
    });
}


function executeSelectQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Database Select Error:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function closeAllFormWindows() {
    [addBorrowWindow, updateBorrowWindow].forEach(window => {
        if (window && !window.isDestroyed()) window.close();
    });
}

/// BOOKS
// Books IPC Handlers
ipcMain.handle('addBook', async (_event, record) => {
    try {
        await executeQuery(
            'INSERT INTO books (number, date_received, class, author, title_of_book, edition, volume, pages, year, source_of_fund, cost_price, publisher, remarks, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
            [record.number, record.date_received, record.class, record.author, record.title_of_book, record.edition, record.volume, record.pages, record.year, record.source_of_fund, record.cost_price, record.publisher, record.remarks],
            function () {
                record.id = this.lastID;
                record.createdAt = new Date().toISOString();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('book-record-added', record);
                }
            }
        );
    } catch (error) {
        console.error('Error adding book record:', error);
    }
});

ipcMain.handle('updateBook', async (_event, record) => {
    try {
        await executeQuery(
            'UPDATE books SET number = ?, date_received = ?, class = ?, author = ?, title_of_book = ?, edition = ?, volume = ?, pages = ?, year = ?, source_of_fund = ?, cost_price = ?, publisher = ?, remarks = ? WHERE id = ?',
            [record.number, record.date_received, record.class, record.author, record.title_of_book, record.edition, record.volume, record.pages, record.year, record.source_of_fund, record.cost_price, record.publisher, record.remarks, record.id]
        );

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('book-record-updated', record);
        }
    } catch (error) {
        console.error('Error updating book record:', error);
    }
});

ipcMain.handle('deleteBook', async (_event, id) => {
    try {
        await executeQuery(
            'DELETE FROM books WHERE id = ?',
            [id],
            function () {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('book-record-deleted', id);
                }
            }
        );
    } catch (error) {
        console.error('Error deleting book record:', error);
    }
});

ipcMain.handle('getBooks', async () => {
    try {
        const books = await executeSelectQuery('SELECT * FROM books ORDER BY createdAt DESC');
        return books;
    } catch (error) {
        console.error('Error fetching book records:', error);
        return [];
    }
});

ipcMain.on('open-add-book-window', () => {
    if (!addBookWindow) {
        createAddBookWindow();
    } else {
        addBookWindow.focus();
    }
});

ipcMain.on('open-edit-book-window', (_event, record) => {
    if (!editBookWindow) {
        createEditBookWindow(record);
    } else {
        editBookWindow.focus();
        editBookWindow.webContents.send('fill-edit-form', record);
    }
});

function createChangeCredentialsWindow() {
    const changeCredentialsWindow = createWindow({
        filePath: 'change.html',
        width: 400,
        height: 500,
        parent: mainWindow,
        onClose: () => (changeCredentialsWindow = null),
    });
}

// Add an IPC listener to open the change credentials window
ipcMain.on('open-change-credentials-window', () => {
    if (!changeCredentialsWindow) {
        createChangeCredentialsWindow();
    } else {
        changeCredentialsWindow.focus();
    }
});




ipcMain.handle('update-login-credentials', async (_event, credentials) => {
    const { oldUsername, oldPassword, newUsername, newPassword } = credentials;

    // Validate old credentials
    const validateQuery = "SELECT * FROM user WHERE username = ? AND password = ?";
    const updateQuery = "UPDATE user SET username = ?, password = ? WHERE username = ? AND password = ?";

    return new Promise((resolve, reject) => {
        db.get(validateQuery, [oldUsername, oldPassword], (error, row) => {
            if (error) {
                console.error('Error validating credentials:', error);
                reject({ success: false, message: 'Database error during validation.' });
            } else if (row) {
                // If old credentials are valid, update to new credentials
                db.run(updateQuery, [newUsername, newPassword, oldUsername, oldPassword], (err) => {
                    if (err) {
                        console.error('Error updating credentials:', err);
                        reject({ success: false, message: 'Database error during update.' });
                    } else {
                        resolve({ success: true });
                    }
                });
            } else {
                resolve({ success: false, message: 'Old username or password is incorrect.' });
            }
        });
    });
});
