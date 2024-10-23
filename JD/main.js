const { app, BrowserWindow, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const db = require('./database.js');

let mainWindow, loginWindow, addBorrowWindow, updateBorrowWindow, addBookWindow, editBookWindow, addProfileWindow, editProfileWindow;

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

// Function to open the books page
function createBooksPageWindow() {
    if (!mainWindow) {
        createMainWindow(); // Make sure the main window is created if it's not already
    }
    // You can adjust the navigation logic to ensure the books page is loaded within the main window
    mainWindow.loadFile(path.join(__dirname, 'books', 'books.html'));
}

function createProfilesPageWindow() {
    if (!mainWindow) {
        createMainWindow(); // Make sure the main window is created if it's not already
    }
    // You can adjust the navigation logic to ensure the books page is loaded within the main window
    mainWindow.loadFile(path.join(__dirname, 'profiles', 'profiles.html'));
}

// Listen for the event to open the books page
ipcMain.on('open-books-page', () => {
    createBooksPageWindow();
});

ipcMain.on('open-profiles-page', () => {
    createProfilesPageWindow();
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
// Add this handler to get the password hint
ipcMain.handle('get-password-hint', async (event, username) => {
    try {
        const user = await getUserByUsername(username);
        if (!user) {
            return { success: false, error: 'Username not found.' };
        }

        return { success: true, hint: user.hint || '' }; 
    } catch (error) {
        console.error('Error getting password hint:', error);
        return { success: false, error: 'An error occurred.' };
    }
});

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

// Change Password IPC Handler
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

        // Update the password and the hint in the database
        await executeQuery('UPDATE user SET password = ?, hint = ? WHERE id = ?', [newPassword, passwordHint, user.id]);

        console.log('Password and hint updated successfully');
        return { success: true };
    } catch (error) {
        console.error('Error changing password:', error);
        return { success: false, error: error.message };
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
///BOOKS
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

function createAddBookWindow() {
    addBookWindow = createWindow({
        filePath: path.join(__dirname, 'books', 'addBook.html'),
        width: 600,
        height: 600,
        parent: mainWindow,
        onClose: () => (addBookWindow = null),
    });
}

ipcMain.on('open-add-book-window', () => {
    if (!addBookWindow) {
        createAddBookWindow();
    } else {
        addBookWindow.focus();
    }
});

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

//PROFILES' CRUD
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

// Generic function to show a confirmation dialog
async function showConfirmationDialog(title, message) {
    const response = await dialog.showMessageBox({
        type: 'question',
        buttons: ['Cancel', 'Confirm'],
        title: title,
        message: message
    });

    return response.response === 1; // Return true if the user clicked 'Confirm'
}

// Handle confirmation requests
ipcMain.handle('show-confirmation-dialog', async (event, { title, message }) => {
    return await showConfirmationDialog(title, message);
});

///PROFILES
// Listen for the event from index.js
// Function to create the Add Profile window
function createAddProfileWindow() {
    addProfileWindow = new BrowserWindow({
        width: 600,
        height: 490,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            // No need for preload if you are not using it
            nodeIntegration: true, // This allows you to access Node.js in your renderer process
            contextIsolation: false // Allows direct access to ipcRenderer from the renderer process
        },
    });

    addProfileWindow.loadFile(path.join(__dirname, 'profiles', 'addProfile.html'));

    addProfileWindow.on('closed', () => {
        addProfileWindow = null;
        if (mainWindow) mainWindow.focus();
    });
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
        width: 585,
        height: 405,

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