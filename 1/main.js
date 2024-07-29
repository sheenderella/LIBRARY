const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const db = require('./database.js');

let mainWindow, loginWindow, addBorrowWindow, updateBorrowWindow;

function createWindow(options) {
    const window = new BrowserWindow({
        width: options.width || 800,
        height: options.height || 600,
        parent: options.parent || null,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    window.loadFile(options.filePath);

    window.on('closed', () => {
        if (options.onClose) options.onClose();
    });

    return window;
}

function createMainWindow() {
    mainWindow = createWindow({
        filePath: 'index.html',
    });
}

function createLoginWindow() {
    loginWindow = createWindow({
        filePath: 'login.html',
    });
}

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
ipcMain.handle('login', (event, obj) => validatelogin(obj));

ipcMain.handle('logout', async () => {
    createLoginWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
});

ipcMain.handle('addBorrow', async (event, record) => executeQuery(
    'INSERT INTO borrow (borrowerName, bookTitle, borrowDate, borrowStatus, createdAt) VALUES (?, ?, ?, ?, datetime("now"))',
    [record.borrowerName, record.bookTitle, record.borrowDate, record.borrowStatus],
    function () {
        record.id = this.lastID;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('borrow-record-added', record);
        }
    }
));

ipcMain.handle('updateBorrow', async (event, record) => {
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


ipcMain.handle('deleteBorrow', async (event, id) => {
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

ipcMain.handle('getBorrowerLog', async (event, name) => executeSelectQuery(
    'SELECT * FROM borrow WHERE borrowerName = ?',
    [name]
));

ipcMain.on('open-add-borrow-window', createAddBorrowWindow);
ipcMain.on('open-update-window', (event, record) => createUpdateBorrowWindow(record));
ipcMain.on('close-form-window', closeAllFormWindows);

function validatelogin({ username, password }) {
    const sql = "SELECT * FROM user WHERE username=? AND password=?";
    db.get(sql, [username, password], (error, result) => {
        if (error) {
            console.log(error);
            return;
        }

        if (result) {
            createMainWindow();
            if (mainWindow) mainWindow.show();
            if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close();
        } else {
            new Notification({
                title: "Login",
                body: 'Username or password incorrect',
            }).show();
        }
    });
}

function executeQuery(sql, params, callback) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
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

///BOOK

ipcMain.handle('listBookRecords', async () => {
    return await executeSelectQuery('SELECT * FROM books ORDER BY createdAt DESC');
});



