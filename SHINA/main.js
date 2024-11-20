const { app, BrowserWindow, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const db = require('./database.js');
const sqlite3 = require('sqlite3').verbose();;
const fs = require('fs');
const ExcelJS = require('exceljs'); 


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

// Import Profiles from Excel 
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

//GENERATE REPORTS
// + REPORTS
// Export Books to Excel
ipcMain.handle('exportBooksToExcel', async () => {
    try {
        const books = await executeSelectQuery('SELECT * FROM books');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Books');

        // Define readable column names
        const columns = [
            { header: 'ID', key: 'id', hidden: true },
            { header: 'Book Number', key: 'number' },
            { header: 'Date Received', key: 'date_received' },
            { header: 'Class', key: 'class' },
            { header: 'Author', key: 'author' },
            { header: 'Title of Book', key: 'title_of_book' },
            { header: 'Edition', key: 'edition' },
            { header: 'Source of Fund', key: 'source_of_fund' },
            { header: 'Cost Price', key: 'cost_price' },
            { header: 'Publisher', key: 'publisher' },
            { header: 'Year', key: 'year' },
            { header: 'Remarks', key: 'remarks' },
            { header: 'Volume', key: 'volume' },
            { header: 'Pages', key: 'pages' },
            { header: 'Condition', key: 'condition' },
            { header: 'Created At', key: 'createdAt', hidden: true } // Hide the createdAt column
        ];
        worksheet.columns = columns;

        // Add rows from books data
        books.forEach(book => {
            worksheet.addRow(book);
        });

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

// Import Books 
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

        const worksheet = workbook.getWorksheet('Books'); // Adjusted to match your export worksheet name
        let importedCount = 0; // Track the number of successfully imported books

        // Loop through each row, validating and merging data
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) { // Start from the second row
            const row = worksheet.getRow(rowNumber);
            const title_of_book = row.getCell(6).value; // Assuming this is the "Title of Book" column

            // Validate for missing title
            if (!title_of_book) {
                console.warn(`Row ${rowNumber} has incomplete data: Title of Book is required.`);
                continue; // Skip rows without the title of book
            }

            const book = {
                id: row.getCell(1).value,                // Excel Column: "ID"
                number: row.getCell(2).value,            // Excel Column: "Book Number"
                date_received: row.getCell(3).value,     // Excel Column: "Date Received"
                class: row.getCell(4).value,             // Excel Column: "Class"
                author: row.getCell(5).value,            // Excel Column: "Author"
                title_of_book: title_of_book,             // Required Title
                edition: row.getCell(7).value,           // Excel Column: "Edition"
                source_of_fund: row.getCell(8).value,    // Excel Column: "Source of Fund"
                cost_price: row.getCell(9).value,        // Excel Column: "Cost Price"
                publisher: row.getCell(10).value,        // Excel Column: "Publisher"
                year: row.getCell(11).value,             // Excel Column: "Year"
                remarks: row.getCell(12).value,          // Excel Column: "Remarks"
                volume: row.getCell(13).value,           // Excel Column: "Volume"
                pages: row.getCell(14).value,            // Excel Column: "Pages"
                createdAt: row.getCell(15).value,        // Excel Column: "Created At"
                condition: row.getCell(16).value         // Excel Column: "Condition"
            };

            // Check if the Book ID already exists
            if (book.id) {
                const existingBook = await executeSelectQuery('SELECT * FROM books WHERE id = ?', [book.id]);

                if (existingBook.length > 0) {
                    // If Book ID exists, merge the book (update the existing record)
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
                    // If the ID is provided but doesn't exist in the database, insert the record with that ID
                    await executeQuery(
                        `INSERT INTO books (id, number, date_received, class, author, title_of_book, edition, source_of_fund, cost_price, publisher, year, remarks, volume, pages, createdAt, condition) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            book.id, book.number, book.date_received, book.class, book.author, 
                            book.title_of_book, book.edition, book.source_of_fund, 
                            book.cost_price, book.publisher, book.year, 
                            book.remarks, book.volume, book.pages, 
                            book.createdAt, book.condition
                        ]
                    );
                }
            } else {
                // If no ID is provided, insert a new record and let the database auto-increment the ID
                await executeInsertQuery(
                    `INSERT INTO books (number, date_received, class, author, title_of_book, edition, source_of_fund, cost_price, publisher, year, remarks, volume, pages, createdAt, condition) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
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
                message: `${importedCount} Books imported and merged successfully!`,
                buttons: ['OK']
            });
        }

    } catch (error) {
        console.error('Error importing books:', error);
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

// Books Availability
ipcMain.handle('checkBooksAvailability', async () => {
    try {
        // Query to get book information and its status, including the book ID
        const booksAvailability = await executeSelectQuery(`
            SELECT 
                b.id,  -- Add book ID
                b.title_of_book, 
                b.year, 
                b.edition, 
                b.volume,
                CASE 
                    WHEN br.borrowStatus = 'borrowed' THEN 'Not Available'
                    ELSE 'Available'
                END AS book_status
            FROM books b
            LEFT JOIN borrow br ON b.id = br.book_id
            GROUP BY b.id, b.title_of_book, b.year, b.edition, b.volume
        `);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Books Availability');

        // Define readable column names, adding a hidden 'Book ID' column
        const columns = [
            { header: 'Book ID', key: 'id', hidden: true },  // Hidden Book ID column
            { header: 'Title of Book', key: 'title_of_book' },
            { header: 'Year', key: 'year' },
            { header: 'Edition', key: 'edition' },
            { header: 'Volume', key: 'volume' },
            { header: 'Book Status', key: 'book_status' }
        ];
        worksheet.columns = columns;

        // Add rows from books status data
        booksAvailability.forEach(book => {
            worksheet.addRow(book);
        });

        // Apply conditional formatting: Green for 'Available' books (for entire row)
        worksheet.eachRow((row, rowNumber) => {
            const bookStatusCell = row.getCell('book_status');
            if (bookStatusCell.value === 'Available') {
                row.eachCell({ includeEmpty: true }, (cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF00FF00' }, // Green color for available books
                    };
                });
            }
        });

        // Apply dropdown (data validation) for the "Book Status" column
        worksheet.getColumn('book_status').eachCell({ includeEmpty: true }, (cell, rowNumber) => {
            if (rowNumber > 1) { // Skip header row
                cell.dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formula1: '"Available,Not Available"', // Dropdown options
                    showDropDown: true
                };
            }
        });

        // Apply auto-filter to the worksheet
        worksheet.autoFilter = {
            from: 'A1',
            to: 'F1' // Adjust if the range changes
        };

        // Calculate availability statistics
        const totalBooks = booksAvailability.length;
        const availableBooks = booksAvailability.filter(book => book.book_status === 'Available').length;
        const notAvailableBooks = totalBooks - availableBooks;
        const availablePercentage = ((availableBooks / totalBooks) * 100).toFixed(2);
        const notAvailablePercentage = (100 - availablePercentage).toFixed(2);

        // Add summary to a new sheet
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.addRow(['Status', 'Count', 'Percentage']);
        summarySheet.addRow(['Available', availableBooks, `${availablePercentage}%`]);
        summarySheet.addRow(['Not Available', notAvailableBooks, `${notAvailablePercentage}%`]);

        const { filePath } = await dialog.showSaveDialog({
            title: 'Save Excel File',
            defaultPath: 'books_status.xlsx',
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
        });

        if (filePath) {
            await workbook.xlsx.writeFile(filePath);
            return { message: 'Books status exported successfully with summary!' };
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
                    br.borrower_id,       -- Borrower ID
                    p.name AS borrower_name, -- Borrower Name
                    b.title_of_book AS book_title, -- Book Title
                    br.borrowDate,        -- Borrow Date
                    br.borrowStatus,      -- Borrow Status
                    br.returnDate,        -- Return Date
                    br.dueDate            -- Due Date
                FROM borrow br
                JOIN Profiles p ON br.borrower_id = p.borrower_id
                JOIN books b ON br.book_id = b.id
                WHERE ${getTimePeriodCondition(timePeriod)}  -- Apply time period condition based on borrowDate
                ORDER BY br.borrowDate DESC  -- Sort by borrowDate in descending order
            `;
        } else if (category === 'most-borrowed-books') {
            query = `
                SELECT 
                    b.id AS book_id,                     -- Book ID
                    b.title_of_book AS book_title,       -- Book Title
                    b.year AS year,                     -- Year
                    b.edition AS edition,               -- Edition
                    b.volume AS volume,                 -- Volume
                    COUNT(br.book_id) AS borrow_count   -- Number of times borrowed
                FROM borrow br
                JOIN books b ON br.book_id = b.id
                WHERE ${getTimePeriodCondition(timePeriod)}  -- Apply time period condition
                GROUP BY b.id, b.title_of_book, b.year, b.edition, b.volume  -- Group by all book fields
                ORDER BY borrow_count DESC  -- Order by borrow count in descending order
            `;
        }

        console.log('SQL Query:', query);
        reportData = await executeSelectQuery(query);
        console.log('Report Data:', reportData);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(category === 'borrowing-history' ? 'Borrowing History' : 'Most Borrowed Books');

        // Define columns for the Excel worksheet
        let columns = [];

        if (category === 'borrowing-history') {
            columns = [
                { header: 'Borrower Name', key: 'borrower_name' },
                { header: 'Book Title', key: 'book_title' },
                { header: 'Borrow Date', key: 'borrowDate' },
                { header: 'Borrow Status', key: 'borrowStatus' },
                { header: 'Return Date', key: 'returnDate' },
                { header: 'Due Date', key: 'dueDate' }
            ];
        } else if (category === 'most-borrowed-books') {
            columns = [
                { header: 'Book ID', key: 'book_id' },         // New column for Book ID
                { header: 'Book Title', key: 'book_title' },
                { header: 'Year', key: 'year' },               // New column for Year
                { header: 'Edition', key: 'edition' },         // New column for Edition
                { header: 'Volume', key: 'volume' },           // New column for Volume
                { header: 'Times Borrowed', key: 'borrow_count' }
            ];
        }

        worksheet.columns = columns;

        // Add rows to the worksheet from the report data
        reportData.forEach(row => worksheet.addRow(row));

        // Add auto-filter to the first row
        worksheet.autoFilter = {
            from: 'A1',
            to: `${String.fromCharCode(64 + worksheet.columns.length)}1`  // Dynamically set the last column for autofilter
        };

        // Show a save dialog to save the Excel file
        const { filePath } = await dialog.showSaveDialog({
            title: 'Save Report as Excel',
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
