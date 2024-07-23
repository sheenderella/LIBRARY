const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const db = require('./database.js');

let win;
let winlogin;

function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'index.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');

    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        if (message.includes("Autofill")) {
            event.preventDefault();
        }
    });
}

function loginWindow() {
    winlogin = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'login.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    winlogin.loadFile('login.html');
}

app.whenReady().then(loginWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle('login', (event, obj) => {
    validatelogin(obj);
});

function validatelogin(obj) {
    const { username, password } = obj;
    const sql = "SELECT * FROM user WHERE username=? AND password=?";
    db.get(sql, [username, password], (error, result) => {
        if (error) {
            console.log(error);
            return;
        }

        if (result) {
            createWindow();
            win.show();
            winlogin.close();
        } else {
            new Notification({
                title: "Login",
                body: 'Username or password incorrect'
            }).show();
        }
    });
}

// Handle CRUD operations for borrow
ipcMain.handle('getBorrows', async () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM borrow', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
});

ipcMain.handle('addBorrow', async (event, record) => {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO borrow (borrowerName, bookTitle, borrowDate, borrowStatus) VALUES (?, ?, ?, ?)';
        db.run(sql, [record.borrowerName, record.bookTitle, record.borrowDate, record.borrowStatus], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
});

ipcMain.handle('getBorrow', async (event, id) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM borrow WHERE id = ?', [id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
});

ipcMain.handle('updateBorrow', async (event, record) => {
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE borrow SET borrowerName = ?, bookTitle = ?, borrowDate = ?, borrowStatus = ? WHERE id = ?';
        db.run(sql, [record.borrowerName, record.bookTitle, record.borrowDate, record.borrowStatus, record.id], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
});

ipcMain.handle('deleteBorrow', async (event, id) => {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM borrow WHERE id = ?';
        db.run(sql, [id], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
});

ipcMain.handle('getBorrowerLog', async (event, borrowerName) => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT bookTitle, borrowDate, borrowStatus FROM borrow WHERE borrowerName = ?';
        db.all(sql, [borrowerName], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
});

ipcMain.on('open-borrower-log', (event, borrowerName) => {
    const borrowerLogWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'borrowerLog.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    borrowerLogWindow.loadFile('borrowerLog.html');

    borrowerLogWindow.webContents.once('did-finish-load', () => {
        borrowerLogWindow.webContents.send('load-borrower-log', borrowerName);
    });
});
