// Import ipcRenderer from Electron
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {

    // Sidebar toggle functionality
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', function () {
            const wrapper = document.getElementById('wrapper');
            const sidebar = document.getElementById('sidebar-wrapper');
            if (wrapper && sidebar) {
                wrapper.classList.toggle('collapsed');
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    // LOGOUT
// Handle logout event
const logoutLink = document.getElementById('logout-link');
if (logoutLink) {
    logoutLink.addEventListener('click', function(event) {
        event.preventDefault(); // Prevent default link behavior
        
        // Invoke logout from the centralized login handler
        ipcRenderer.invoke('logout')
            .then(() => {
                // Close current window and load the login window to prevent multiple windows
                window.location.href = './login/login.html'; 
            })
            .catch(error => {
                console.error('Error during logout:', error);
                // Use the notification system from login.js if logout fails
                ipcRenderer.invoke('showNotification', 'An error occurred during logout. Please try again.', 'error');
            });
    });
}

    // ADD Book button functionality
    const addBookButton = document.getElementById('add-book-button');
    if (addBookButton) {
        addBookButton.addEventListener('click', function () {
            ipcRenderer.send('open-add-book-from-index-window');
        });
    }
    

    // Listen for book addition and update the table and dashboard accordingly
    ipcRenderer.on('book-record-added', (event, newBook) => {
        addBookToTable(newBook);  // Add the new book to the table at the top
        updateDashboard(newBook); // Optionally update other parts of the dashboard
    });

    // Function to add a new book to the table at the top
    function addBookToTable(book) {
        const booksList = document.getElementById('books-list');
        if (booksList) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${book.number}</td>
                <td>${book.title_of_book}</td>
                <td>${book.author}</td>
            `;
            // Add the new row at the top of the table
            booksList.prepend(row);
        }
    }

    // Fetch total number of books and update the display
    ipcRenderer.invoke('getBooks').then((books) => {
        const totalBooks = books.length;
        const totalBooksCountElement = document.getElementById('total-books-count');
        if (totalBooksCountElement) {
            totalBooksCountElement.textContent = totalBooks;
        }
    }).catch((error) => {
        console.error('Error fetching total books:', error);
    });

    // Handle click event to redirect to books page
    const totalBooksLink = document.getElementById('total-books-link');
    if (totalBooksLink) {
        totalBooksLink.addEventListener('click', (e) => {
            e.preventDefault();
            ipcRenderer.send('open-books-page');
        });
    }

    const viewAllBooksLink = document.getElementById('view-all-books');
    if (viewAllBooksLink) {
        viewAllBooksLink.addEventListener('click', (e) => {
            e.preventDefault();
            ipcRenderer.send('open-books-page');
        });
    }

    // Fetch books and display them in the table
    ipcRenderer.invoke('getBooks').then((books) => {
        const booksList = document.getElementById('books-list');
        if (booksList) {
            // Limit the number of books displayed in the index
            const limitedBooks = books.slice(0, 5); // Adjust this limit as needed

            // Clear the existing table content
            booksList.innerHTML = '';

            // Display the most recent books at the top
            limitedBooks.forEach((book) => {
                addBookToTable(book);
            });
        }
    }).catch((error) => {
        console.error('Error fetching books:', error);
    });

    // Fetch total number of borrowed books and update the display
    function updateBorrowedBooksCount() {
        ipcRenderer.invoke('getBorrowedBooksCount').then((borrowedBooksCount) => {
            const totalCountElement = document.getElementById('totalCount');
            if (totalCountElement) {
                totalCountElement.textContent = borrowedBooksCount;
            }
        }).catch((error) => {
            console.error('Error updating borrowed books count:', error);
        });
    }

    // Call updateBorrowedBooksCount when the page loads
    updateBorrowedBooksCount(); // Fetch and display borrowed books count on page load

    // Fetch total number of unique borrowers and update the display
    ipcRenderer.invoke('getUniqueBorrowers').then((uniqueBorrowers) => {
        const totalBorrowers = uniqueBorrowers.length;
        const totalBorrowersCountElement = document.getElementById('total-borrowers-count');
        if (totalBorrowersCountElement) {
            totalBorrowersCountElement.textContent = totalBorrowers;
        }
    }).catch((error) => {
        console.error('Error fetching unique borrowers:', error);
    });


// PIECHART
// Fetch data for the pie chart
Promise.all([
    ipcRenderer.invoke('getBooksCount'),
    ipcRenderer.invoke('getBorrowedBooksCount')
]).then(([totalBooks, totalBorrowedBooks]) => {
    const availableBooks = totalBooks - totalBorrowedBooks;

    // Calculate percentages
    const borrowedPercentage = (totalBorrowedBooks / totalBooks) * 100;
    const availablePercentage = (availableBooks / totalBooks) * 100;

    // Create the pie chart
    const ctx = document.getElementById('libraryPieChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Borrowed Books', 'Available Books'],
            datasets: [{
                label: 'Library Statistics',
                data: [totalBorrowedBooks, availableBooks], // Use raw counts
                backgroundColor: ['#30688B', '#F7F7F7'],
                hoverOffset: 4,
                borderColor: '#666',
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '', // Set the title
                    font: {
                        size: 16, // Adjust font size as needed
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            const dataset = tooltipItem.dataset;
                            const total = dataset.data.reduce((acc, val) => acc + val, 0); // Calculate the total of all segments
                            const percentage = ((tooltipItem.raw / total) * 100).toFixed(2); // Calculate percentage based on the total
                            return `${tooltipItem.label}: ${percentage}%`;
                        }
                    }
                }
            }
        }
    });
}).catch((error) => {
    console.error('Error fetching data for pie chart:', error);
});
});
