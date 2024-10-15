const { app, BrowserWindow, ipcMain, Notification } = require('electron');
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
}

;

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
// Database operations (assuming executeSelectQuery and executeQuery are predefined)
ipcMain.handle('getBorrows', async () => {
    try {
        return await executeSelectQuery('SELECT * FROM borrow ORDER BY createdAt ASC');
    } catch (error) {
        console.error('Error fetching borrow records:', error);
        throw new Error('Failed to fetch records');
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
    'SELECT * FROM borrow WHERE borrowerName = ?',
    [name]
));


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

// Handle add borrow
ipcMain.handle('addBorrow', async (event, record) => {
    try {
        // Check if the borrower ID exists in the 'Profiles' table
        const borrowerExists = await executeSelectQuery(
            'SELECT * FROM Profiles WHERE borrower_id = ?',
            [record.borrowerID] // Use borrower ID
        );

        if (borrowerExists.length === 0) {
            console.error('Borrower does not exist in Profiles table:', record.borrowerID);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('borrow-added-failure', 'Borrower ID does not exist');
            }
            return; // Exit without adding the borrow record
        }

        // Check if the book exists in the 'books' table
        const bookExists = await executeSelectQuery(
            'SELECT * FROM books WHERE title_of_book = ?',
            [record.bookTitle]
        );

        if (bookExists.length === 0) {
            console.error('Book does not exist in books table:', record.bookTitle);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('borrow-added-failure', 'Book does not exist');
            }
            return; // Exit without adding the borrow record
        }

        // Proceed to add the borrow record if the borrower and book exist
        console.log('Inserting record:', record);
        await executeQuery(
            'INSERT INTO borrow (borrowerName, bookTitle, borrowDate, dueDate, borrowStatus, createdAt) VALUES (?, ?, ?, ?, ?, datetime("now"))',
            [record.borrowerName, record.bookTitle, record.borrowDate, record.dueDate, record.borrowStatus]
        );

        // Notify the main window about the new record
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('borrow-record-added', record);
            mainWindow.webContents.send('borrow-added-success');
        }
    } catch (error) {
        console.error('Error adding borrow record:', error);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('borrow-added-failure', 'Error adding borrow record');
        }
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

// Handle fetching all book titles for suggestions
ipcMain.handle('getBookTitles', async () => {
    try {
        const bookTitles = await executeSelectQuery('SELECT title_of_book FROM books');
        console.log('Fetched book titles:', bookTitles); // Log fetched book titles for debugging
        return bookTitles.map(book => book.title_of_book); // Return only the titles
    } catch (error) {
        console.error('Error fetching book titles:', error);
        throw new Error('Failed to fetch book titles');
    }
});


// Handle searching for books
ipcMain.handle('searchBooks', async (event, query) => {
    try {
        const books = await executeSelectQuery(
            'SELECT title_of_book FROM books WHERE title_of_book LIKE ? LIMIT 5',
            [`%${query}%`]
        );
        return books;
    } catch (error) {
        console.error('Error fetching book suggestions:', error);
        return [];
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



//PROFILES
ipcMain.handle('getProfiles', async () => {
    try {
        const profiles = await executeSelectQuery('SELECT * FROM Profiles ORDER BY id DESC');
        return profiles;
    } catch (error) {
        console.error('Error fetching book records:', error);
        return [];
    }
});


let reportsWindow = null; // Initialize the reportsWindow variable

// REPORTS
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