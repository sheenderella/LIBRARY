const { app, BrowserWindow, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const db = require('./database.js');
const sqlite3 = require('sqlite3').verbose();

let mainWindow, loginWindow, addBorrowWindow, updateBorrowWindow, addBookWindow, editBookWindow, deleteNotifWindow;
let selectedBookIds = []; // Make sure this variable is populated with the correct IDs

require('./settings/backupRestore.js'); // Add this line to include backup functionalities

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

// REPORTS
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
            resizable: true,
            parent: mainWindow,
            modal: true,
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

// Books IPC Handlers
ipcMain.handle('addBook', async (event, record) => {
    try {
        await executeQuery(
            'INSERT INTO books (date_received, class, author, title_of_book, edition, volume, pages, year, source_of_fund, cost_price, publisher, remarks, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
            [record.date_received, record.class, record.author, record.title_of_book, record.edition, record.volume, record.pages, record.year, record.source_of_fund, record.cost_price, record.publisher, record.remarks],
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


ipcMain.on('open-edit-book-window', (event, record) => {
    if (!editBookWindow) {
        createEditBookWindow(record);
    } else {
        editBookWindow.focus();
        editBookWindow.webContents.send('fill-edit-form', record);
    }
});


//BORROW

//DISPLAY
// Database operations (assuming executeSelectQuery and executeQuery are predefined)
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
                Profiles.name AS borrower_name,
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

ipcMain.handle('getBorrowerLog', async (event, name) => executeSelectQuery(
    `SELECT borrow.*, Profiles.name AS borrower_name, books.title_of_book AS book_title
     FROM borrow
     JOIN Profiles ON borrow.borrower_id = Profiles.borrower_id
    JOIN books ON borrow.book_id = books.id
     WHERE Profiles.name = ?`,
    [name]
));

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
            'SELECT * FROM Profiles WHERE borrower_id = ?',
            [record.borrowerID]
        );

        if (borrowerExists.length === 0) {
            mainWindow.webContents.send('borrow-error', {
                message: 'Borrower ID does not exist',
                type: 'error'
            });
            return;
        }

        // Validate book ID
        const bookExists = await executeSelectQuery(
            'SELECT * FROM books WHERE id = ?',
            [record.bookId]  // Using the unique bookId for validation
        );

        if (bookExists.length === 0) {
            mainWindow.webContents.send('borrow-error', {
                message: 'Book ID does not exist',
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
            WHERE id NOT IN 
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



// Handle fetching all borrower IDs
ipcMain.handle('getBorrowerIDs', async () => {
    try {
        const borrowerIDs = await executeSelectQuery('SELECT borrower_id FROM Profiles'); // Ensure this matches your column name
        return borrowerIDs.map(borrower => borrower.borrower_id); // Return only the IDs
    } catch (error) {
        console.error('Error fetching borrower IDs:', error);
        throw new Error('Failed to fetch borrower IDs');
    }
});

ipcMain.handle('getBorrowerNameByID', async (event, id) => {
    try {
        const result = await executeSelectQuery(`SELECT name FROM Profiles WHERE borrower_id = ?`, [id]); // Fetch the borrower name
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
        const result = await executeSelectQuery(`SELECT name FROM Profiles`); // Fetch all borrower names
        return result.map(row => row.name); // Return an array of names
    } catch (error) {
        console.error('Error fetching borrower names:', error);
        throw new Error('Failed to fetch borrower names');
    }
});

// IPC handler for fetching borrower ID by name
ipcMain.handle('getBorrowerIDByName', async (event, name) => {
    try {
        const result = await executeSelectQuery(`SELECT borrower_id FROM Profiles WHERE name = ?`, [name]); // Fetch borrower ID
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


//reports
ipcMain.handle('generateReport', async (event, { timePeriod, category }) => {
    try {
        let query = '';

        // Generate SQL query based on category
        switch (category) {
            case 'borrowing-history':
                query = 'SELECT * FROM borrow';
                break;
            case 'most-borrowed-books':
                query = `SELECT bookTitle, COUNT(*) AS borrowCount FROM borrow 
                         GROUP BY bookTitle ORDER BY borrowCount DESC`;
                break;
            case 'books-status':
                query = 'SELECT title_of_book, status FROM books'; // Assuming books table has a 'status' column
                break;
            default:
                throw new Error('Invalid category selected');
        }

        // Filter by time period
        if (timePeriod !== 'all time') {
            let timeFilter = '';
            switch (timePeriod) {
                case 'weekly':
                    timeFilter = "WHERE borrowDate >= date('now', '-7 days')";
                    break;
                case 'monthly':
                    timeFilter = "WHERE borrowDate >= date('now', '-1 month')";
                    break;
                case 'yearly':
                    timeFilter = "WHERE borrowDate >= date('now', '-1 year')";
                    break;
            }
            query += ` ${timeFilter}`;
        }

        // Execute the query and return the results
        const reportData = await executeSelectQuery(query);
        return reportData;

    } catch (error) {
        console.error('Error generating report:', error);
        throw new Error('Failed to generate report');
    }
});



//UPDATE
// Open update window handler
ipcMain.handle('open-update-window', (event, record) => {
    createUpdateBorrowWindow(record); // Pass the record data to the update window
});

// Function to create the Update Borrow Window
function createUpdateBorrowWindow(record) {
    if (!updateBorrowWindow) {
        updateBorrowWindow = new BrowserWindow({
            width: 400,
            height: 440,
            resizable: false,
            parent: mainWindow,
            modal: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        updateBorrowWindow.loadFile(path.join(__dirname, 'borrow', 'updateBorrow.html'));

        // Log the record to see if it is correct
        console.log('Record passed to update window:', record);

        // Send the record to the update window once it's fully loaded
        updateBorrowWindow.webContents.on('did-finish-load', () => {
            console.log('Sending record to update window:', record);
            updateBorrowWindow.webContents.send('fill-update-form', record); // Send record data to the renderer process
        });

        updateBorrowWindow.on('closed', () => {
            updateBorrowWindow = null;
        });
    } else {
        updateBorrowWindow.focus();
        updateBorrowWindow.webContents.send('fill-update-form', record); // Send data again if the window is already open
    }
}


// Fetch a specific borrow record by ID
function getBorrowRecordById(id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM borrow WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Error fetching record from database:', err);
                reject(err);
            } else if (row) {
                console.log('Full record fetched from database:', row); // Log the entire row
                resolve({
                    id: row.id,
                    borrowerName: row.borrowerName,
                    bookTitle: row.bookTitle,
                    borrowStatus: row.borrowStatus,
                    createdAt: row.createdAt
                });
            } else {
                console.log('No record found for ID:', id);
                resolve(null);
            }
        });
    });
}

ipcMain.handle('getBorrowRecordById', async (event, id) => {
    return await getBorrowRecordById(id);
});


// Update the borrow record in the database
ipcMain.handle('updateBorrowRecord', async (event, updatedRecord) => {
    try {
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE borrow SET borrowerName = ?, bookTitle = ?, borrowStatus = ? WHERE id = ?`,
                [updatedRecord.borrowerName, updatedRecord.bookTitle, updatedRecord.borrowStatus, updatedRecord.id],
                function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
        console.log('Record updated successfully:', updatedRecord);

        // Notify the main window that the record was updated
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('borrow-record-updated', updatedRecord);
        }
    } catch (error) {
        console.error('Error updating record:', error);
        throw error;
    }
});

//RETURNDATE
// Function to update both the borrow status and return date
ipcMain.handle('updateBorrowStatus', async (event, { id, status, returnDate }) => {
    try {
        await new Promise((resolve, reject) => {
            const query = `UPDATE borrow SET borrowStatus = ?, returnDate = ? WHERE id = ?`;
            const params = [status, returnDate, id];

            db.run(query, params, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        console.log(`Borrow status and return date updated successfully for ID: ${id}`);
        
        // Notify the main window about the status update
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('borrow-status-updated', { id, status, returnDate });
        }

    } catch (error) {
        console.error('Error updating borrow status and return date:', error);
        throw error;
    }
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


//PROFILES' CRUD
let addProfileWindow = null;
let editProfileWindow = null;


ipcMain.handle('getProfiles', async () => {
    try {
        const profiles = await executeSelectQuery('SELECT * FROM Profiles ORDER BY id DESC');
        return profiles;
    } catch (error) {
        console.error('Error fetching profile records:', error);
        return [];
    }
});

ipcMain.handle('addProfile', async (event, record) => {
    try {
        const result = await executeQuery(
            `INSERT INTO Profiles (borrower_id, name, phone_number, email) 
             VALUES (?, ?, ?, ?)`,
            [record.borrower_id, record.name, record.phone_number, record.email]
        );
        
        record.id = this.lastID;  // Get the last inserted ID

        // Send the added record back to the main window
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('profile-record-added', record);
        }
    } catch (error) {
        console.error('Error adding profile record:', error);
    }
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

///PROFILES
// Create a new function for the Add Profile button in index.html
function createAddProfileFromIndexWindow() {
    addProfileWindow = createWindow({
        filePath: path.join(__dirname, 'profiles', 'addProfile.html'),
        width: 600,
        height: 600,
        parent: mainWindow,
        onClose: () => (addProfileWindow = null),
    });

    // Ensure the window is not reused elsewhere
    addProfileWindow.webContents.on('did-finish-load', () => {
        // You can send specific data or commands here if necessary
    });
}

// Listen for the event from index.js
ipcMain.on('open-add-profile-from-index-window', () => {
    if (!addProfileWindow) {
        createAddProfileFromIndexWindow();
    } else {
        addProfileWindow.focus();
    }
});

function createAddProfileWindow() {
    addProfileWindow = createWindow({
        filePath: path.join(__dirname, 'profiles', 'addProfile.html'),
        width: 585,
        height: 485,
        parent: mainWindow,
        onClose: () => (addProfileWindow = null),
    });

    addProfileWindow.webContents.on('did-finish-load', () => {
        // You can send specific data or commands here if necessary
    });
}

function createEditProfileWindow(record) {
    editProfileWindow = createWindow({
        filePath: path.join(__dirname, 'profiles', 'editProfile.html'),
        width: 585,
        height: 485,

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


//BACKUP/RESTORE EXCEL FILES
const ExcelJS = require('exceljs'); // For handling Excel files


// Export Profiles to Excel (excluding Profile ID)
ipcMain.handle('exportProfilesToExcel', async () => {
    try {
        const profiles = await executeSelectQuery('SELECT * FROM Profiles');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Borrower Profiles');

        // Define headers without Profile ID
        const headers = [
            { header: 'Borrower ID', key: 'borrower_id', width: 15 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Phone Number', key: 'phone_number', width: 20 },
            { header: 'Email Address', key: 'email', width: 30 }
        ];

        worksheet.columns = headers;

        let lastProfileID = 0; // Track Profile ID for incrementing

        const borrowerIDSet = new Set();

        profiles.forEach(profile => {
            // Increment Profile ID if it's a new Borrower ID
            if (!borrowerIDSet.has(profile.borrower_id)) {
                borrowerIDSet.add(profile.borrower_id);
                lastProfileID++;
            }

            worksheet.addRow({
                borrower_id: profile.borrower_id,
                name: profile.name,
                phone_number: profile.phone_number,
                email: profile.email
            });
        });

        const { filePath } = await dialog.showSaveDialog({
            title: 'Save Excel File',
            defaultPath: 'profiles.xlsx',
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
        });

        if (filePath) {
            await workbook.xlsx.writeFile(filePath);
            return { message: 'Profiles exported successfully!' };
        }

        return { message: 'Export canceled.' };
    } catch (error) {
        console.error('Error exporting profiles:', error);
        return { message: 'Error exporting profiles.' };
    }
});

// Import Profiles from Excel (with validation and merge functionality)
ipcMain.handle('importProfilesFromExcel', async () => {
    try {
        const { filePaths } = await dialog.showOpenDialog({
            title: 'Select Excel File',
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
            properties: ['openFile']
        });

        if (filePaths.length === 0) return { message: 'Import canceled.' };

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
        return { message: 'Error importing profiles.' };
    }
});


// Import Books from Excel (with merge functionality)
ipcMain.handle('importBooksFromExcel', async () => {
    try {
        const { filePaths } = await dialog.showOpenDialog({
            title: 'Select Excel File',
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
            properties: ['openFile']
        });

        if (filePaths.length === 0) return { message: 'Import canceled.' };

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePaths[0]);

        const worksheet = workbook.getWorksheet('Books');
        worksheet.eachRow(async (row, rowNumber) => {
            if (rowNumber > 1) { // Skip header row
                const book = {
                    id: row.getCell(1).value,
                    title_of_book: row.getCell(2).value,
                    author: row.getCell(3).value,
                    year: row.getCell(4).value,
                    number: row.getCell(5).value,
                    date_received: row.getCell(6).value,
                    class: row.getCell(7).value,
                    source_of_fund: row.getCell(8).value,
                    cost_price: row.getCell(9).value,
                    publisher: row.getCell(10).value,
                    remarks: row.getCell(11).value,
                    volume: row.getCell(12).value,
                    pages: row.getCell(13).value,
                    condition: row.getCell(14).value
                };

                const existingBook = await executeSelectQuery('SELECT * FROM books WHERE id = ?', [book.id]);

                if (existingBook.length > 0) {
                    // If the book exists, update the record
                    await executeQuery(
                        `UPDATE books SET 
                            title_of_book = ?, author = ?, year = ?, number = ?, date_received = ?, class = ?, source_of_fund = ?, 
                            cost_price = ?, publisher = ?, remarks = ?, volume = ?, pages = ?, condition = ? 
                         WHERE id = ?`,
                        [
                            book.title_of_book, book.author, book.year, book.number, book.date_received, book.class,
                            book.source_of_fund, book.cost_price, book.publisher, book.remarks, book.volume, book.pages,
                            book.condition, book.id
                        ]
                    );
                } else {
                    // If the book doesn't exist, insert a new record
                    await executeQuery(
                        'INSERT INTO books (id, title_of_book, author, year, number, date_received, class, source_of_fund, cost_price, publisher, remarks, volume, pages, condition) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            book.id, book.title_of_book, book.author, book.year, book.number, book.date_received, book.class,
                            book.source_of_fund, book.cost_price, book.publisher, book.remarks, book.volume, book.pages, book.condition
                        ]
                    );
                }
            }
        });

        return { message: 'Books imported and merged successfully!' };
    } catch (error) {
        console.error('Error importing books:', error);
        return { message: 'Error importing books.' };
    }
});


// Export Books to Excel
ipcMain.handle('exportBooksToExcel', async () => {
    try {
        const books = await executeSelectQuery('SELECT * FROM books');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Books');

        // Dynamically add column headers based on the database schema
        if (books.length > 0) {
            const columns = Object.keys(books[0]).map((key) => ({
                header: key,
                key: key
            }));
            worksheet.columns = columns;

            // Add rows from books data (as-is from database)
            books.forEach(book => {
                worksheet.addRow(book);
            });
        }

        const { filePath } = await dialog.showSaveDialog({
            title: 'Save Excel File',
            defaultPath: 'books.xlsx',
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
        });

        if (filePath) {
            await workbook.xlsx.writeFile(filePath);
            return { message: 'Books exported successfully!' };
        }

        return { message: 'Export canceled.' };
    } catch (error) {
        console.error('Error exporting books:', error);
        return { message: 'Error exporting books.' };
    }
});

