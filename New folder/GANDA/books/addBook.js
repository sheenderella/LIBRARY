const { ipcRenderer } = require('electron');

// Fetch the list of books when the window loads
let existingBooks = [];
ipcRenderer.invoke('getBooks').then((books) => {
    // Filter books to only include unique titles (ignoring the book number)
    const uniqueBooks = [];
    const seenTitles = new Set();

    books.forEach(book => {
        if (!seenTitles.has(book.title_of_book)) {
            seenTitles.add(book.title_of_book);
            uniqueBooks.push(book);
        }
    });

    existingBooks = uniqueBooks;
}).catch((error) => {
    console.error('Error fetching existing books:', error);
});

const titleInput = document.getElementById('title_of_book');
const suggestionBox = document.createElement('ul'); // Create suggestion dropdown
suggestionBox.classList.add('suggestion-box'); // Add class for styling
document.body.appendChild(suggestionBox); // Append the suggestion box to the body

// Filter and display matching titles
titleInput.addEventListener('input', function () {
    const enteredTitle = titleInput.value.trim().toLowerCase();
    
    // Clear any existing suggestions
    suggestionBox.innerHTML = '';
    
    if (enteredTitle.length > 0) {
        // Filter books based on the entered title
        const matches = existingBooks.filter(book => 
            book.title_of_book.toLowerCase().includes(enteredTitle)
        );
        
        // Display matching suggestions
        matches.forEach(book => {
            const suggestionItem = document.createElement('li');
            suggestionItem.textContent = book.title_of_book;
            suggestionItem.addEventListener('click', () => {
                // Autofill the form when a suggestion is clicked
                titleInput.value = book.title_of_book;
                autofillForm(book);
                suggestionBox.innerHTML = ''; // Clear suggestions
            });
            suggestionBox.appendChild(suggestionItem);
        });
    }
});

// Autofill form fields based on selected book
function autofillForm(matchingBook) {
    document.getElementById('date_received').value = matchingBook.date_received;
    document.getElementById('class').value = matchingBook.class;
    document.getElementById('author').value = matchingBook.author;
    document.getElementById('edition').value = matchingBook.edition;
    document.getElementById('volume').value = matchingBook.volume;
    document.getElementById('pages').value = matchingBook.pages;
    document.getElementById('source_of_fund').value = matchingBook.source_of_fund;
    document.getElementById('cost_price').value = matchingBook.cost_price;
    document.getElementById('publisher').value = matchingBook.publisher;
    document.getElementById('year').value = matchingBook.year;
    document.getElementById('condition').value = matchingBook.condition;
    document.getElementById('remarks').value = matchingBook.remarks;
}

// Handle form submission
document.getElementById('addBookForm').addEventListener('submit', (event) => {
    event.preventDefault();

    const record = {
        date_received: document.getElementById('date_received').value,
        class: document.getElementById('class').value,
        author: document.getElementById('author').value,
        title_of_book: document.getElementById('title_of_book').value,
        edition: document.getElementById('edition').value,
        volume: document.getElementById('volume').value,
        pages: document.getElementById('pages').value,
        source_of_fund: document.getElementById('source_of_fund').value,
        cost_price: document.getElementById('cost_price').value,
        publisher: document.getElementById('publisher').value,
        year: document.getElementById('year').value,
        condition: document.getElementById('condition').value,
        remarks: document.getElementById('remarks').value,
    };

    const numberOfCopies = parseInt(document.getElementById('copies').value); // Get the number of copies

    // Add the book to the table based on the number of copies
    const addBookPromises = [];
    for (let i = 0; i < numberOfCopies; i++) {
        addBookPromises.push(ipcRenderer.invoke('addBook', record)); // Push promise for each copy
    }

    Promise.all(addBookPromises).then(() => {
        window.close();
    }).catch(error => {
        console.error('Error adding books:', error);
        showNotification('Error adding books!', 'error'); // Optional notification for error handling
    });
});


// Round cost price to two decimal places on blur
const costPriceInput = document.getElementById('cost_price');
costPriceInput.addEventListener('blur', function () {
    const value = parseFloat(this.value);
    if (!isNaN(value)) {
        this.value = value.toFixed(2);
    }
});

// Set the max date for the date_received input
const today = new Date().toISOString().split('T')[0];
document.getElementById('date_received').setAttribute('max', today);

// Style the suggestion box and position it relative to the input
titleInput.addEventListener('focus', function() {
    const rect = titleInput.getBoundingClientRect();
    suggestionBox.style.position = 'absolute';
    suggestionBox.style.left = `${rect.left}px`;
    suggestionBox.style.top = `${rect.bottom}px`;
    suggestionBox.style.width = `${rect.width}px`;
});

