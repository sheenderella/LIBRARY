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


//BOOK 
// Function to fetch book titles for suggestions
async function fetchBookTitles() {
    try {
        return await ipcRenderer.invoke('getBookTitles');
    } catch (error) {
        console.error('Error fetching book titles:', error);
        return [];
    }
}

// Function to check if a specific book is already borrowed based on its ID
async function checkIfBookIsBorrowed(bookId) {
    try {
        return await ipcRenderer.invoke('checkBookBorrowed', { bookId });
    } catch (error) {
        console.error('Error checking if book is borrowed:', error);
        return false;
    }
}

document.getElementById('addBookTitle').addEventListener('input', async function () {
    const input = this.value.trim();
    
    if (input.length === 0) {
        document.getElementById('bookSuggestionList').innerHTML = ''; // Clear suggestions if input is empty
        return;
    }

    const titles = await fetchBookTitles(); // Fetch all book titles
    const suggestions = await filterSuggestions(titles, input); // Filter based on the user's input
    displaySuggestions(suggestions); // Display the filtered suggestions
});


/// Function to fetch all currently selected book IDs (including dynamically added ones)
function getSelectedBookIds() {
    const selectedIds = [];
    document.querySelectorAll('.book-item input[type="hidden"]').forEach((input) => {
        const bookId = input.value;
        if (bookId) {
            selectedIds.push(bookId); // Collect the IDs of selected books
        }
    });
    return selectedIds;
}

// Modify the filterSuggestions function to exclude borrowed and already selected books
async function filterSuggestions(titles, input) {
    const lowerInput = input.toLowerCase();
    const selectedIds = getSelectedBookIds(); // Get all currently selected book IDs

    const filtered = [];
    for (const title of titles) {
        // Check if the title matches the input and if the book is not already selected
        if (title.title_of_book.toLowerCase().includes(lowerInput) && !selectedIds.includes(title.bookId)) {
            const isBorrowed = await checkIfBookIsBorrowed(title.bookId);
            if (!isBorrowed) {
                filtered.push(title); // Only add the book to suggestions if it's not borrowed or selected
            }
        }
    }

    console.log('Filtered suggestions:', filtered); // Ensure this logs the filtered titles correctly
    return filtered;
}

function displaySuggestions(suggestions) {
    const suggestionList = document.getElementById('bookSuggestionList');
    suggestionList.innerHTML = ''; // Clear previous suggestions

    suggestions.forEach((book) => {
        const option = document.createElement('div');
        option.classList.add('suggestion');
        option.textContent = `${book.title_of_book} - Volume: ${book.volume}, Edition: ${book.edition}, Year: ${book.year}`;

        option.addEventListener('click', () => {
            document.getElementById('addBookTitle').value = book.title_of_book;
            document.getElementById('addBookId').value = book.bookId; // Save the selected book's ID
            suggestionList.innerHTML = ''; // Clear suggestions
            autofillDetails(book); // Autofill the rest of the details
        });

        suggestionList.appendChild(option); // Append suggestion to the list
    });
}

// Autofill details for the selected book
function autofillDetails(detail) {
    document.getElementById('addVolume').value = detail.volume || 'n/a';
    document.getElementById('addEdition').value = detail.edition || 'n/a';
    document.getElementById('addYear').value = detail.year || 'n/a';
}

// Disable the 'Add Another Book' button if there's already a book selected
document.getElementById('addBorrowForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const borrowerID = document.getElementById('addBorrowerID').value;
    const borrowerName = document.getElementById('addBorrowerName').value;
    const borrowDate = document.getElementById('addBorrowDate').value;
    const dueDate = document.getElementById('addDueDate').value;

    if (!borrowerID || !borrowerName || !borrowDate || !dueDate) {
        showModal('Error', 'All borrower details are required.');
        return;
    }

    // Check if there's already a book added
    const bookItems = document.querySelectorAll('.book-item');
    if (bookItems.length === 0) {
        showModal('Error', 'Please add at least one book.');
        return;
    }

    const bookItem = bookItems[0]; // Only allow the first book
    const bookTitle = bookItem.querySelector('input[placeholder="Book Title"]').value;
    const volume = bookItem.querySelector('input[placeholder="Volume"]').value || 'n/a';
    const edition = bookItem.querySelector('input[placeholder="Edition"]').value || 'n/a';
    const year = bookItem.querySelector('input[placeholder="Year"]').value || 'n/a';
    const bookId = bookItem.querySelector('input[type="hidden"]').value;

    if (!bookId) {
        showModal('Error', 'Please select a valid book.');
        return;
    }

    // Check if the book is already borrowed
    const isAlreadyBorrowed = await checkIfBookIsBorrowed(bookId);
    if (isAlreadyBorrowed) {
        showModal('Error', `The book "${bookTitle}" is already borrowed.`);
        return;
    }

    // Prepare the borrow record
    const borrowRecord = {
        borrowerID,
        borrowerName,
        borrowDate,
        dueDate,
        books: [{
            bookId,
            title: bookTitle,
            volume,
            edition,
            year
        }],
        borrowStatus: 'borrowed'
    };

    try {
        await ipcRenderer.invoke('addBorrow', borrowRecord);
        window.close(); // Close the window after successful submission
    } catch (error) {
        console.error('Error adding borrow record:', error);
        showModal('Error', 'Failed to add the borrow record. Please try again.');
    }
});

// Function to check if a specific book is already borrowed
async function checkIfBookIsBorrowed(book_id) {
    try {
        const result = await ipcRenderer.invoke('checkBookBorrowed', book_id); // Use specific bookId here
        return result; // This should return true if borrowed, false otherwise
    } catch (error) {
        console.error('Error checking if book is borrowed:', error);
        return false; // Default to false in case of error
    }
}


// Add book logic with dynamic suggestion filtering
document.getElementById('addBookButton').addEventListener('click', function () {
    const bookList = document.getElementById('bookList');
    
    // Disable the button after adding a book, until a book is removed
    document.getElementById('addBookButton').disabled = true;

    const newBookItem = document.createElement('div');
    newBookItem.classList.add('book-item');

    newBookItem.innerHTML = `
    <small class="form-text text-muted"> New Book: </small>

        <div class="form-group">
            <small class="form-text text-muted">Book Title:</small>
            <input class="form-control book-title" type="text" placeholder="Book Title" required>
            <div class="suggestion-list"></div>
        </div>
        <div class="form-group">
            <small class="form-text text-muted">Volume (put n/a if not applicable):</small>
            <input class="form-control" type="text" placeholder="Volume">
        </div>
        <div class="form-group">
            <small class="form-text text-muted">Edition (put n/a if not applicable):</small>
            <input class="form-control" type="text" placeholder="Edition">
        </div>
        <div class="form-group">
            <small class="form-text text-muted">Year (put n/a if not applicable):</small>
            <input class="form-control" type="text" placeholder="Year">
        </div>
        <input type="hidden" value="">
        <button type="button" class="btn btn-danger remove-book-btn">Remove</button>
    `;

    bookList.appendChild(newBookItem);

    const removeButton = newBookItem.querySelector('.remove-book-btn');
    removeButton.addEventListener('click', function () {
        bookList.removeChild(newBookItem);
        // Re-enable the button if no books are left
        if (bookList.querySelectorAll('.book-item').length === 0) {
            document.getElementById('addBookButton').disabled = false;
        }
    });

    const bookTitleInput = newBookItem.querySelector('.book-title');
    bookTitleInput.addEventListener('input', async function () {
        const input = this.value.trim();
        const suggestionList = newBookItem.querySelector('.suggestion-list');

        if (input.length === 0) {
            suggestionList.innerHTML = '';
            return;
        }

        const titles = await fetchBookTitles();
        const suggestions = await filterSuggestions(titles, input);
        displayDynamicSuggestions(suggestions, bookTitleInput, suggestionList);
    });
});

// Function to display book title suggestions for dynamically added fields
function displayDynamicSuggestions(suggestions, inputElement, suggestionList) {
    suggestionList.innerHTML = ''; // Clear previous suggestions

    suggestions.forEach((book) => {
        const option = document.createElement('div');
        option.classList.add('suggestion');
        option.textContent = `${book.title_of_book} - Volume: ${book.volume}, Edition: ${book.edition}, Year: ${book.year}`;

        // Click handler for the suggestion
        option.addEventListener('click', () => {
            inputElement.value = book.title_of_book;
            inputElement.closest('.book-item').querySelector('input[type="hidden"]').value = book.bookId; // Save the selected book's ID
            suggestionList.innerHTML = ''; // Clear suggestions
            autofillDynamicDetails(book, inputElement); // Autofill the rest of the details

            console.log('Selected Book:', {
                id: book.bookId,
                title: book.title_of_book,
                volume: book.volume,
                edition: book.edition,
                year: book.year
            });
        });

        suggestionList.appendChild(option); // Append suggestion to the list
    });
}

// Autofill details for dynamically added book fields
function autofillDynamicDetails(detail, inputElement) {
    const bookItem = inputElement.closest('.book-item');
    bookItem.querySelector('input[placeholder="Volume"]').value = detail.volume || 'n/a';
    bookItem.querySelector('input[placeholder="Edition"]').value = detail.edition || 'n/a';
    bookItem.querySelector('input[placeholder="Year"]').value = detail.year || 'n/a';
}


function showModal(title, message) {
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Show the modal (implement your modal display logic)
    const modal = document.getElementById('error-modal');
    modal.style.display = 'block';

    // Close modal on click (if you have a close button)
    const modalClose = document.getElementById('modal-close');
    modalClose.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

// Handle success or failure messages
ipcRenderer.on('borrow-added-success', () => {
    window.close(); // Close the add borrow window on success
});

ipcRenderer.on('borrow-added-failure', (event, message) => {
    alert(message || 'Failed to add borrow record'); // Show error message if the borrow record addition fails
});

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
