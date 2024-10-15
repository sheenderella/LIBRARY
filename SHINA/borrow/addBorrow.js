const { ipcRenderer } = require('electron');

// Function to fetch borrower IDs for suggestions from the database
async function fetchBorrowerIDs() {
    try {
        const ids = await ipcRenderer.invoke('getBorrowerIDs'); // Fetch borrower IDs via IPC
        return ids;
    } catch (error) {
        console.error('Error fetching borrower IDs:', error);
        return [];
    }
}

// Function to fetch borrower names for suggestions from the database
async function fetchBorrowerNames() {
    try {
        const names = await ipcRenderer.invoke('getBorrowerNames'); // Fetch borrower names via IPC
        return names;
    } catch (error) {
        console.error('Error fetching borrower names:', error);
        return [];
    }
}

// Function to fetch the borrower name based on ID
async function fetchBorrowerNameByID(id) {
    try {
        const name = await ipcRenderer.invoke('getBorrowerNameByID', id); // Fetch borrower name via IPC
        return name;
    } catch (error) {
        console.error('Error fetching borrower name:', error);
        return null;
    }
}

// Function to fetch the borrower ID based on name
async function fetchBorrowerIDByName(name) {
    try {
        const id = await ipcRenderer.invoke('getBorrowerIDByName', name); // Fetch borrower ID via IPC
        return id;
    } catch (error) {
        console.error('Error fetching borrower ID:', error);
        return null;
    }
}

// Function to fetch book titles for suggestions from the database
async function fetchBookTitles() {
    try {
        const titles = await ipcRenderer.invoke('getBookTitles'); // Fetch book titles via IPC
        return titles;
    } catch (error) {
        console.error('Error fetching book titles:', error);
        return [];
    }
}

// Function to filter borrower ID suggestions based on user input
function filterIDSuggestions(ids, input) {
    const lowerInput = input.toLowerCase(); // Convert input to lowercase for case-insensitive matching
    return ids.filter(id => id.toString().toLowerCase().includes(lowerInput)); // Return matching IDs
}

// Function to filter borrower name suggestions based on user input
function filterNameSuggestions(names, input) {
    const lowerInput = input.toLowerCase(); // Convert input to lowercase for case-insensitive matching
    return names.filter(name => name.toLowerCase().includes(lowerInput)); // Return matching names
}

// Function to filter book title suggestions based on user input
function filterSuggestions(titles, input) {
    const lowerInput = input.toLowerCase(); // Convert input to lowercase for case-insensitive matching
    return titles.filter(title => title.toLowerCase().includes(lowerInput)); // Return matching titles
}

// Function to display borrower ID suggestions in the UI
function displayIDSuggestions(suggestions) {
    const suggestionList = document.getElementById('borrowerSuggestionList'); // Target the correct list for IDs
    suggestionList.innerHTML = ''; // Clear previous suggestions

    suggestions.forEach(id => {
        const option = document.createElement('div');
        option.classList.add('suggestion'); // Add class for styling
        option.textContent = id; // Display the borrower ID as the suggestion

        // When a suggestion is clicked, set it as the input value and autofill the borrower name
        option.addEventListener('click', async () => {
            document.getElementById('addBorrowerID').value = id; // Set ID input value
            suggestionList.innerHTML = ''; // Clear the suggestion list

            const name = await fetchBorrowerNameByID(id); // Fetch the name associated with the ID
            if (name) {
                document.getElementById('addBorrowerName').value = name; // Autofill the borrower name
            }
        });

        suggestionList.appendChild(option); // Add the suggestion to the suggestion list
    });
}

// Function to display borrower name suggestions in the UI
function displayNameSuggestions(suggestions) {
    const suggestionList = document.getElementById('nameSuggestionList'); // Target the correct list for names
    suggestionList.innerHTML = ''; // Clear previous suggestions

    suggestions.forEach(name => {
        const option = document.createElement('div');
        option.classList.add('suggestion'); // Add class for styling
        option.textContent = name; // Display the borrower name as the suggestion

        // When a suggestion is clicked, set it as the input value and autofill the borrower ID
        option.addEventListener('click', async () => {
            document.getElementById('addBorrowerName').value = name; // Set name input value
            suggestionList.innerHTML = ''; // Clear the suggestion list

            const id = await fetchBorrowerIDByName(name); // Fetch the ID associated with the name
            if (id) {
                document.getElementById('addBorrowerID').value = id; // Autofill the borrower ID
            }
        });

        suggestionList.appendChild(option); // Add the suggestion to the suggestion list
    });
}

// Event listener for the borrower ID input field
document.getElementById('addBorrowerID').addEventListener('input', async function () {
    const input = this.value;

    if (input.length === 0) {
        document.getElementById('borrowerSuggestionList').innerHTML = ''; // Clear suggestions if input is empty
        return;
    }

    const ids = await fetchBorrowerIDs(); // Fetch all borrower IDs
    const suggestions = filterIDSuggestions(ids, input); // Filter based on the user's input
    displayIDSuggestions(suggestions); // Display the filtered suggestions
});

// Event listener for the borrower name input field
document.getElementById('addBorrowerName').addEventListener('input', async function () {
    const input = this.value;

    if (input.length === 0) {
        document.getElementById('nameSuggestionList').innerHTML = ''; // Clear suggestions if input is empty
        return;
    }

    const names = await fetchBorrowerNames(); // Fetch all borrower names
    const suggestions = filterNameSuggestions(names, input); // Filter based on the user's input
    displayNameSuggestions(suggestions); // Display the filtered suggestions
});

// Event listener for the book title input field
document.getElementById('addBookTitle').addEventListener('input', async function () {
    const input = this.value;

    if (input.length === 0) {
        document.getElementById('bookSuggestionList').innerHTML = ''; // Clear suggestions if input is empty
        return;
    }

    const titles = await fetchBookTitles(); // Fetch all book titles
    const suggestions = filterSuggestions(titles, input); // Filter based on the user's input
    displaySuggestions(suggestions); // Display the filtered suggestions
});


// Event listener to handle form submission
async function handleAddBorrow(event) {
    event.preventDefault();

    const borrowerName = document.getElementById('addBorrowerName').value; // Borrower name
    const bookTitle = document.getElementById('addBookTitle').value;
    const borrowDate = document.getElementById('addBorrowDate').value;
    const dueDate = document.getElementById('addDueDate').value;
    const borrowStatus = 'borrowed'; // Default status

    try {
        const newRecord = {
            borrowerName,
            bookTitle,
            borrowDate,
            dueDate,
            borrowStatus
        };

        // Send the new borrow record to the backend for adding to the database
        await ipcRenderer.invoke('addBorrow', newRecord);
        
    } catch (error) {
        console.error('Error adding borrow record:', error);
        ipcRenderer.send('borrow-added-failure', 'Failed to add borrow record'); // Emit failure message
    }
}

// Function to display book title suggestions in the UI
function displaySuggestions(suggestions) {
    const suggestionList = document.getElementById('bookSuggestionList'); // Target the correct list for book titles
    suggestionList.innerHTML = ''; // Clear previous suggestions

    suggestions.forEach(title => {
        const option = document.createElement('div');
        option.classList.add('suggestion'); // Add class for styling
        option.textContent = title; // Display the book title as the suggestion

        // When a suggestion is clicked, set it as the input value
        option.addEventListener('click', () => {
            document.getElementById('addBookTitle').value = title; // Set title input value
            suggestionList.innerHTML = ''; // Clear the suggestion list
        });

        suggestionList.appendChild(option); // Add the suggestion to the suggestion list
    });
}


// Handle success or failure messages
ipcRenderer.on('borrow-added-success', () => {
    window.close(); // Close the add borrow window on success
});

ipcRenderer.on('borrow-added-failure', (event, message) => {
    alert(message || 'Failed to add borrow record'); // Show error message if the borrow record addition fails
});

// Attach the form submission handler to the form
document.getElementById('addBorrowForm').addEventListener('submit', handleAddBorrow);

async function handleAddBorrow(event) {
    event.preventDefault();

    const borrowerID = document.getElementById('addBorrowerID').value;
    const borrowerName = document.getElementById('addBorrowerName').value;
    const bookTitle = document.getElementById('addBookTitle').value;
    const borrowDate = document.getElementById('addBorrowDate').value;
    const dueDate = document.getElementById('addDueDate').value;
    const borrowStatus = 'borrowed'; // Default status

    if (!borrowerID || !borrowerName || !bookTitle || !borrowDate || !dueDate) {
        alert('Please fill out all required fields.');
        return;
    }

    const newRecord = {
        borrowerID,
        borrowerName,
        bookTitle,
        borrowDate,
        dueDate,
        borrowStatus
    };

    try {
        await ipcRenderer.invoke('addBorrow', newRecord);
        window.close();
    } catch (error) {
        console.error('Error adding borrow record:', error);
    }
}


// Set max date and sync due date with borrow date
document.addEventListener('DOMContentLoaded', function () {
    // Set max date to today's date for borrow date
    const addBorrowDateInput = document.getElementById('addBorrowDate');
    const today = new Date().toISOString().split('T')[0]; // Get today's date in yyyy-mm-dd format
    addBorrowDateInput.setAttribute('max', today);

    const addDueDateInput = document.getElementById('addDueDate');
    addBorrowDateInput.addEventListener('change', function() {
        addDueDateInput.setAttribute('min', addBorrowDateInput.value); // Ensure due date is not before borrow date
    });
});
