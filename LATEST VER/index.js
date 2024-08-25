// Import ipcRenderer from Electron
const { ipcRenderer } = require('electron');

//NAV
// Sidebar toggle functionality
document.getElementById('sidebarCollapse').addEventListener('click', function () {
    const wrapper = document.getElementById('wrapper');
    const sidebar = document.getElementById('sidebar-wrapper');
    
    wrapper.classList.toggle('collapsed');
    sidebar.classList.toggle('collapsed');
});

// Logout functionality
document.getElementById('logout-link').addEventListener('click', function(event) {
    event.preventDefault();
    window.location.href = 'login.html';
});


// ADD Book button functionality
document.querySelector('.btn-primary').addEventListener('click', function () {
    ipcRenderer.send('open-add-book-from-index-window');
});

// Listen for book addition and update the table and dashboard accordingly
ipcRenderer.on('book-record-added', (event, newBook) => {
    addBookToTable(newBook);  // Add the new book to the table at the top
    updateDashboard(newBook); // Optionally update other parts of the dashboard
});



//TABLE
// Function to add a new book to the table at the top
function addBookToTable(book) {
    const booksList = document.getElementById('books-list');
    const row = document.createElement('tr');

    row.innerHTML = `
        <td>${book.number}</td>
        <td>${book.title_of_book}</td>
        <td>${book.author}</td>
    `;

    // Add the new row at the top of the table
    booksList.prepend(row);
}

// Fetch total number of books and update the display
ipcRenderer.invoke('getBooks').then((books) => {
    const totalBooks = books.length;
    document.getElementById('total-books-count').textContent = totalBooks;
}).catch((error) => {
    console.error('Error fetching total books:', error);
});

// Handle click event to redirect to books page
document.getElementById('total-books-link').addEventListener('click', (e) => {
    e.preventDefault();
    ipcRenderer.send('open-books-page');
});

// Fetch books and display them in the table
ipcRenderer.invoke('getBooks').then((books) => {
    const booksList = document.getElementById('books-list');

    // Limit the number of books displayed in the index
    const limitedBooks = books.slice(0, 5); // Adjust this limit as needed

    // Clear the existing table content
    booksList.innerHTML = '';

    // Display the most recent books at the top
    limitedBooks.forEach((book) => {
        addBookToTable(book);
    });
}).catch((error) => {
    console.error('Error fetching books:', error);
});

// Handle click event to redirect to books page
document.getElementById('view-all-books').addEventListener('click', (e) => {
    e.preventDefault();
    ipcRenderer.send('open-books-page');
});


// Fetch total number of borrowed books and update the display
function updateBorrowedBooksCount() {
    ipcRenderer.invoke('getBorrowedBooksCount').then((borrowedBooksCount) => {
        document.getElementById('totalCount').textContent = borrowedBooksCount;
    }).catch((error) => {
        console.error('Error updating borrowed books count:', error);
    });
}

// Call updateBorrowedBooksCount when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateBorrowedBooksCount(); // Fetch and display borrowed books count on page load
});


// Fetch total number of unique borrowers and update the display
ipcRenderer.invoke('getUniqueBorrowers').then((uniqueBorrowers) => {
    const totalBorrowers = uniqueBorrowers.length;
    document.getElementById('total-borrowers-count').textContent = totalBorrowers;
}).catch((error) => {
    console.error('Error fetching unique borrowers:', error);
});

// Function to fetch unique borrowers
ipcRenderer.invoke('getUniqueBorrowers').then((uniqueBorrowers) => {
    // Count the number of unique borrowers
    const totalBorrowers = uniqueBorrowers.length;
    document.getElementById('total-borrowers-count').textContent = totalBorrowers;
}).catch((error) => {
    console.error('Error fetching unique borrowers:', error);
});



// Fetch data for the pie chart
Promise.all([
    ipcRenderer.invoke('getBooksCount'),
    ipcRenderer.invoke('getBorrowedBooksCount'),
    ipcRenderer.invoke('getUniqueBorrowers')
]).then(([totalBooks, totalBorrowedBooks, uniqueBorrowers]) => {
    const totalUniqueBorrowers = uniqueBorrowers.length;
    
    // Create the pie chart
    const ctx = document.getElementById('libraryPieChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Total Books', 'Borrowed Books', 'Unique Borrowers'],
            datasets: [{
                label: 'Library Statistics',
                data: [totalBooks, totalBorrowedBooks, totalUniqueBorrowers],
                backgroundColor: ['#36a2eb', '#ff6384', '#4bc0c0'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            return tooltipItem.label + ': ' + tooltipItem.raw;
                        }
                    }
                }
            }
        }
    });
}).catch((error) => {
    console.error('Error fetching data for pie chart:', error);
});

async function fetchBooksCount() {
    try {
        const count = await ipcRenderer.invoke('getBooksCount');
        // Use the count value for your pie chart or any other logic
        console.log(`Number of books: ${count}`);
    } catch (error) {
        console.error('Error fetching data for pie chart:', error);
    }
}

fetchBooksCount();