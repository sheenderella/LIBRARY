const { app, BrowserWindow, ipcMain, Notification, dialog } = require('electron');
const sqlite3 = require('sqlite3').verbose();;

const path = require('path');
const db = require('./database.js');
const betterSqlite = require('better-sqlite3');
const fs = require('fs');
const ExcelJS = require('exceljs'); 


let mainWindow, loginWindow, addBorrowWindow, updateBorrowWindow, addBookWindow, editBookWindow, deleteNotifWindow;
let selectedBookIds = []; // Make sure this variable is populated with the correct IDs


function createWindow(options) {
    const window = new BrowserWindow({
        width: options.width || 800,
        height: options.height || 600,
        parent: options.parent || null,
        resizable: false, // Prevents resizing
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

//DASHBOARD
function createMainWindow() {
    mainWindow = createWindow({
        filePath: 'index.html',
        width: 1200,
        height: 680,
    });
}

// Create a new function for the Add Book button in index.html
function createAddBookFromIndexWindow() {
    addBookWindow = createWindow({
        filePath: path.join(__dirname, 'books', 'addBook.html'),
        width: 600,
        height: 600,
        parent: mainWindow,
        onClose: () => (addBookWindow = null),
    });

    // Ensure the window is not reused elsewhere
    addBookWindow.webContents.on('did-finish-load', () => {
        // You can send specific data or commands here if necessary
    });
}

// Listen for the event from index.js
ipcMain.on('open-add-book-from-index-window', () => {
    if (!addBookWindow) {
        createAddBookFromIndexWindow();
    } else {
        addBookWindow.focus();
    }
});

// Function to open the books page
function createBooksPageWindow() {
    if (!mainWindow) {
        createMainWindow(); // Make sure the main window is created if it's not already
    }
    // You can adjust the navigation logic to ensure the books page is loaded within the main window
    mainWindow.loadFile(path.join(__dirname, 'books', 'books.html'));
}

// Listen for the event to open the books page
ipcMain.on('open-books-page', () => {
    createBooksPageWindow();
});


// Function to get the total number of borrowed books
async function getBorrowedBooksCount() {
    const sql = "SELECT COUNT(*) AS count FROM borrow";
    return new Promise((resolve, reject) => {
        db.get(sql, [], (error, row) => {
            if (error) {
                reject(error);
            } else {
                resolve(row.count);
            }
        });
    });
}

// Register the IPC handler for getBorrowedBooksCount
ipcMain.handle('getBorrowedBooksCount', async () => {
    try {
        const count = await getBorrowedBooksCount();
        return count;
    } catch (error) {
        console.error('Error fetching borrowed books count:', error);
        throw error;
    }
});

// Function to get the number of books by their borrowStatus
async function getBooksCountByStatus() {
    const sql = `
        SELECT borrowStatus, COUNT(*) AS count
        FROM borrow
        GROUP BY borrowStatus
    `;
    return new Promise((resolve, reject) => {
        db.all(sql, [], (error, rows) => {
            if (error) {
                reject(error);
            } else {
                // Convert the rows into a more usable object
                const counts = {
                    borrowed: 0,
                    overdue: 0,
                    returned: 0,
                    returnedOverdue: 0
                };

                rows.forEach(row => {
                    if (row.borrowStatus === 'borrowed') counts.borrowed = row.count;
                    if (row.borrowStatus === 'overdue') counts.overdue = row.count;
                    if (row.borrowStatus === 'returned') counts.returned = row.count;
                    if (row.borrowStatus === 'returned overdue') counts.returnedOverdue = row.count;
                });

                resolve(counts);
            }
        });
    });
}

// Register the IPC handler for getting books by status
ipcMain.handle('getBooksCountByStatus', async () => {
    try {
        const counts = await getBooksCountByStatus();
        return counts;
    } catch (error) {
        console.error('Error fetching books count by status:', error);
        throw error;
    }
});


// Function to fetch unique borrowers
ipcMain.handle('getUniqueBorrowers', async () => {
    try {
        // Assuming you have a function `getUniqueBorrowersFromDB` that returns an array of unique borrower names
        const uniqueBorrowers = await getUniqueBorrowersFromDB();
        return uniqueBorrowers;
    } catch (error) {
        console.error('Error fetching unique borrowers:', error);
        return [];
    }
});

// Function to fetch unique borrowers from the database
async function getUniqueBorrowersFromDB() {
    const sql = 'SELECT DISTINCT borrowerName FROM borrow';
    return executeSelectQuery(sql);
}



//GRAPH
// Register IPC handlers
ipcMain.handle('getBooksCount', async (event) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) AS count FROM books', (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row.count);
            }
        });
    });
});


// LOGIN (updated)
function createLoginWindow() {
    loginWindow = createWindow({
        filePath: path.join(__dirname, 'login', 'login.html'),
    });

    ipcMain.on('open-forgot-password-window', () => { 
        createForgotPasswordWindow();
    });
}

//FORGOT PASSWORD
let forgotPasswordWindow = null; // Declare the variable outside the function to track the window instance

function createForgotPasswordWindow() {
    if (forgotPasswordWindow === null) { // Only create the window if it doesn't already exist
        forgotPasswordWindow = new BrowserWindow({
            width: 450,
            height: 400,
            parent: loginWindow, 
            modal: true, 
            show: false,
            resizable: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        forgotPasswordWindow.loadFile(path.join(__dirname, 'login', 'forgotPass.html'));

        forgotPasswordWindow.once('ready-to-show', () => {
            forgotPasswordWindow.show();
        });

        // Ensure the forgot password window is properly handled when it's closed
        forgotPasswordWindow.on('close', () => {
            forgotPasswordWindow = null; 
        });

        // Close the forgot password window when the login window is closed
        loginWindow.on('close', () => {
            if (forgotPasswordWindow && !forgotPasswordWindow.isDestroyed()) {
                forgotPasswordWindow.close();
            }
        });
    }
};

//DELETE WARNING
function createDeleteNotifWindow() {
    deleteNotifWindow = createWindow({
        filePath: path.join(__dirname, 'books', 'deleteNotif.html'),
        width: 400,
        height: 300,
        parent: mainWindow,
        onClose: () => (deleteNotifWindow = null),
    });
}


// Handle IPC calls
//LOGIN
ipcMain.handle('login', async (event, obj) => {
    try {
        const loginResult = await validatelogin(obj);
        return loginResult;
    } catch (error) {
        return { success: false, error: 'An error occurred during login' };
    }
});

//LOGOUT
ipcMain.handle('logout', async () => {
    createLoginWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
});


//LOGIN
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


// After successful login, store the username
function validatelogin({ username, password }) {
    const sql = "SELECT * FROM user WHERE username=? AND password=?";
    db.get(sql, [username, password], (error, result) => {
        if (error) {
            console.log(error);
            return;
        }

        if (result) {
            loggedInUsername = username; // Store the logged-in username
            createMainWindow();
            if (mainWindow) mainWindow.show();
            if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close();
        } else {
            clearLoginFields();
        }
    });
}

function clearLoginFields() {
    if (loginWindow) {
        loginWindow.webContents.send('clear-login-fields');
    }
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


// Variable to store the reset password window instance
let resetPasswordWindow = null;

// Function to create the Reset Password window and pass the username
function createResetPasswordWindow(username) {
    if (resetPasswordWindow) {
        resetPasswordWindow.focus(); // Bring the existing window to the front if it's already open
        return;
    }

    resetPasswordWindow = new BrowserWindow({
        width: 400,
        height: 500,
        parent: mainWindow, // Ensure it is a child of the main window
        resizable: false,
        modal: true,
        alwaysOnTop: true,      // Keep the popup on top of other windows
        movable: true,          // Allow moving the popup around
        center: true,           // Center the window on the screen
        show: true, // Ensure the window is visible when created
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    resetPasswordWindow.loadFile(path.join(__dirname, 'login', 'reset.html')); // Load the HTML file for the Reset Password window

    resetPasswordWindow.on('closed', () => {
        resetPasswordWindow = null; // Handle cleanup when the window is closed
    });

    // Send the username to the reset.html renderer once the window is ready
    resetPasswordWindow.once('ready-to-show', () => {
        resetPasswordWindow.webContents.send('set-username', username);
    });
}

// IPC handler to open the reset password window
ipcMain.handle('open-reset-password-window', (event, username) => {
    createResetPasswordWindow(username); // Calls the function to create the Reset Password window with the username
});

ipcMain.on('close-window', (event) => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
        window.close();
    }
});


//CHANGE USERNAME
let changeUsernameWindow; // Declare the variable at the top

// Function to create the Change Username window
function createChangeUsernameWindow() {
    if (changeUsernameWindow) {
        changeUsernameWindow.focus(); // Bring the existing window to the front if it's already open
        return;
    }

    changeUsernameWindow = new BrowserWindow({
        width: 400,
        height: 600,
        parent: mainWindow, // Ensures it is a child of the main window
        resizable: false,
        show: true, // Ensures the window is visible when created
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    changeUsernameWindow.loadFile(path.join(__dirname, 'settings', 'username.html')); // Load the HTML file for the Change Username window

    changeUsernameWindow.on('closed', () => {
        changeUsernameWindow = null; // Handle cleanup when the window is closed
    });
}

// Listen for the event to open the Change Username window
ipcMain.handle('open-change-username-window', () => {
    createChangeUsernameWindow(); // Calls the function to create the Change Username window
});

// IPC handler to change the username
ipcMain.handle('change-username', async (event, { newUsername, currentPassword }) => {
    try {
        // Validate the current password and get the user details
        const user = await validateCurrentPassword(currentPassword);

        if (!user) {
            return { success: false, error: 'Current password is incorrect' };
        }

        // Check if the new username is the same as the current one
        if (user.username === newUsername) {
            return { success: false, error: 'The new username is the same as the current username.' };
        }

        // Update the username in the database
        await executeQuery('UPDATE user SET username = ? WHERE id = ?', [newUsername, user.id]);

        // Update the loggedInUsername after changing it
        loggedInUsername = newUsername;

        return { success: true };
    } catch (error) {
        console.error('Error changing username:', error);
        return { success: false, error: 'An error occurred while changing the username.' };
    }
});



//CHANGE PASSWORD
let changePasswordWindow; // Declare the variable at the top

// Function to create the Change Password window
function createChangePasswordWindow() {
    if (changePasswordWindow) {
        changePasswordWindow.focus(); // Bring the existing window to the front if it's already open
        return;
    }

    changePasswordWindow = new BrowserWindow({
        width: 400,
        height: 650,
        parent: mainWindow, // Ensures it is a child of the main window
        resizable: false,
        show: true, // Ensures the window is visible when created
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    changePasswordWindow.loadFile(path.join(__dirname, 'settings', 'password.html')); // Load the HTML file for the Change Password window

    changePasswordWindow.on('closed', () => {
        changePasswordWindow = null; // Handle cleanup when the window is closed
    });
}

// Listen for the event to open the Change Password window
ipcMain.handle('open-change-password-window', () => {
    createChangePasswordWindow(); // Calls the function to create the Change Password window
});

//Change Password IPC Handler
ipcMain.handle('change-password', async (event, { currentPassword, newPassword, passwordHint }) => {
    try {
        console.log('Received change-password request');
        const user = await validateCurrentPassword(currentPassword);

        if (!user) {
            console.log('Current password is incorrect');
            return { success: false, error: 'Current password is incorrect' };
        }

        if (currentPassword === newPassword) {
            console.log('New password is the same as the current password');
            return { success: false, error: 'The new password cannot be the same as the current password.' };
        }

        await executeQuery('UPDATE user SET password = ?, hint = ? WHERE id = ?', [newPassword, passwordHint, user.id]);

        console.log('Password and hint updated successfully');
        return { success: true };
    } catch (error) {
        console.error('Error changing password:', error);
        return { success: false, error: error.message };
    }
});


// Handle retrieving the password hintipcMain.handle('get-password-hint', async (event, username) => {
    ipcMain.handle('get-password-hint', async (event, username) => {
        try {
            console.log(`Retrieving password hint for username: ${username}`);
            
            const result = await new Promise((resolve, reject) => {
                db.all('SELECT hint FROM user WHERE username = ?', [username], (err, rows) => {
                    if (err) {
                        console.error('Error executing query:', err);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });
    
            console.log('Database query result:', result);
    
            if (result.length > 0) {
                console.log(`Hint found for ${username}: ${result[0].hint}`);
                return { success: true, hint: result[0].hint };
            } else {
                console.log(`No hint found for username: ${username}`);
                return { success: false, error: 'No hint found for this username.' };
            }
        } catch (error) {
            console.error('Error retrieving password hint:', error);
            return { success: false, error: 'Failed to retrieve password hint.' };
        }
    });
    


async function validateCurrentPassword(password) {
    const sql = "SELECT * FROM user WHERE username = ? AND password = ?";
    return new Promise((resolve, reject) => {
        db.get(sql, [loggedInUsername, password], (error, row) => {
            if (error) {
                reject(error);
            } else {
                resolve(row);
            }
        });
    });
}

// Add this handler to fetch the current password from the database
ipcMain.handle('get-current-password', async () => {
    try {
        const sql = "SELECT password FROM user WHERE username = ?";
        return new Promise((resolve, reject) => {
            db.get(sql, [loggedInUsername], (error, row) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(row ? row.password : null);
                }
            });
        });
    } catch (error) {
        console.error('Error fetching current password:', error);
        throw error;
    }
});




//SECURITY-SETUP
let securitySetupWindow;

// Function to create the Security Setup window
function createSecuritySetupWindow() {
    if (securitySetupWindow) {
        securitySetupWindow.focus(); // Bring the existing window to the front if it's already open
        return;
    }

    securitySetupWindow = new BrowserWindow({
        width: 400,
        height: 650,
        parent: mainWindow, // Ensure it is a child of the main window
        resizable: false,
        show: true, // Ensure the window is visible when created
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    securitySetupWindow.loadFile(path.join(__dirname, 'settings', 'security.html')); // Load the HTML file for the Security Setup window

    securitySetupWindow.on('closed', () => {
        securitySetupWindow = null; // Handle cleanup when the window is closed
    });
}

ipcMain.handle('open-security-setup-window', () => {
    createSecuritySetupWindow(); // Calls the function to create the Security Setup window
});


// IPC handler to save the security question
ipcMain.handle('save-security-question', async (event, { question, answer, currentPassword }) => {
    try {
        // Validate the current password
        const user = await validateCurrentPassword(currentPassword);

        if (!user) {
            return { success: false, error: 'Current password is incorrect' };
        }

        // Save the security question and answer in the database
        await executeQuery('UPDATE user SET security_question = ?, security_answer = ? WHERE id = ?', [question, answer, user.id]);

        return { success: true };
    } catch (error) {
        console.error('Error saving security question:', error);
        return { success: false, error: 'An error occurred while saving the security question.' };
    }
});

// Handle retrieving the security question based on the username
ipcMain.handle('get-security-question', async (event, username) => {
    try {
        console.log(`Fetching security question for username: ${username}`);
        
        const result = await new Promise((resolve, reject) => {
            db.all('SELECT security_question FROM user WHERE username = ?', [username], (err, rows) => {
                if (err) {
                    console.error('Error executing query:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        console.log('Database query result:', result);

        if (result.length > 0) {
            console.log(`Security question found for ${username}: ${result[0].security_question}`);
            return { success: true, question: result[0].security_question };
        } else {
            console.log(`No security question found for username: ${username}`);
            return { success: false, error: 'No security question found for this username.' };
        }
    } catch (error) {
        console.error('Error fetching security question:', error);
        return { success: false, error: 'An error occurred while fetching the security question.' };
    }
});

// Handle verifying the security answer
ipcMain.handle('verify-security-answer', async (event, { username, answer }) => {
    try {
        const result = await new Promise((resolve, reject) => {
            db.get('SELECT security_answer FROM user WHERE username = ?', [username], (err, row) => {
                if (err) {
                    reject(err); // Reject the promise if an error occurs
                } else {
                    resolve(row); // Resolve with the row (or null if no user is found)
                }
            });
        });

        // If no user is found, return an error
        if (!result) {
            return { success: false, error: 'Username not found.' };
        }

        // Perform a case-insensitive comparison of the answers
        const storedAnswer = result.security_answer.toLowerCase();
        const userAnswer = answer.toLowerCase();

        if (storedAnswer === userAnswer) {
            return { success: true }; // Success if answers match
        } else {
            return { success: false, error: 'Incorrect security answer.' }; // Error if answers don't match
        }
    } catch (error) {
        console.error('Error verifying security answer:', error);
        return { success: false, error: 'An error occurred while verifying the answer.' };
    }
});


// Handle changing the password
ipcMain.handle('change', async (event, { username, newPassword }) => {
    try {
        await new Promise((resolve, reject) => {
            db.run('UPDATE user SET password = ? WHERE username = ?', [newPassword, username], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        return { success: true };
    } catch (error) {
        console.error('Error changing password:', error);
        return { success: false, error: 'An error occurred while changing the password.' };
    }
});



///BOOKS
ipcMain.on('open-add-book-window', () => {
    if (!addBookWindow) {
        createAddBookWindow();
    } else {
        addBookWindow.focus();
    }
});

function createAddBookWindow() {
    addBookWindow = createWindow({
        filePath: path.join(__dirname, 'books', 'addBook.html'),
        width: 600,
        height: 600,
        parent: mainWindow,
        onClose: () => (addBookWindow = null),
    });
}

function createEditBookWindow(record) {
    editBookWindow = createWindow({
        filePath: path.join(__dirname, 'books', 'editBook.html'),
        width: 600,
        height: 600,

        parent: mainWindow,
        onClose: () => (editBookWindow = null),
    });

    editBookWindow.webContents.on('did-finish-load', () => {
        editBookWindow.webContents.send('fill-edit-form', record);
    });
}

ipcMain.on('open-edit-book-window', (event, record) => {
    if (!editBookWindow) {
        createEditBookWindow(record);
    } else {
        editBookWindow.focus();
        editBookWindow.webContents.send('fill-edit-form', record);
    }
});

//BOOK'S CRUD OPERATION
ipcMain.handle('addBook', async (event, record) => {
    try {
        await executeQuery(
            'INSERT INTO books (date_received, class, author, title_of_book, edition, volume, pages, year, source_of_fund, cost_price, publisher, condition, remarks, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
            [record.date_received, record.class, record.author, record.title_of_book, record.edition, record.volume, record.pages, record.year, record.source_of_fund, record.cost_price, record.publisher, record.condition, record.remarks],
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

ipcMain.handle('updateBook', async (event, record) => {
    try {
        await executeQuery(
            'UPDATE books SET number = ?, date_received = ?, class = ?, author = ?, title_of_book = ?, edition = ?, volume = ?, pages = ?, year = ?, source_of_fund = ?, cost_price = ?, publisher = ?, condition = ?, remarks = ? WHERE id = ?',
            [record.number, record.date_received, record.class, record.author, record.title_of_book, record.edition, record.volume, record.pages, record.year, record.source_of_fund, record.cost_price, record.publisher, record.condition, record.remarks, record.id]
        );

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('book-record-updated', record);
        }
    } catch (error) {
        console.error('Error updating book record:', error);
    }
});

ipcMain.handle('deleteBook', async (event, id) => {
    try {
        await new Promise((resolve, reject) => {
            executeQuery(
                'DELETE FROM books WHERE id = ?',
                [id],
                (error, results) => {
                    if (error) {
                        reject(error); // Reject promise if there's an error
                    } else {
                        resolve(results); // Resolve promise on success
                    }
                }
            );
        });

        // Notify the main window after the record is deleted
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('book-record-deleted', id);
        }
    } catch (error) {
        console.error('Error deleting book record:', error);
        // Optionally send an error notification to the renderer process
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('book-record-deletion-error', error.message);
        }
    }
});

ipcMain.handle('archiveBook', async (event, id) => {
    try {
        await new Promise((resolve, reject) => {
            executeQuery(
                'UPDATE books SET is_deleted = TRUE WHERE id = ?',
                [id],
                (error, results) => {
                    if (error) {
                        reject(error); // Reject promise if there's an error
                    } else {
                        resolve(results); // Resolve promise on success
                    }
                }
            );
        });

        // Notify the main window after the record is archived
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('book-record-archived', id);
        }
    } catch (error) {
        console.error('Error archiving book record:', error);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('book-record-archive-error', error.message);
        }
    }
});


ipcMain.handle('getBooks', async () => {
    try {
    
        const books = await executeSelectQuery(
            'SELECT * FROM books WHERE is_deleted = FALSE ORDER BY createdAt DESC'
        );
        return books;
    } catch (error) {
        console.error('Error fetching book records:', error);
        return [];
    }
});

ipcMain.handle('getBooksArchive', async () => {
    try {
    
        const books = await executeSelectQuery(
            'SELECT * FROM books WHERE is_deleted = TRUE ORDER BY createdAt DESC'
        );
        return books;
    } catch (error) {
        console.error('Error fetching book records:', error);
        return [];
    }
});

ipcMain.handle('unarchiveBook', async (event, id) => {
    try {
        await new Promise((resolve, reject) => {
            executeQuery(
                'UPDATE books SET is_deleted = FALSE WHERE id = ?',
                [id],
                (error, results) => {
                    if (error) {
                        reject(error); // Reject promise if there's an error
                    } else {
                        resolve(results); // Resolve promise on success
                    }
                }
            );
        });

        // Notify the main window after the record is archived
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('book-record-unarchived', id);
        }
    } catch (error) {
        console.error('Error archiving book record:', error);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('book-record-unarchive-error', error.message);
        }
    }
});



//BORROW
ipcMain.handle('getBookId', async (event, bookTitle, bookVolume, bookEdition) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT id FROM books 
            WHERE title_of_book = ? 
            AND (volume = ? OR volume IS NULL) 
            AND (edition = ? OR edition IS NULL)
        `; // Ensure proper SQL syntax with logical AND for grouping

        db.get(sql, [bookTitle, bookVolume || null, bookEdition || null], (err, row) => {
            if (err) {
                console.error('Database error:', err); // Log the error
                return reject(err); // Reject with error
            }
            resolve(row ? row.id : null); // Return the book ID or null if not found
        });
    });
});


// Handle the 'fetch-book-details' event
ipcMain.handle('fetch-book-details', async (event, bookId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, number, date_received, author, title_of_book, edition,
                   source_of_fund, cost_price, publisher, year, remarks, 
                   volume, pages, condition, class
            FROM books
            WHERE id = ?
        `;

        db.get(query, [bookId], (err, row) => {
            if (err) {
                console.error('Database query error:', err);
                reject(err);
            } else {
                resolve(row || null); // Return the book details or null if not found
            }
        });
    });
});

ipcMain.handle('getBorrows', async () => {
    try {
        const query = `
            SELECT 
                borrow.id,
                borrow.borrowDate,
                borrow.borrowStatus,
                borrow.createdAt,
                borrow.returnDate,
                borrow.dueDate,
                Profiles.borrower_id,
                Profiles.name AS borrower_name,
                Profiles.phone_number,         -- Include phone number
                Profiles.email,                -- Include email
                books.id AS book_id,              -- Ensure book ID is fetched
                books.title_of_book AS book_title
            FROM borrow
            JOIN Profiles ON borrow.borrower_id = Profiles.borrower_id
            JOIN books ON borrow.book_id = books.id
            ORDER BY borrow.createdAt ASC
        `;
        console.log('Executing query:', query);  // Log query execution

        const borrowRecords = await executeSelectQuery(query);
        
        console.log('Fetched Borrow Records:', borrowRecords);  // Log results
        
        return borrowRecords;
    } catch (error) {
        console.error('Error fetching borrow records:', error);
        throw new Error('Failed to fetch borrow records');
    }
});


function executeSelectQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        console.log('Executing query:', query);  // Add this log to see the query execution
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Database query failed:', err); // Log the error
                reject(err);
            } else {
                console.log('Query result:', rows); // Log the result
                resolve(rows);
            }
        });
    });
}

ipcMain.handle('getBorrowerLog', async (event, borrowerId) => {
    try {
        const query = `
            SELECT borrow.*, Profiles.name AS borrower_name, books.title_of_book AS book_title
            FROM borrow
            JOIN Profiles ON borrow.borrower_id = Profiles.borrower_id
            JOIN books ON borrow.book_id = books.id
            WHERE borrow.borrower_id = ?
        `;
        const borrowRecords = await executeSelectQuery(query, [borrowerId]);
        
        console.log('Fetched Borrow Records for Borrower ID:', borrowerId, borrowRecords);
        return borrowRecords;
    } catch (error) {
        console.error('Error fetching borrower log:', error);
        throw new Error('Failed to fetch borrower log');
    }
});

ipcMain.handle('getBookBorrowRecords', async (event, bookId) => {
    try {
        const query = `
            SELECT 
                borrow.id AS borrow_id,
                borrow.borrowStatus,
                borrow.borrowDate,
                borrow.returnDate,
                borrow.dueDate,
                Profiles.name AS borrower_name,
                books.title_of_book AS book_title
            FROM borrow
            JOIN Profiles ON borrow.borrower_id = Profiles.borrower_id
            JOIN books ON borrow.book_id = books.id
            WHERE borrow.book_id = ?
            ORDER BY borrow.borrowDate ASC
        `;
        
        console.log('Executing query to fetch borrow records for book:', query);  // Log query execution

        const bookBorrowRecords = await executeSelectQuery(query, [bookId]);

        console.log('Fetched Borrow Records for Book ID:', bookId, bookBorrowRecords);  // Log fetched records
        
        return bookBorrowRecords;
    } catch (error) {
        console.error('Error fetching borrow records by book ID:', error);
        throw new Error('Failed to fetch borrow records by book ID');
    }
});

//ADD
ipcMain.on('open-add-borrow-window', createAddBorrowWindow);
ipcMain.on('close-form-window', closeAllFormWindows);

function closeAllFormWindows() {
    [addBorrowWindow, updateBorrowWindow].forEach(window => {
        if (window && !window.isDestroyed()) window.close();
    });
}

// Add Borrow Window
function createAddBorrowWindow() {
    if (!addBorrowWindow) {
        addBorrowWindow = createWindow({
            filePath: path.join(__dirname, 'borrow', 'addBorrow.html'),
            width: 400,
            height: 640,
            parent: mainWindow,
            onClose: () => (addBorrowWindow = null),
        });
    } else {
        addBorrowWindow.focus();
    }
}

ipcMain.handle('addBorrow', async (event, record) => {
    try {
        // Validate borrower ID
        const borrowerExists = await executeSelectQuery(
            'SELECT * FROM Profiles WHERE borrower_id = ? AND is_deleted = 0',
            [record.borrowerID]
        );

        if (borrowerExists.length === 0) {
            mainWindow.webContents.send('borrow-error', {
                message: 'Borrower ID does not exist. Please try again',
                type: 'error'
            });
            return;
        }

        // Validate book ID
        const bookExists = await executeSelectQuery(
            'SELECT * FROM books WHERE id = ? AND is_deleted = 0',
            [record.bookId]  // Using the unique bookId for validation
        );

        if (bookExists.length === 0) {
            mainWindow.webContents.send('borrow-error', {
                message: 'Book ID does not exist. Please try again',
                type: 'error'
            });
            return;
        }

        // Check if the book with this exact ID is already borrowed or overdue
        const bookStatus = await executeSelectQuery(
            'SELECT borrowStatus FROM borrow WHERE book_id = ? AND (borrowStatus = "borrowed" OR borrowStatus = "overdue")',
            [record.bookId] // Ensure this `bookId` is for the specific edition selected
        );

        if (bookStatus.length > 0) {
            mainWindow.webContents.send('borrow-error', {
                message: 'This book is already borrowed',
                type: 'error'
            });
            return;
        }


        // Add the borrow record with borrower_id and book_id
        await executeQuery(
            'INSERT INTO borrow (borrower_id, book_id, borrowDate, dueDate, borrowStatus, createdAt) VALUES (?, ?, ?, ?, ?, datetime("now"))',
            [record.borrowerID, record.bookId, record.borrowDate, record.dueDate, record.borrowStatus]
        );

        mainWindow.webContents.send('borrow-record-added', {
            message: 'Borrow record successfully added',
            type: 'success',
            record
        });
    } catch (error) {
        console.error('Error adding borrow record:', error);
        mainWindow.webContents.send('borrow-error', {
            message: 'Error adding borrow record',
            type: 'error'
        });
    }
});


// Handle fetching all book titles for suggestions, returning unique combinations of title, volume, edition, etc.
ipcMain.handle('getBookTitles', async () => {
    try {
        const bookTitles = await executeSelectQuery(
            `SELECT id as bookId, title_of_book, volume, edition, year 
            FROM books 
            WHERE is_deleted != 1 AND id NOT IN 
            (SELECT book_id FROM borrow WHERE borrowStatus = 'borrowed' OR borrowStatus = 'overdue')`
        );
        return bookTitles; // Return the full details including unique bookId
    } catch (error) {
        console.error('Error fetching book titles:', error);
        throw new Error('Failed to fetch book titles');
    }
});

// Handle check if the book is already borrowed
ipcMain.handle('checkBookBorrowed', async (event, bookId) => {
    try {
        const bookStatus = await executeSelectQuery(
            'SELECT borrowStatus FROM borrow WHERE book_id = ? AND (borrowStatus = "borrowed" OR borrowStatus = "overdue")',
            [bookId]
        );
        return bookStatus.length > 0; // Return true if borrowed, false otherwise
    } catch (error) {
        console.error('Error checking if book is borrowed:', error);
        return false;
    }
});



// Handle searching for books and fetch all details for books with the same title
ipcMain.handle('getBookDetails', async (event, title) => {
    try {
        // Fetch book details including the unique bookId
        const bookDetails = await executeSelectQuery(
            'SELECT id as bookId, title_of_book, year, volume, edition FROM books WHERE title_of_book = ?',
            [title]
        );

        if (bookDetails.length > 0) {
            console.log('Fetched book details:', bookDetails); 
            return bookDetails;
        } else {
            console.error('No records found for title:', title);
            return [];
        }
    } catch (error) {
        console.error('Error fetching book details:', error);
        throw new Error('Failed to fetch book details');
    }
});

ipcMain.handle('getBorrowerIDs', async () => {
    try {
        const borrowerIDs = await executeSelectQuery('SELECT borrower_id FROM Profiles WHERE is_deleted = 0'); // Filter by is_deleted = 0
        return borrowerIDs.map(borrower => borrower.borrower_id); // Return only the IDs
    } catch (error) {
        console.error('Error fetching borrower IDs:', error);
        throw new Error('Failed to fetch borrower IDs');
    }
});

ipcMain.handle('getBorrowerNameByID', async (event, id) => {
    try {
        const result = await executeSelectQuery(`SELECT name FROM Profiles WHERE borrower_id = ? AND is_deleted = 0`, [id]); // Fetch the borrower name
        if (result.length > 0) {
            return result[0].name; // Assuming 'name' is the column that holds the borrower's name
        } else {
            throw new Error('Borrower not found');
        }
    } catch (error) {
        console.error('Error fetching borrower name:', error);
        throw new Error('Failed to fetch borrower name');
    }
});

// IPC handler for fetching borrower names
ipcMain.handle('getBorrowerNames', async () => {
    try {
        // Adjust the SQL query to match your actual database schema
        const result = await executeSelectQuery(`SELECT name FROM Profiles WHERE is_deleted = 0`); // Fetch all borrower names
        return result.map(row => row.name); // Return an array of names
    } catch (error) {
        console.error('Error fetching borrower names:', error);
        throw new Error('Failed to fetch borrower names');
    }
});

// IPC handler for fetching borrower ID by name
ipcMain.handle('getBorrowerIDByName', async (event, name) => {
    try {
        const result = await executeSelectQuery(`SELECT borrower_id FROM Profiles WHERE name = ? AND is_deleted = 0`, [name]); // Fetch borrower ID
        if (result.length > 0) {
            return result[0].borrower_id; // Assuming 'borrower_id' is the column that holds the borrower's ID
        } else {
            throw new Error('Borrower not found');
        }
    } catch (error) {
        console.error('Error fetching borrower ID:', error);
        throw new Error('Failed to fetch borrower ID');
    }
});


ipcMain.on('update-borrow-status', (event, updatedStatus) => {
    const { id, status, returnDate } = updatedStatus;

    // Update the borrow status in the database
    const query = `UPDATE borrow SET "borrowStatus" = ?, "returnDate" = COALESCE(?, "returnDate") WHERE id = ?`;
    db.run(query, [status, returnDate, id], function (err) {
        if (err) {
            console.error('Failed to update borrow status:', err.message);
            event.reply('borrow-status-updated', { success: false, message: 'Failed to update status' });
            return;
        }
        console.log('Borrow status updated successfully');
        event.reply('borrow-status-updated', { success: true, message: 'Status updated' });
    });
});



//DELETE
// Handle delete borrow
ipcMain.handle('deleteBorrow', async (event, id) => {
    try {
        await executeQuery(
            'DELETE FROM borrow WHERE id = ?',
            [id]
        );

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('borrow-record-deleted', id);
        }
    } catch (error) {
        console.error('Error deleting borrow record:', error);
    }
});

ipcMain.handle('deleteSelectedBorrows', async (event, ids) => {
    try {
        // Replace this with your actual database deletion logic
        await deleteFromDatabase(ids); // Function to delete records from the database
        return true; // Return success to the renderer process
    } catch (error) {
        console.error('Error deleting records:', error);
        throw new Error('Failed to delete records.'); // Return failure
    }
});

async function deleteFromDatabase(ids) {
    const query = `DELETE FROM borrow WHERE id IN (${ids.map(() => '?').join(',')})`;
    
    try {
        // Assuming db.run is the function that executes SQL commands in your setup
        await db.run(query, ...ids);
        console.log(`Successfully deleted records with IDs: ${ids}`);
    } catch (error) {
        console.error('Error deleting records from database:', error);
        throw error; // re-throw the error so it can be handled in the main process
    }
}

ipcMain.handle('show-confirmation-dialog', async (event, { title, message }) => {
    const result = await dialog.showMessageBox({
        type: 'question',
        buttons: ['Yes', 'No'],
        defaultId: 1,  // 'No' as default
        title: title,
        message: message
    });

    // Return true if user selected 'Yes' (button index 0)
    return result.response === 0;
});

ipcMain.on('open-condition-window', (event, { bookId, borrowId, originalStatus }) => {
    const conditionWindow = new BrowserWindow({
        width: 450,
        height: 400,
        minimizable: false,
        maximizable: false,
        alwaysOnTop: true,
        modal: true,
        parent: mainWindow,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // Track if condition was submitted
    let conditionSubmitted = false;

    conditionWindow.loadFile(path.join(__dirname, 'borrow', 'condition.html'));

    conditionWindow.webContents.on('did-finish-load', () => {
        conditionWindow.webContents.send('set-book-id', { bookId, borrowId });
        conditionWindow.focus();
    });

    const handleConditionSubmission = (event, { bookId, bookCondition }) => {
        if (!conditionSubmitted) {
            conditionSubmitted = true;
            updateBookCondition(bookId, bookCondition);

            // Close the condition window after submission
            conditionWindow.close();
        }
    };

    // Listen for the book condition submission event
    ipcMain.on('submit-book-condition', handleConditionSubmission);

    conditionWindow.on('close', () => {
        if (!conditionSubmitted) {
            mainWindow.webContents.send('reset-status', { borrowId, originalStatus });
        }
        // Remove the listener when the window is closed
        ipcMain.removeListener('submit-book-condition', handleConditionSubmission);
    });

    function updateBookCondition(bookId, bookCondition) {
        db.run(
            'UPDATE books SET condition = ? WHERE id = ?',
            [bookCondition, bookId],
            function (error) {
                if (error) {
                    console.error(`Error updating book condition: ${error.message}`);
                } else {
                    console.log(`Book ID ${bookId} condition updated to "${bookCondition}".`);
                }
            }
        );
    }
});

// Handle showing dialogs from renderer process
ipcMain.handle('showDialog', (event, type, message) => {
    switch (type) {
        case 'info':
            dialog.showMessageBox({
                type: 'info',
                title: 'Information',
                message: message
            });
            break;
        case 'error':
            dialog.showMessageBox({
                type: 'error',
                title: 'Error',
                message: message
            });
            break;
        default:
            console.warn('Unknown dialog type:', type);
    }
});

let bookReportsWindow = null;
let bookDetails = {}; // Store book details
let bookRecords = []; // Store book records

// Function to create the Book Reports Window
function createBookReportsWindow(params) {
    if (!bookReportsWindow) {
        bookReportsWindow = new BrowserWindow({
            width: 400,
            height: 500,
            resizable: false,
            parent: mainWindow,
            modal: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        const query = new URLSearchParams(params).toString();
        const reportPath = `file://${path.join(__dirname, 'borrow', 'bookReports.html')}?${query}`;
        bookReportsWindow.loadURL(reportPath);

        console.log('Book Reports window created with params:', params);

        bookReportsWindow.on('closed', () => {
            bookReportsWindow = null;
        });
    } else {
        bookReportsWindow.focus();
    }
}

// Listener for opening book reports
ipcMain.on('open-book-reports', (event, details) => {
    console.log('Received book details in main process:', details);

    // Save details for use in other operations
    bookDetails = details;

    // Create the book reports window
    createBookReportsWindow(details);
});

// Listener for receiving book details
ipcMain.on('send-book-details', (event, details) => {
    bookDetails = details;
    console.log('Book details received:', bookDetails);
});

// Listener for receiving book records
ipcMain.on('send-book-records', (event, records) => {
    bookRecords = records;
    console.log('Book records received in main:', bookRecords);
});

// Listener for combined data (book details and borrow records)
ipcMain.on('send-combined-data', (event, data) => {
    const { bookDetails, borrowRecords } = data;
    console.log('Book Details:', bookDetails);
    console.log('Borrow Records:', borrowRecords);
});

ipcMain.handle('exportBorrowRecords', async (event, enrichedRecords) => {
    try {
        if (enrichedRecords.length === 0) {
            dialog.showErrorBox('Export Failed', 'No records to export.');
            return { success: false, message: 'No records to export.' };
        }

        // Enrich the records with borrower_id and book details from the database
        for (let record of enrichedRecords) {
            // Get borrower_id from borrow table using borrow_id
            await new Promise((resolve, reject) => {
                db.get(
                    'SELECT borrower_id, book_id FROM borrow WHERE id = ?',
                    [record.borrow_id],
                    (err, row) => {
                        if (err) {
                            console.error('Error fetching borrower_id and book_id:', err);
                            reject(err);
                        } else {
                            record.borrower_id = row ? row.borrower_id : 'N/A'; // Handle missing borrower_id
                            record.book_id = row ? row.book_id : 'N/A'; // Handle missing book_id
                            resolve();
                        }
                    }
                );
            });

            // Get book details from books table using book_id
            await new Promise((resolve, reject) => {
                db.get(
                    'SELECT * FROM books WHERE id = ?', // Query using book_id
                    [record.book_id],
                    (err, bookDetails) => {
                        if (err) {
                            console.error('Error fetching book details:', err);
                            reject(err);
                        } else {
                            record.bookDetails = bookDetails || {}; // Store book details
                            resolve();
                        }
                    }
                );
            });
        }

        const workbook = new ExcelJS.Workbook();
        const recordsSheet = workbook.addWorksheet('Borrow Records');
        const summarySheet = workbook.addWorksheet('Summary');

        // Borrow Records header
        recordsSheet.mergeCells('A1:F1');
        const headerCell = recordsSheet.getCell('A1');
        headerCell.value = 'BOOK BORROWING HISTORY';
        headerCell.font = { size: 16, bold: true };
        headerCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Borrow Records column headers
        const headers = ['Borrower ID', 'Borrower Name', 'Borrow Date', 'Due Date', 'Return Date', 'Status'];
        recordsSheet.addRow(headers);
        recordsSheet.getRow(2).font = { bold: true };

        // Populate Borrow Records with enriched data
        enrichedRecords.forEach(record => {
            recordsSheet.addRow([
                record.borrower_id,
                record.borrower_name,
                record.borrowDate,
                record.dueDate,
                record.returnDate,
                record.borrowStatus,
            ]);
        });

        headers.forEach((header, index) => {
            const column = recordsSheet.getColumn(index + 1);
            column.width = header.length + 5;
        });

        // Summary header
        summarySheet.mergeCells('A1:D1');
        const summaryHeaderCell = summarySheet.getCell('A1');
        summaryHeaderCell.value = 'SUMMARY';
        summaryHeaderCell.font = { size: 16, bold: true };
        summaryHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Add total number of borrowers
        summarySheet.addRow([]); // Empty row for spacing
        summarySheet.addRow(['Total number of borrowers:', enrichedRecords.length]);
        summarySheet.addRow([]); // Empty row for spacing
        summarySheet.addRow(['Top 5 Borrowers']);
        summarySheet.addRow(['Borrower Name', 'Borrower ID', 'Number of Borrows']);

        const borrowerCounts = enrichedRecords.reduce((acc, record) => {
            const { borrower_name, borrower_id } = record;
            if (!acc[borrower_id]) {
                acc[borrower_id] = { borrowerName: borrower_name, borrowerID: borrower_id, count: 0 };
            }
            acc[borrower_id].count++;
            return acc;
        }, {});

        const topBorrowers = Object.values(borrowerCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        topBorrowers.forEach(borrower => {
            summarySheet.addRow([borrower.borrowerName, borrower.borrowerID, borrower.count]);
        });

        // Process book details in summary (from enriched records)
        enrichedRecords.forEach(record => {
            const { borrow_id, bookDetails } = record;

            summarySheet.addRow([]); // Empty row for spacing
            summarySheet.addRow([`Borrow ID: ${borrow_id}`]);

            summarySheet.addRow([
                'Book Title', 'Book ID', 'Author', 'Edition', 'Publisher', 'Year', 'Cost Price', 'Pages', 'Volume', 'Condition'
            ]);

            // Check if bookDetails exists before accessing its properties
            if (bookDetails) {
                summarySheet.addRow([
                    bookDetails.title_of_book || 'N/A',
                    bookDetails.id || 'N/A', // bookId from books table
                    bookDetails.author || 'N/A',
                    bookDetails.edition || 'N/A',
                    bookDetails.publisher || 'N/A',
                    bookDetails.year || 'N/A',
                    bookDetails.cost_price || 'N/A',
                    bookDetails.pages || 'N/A',
                    bookDetails.volume || 'N/A',
                    bookDetails.condition || 'N/A',
                ]);
            } else {
                console.log(`No book details found for borrow_id: ${borrow_id}`);
                summarySheet.addRow(['No book details found', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A']);
            }
        });

        // Adjust column widths for Summary
        summarySheet.columns.forEach(column => {
            column.width = 25;
        });

        // Save file dialog
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Save Borrow Records',
            defaultPath: path.join(__dirname, `Book-Borrow-Records_${new Date().toISOString().split('T')[0]}.xlsx`),
            filters: [
                { name: 'Excel Files', extensions: ['xlsx'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (canceled) {
            dialog.showMessageBox({
                type: 'info',
                title: 'Export Cancelled',
                message: 'Export cancelled by user.'
            });
            return { success: false, message: 'Export cancelled by user.' };
        }

        // Check if the file exists and confirm overwrite if necessary
        if (fs.existsSync(filePath)) {
            const { response } = await dialog.showMessageBox({
                type: 'warning',
                buttons: ['Overwrite', 'Cancel'],
                defaultId: 1,
                title: 'Confirm Overwrite',
                message: `The file "${path.basename(filePath)}" already exists. Do you want to overwrite it?`
            });

            if (response === 1) {
                dialog.showMessageBox({
                    type: 'info',
                    title: 'Export Cancelled',
                    message: 'Export cancelled by user.'
                });
                return { success: false, message: 'Export cancelled by user.' };
            }
        }

        // Save the workbook
        await workbook.xlsx.writeFile(filePath);

        dialog.showMessageBox({
            type: 'info',
            title: 'Export Successful',
            message: `Report exported successfully to: ${filePath}`
        });

        return { success: true, filePath };
    } catch (error) {
        console.error('Error exporting borrow records:', error);
        dialog.showErrorBox('Export Error', 'An error occurred while exporting the borrow records. Please try again.');
        throw new Error('Failed to export borrow records');
    }
});









// BORROW - BORROWING HISTORY
let borrowingReportsWindow = null;
let borrowerDetails = {}; // To store borrower details


// Function to create the Borrowing Reports Window
function createBorrowingReportsWindow(params) {
    if (!borrowingReportsWindow) { // Check if the reports window is already open
        borrowingReportsWindow = new BrowserWindow({
            width: 400,
            height: 500,
            resizable: false,
            parent: mainWindow, // Assuming mainWindow is already defined
            modal: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        // Load the borrowerReports.html file and pass the parameters as a query string
        const query = new URLSearchParams(params).toString();
        console.log("Generated Query String:", query); // Debugging
        const reportPath = `file://${path.join(__dirname, 'borrow', 'borrowerReports.html')}?${query}`;
        
        borrowingReportsWindow.loadURL(reportPath);

        // Log when the reports window is opened
        console.log('Borrowing Reports window created with params:', params);

        borrowingReportsWindow.on('closed', () => {
            borrowingReportsWindow = null; // Clear reference on close
        });
    } else {
        borrowingReportsWindow.focus(); // Focus on the existing window if it's already open
    }
}

// Listen for 'open-borrowing-reports' event
ipcMain.on('open-borrowing-reports', (event, borrowerDetails) => {
    console.log('Received borrower details in main process:', borrowerDetails);
    
    createBorrowingReportsWindow(borrowerDetails);
});

// Listen for the 'send-borrower-details' event
ipcMain.on('send-borrower-details', (event, details) => {
    borrowerDetails = details;
    console.log('Borrower details received:', borrowerDetails);
});


ipcMain.handle('exportBorrowingRecords', async (event, records) => {
    try {
        if (records.length === 0) {
            dialog.showErrorBox('Export Failed', 'No records to export.');
            return { success: false, message: 'No records to export.' };
        }

        // Use borrowerDetails for user info in the summary
        const borrowerName = borrowerDetails.borrowerName || 'N/A';
        const borrowerId = borrowerDetails.borrowerId || 'N/A';
        const email = borrowerDetails.email || 'N/A';
        const phoneNumber = borrowerDetails.phoneNumber || 'N/A';

        // Initialize workbook and worksheets
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Borrowing Records');
        const summarySheet = workbook.addWorksheet('SUMMARY');

        // Add title: "BORROWING HISTORY"
        worksheet.addRow(['BORROWING HISTORY']);
        worksheet.getCell('A1').font = { bold: true, size: 16 };
        worksheet.mergeCells('A1:F1'); // Center the title
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Add column headers
        worksheet.addRow(['Book Title', 'Borrow Date', 'Due Date', 'Return Date', 'Status']);
        worksheet.getRow(2).font = { bold: true }; // Make headers bold

        // Add rows of records
        records.forEach(record => {
            worksheet.addRow([
                record.book_title,
                record.borrowDate,
                record.dueDate,
                record.returnDate || 'N/A',
                record.borrowStatus
            ]);
        });

        // Adjust column widths dynamically
        worksheet.columns = [
            { width: 25 }, // Book Title
            { width: 15 }, // Borrow Date
            { width: 15 }, // Due Date
            { width: 15 }, // Return Date
            { width: 10 }  // Status
        ];

        // Generate summary values
        const totalBooksBorrowed = records.length;
        const totalBooksReturned = records.filter(r => r.borrowStatus === 'returned').length;
        const totalOverdueBooks = records.filter(r => r.borrowStatus === 'overdue').length;
        const totalReturnedOverdueBooks = records.filter(r => r.borrowStatus === 'returned overdue').length;

        // Add User Information and Summary to SUMMARY sheet
        summarySheet.addRows([
            ['SUMMARY', ''],
            ['User Information', ''],
            ['Name:', borrowerName],
            ['ID Number:', borrowerId],
            ['Email:', email],
            ['Phone:', phoneNumber],
            [''],
            ['Report Summary', ''],
            ['Total Books Borrowed:', totalBooksBorrowed],
            ['Total Books Returned:', totalBooksReturned],
            ['Total Overdue Books:', totalOverdueBooks],
            ['Total Returned Overdue Books:', totalReturnedOverdueBooks],
        ]);

        summarySheet.getRow(1).font = { bold: true, size: 14 }; // Title styling
        summarySheet.getRow(2).font = { bold: true }; // User Info Section Title
        summarySheet.getRow(8).font = { bold: true }; // Report Summary Section Title

        summarySheet.getColumn(1).width = 25; // Adjust column width
        summarySheet.getColumn(2).width = 30;

        // Show save dialog
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Save Borrowing Records',
            defaultPath: path.join(__dirname, `Borrower_Borrowing_History_${new Date().toISOString().split('T')[0]}.xlsx`),
            filters: [
                { name: 'Excel Files', extensions: ['xlsx'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (canceled) {
            dialog.showMessageBox({
                type: 'info',
                title: 'Export Cancelled',
                message: 'Export cancelled by user.'
            });
            return { success: false, message: 'Export cancelled by user.' };
        }

        // Save workbook to file
        await workbook.xlsx.writeFile(filePath);

        dialog.showMessageBox({
            type: 'info',
            title: 'Export Successful',
            message: `Report exported successfully to: ${filePath}`
        });

        return { success: true, filePath };
    } catch (error) {
        console.error('Error exporting borrower records:', error);

        // Show error dialog
        await dialog.showErrorBox('Export Error', 'An error occurred while exporting the borrowing records. Please try again.');
        throw new Error('Failed to export borrower records');
    }
});




//PROFILES' CRUD
let addProfileWindow = null;
let editProfileWindow = null;


ipcMain.handle('getProfiles', async () => {
    try {
        const profiles = await executeSelectQuery('SELECT * FROM Profiles WHERE is_deleted = FALSE ORDER BY id DESC');
        return profiles;
    } catch (error) {
        console.error('Error fetching profile records:', error);
        return [];
    }
});

ipcMain.handle('getProfilesArchive', async () => {
    try {
        const profiles = await executeSelectQuery('SELECT * FROM Profiles WHERE is_deleted = TRUE ORDER BY id DESC');
        return profiles;
    } catch (error) {
        console.error('Error fetching profile records:', error);
        return [];
    }
});


// Handle the 'addProfile' logic
ipcMain.handle('addProfile', async (event, record) => {
    try {
        // Check if the borrower_id already exists
        const existingProfile = await executeSelectQuery(
            'SELECT * FROM Profiles WHERE borrower_id = ?',
            [record.borrower_id]
        );

        if (existingProfile.length > 0) {
            // Borrower ID is already taken, throw an error
            throw new Error('Borrower ID already exists');
        }

        // If no duplicate borrower_id, proceed with the insertion
        const result = await executeQuery(
            `INSERT INTO Profiles (borrower_id, name, phone_number, email) 
             VALUES (?, ?, ?, ?)`,
            [record.borrower_id, record.name, record.phone_number, record.email]
        );

        record.id = this.lastID; // Get the last inserted ID
        // Send the added record back to the main window
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('profile-record-added', record);
        }
        
        // Return success to the renderer process
        return { success: true, record };

    } catch (error) {
        // Send the error message back to the renderer process
        event.sender.send('profile-add-error', error.message);
        return { success: false, error: error.message };
    }
});

// Handle the 'show-error-dialog' request from the renderer process
ipcMain.handle('show-error-dialog', (event, title, content) => {
    dialog.showErrorBox(title, content);
});

ipcMain.handle('updateProfile', async (event, record) => {
    try {
        await executeQuery(
            `UPDATE Profiles 
             SET borrower_id = ?, name = ?, phone_number = ?, email = ? 
             WHERE id = ?`,
            [record.borrower_id, record.name, record.phone_number, record.email, record.id]
        );

        // Send the updated record back to the main window
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('profile-record-updated', record);
        }
    } catch (error) {
        console.error('Error updating profile record:', error);
    }
});

ipcMain.handle('deleteProfile', async (event, id) => {
    try {
        await new Promise((resolve, reject) => {
            executeQuery(
                'DELETE FROM Profiles WHERE id = ?',
                [id],
                (error, results) => {
                    if (error) {
                        reject(error);  // Reject the promise if there's an error
                    } else {
                        resolve(results);  // Resolve on success
                    }
                }
            );
        });

        // Notify the renderer process that the record is deleted
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('profile-record-deleted', id);
        }
    } catch (error) {
        console.error('Error deleting profile record:', error);

        // Optionally send an error notification to the renderer process
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('profile-record-deletion-error', error.message);
        }
    }
});

ipcMain.handle('archiveProfile', async (event, id) => {
    try {
        await new Promise((resolve, reject) => {
            executeQuery(
                'UPDATE Profiles SET is_deleted = TRUE WHERE id = ?',
                [id],
                (error, results) => {
                    if (error) {
                        reject(error); // Reject the promise if there's an error
                    } else {
                        resolve(results); // Resolve on success
                    }
                }
            );
        });

        // Notify the renderer process that the record is archived
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('profile-record-archived', id);
        }
    } catch (error) {
        console.error('Error archiving profile record:', error);

        // Optionally send an error notification to the renderer process
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('profile-record-archival-error', error.message);
        }
    }
});

ipcMain.handle('unarchiveProfile', async (event, id) => {
    try {
        await new Promise((resolve, reject) => {
            executeQuery(
                'UPDATE Profiles SET is_deleted = FALSE WHERE id = ?',
                [id],
                (error, results) => {
                    if (error) {
                        reject(error); // Reject the promise if there's an error
                    } else {
                        resolve(results); // Resolve on success
                    }
                }
            );
        });

        // Notify the renderer process that the record is archived
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('profile-record-unarchived', id);
        }
    } catch (error) {
        console.error('Error unarchiving profile record:', error);

        // Optionally send an error notification to the renderer process
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('profile-record-unarchival-error', error.message);
        }
    }
});


///PROFILES
// Listen for the event from index.js
// Function to create the Add Profile window
function createAddProfileWindow() {
if (!addProfileWindow) {
    addProfileWindow = createWindow({
        filePath: path.join(__dirname, 'profiles', 'addProfile.html'),
        width: 400,
        height: 585,
        parent: mainWindow,
        onClose: () => (addProfileWindow = null),
    });
} else {
    addProfileWindow.focus();
}
}

// Listen for the event to open the Add Profile window from the index page
ipcMain.on('open-add-profile-from-index-window', () => {
    // If addProfileWindow doesn't exist, create it
    if (!addProfileWindow) {
        createAddProfileWindow();
    } else {
        addProfileWindow.focus();
    }
});

function createEditProfileWindow(record) {
    editProfileWindow = createWindow({
        filePath: path.join(__dirname, 'profiles', 'editProfile.html'),
        width: 400,
        height: 640,
        minimizable: false,
        maximizable: false,
        alwaysOnTop: true,
        parent: mainWindow,
        onClose: () => (editProfileWindow = null),
    });

    editProfileWindow.webContents.on('did-finish-load', () => {
        editProfileWindow.webContents.send('fill-edit-form', record);
    });
}

ipcMain.on('open-add-profile-window', () => {
    if (!addProfileWindow) {
        createAddProfileWindow();
    } else {
        addProfileWindow.focus();
    }
});

ipcMain.on('open-edit-profile-window', (event, record) => {
    if (!editProfileWindow) {
        createEditProfileWindow(record);
    } else {
        editProfileWindow.focus();
        editProfileWindow.webContents.send('fill-edit-form', record);
    }
});


//SETTINGS
//BACKUP & RESTORE EXCEL FILES
// Export Profiles to Excel
ipcMain.handle('exportProfilesToExcel', async () => {
    try {
        const profiles = await executeSelectQuery('SELECT * FROM Profiles WHERE is_deleted = 0'); // Exclude deleted profiles
        const workbook = new ExcelJS.Workbook();

        // Create Borrower Profiles sheet
        const profilesSheet = workbook.addWorksheet('Borrower Profiles');

        // Add title to Borrower Profiles sheet
        profilesSheet.mergeCells('A1:D1');
        profilesSheet.getCell('A1').value = 'BORROWER PROFILES';
        profilesSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        profilesSheet.getCell('A1').font = { bold: true, size: 14 };

        // Add headers to Borrower Profiles sheet
        const headers = ['Borrower ID', 'Name', 'Phone Number', 'Email Address'];
        profilesSheet.addRow(headers);

        // Format headers
        const headerRow = profilesSheet.getRow(2);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Adjust column widths
        profilesSheet.getColumn(1).width = 15; // Borrower ID
        profilesSheet.getColumn(2).width = 30; // Name
        profilesSheet.getColumn(3).width = 20; // Phone Number
        profilesSheet.getColumn(4).width = 30; // Email Address

        // Add profile data
        profiles.forEach(profile => {
            profilesSheet.addRow([
                profile.borrower_id,
                profile.name,
                profile.phone_number,
                profile.email
            ]);
        });

        // Create Summary sheet
        const summarySheet = workbook.addWorksheet('Summary');

        // Add title to Summary sheet
        summarySheet.mergeCells('A1:B1');
        summarySheet.getCell('A1').value = 'SUMMARY';
        summarySheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        summarySheet.getCell('A1').font = { bold: true, size: 14 };

        // Set column widths in the Summary sheet
        summarySheet.getColumn(1).width = 30; // Set width for "Registered Borrowers Total" label column
        summarySheet.getColumn(2).width = 15; // Set width for the count column       

        // Add summary data with proper spacing and alignment
        summarySheet.addRow([' ', ' ']); // Add an empty row for spacing
        const summaryRow = summarySheet.addRow(['Registered Borrowers Total:', profiles.length]);
        summaryRow.getCell(1).font = { bold: true }; // Bold the label
        summaryRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' }; // Right-align the label
        summaryRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }; // Center-align the count

        const { filePath } = await dialog.showSaveDialog({
            title: 'Save Excel File',
            defaultPath: 'profiles.xlsx',
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
        });

        if (!filePath) {
            console.log('Export canceled');
            await dialog.showMessageBox({
                type: 'warning',
                title: 'Export Canceled',
                message: 'No file was selected. Export operation was canceled.',
                buttons: ['OK']
            });
            return { message: 'Export canceled.' };
        }

        await workbook.xlsx.writeFile(filePath);
        console.log('Export successful:', filePath);

        await dialog.showMessageBox({
            type: 'info',
            title: 'Export Successful',
            message: 'Profiles and summary exported successfully!',
            buttons: ['OK']
        });

        return { message: 'Profiles and summary exported successfully!' };
    } catch (error) {
        console.error('Error exporting profiles:', error);
        await dialog.showMessageBox({
            type: 'error',
            title: 'Export Failed',
            message: `An error occurred during export: ${error.message}`,
            buttons: ['OK']
        });
        return { message: `Error exporting profiles: ${error.message}` };
    }
});


// Import Profiles from Excel 
ipcMain.handle('importProfilesFromExcel', async () => {
    try {
        const { filePaths } = await dialog.showOpenDialog({
            title: 'Select Excel File',
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
            properties: ['openFile']
        });

        if (filePaths.length === 0) {
            // Notify the user about the cancellation
            await dialog.showMessageBox({
                type: 'warning',
                title: 'Import Canceled',
                message: 'The import operation was canceled.',
                buttons: ['OK']
            });
            return { message: 'Import canceled.' };
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePaths[0]);

        const worksheet = workbook.getWorksheet('Borrower Profiles');
        let incompleteDataFound = false; // Track if any incomplete data is found
        let importedCount = 0; // Track the number of successfully imported profiles

        // Get the maximum Profile ID before inserting new profiles
        let result = await executeSelectQuery('SELECT MAX(id) as maxId FROM Profiles');
        let lastProfileID = result[0]?.maxId || 0;

        // Loop through each row, validating and merging data
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) { // Start from the second row
            const row = worksheet.getRow(rowNumber);
            const borrower_id = row.getCell(1).value;
            const name = row.getCell(2).value;
            const phone_number = row.getCell(3).value;

            // For the email, check if it's a hyperlink or a plain value
            let emailCell = row.getCell(4);
            let email = emailCell.text || (emailCell.hyperlink ? emailCell.hyperlink : emailCell.value);

            // Validate for missing data
            let missingFields = [];
            if (!borrower_id) missingFields.push('Borrower ID');
            if (!name) missingFields.push('Name');
            if (!phone_number) missingFields.push('Phone Number');
            if (!email) missingFields.push('Email Address');

            if (missingFields.length > 0) {
                console.warn(`Row ${rowNumber} has incomplete data: ${missingFields.join(', ')}.`);
                incompleteDataFound = true; // Mark that incomplete data was found

                // Show alert for incomplete data
                await dialog.showMessageBox({
                    type: 'warning',
                    title: 'Incomplete Data',
                    message: `Row ${rowNumber} has incomplete data: ${missingFields.join(', ')}.`,
                    buttons: ['OK']
                });
                continue; // Skip incomplete rows
            }

            // Check if the Borrower ID already exists
            const existingProfile = await executeSelectQuery('SELECT * FROM Profiles WHERE borrower_id = ?', [borrower_id]);

            if (existingProfile.length > 0) {
                // If Borrower ID exists, merge the profile (update the existing record)
                await executeQuery(
                    `UPDATE Profiles SET 
                        name = ?, phone_number = ?, email = ? 
                     WHERE borrower_id = ?`,
                    [name, phone_number, email, borrower_id]
                );
            } else {
                // If Borrower ID is new, increment Profile ID and insert new profile
                lastProfileID++;
                await executeQuery(
                    'INSERT INTO Profiles (id, borrower_id, name, phone_number, email) VALUES (?, ?, ?, ?, ?)',
                    [lastProfileID, borrower_id, name, phone_number, email]
                );
            }
            importedCount++; // Increment the count of successfully imported profiles
        }

        // Show success message if no incomplete data found and some profiles were imported
        if (!incompleteDataFound && importedCount > 0) {
            await dialog.showMessageBox({
                type: 'info',
                title: 'Import Successful',
                message: `${importedCount} Borrower Profiles imported and merged successfully!`,
                buttons: ['OK']
            });
        }

    } catch (error) {
        console.error('Error importing profiles:', error);

        // Show error dialog to the user
        await dialog.showMessageBox({
            type: 'error',
            title: 'Import Error',
            message: `An error occurred while importing profiles:\n\n${error.message}`,
            buttons: ['OK']
        });

        return { message: 'Error importing profiles.' };
    }
});



//GENERATE REPORTS
// + REPORTS
ipcMain.handle('exportBooksToExcel', async () => {
    try {
        const books = await executeSelectQuery('SELECT * FROM books');
        const workbook = new ExcelJS.Workbook();
        
        // Add "Books" worksheet
        const booksSheet = workbook.addWorksheet('Books');

        // Add and style the title row
        booksSheet.mergeCells('A1:O1'); // Merge cells across the first row
        booksSheet.getCell('A1').value = 'LIST OF BOOKS';
        booksSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        booksSheet.getCell('A1').font = { bold: true, size: 16 };

        // Add column headers manually in row 2
        const headers = [
            'ID',
            'Book Number',
            'Date Received',
            'Class',
            'Author',
            'Title of Book',
            'Edition',
            'Source of Fund',
            'Cost Price',
            'Publisher',
            'Year',
            'Remarks',
            'Volume',
            'Pages',
            'Condition',
            'Created At'
        ];
        const headerRow = booksSheet.addRow(headers);
        headerRow.font = { bold: true }; // Make headers bold

        // Set column widths and hide specific columns
        booksSheet.columns = [
            { key: 'id', width: 10, hidden: true }, // Hide ID
            { key: 'number', width: 15 },
            { key: 'date_received', width: 15 },
            { key: 'class', width: 10 },
            { key: 'author', width: 20 },
            { key: 'title_of_book', width: 25 },
            { key: 'edition', width: 10 },
            { key: 'source_of_fund', width: 20 },
            { key: 'cost_price', width: 10 },
            { key: 'publisher', width: 15 },
            { key: 'year', width: 10 },
            { key: 'remarks', width: 20 },
            { key: 'volume', width: 10 },
            { key: 'pages', width: 10 },
            { key: 'condition', width: 15 },
            { key: 'createdAt', width: 15, hidden: true } // Hide Created At
        ];

        // Add rows from books data
        books.forEach(book => {
            booksSheet.addRow([
                book.id,
                book.number,
                book.date_received,
                book.class,
                book.author,
                book.title_of_book,
                book.edition,
                book.source_of_fund,
                book.cost_price,
                book.publisher,
                book.year,
                book.remarks,
                book.volume,
                book.pages,
                book.condition,
                book.createdAt
            ]);
        });

        // Add "SUMMARY" worksheet
        const summarySheet = workbook.addWorksheet('SUMMARY');

        // Set column widths for the SUMMARY sheet
        summarySheet.columns = [
            { width: 30 }, // First column for labels
            { width: 10 }  // Second column for values (numeric or count)
        ];

        // Calculate summary data
        const conditionCounts = {
            new: 0,
            good: 0,
            acceptable: 0,
            poor: 0,
            'not usable': 0
        };
        const yearCounts = {};
        let totalBooks = books.length;

        books.forEach(book => {
            // Count conditions
            const condition = book.condition?.toLowerCase();
            if (conditionCounts[condition] !== undefined) {
                conditionCounts[condition]++;
            }

            // Count years
            const year = book.year;
            if (year) {
                yearCounts[year] = (yearCounts[year] || 0) + 1;
            }
        });

        // Populate the SUMMARY sheet
        summarySheet.addRow(['Summary of Book Conditions']);
        Object.entries(conditionCounts).forEach(([condition, count]) => {
            summarySheet.addRow([`${condition.charAt(0).toUpperCase() + condition.slice(1)}:`, count]);
        });

        summarySheet.addRow([]); // Empty row
        summarySheet.addRow(['Total Number of Books:', totalBooks]);

        summarySheet.addRow([]); // Empty row
        const summaryOfYearsRow = summarySheet.addRow(['Summary of Book Years']);
        summaryOfYearsRow.font = { bold: true }; // Bold "Summary of Book Years"

        Object.entries(yearCounts).forEach(([year, count]) => {
            summarySheet.addRow([`Year ${year}:`, count]);
        });

        // Style the summary headers
        summarySheet.getRow(1).font = { bold: true }; // Book condition summary header
        summarySheet.getRow(6).font = { bold: true }; // Total number of books
        summarySheet.getRow(8).font = { bold: true }; // Book year summary header

        // Save the workbook
        const { filePath } = await dialog.showSaveDialog({
            title: 'Save Exported Books as Excel',
            defaultPath: 'books.xlsx',
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
        });

        if (filePath) {
            await workbook.xlsx.writeFile(filePath);
            await dialog.showMessageBox({
                type: 'info',
                title: 'Export Successful',
                message: 'Books have been exported successfully!',
                buttons: ['OK']
            });
            return { message: 'Books exported successfully!' };
        } else {
            // Notify the user about cancellation
            await dialog.showMessageBox({
                type: 'info',
                title: 'Export Canceled',
                message: 'The export operation was canceled.',
                buttons: ['OK']
            });
            return { message: 'Export canceled.' };
        }
    } catch (error) {
        console.error('Error exporting books:', error);

        // Show error dialog to the user
        await dialog.showErrorBox('Export Error', 'An error occurred while exporting books.');
        return { message: 'Error exporting books.' };
    }
});

// Import Books 
ipcMain.handle('importBooksFromExcel', async () => {
    try {
        const { filePaths } = await dialog.showOpenDialog({
            title: 'Select Excel File',
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
            properties: ['openFile']
        });

        if (filePaths.length === 0) {
            await dialog.showMessageBox({
                type: 'warning',
                title: 'Import Canceled',
                message: 'No file was selected for import.',
                buttons: ['OK']
            });
            return { message: 'Import canceled.' };
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePaths[0]);

        const worksheet = workbook.getWorksheet('Books');
        let importedCount = 0;

        // Validate that the worksheet has the expected structure
        const headers = [
            'ID', 'Book Number', 'Date Received', 'Class', 'Author', 'Title of Book', 'Edition',
            'Source of Fund', 'Cost Price', 'Publisher', 'Year', 'Remarks', 'Volume',
            'Pages', 'Condition', 'Created At'
        ];

        const firstRow = worksheet.getRow(2);
        const rowHeaders = firstRow.values.slice(1); // Remove null value from the start
        
        if (!headers.every((header, index) => rowHeaders[index] === header)) {
            throw new Error('Invalid Excel format. Please ensure the column headers match the export format.');
        }

        // Loop through each row, validating and merging data
        for (let rowNumber = 3; rowNumber <= worksheet.rowCount; rowNumber++) { // Start from the third row (data rows)
            const row = worksheet.getRow(rowNumber);
            const title_of_book = row.getCell(6).value; // "Title of Book" column

            // Validate for missing title
            if (!title_of_book) {
                console.warn(`Row ${rowNumber} has incomplete data: Title of Book is required.`);
                continue; // Skip rows without the title of book
            }

            const book = {
                id: row.getCell(1).value ?? '',                // Excel Column: "ID"
                number: row.getCell(2).value ?? '',            // Excel Column: "Book Number"
                date_received: row.getCell(3).value ?? '',     // Excel Column: "Date Received"
                class: row.getCell(4).value ?? '',             // Excel Column: "Class"
                author: row.getCell(5).value ?? '',            // Excel Column: "Author"
                title_of_book: title_of_book ?? '',            // Required Title
                edition: row.getCell(7).value ?? '',           // Excel Column: "Edition"
                source_of_fund: row.getCell(8).value ?? '',    // Excel Column: "Source of Fund"
                cost_price: row.getCell(9).value ?? '',        // Excel Column: "Cost Price"
                publisher: row.getCell(10).value ?? '',        // Excel Column: "Publisher"
                year: row.getCell(11).value ?? '',             // Excel Column: "Year"
                remarks: row.getCell(12).value ?? '',          // Excel Column: "Remarks"
                volume: row.getCell(13).value ?? '',           // Excel Column: "Volume"
                pages: row.getCell(14).value ?? '',            // Excel Column: "Pages"
                condition: row.getCell(15).value ?? '',        // Excel Column: "Condition"
                createdAt: row.getCell(16).value ?? ''         // Excel Column: "Created At"
            };
            

            // Check if the Book ID already exists
            if (book.id) {
                const existingBook = await executeSelectQuery('SELECT * FROM books WHERE id = ?', [book.id]);

                if (existingBook.length > 0) {
                    // Update the existing record
                    await executeQuery(
                        `UPDATE books SET 
                            number = ?, date_received = ?, class = ?, author = ?, title_of_book = ?, edition = ?, source_of_fund = ?, cost_price = ?, publisher = ?, year = ?, remarks = ?, volume = ?, pages = ?, createdAt = ?, condition = ? 
                         WHERE id = ?`,
                        [
                            book.number, book.date_received, book.class, book.author, 
                            book.title_of_book, book.edition, book.source_of_fund, 
                            book.cost_price, book.publisher, book.year, 
                            book.remarks, book.volume, book.pages, 
                            book.createdAt, book.condition, book.id
                        ]
                    );
                } else {
                    // Insert new record with the specified ID
                    await executeQuery(
                        `INSERT INTO books (id, number, date_received, class, author, title_of_book, edition, source_of_fund, cost_price, publisher, year, remarks, volume, pages, createdAt, condition) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                        , [
                            book.id, book.number, book.date_received, book.class, book.author, 
                            book.title_of_book, book.edition, book.source_of_fund, 
                            book.cost_price, book.publisher, book.year, 
                            book.remarks, book.volume, book.pages, 
                            book.createdAt, book.condition
                        ]
                    );
                }
            } else {
                // Insert a new record and let the database auto-increment the ID
                await executeInsertQuery(
                    `INSERT INTO books (number, date_received, class, author, title_of_book, edition, source_of_fund, cost_price, publisher, year, remarks, volume, pages, createdAt, condition) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                    , [
                        book.number, book.date_received, book.class, book.author, 
                        book.title_of_book, book.edition, book.source_of_fund, 
                        book.cost_price, book.publisher, book.year, 
                        book.remarks, book.volume, book.pages, 
                        book.createdAt, book.condition
                    ]
                );
            }

            importedCount++; // Increment the count of successfully imported books
        }

        // Show success message if some books were imported
        if (importedCount > 0) {
            await dialog.showMessageBox({
                type: 'info',
                title: 'Import Successful',
                message: `${importedCount} Books were imported and merged successfully!`,
                buttons: ['OK']
            });
        } else {
            await dialog.showMessageBox({
                type: 'info',
                title: 'Import Complete',
                message: 'No valid books were found to import.',
                buttons: ['OK']
            });
        }

        return { message: 'Import successful!' };
    } catch (error) {
        console.error('Error importing books:', error);
        await dialog.showErrorBox('Import Error', 'An error occurred while importing books.');
        return { message: 'Error importing books.' };
    }
});




// GENERATE REPORTS
let reportsWindow = null; // Initialize the reportsWindow variable

// Open reports window handler
ipcMain.handle('open-reports-window', (event) => {
    createReportsWindow(); // Create the reports window
});

// Function to create the Reports Window
function createReportsWindow() {
    if (!reportsWindow) {
        reportsWindow = new BrowserWindow({
            width: 400,
            height: 600,
            resizable: false,
            parent: mainWindow,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });      

        reportsWindow.loadFile(path.join(__dirname, 'reports.html')); // Load the reports HTML file

        // Log when the reports window is opened
        console.log('Reports window created');

        reportsWindow.on('closed', () => {
            reportsWindow = null; // Clear reference on close
        });
    } else {
        reportsWindow.focus(); // Focus on the existing window if it's already open
    }
}

// Books Availability
ipcMain.handle('checkBooksAvailability', async () => {
    try {
        // Query to get book information and its status
        const booksAvailability = await executeSelectQuery(`
            SELECT 
                b.id,  
                b.title_of_book, 
                b.year, 
                b.edition, 
                b.volume,
                CASE 
                    WHEN br.borrowStatus = 'borrowed' THEN 'Not Available'
                    WHEN br.borrowStatus = 'overdue' THEN 'Not Available'
                    ELSE 'Available'
                END AS book_status
            FROM books b
            LEFT JOIN borrow br ON b.id = br.book_id
            GROUP BY b.id, b.title_of_book, b.year, b.edition, b.volume
        `);

        const workbook = new ExcelJS.Workbook();
        
        // Add books availability sheet
        const booksSheet = workbook.addWorksheet('Books Status');

        // Add title to books sheet
        booksSheet.mergeCells('A1:F1');
        booksSheet.getCell('A1').value = 'BOOK STATUS'.toUpperCase();
        booksSheet.getCell('A1').font = { bold: true, size: 16 };
        booksSheet.getCell('A1').alignment = { horizontal: 'center' };
        
        // Define column headers
        const columns = [
            { header: 'Book ID', key: 'id', hidden: true },  // Book ID now hidden
            { header: 'Title of Book', key: 'title_of_book', width: 30 },
            { header: 'Year', key: 'year', width: 15 },
            { header: 'Edition', key: 'edition', width: 15 },
            { header: 'Volume', key: 'volume', width: 15 },
            { header: 'Book Status', key: 'book_status', width: 20 }
        ];
        booksSheet.columns = columns;

        // Add column headers directly below the title
        const headerRow = booksSheet.insertRow(2, columns.map(col => col.header));
        headerRow.font = { bold: true }; // Make headers bold

        // Add data rows
        booksAvailability.forEach(book => {
            booksSheet.addRow(book);
        });

        // Apply formatting for data rows
        booksSheet.eachRow((row, rowNumber) => {
            if (rowNumber > 2) { // Skip title and header rows
                const bookStatusCell = row.getCell(6); // Book Status is the 6th column
                if (bookStatusCell.value === 'Available') {
                    bookStatusCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF00FF00' } // Green for available books
                    };
                } else if (bookStatusCell.value === 'Not Available') {
                    bookStatusCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFF0000' } // Red for unavailable books
                    };
                }
            }
        });

        // Apply auto-filter to the worksheet
        booksSheet.autoFilter = {
            from: 'B2',
            to: 'F2'
        };

        // Add summary sheet
        const summarySheet = workbook.addWorksheet('Summary');

        // Calculate summary data
        const totalBooks = booksAvailability.length;
        const borrowedBooks = booksAvailability.filter(book => book.book_status === 'Not Available').length;

        // Add title to summary sheet
        summarySheet.mergeCells('A1:C1');
        summarySheet.getCell('A1').value = 'BOOK STATUS SUMMARY';
        summarySheet.getCell('A1').font = { bold: true, size: 16 };
        summarySheet.getCell('A1').alignment = { horizontal: 'center' };

        // Define column widths for proper sizing
        summarySheet.columns = [
            { header: '', key: 'blank', width: 5 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'BOOK STATUS SUMMARY', key: 'BOOK STATUS SUMMARY', width: 20 }
        ];        

        // Add summary data
        summarySheet.addRow([]); // Blank row
        summarySheet.addRow(['', 'Books Total:', totalBooks]);
        summarySheet.addRow(['', 'Borrowed Books Total:', borrowedBooks]);
        summarySheet.addRow(['', 'Available Books Total:', (totalBooks - borrowedBooks)]);

        const { filePath } = await dialog.showSaveDialog({
            title: 'Save Excel File',
            defaultPath: 'books_status.xlsx',
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
        });

        if (filePath) {
            await workbook.xlsx.writeFile(filePath);
            return { message: 'Books status exported successfully!' };
        }

        return { message: 'Export canceled.' };
    } catch (error) {
        console.error('Error exporting books status:', error);
        return { message: 'Error exporting books status.' };
    }
});

// Borrowing Details - Handle generating reports based on time period and category
// Define function to get SQL time condition based on borrowDate and selected time period
function getTimePeriodCondition(timePeriod) {
    let condition = '1 = 1';  // Default condition to match all records ("all time")

    switch (timePeriod) {
        case 'weekly':
            condition = "br.borrowDate >= DATE('now', '-7 days')";
            break;
        case 'monthly':
            condition = "br.borrowDate >= DATE('now', '-1 month')";
            break;
        case 'yearly':
            condition = "br.borrowDate >= DATE('now', '-1 year')";
            break;
        case 'all time':
        default:
            condition = '1 = 1';  // No time limit, return all records
            break;
    }

    return condition;
}

ipcMain.handle('generateReport', async (event, timePeriod, category) => {
    try {
        console.log(`Generating report for time period: ${timePeriod}, category: ${category}`);
        let query;
        let reportData = [];

        if (category === 'borrowing-history') {
            query = `
                SELECT 
                    br.borrower_id,       
                    p.name AS borrower_name,
                    b.title_of_book AS book_title,
                    DATE(br.borrowDate) AS borrow_date,
                    br.borrowStatus AS borrow_status,
                    DATE(br.returnDate) AS return_date,
                    DATE(br.dueDate) AS due_date
                FROM borrow br
                JOIN Profiles p ON br.borrower_id = p.borrower_id
                JOIN books b ON br.book_id = b.id
                WHERE ${getTimePeriodCondition(timePeriod)}  
                ORDER BY br.borrowDate DESC
            `;
        } else if (category === 'most-borrowed-books') {
            query = `
                SELECT 
                    b.title_of_book AS book_title,
                    b.year,
                    b.edition,
                    b.volume,
                    COUNT(br.book_id) AS borrow_count
                FROM borrow br
                JOIN books b ON br.book_id = b.id
                WHERE ${getTimePeriodCondition(timePeriod)}  
                GROUP BY b.title_of_book, b.year, b.edition, b.volume
                ORDER BY borrow_count DESC
            `;
        }

        console.log('SQL Query:', query);
        reportData = await executeSelectQuery(query);
        console.log('Report Data:', reportData);

        const workbook = new ExcelJS.Workbook();
        const reportSheet = workbook.addWorksheet(category === 'borrowing-history' ? 'Borrowing History' : 'Most Borrowed Books');
        reportSheet.mergeCells('A1:G1');
        reportSheet.getCell('A1').value = category === 'borrowing-history' ? 'BORROWING HISTORY REPORT' : 'MOST BORROWED BOOKS REPORT';
        reportSheet.getCell('A1').font = { bold: true, size: 16 };
        reportSheet.getCell('A1').alignment = { horizontal: 'center' };

        reportSheet.addRow([]);

        const headers = category === 'borrowing-history'
            ? ['Borrower ID', 'Borrower Name', 'Book Title', 'Borrow Date', 'Borrow Status', 'Return Date', 'Due Date']
            : ['Book Title', 'Year', 'Edition', 'Volume', 'Times Borrowed'];

        const columnWidths = category === 'borrowing-history'
            ? [15, 30, 25, 20, 20, 20, 20]
            : [30, 15, 15, 15, 20];

        const headerRowIndex = 3;
        const headerRow = reportSheet.insertRow(headerRowIndex, headers);
        headerRow.font = { bold: true };

        columnWidths.forEach((width, index) => {
            reportSheet.getColumn(index + 1).width = width;
        });

        reportData.forEach(row => {
            const dataRow = category === 'borrowing-history'
                ? [
                    row.borrower_id,
                    row.borrower_name,
                    row.book_title,
                    row.borrow_date || 'N/A',
                    row.borrow_status || 'N/A',
                    row.return_date || 'N/A',
                    row.due_date || 'N/A'
                ]
                : [
                    row.book_title,
                    row.year || 'N/A',
                    row.edition || 'N/A',
                    row.volume || 'N/A',
                    row.borrow_count || 0
                ];
            reportSheet.addRow(dataRow);
        });

        reportSheet.autoFilter = {
            from: 'A3',
            to: `${String.fromCharCode(64 + headers.length)}3`
        };
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.mergeCells('A1:D1');
        summarySheet.getCell('A1').value = category === 'borrowing-history'
            ? 'BORROWING HISTORY REPORT SUMMARY'
            : 'MOST BORROWED BOOKS REPORT SUMMARY';
        summarySheet.getCell('A1').font = { bold: true, size: 16 };
        summarySheet.getCell('A1').alignment = { horizontal: 'center' };

        summarySheet.addRow([]);
        summarySheet.addRow(['Summary Details']);
        summarySheet.getCell('A3').font = { bold: true, size: 14 };
        summarySheet.addRow([]);

        if (category === 'borrowing-history') {
            const totalBorrowers = new Set(reportData.map(row => row.borrower_id)).size;
            const totalBooksBorrowed = reportData.length;

            summarySheet.addRow(['Total of Borrowers:', totalBorrowers]);
            summarySheet.getCell('A5').font = { bold: true };
            summarySheet.addRow(['Total of Borrowed Books:', totalBooksBorrowed]);
            summarySheet.getCell('A6').font = { bold: true };
            
            summarySheet.addRow([]);
            summarySheet.addRow(['Top 5 Borrowers']);
            summarySheet.getCell('A8').font = { bold: true, size: 14 };

            summarySheet.addRow(['Borrower Name', 'Borrower ID', 'Borrow Count']);
            const headerRowBorrowers = summarySheet.lastRow;
            headerRowBorrowers.eachCell(cell => {
                cell.font = { bold: true };
            });

            const topBorrowers = reportData.reduce((acc, row) => {
                acc[row.borrower_id] = acc[row.borrower_id] || { name: row.borrower_name, count: 0 };
                acc[row.borrower_id].count++;
                return acc;
            }, {});

            const sortedTopBorrowers = Object.entries(topBorrowers)
                .map(([id, { name, count }]) => ({ id, name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            sortedTopBorrowers.forEach(borrower => {
                summarySheet.addRow([borrower.name, borrower.id, borrower.count]);
            });
        } else if (category === 'most-borrowed-books') {
            const totalBorrows = reportData.reduce((sum, row) => sum + row.borrow_count, 0);

            summarySheet.addRow(['Total of Borrows:', totalBorrows]);
            summarySheet.getCell('A5').font = { bold: true };

            summarySheet.addRow([]);
            summarySheet.addRow(['Top 5 Most Borrowed Books']);
            summarySheet.getCell('A7').font = { bold: true, size: 14 };

            summarySheet.addRow(['Book Title', 'Number of Borrows']);
            const headerRowBooks = summarySheet.lastRow;
            headerRowBooks.eachCell(cell => {
                cell.font = { bold: true };
            });

            const topBooks = reportData.slice(0, 5);
            topBooks.forEach(book => {
                summarySheet.addRow([book.book_title, book.borrow_count]);
            });
        }

        columnWidths.forEach((width, index) => {
            summarySheet.getColumn(index + 1).width = width + 5;
        });



        const { filePath } = await dialog.showSaveDialog({
            title: 'Save Excel File',
            defaultPath: `${category}_report.xlsx`,
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
        });

        if (filePath) {
            await workbook.xlsx.writeFile(filePath);
            console.log('File saved:', filePath);
            return { message: `${category === 'borrowing-history' ? 'Borrowing history' : 'Most borrowed books'} report exported successfully!` };
        }

        return { message: 'Export canceled.' };
    } catch (error) {
        console.error('Error generating report:', error);
        return { message: 'Error generating report.' };
    }
});



//BACKUP & RESTORE - SETTINGS
const dbPath = path.join(__dirname, './library.db');

let isDialogOpen = false;

// Execute an insert query with a new database connection
function executeInsertQuery(sql, params = []) {
    const db = betterSqlite(dbPath);
    try {
        const stmt = db.prepare(sql);
        stmt.run(...params);
    } catch (error) {
        console.error('Error executing insert query:', error.message);
    } finally {
        db.close();
    }
}


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

        if (!filePath) {
            console.log('Backup cancelled');
            await dialog.showMessageBox({
                type: 'warning',
                title: 'Backup Cancelled',
                message: 'No file was selected. Database backup was cancelled.',
                buttons: ['OK']
            });
            return { success: false, message: 'Backup cancelled.' };
        }

        console.log('Backup filePath:', filePath);
        fs.copyFileSync(dbPath, filePath);
        console.log('Backup successful:', filePath);

        await dialog.showMessageBox({
            type: 'info',
            title: 'Backup Successful',
            message: 'The database backup was completed successfully!',
            buttons: ['OK']
        });

        return { success: true, message: 'Database backup was successful!' };
    } catch (error) {
        console.error('Error exporting database:', error);
        await dialog.showMessageBox({
            type: 'error',
            title: 'Backup Failed',
            message: `An error occurred during database backup: ${error.message}`,
            buttons: ['OK']
        });
        return { success: false, message: `Error: ${error.message}` };
    } finally {
        isDialogOpen = false;
    }
});


// Import database from a file and merge it
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
            properties: ['openFile'],
        });

        if (!filePaths || filePaths.length === 0) {
            console.log('Restore cancelled');
            await dialog.showMessageBox({
                type: 'warning',
                title: 'Restore Cancelled',
                message: 'No file was selected. Database restore was cancelled.',
                buttons: ['OK'],
            });
            return { success: false, message: 'Restore cancelled.' };
        }

        const importedDbPath = filePaths[0];
        await mergeDatabases(importedDbPath);
        console.log('Restore successful:', importedDbPath);

        await dialog.showMessageBox({
            type: 'info',
            title: 'Restore Successful',
            message: 'The database restore was completed successfully!',
            buttons: ['OK'],
        });

        return { success: true, message: 'Database restore was successful!' };
    } catch (error) {
        console.error('Error importing database:', error);
        await dialog.showMessageBox({
            type: 'error',
            title: 'Restore Failed',
            message: `An error occurred during database restore: ${error.message}`,
            buttons: ['OK'],
        });
        return { success: false, message: `Error: ${error.message}` };
    } finally {
        isDialogOpen = false;
    }
});

// Merge data from the imported database
async function mergeDatabases(importedDbPath) {
    const importedDb = betterSqlite(importedDbPath);
    const mainDb = betterSqlite(dbPath);

    const tables = importedDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

    for (const table of tables) {
        const tableName = table.name;

        if (tableName === 'sqlite_sequence' || tableName === 'sqlite_stat1') {
            continue; // Skip internal SQLite tables
        }

        const importedRows = importedDb.prepare(`SELECT * FROM ${tableName}`).all();

        if (importedRows.length === 0) {
            console.log(`No rows to merge in table: ${tableName}`);
            continue;
        }

        const mainRows = mainDb.prepare(`SELECT * FROM ${tableName}`).all();
        const mainRowIds = new Set(mainRows.map(row => row.id));

        const columns = Object.keys(importedRows[0]).join(', ');
        const placeholders = Object.keys(importedRows[0]).map(() => '?').join(', ');

        const maxId = mainDb.prepare(`SELECT MAX(id) AS maxId FROM ${tableName}`).get().maxId || 0;
        let nextId = maxId + 1;

        const insertStmt = mainDb.prepare(
            `INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders})`
        );

        const transaction = mainDb.transaction((rows) => {
            for (const row of rows) {
                try {
                    if (!row.id) {
                        row.id = nextId++;
                    }

                    if (!mainRowIds.has(row.id)) {
                        const rowValues = Object.keys(importedRows[0]).map((key) => row[key] || null);
                        insertStmt.run(...rowValues);
                    } else {
                        console.log(`Skipped row with duplicate ID (${row.id}) in table ${tableName}:`, row);
                    }
                } catch (error) {
                    console.error(`Failed to insert row in table ${tableName}:`, row, error.message);
                }
            }
        });

        transaction(importedRows);
    }

    importedDb.close();
    mainDb.close();
}