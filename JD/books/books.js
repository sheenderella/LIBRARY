const { ipcRenderer } = require('electron');

// Sidebar toggle functionality
document.getElementById('sidebarCollapse').addEventListener('click', function () {
    const wrapper = document.getElementById('wrapper');
    const sidebar = document.getElementById('sidebar-wrapper');
    
    wrapper.classList.toggle('collapsed');
    sidebar.classList.toggle('collapsed');
});

document.getElementById('logout-link').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent default link behavior

    ipcRenderer.invoke('logout').then(() => {
        window.location.href = './login/login.html'; // Redirect to login page after logout
    }).catch(error => {
        console.error('Error during logout:', error);
        alert('An error occurred. Please try again.');
    });
});



document.addEventListener('DOMContentLoaded', () => {
    const addBookButton = document.getElementById('addBook');
    const deleteSelectedButton = document.getElementById('deleteSelected');
    const sortButtons = document.querySelectorAll('.sort-btn');
    const selectAllCheckbox = document.getElementById('selectAll');

    const searchColumn = document.getElementById('searchColumn');
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', filterBooks);

    //clear button
    const clearDateRangeButton = document.getElementById('clearDateRange');
    clearDateRangeButton.addEventListener('click', () => {
        // Reset date inputs
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';

        // Hide custom date range container
        document.getElementById('customDateRange').style.display = 'none';
        document.getElementById('dateRangeSelect').value = ''; // Optionally reset the dropdown

        // Reset the filter and display default content
        filterBooks();
    });

        // Add event listener for date range selection
        document.getElementById('dateRangeSelect').addEventListener('change', function() {
            const customRange = document.getElementById('customDateRange');
            if (this.value === 'custom') {
                customRange.style.display = 'block';
                dateRangeContainer.classList.add('custom-range-narrow');
            } else {
                customRange.style.display = 'none';
                dateRangeContainer.classList.remove('custom-range-narrow');
            }
            filterBooks(); // Apply filter when selection changes
        });

        document.addEventListener('click', function(event) {
            const customRange = document.getElementById('customDateRange');
            const dateRangeSelect = document.getElementById('dateRangeSelect');
        
            if (dateRangeSelect.value === 'custom') {
                // Check if the click is outside of the customDateRange div
                if (!customRange.contains(event.target) && !dateRangeSelect.contains(event.target)) {
                    customRange.style.display = 'none';
                    dateRangeSelect.value = ''; // Optionally reset the dropdown
                }
            }
        });
        
    
        // Add event listeners for date inputs
        document.getElementById('startDate').addEventListener('change', filterBooks);
        document.getElementById('endDate').addEventListener('change', filterBooks);


        document.getElementById('dateRangeSelect').addEventListener('change', function() {
            const customRange = document.getElementById('customDateRange');
            
            if (this.value === 'custom') {
                customRange.style.display = 'block';
            } else {
                customRange.style.display = 'none';
            }
        });
        


    // MAKE A SCROLL BAR TOP OF THE TABLE
    const scrollbarTop = document.querySelector('.scrollbar-top');
    const tableContainer = document.querySelector('.table-container');
  
    scrollbarTop.addEventListener('scroll', function() {
      tableContainer.scrollLeft = scrollbarTop.scrollLeft;
    });
  
    tableContainer.addEventListener('scroll', function() {
      scrollbarTop.scrollLeft = tableContainer.scrollLeft;
    });
  
    // Create a dummy content to ensure scrollbar appears
    const dummyContent = document.createElement('div');
    dummyContent.style.width = tableContainer.scrollWidth + 'px';
    dummyContent.style.height = '1px';
    scrollbarTop.appendChild(dummyContent);

    // ADD-DELETE-EDIT ACTIONS
    addBookButton.addEventListener('click', () => {
        openAddBookWindow();
    });

    deleteSelectedButton.addEventListener('click', () => {
        deleteSelectedBooks();
    });

    searchInput.addEventListener('input', () => {
        filterBooks();
    });

    searchColumn.addEventListener('change', () => {
        filterBooks();
    });

    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            sortBooks(button.dataset.column, button);
        });
    });

    selectAllCheckbox.addEventListener('change', () => {
        const selectAll = selectAllCheckbox.checked;
        const checkboxes = document.querySelectorAll('.select-book');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
        });
    });

// Listen for book record added event
ipcRenderer.on('book-record-added', (event, record) => {
    addBookToTable(record, true);
    updatePagination();
    showNotification('Book added successfully!', 'success');
});

// Listen for book record updated event
ipcRenderer.on('book-record-updated', (event, record) => {
    updateBookInTable(record);
    showNotification('Book updated successfully!', 'success');
});

// Optional: Handle any errors
ipcRenderer.on('error', (event, error) => {
    console.error('Error:', error);
    showNotification('An error occurred while processing the request.', 'error');
});


    ipcRenderer.on('book-record-deleted', (event, id) => {
        deleteBookFromTable(id);
        updatePagination();
    });

    window.addEventListener('resize', adjustBooksPerPage);
    
    // Initial adjustment
    adjustBooksPerPage();

    loadBooks();
});

function openAddBookWindow() {
    ipcRenderer.send('open-add-book-window');
}

function openDeleteNotifWindow(ids) {
    ipcRenderer.once('delete-confirmed', () => {
        ids.forEach(id => {
            ipcRenderer.invoke('deleteBook', id);
        });
        updatePagination();
    });

    ipcRenderer.send('open-delete-notif-window', ids);
}

function openEditBookWindow(record) {
    ipcRenderer.send('open-edit-book-window', record);
}

let originalBooks = [];
let currentBooks = [];
let currentPage = 1;
let booksPerPage = 10; // Default value

function adjustBooksPerPage() {
    // Adjust the number of books per page based on window width
    const isNotMaximized = window.innerWidth < screen.width;
    booksPerPage = isNotMaximized ? 5 : 10;
    currentPage = 1; // Reset to the first page when changing books per page
    displayBooks();
    updatePagination();
}

function loadBooks() {
    ipcRenderer.invoke('getBooks').then(books => {
        originalBooks = books.slice();
        currentBooks = originalBooks;
        displayBooks();
        updatePagination();
    });
}

function displayBooks() {
    const bookList = document.getElementById('bookList');
    bookList.innerHTML = '';

    if (currentBooks.length === 0) {
        const emptyMessageRow = document.createElement('tr');
        const emptyMessageCell = document.createElement('td');
        emptyMessageCell.colSpan = 15;
        emptyMessageCell.textContent = "No Existing Book";
        emptyMessageCell.classList.add('empty-message-cell'); // Ensure the CSS class is defined
        emptyMessageRow.appendChild(emptyMessageCell);
        bookList.appendChild(emptyMessageRow);
        return;
    }

    const start = (currentPage - 1) * booksPerPage;
    const end = start + booksPerPage;
    const booksToShow = currentBooks.slice(start, end);
    booksToShow.forEach(book => {
        addBookToTable(book);
    });
}

// Function to show notifications
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.textContent = message;

    document.body.appendChild(notification);

    // Automatically remove the notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function addBookToTable(book, prepend = false) {
    const bookList = document.getElementById('bookList');
    const row = document.createElement('tr');

    // Check if cost_price has a value, add "₱" prefix, format with commas, and round to two decimal places
    const formattedCostPrice = book.cost_price 
        ? `₱ ${parseFloat(book.cost_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '';


    row.innerHTML = `
        <td><input type="checkbox" class="select-book" data-id="${book.id}"></td>
        <td>${book.number}</td>
        <td>${book.date_received}</td>
        <td>${book.class}</td>
        <td>${book.author}</td>
        <td>${book.title_of_book}</td>
        <td>${book.edition}</td>
        <td>${book.volume}</td>
        <td>${book.source_of_fund}</td>
        <td>${book.pages}</td>
        <td>${formattedCostPrice}</td>
        <td>${book.publisher}</td>
        <td>${book.year}</td>
        <td>${book.remarks}</td>
        <td>
            <button class="edit-btn" data-id="${book.id}"> <i class="fas fa-pencil-alt"></i> </button>
            <button class="delete-btn" data-id="${book.id}"> <i class="fas fa-trash"></i> </button>
        </td>
    `;

    row.querySelector('.edit-btn').addEventListener('click', () => {
        const record = getBookFromRow(row);
        openEditBookWindow(record);
    });

    row.querySelector('.delete-btn').addEventListener('click', () => {
        const id = book.id;
        openDeleteNotifWindow(id); // Open the confirmation popup with the book ID
    });

    if (prepend) {
        bookList.insertBefore(row, bookList.firstChild);
    } else {
        bookList.appendChild(row);
    }
}


function updateBookInTable(book) {
    const row = document.querySelector(`button[data-id="${book.id}"]`).closest('tr');
    const formattedCostPrice = book.cost_price 
    ? `₱ ${parseFloat(book.cost_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '';

    row.innerHTML = `
        <td><input type="checkbox" class="select-book" data-id="${book.id}"></td>
        <td>${book.number}</td>
        <td>${book.date_received}</td>
        <td>${book.class}</td>
        <td>${book.author}</td>
        <td>${book.title_of_book}</td>
        <td>${book.edition}</td>
        <td>${book.volume}</td>
        <td>${book.source_of_fund}</td>
        <td>${book.pages}</td>
        <td>${formattedCostPrice}</td>
        <td>${book.publisher}</td>
        <td>${book.year}</td>
        <td>${book.remarks}</td>
        <td>
            <button class="edit-btn" data-id="${book.id}"> <i class="fas fa-pencil-alt"></i> </button>
            <button class="delete-btn" data-id="${book.id}"> <i class="fas fa-trash"></i> </button>
        </td>
    `;
}

function deleteBookFromTable(id) {
    const row = document.querySelector(`button[data-id="${id}"]`).closest('tr');
    row.remove();
}

function deleteSelectedBooks() {
    const selectedBooks = document.querySelectorAll('.select-book:checked');
    const ids = Array.from(selectedBooks).map(book => book.dataset.id);

    if (ids.length > 0) {
        openDeleteNotifWindow(ids);
    } else {
        alert("No books selected");
    }
}

function filterBooks() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const searchColumn = document.getElementById('searchColumn').value;
    const dateRangeSelect = document.getElementById('dateRangeSelect').value;
    const startDateInput = document.getElementById('startDate').value;
    const endDateInput = document.getElementById('endDate').value;

    // Parse dates for filtering
    let startDate = startDateInput ? new Date(startDateInput) : null;
    let endDate = endDateInput ? new Date(endDateInput) : null;

    currentBooks = originalBooks.filter(book => {
        let matches = true;

        if (searchColumn === 'all') {
            matches = Object.values(book).some(cell => String(cell).toLowerCase().includes(searchInput));
        } else {
            matches = String(book[searchColumn]).toLowerCase().includes(searchInput);
        }

        // Apply date range filtering
        if (dateRangeSelect !== '') {
            const bookDate = new Date(book.date_received);

            if (dateRangeSelect === 'last_7_days') {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                matches = bookDate >= sevenDaysAgo;
            } else if (dateRangeSelect === 'last_30_days') {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                matches = bookDate >= thirtyDaysAgo;
            } else if (dateRangeSelect === 'this_month') {
                const today = new Date();
                matches = bookDate.getMonth() === today.getMonth() && bookDate.getFullYear() === today.getFullYear();
            } else if (dateRangeSelect === 'last_month') {
                const today = new Date();
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const firstDayOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
                const lastDayOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
                matches = bookDate >= firstDayOfLastMonth && bookDate <= lastDayOfLastMonth;
            } else if (dateRangeSelect === 'custom') {
                if (startDate && endDate) {
                    matches = bookDate >= startDate && bookDate <= endDate;
                } 
                else if(startDate==NULL || endDate==NULL) {
                    matches = true;
                }
                else {
                    matches = false;
                }
            }
        }

        return matches;
    });

    // Reset to first page after filtering
    currentPage = 1;
    displayBooks();
    updatePagination();
}


document.getElementById('searchColumn').addEventListener('change', () => {
    const searchColumn = document.getElementById('searchColumn').value;
    const textInputContainer = document.getElementById('textInputContainer');
    const dateInputContainer = document.getElementById('dateInputContainer');

    if (searchColumn === 'date_received') {
        textInputContainer.style.display = 'none';
        dateInputContainer.style.display = 'block';
    } else {
        textInputContainer.style.display = 'block';
        dateInputContainer.style.display = 'none';
    }
    filterBooks();
});

function sortBooks(column, button) {
    // Toggle sort order
    let order = button.dataset.order || 'asc';

    if (order === 'asc') {
        order = 'desc';
    } else if (order === 'desc') {
        order = 'default';
    } else {
        order = 'asc';
    }
    button.dataset.order = order;

    // Update sorting icons
    document.querySelectorAll('.sort-btn i').forEach(icon => {
        icon.classList.remove('fa-sort-up', 'fa-sort-down');
        icon.classList.add('fa-sort');
    });

    const currentIcon = button.querySelector('i');
    if (order === 'asc') {
        currentIcon.classList.remove('fa-sort');
        currentIcon.classList.add('fa-sort-up');
    } else if (order === 'desc') {
        currentIcon.classList.remove('fa-sort');
        currentIcon.classList.add('fa-sort-down');
    } else {
        currentIcon.classList.remove('fa-sort-up', 'fa-sort-down');
        currentIcon.classList.add('fa-sort');
    }

    // Sort books
    if (order === 'asc') {
        currentBooks.sort((a, b) => {
            const aText = a[column] ? a[column].toString().trim() : '';
            const bText = b[column] ? b[column].toString().trim() : '';
            return !isNaN(aText) && !isNaN(bText) ? aText - bText : aText.localeCompare(bText);
        });
    } else if (order === 'desc') {
        currentBooks.sort((a, b) => {
            const aText = a[column] ? a[column].toString().trim() : '';
            const bText = b[column] ? b[column].toString().trim() : '';
            return !isNaN(aText) && !isNaN(bText) ? bText - aText : bText.localeCompare(aText);
        });
    } else {
        currentBooks = originalBooks.slice(); // Reset to original order
    }

    currentPage = 1; // Reset to first page after sorting
    displayBooks();
    updatePagination();
}

function updatePagination() {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';

    const totalPages = Math.ceil(currentBooks.length / booksPerPage);
    if (totalPages <= 1) return;

    const maxPagesToShow = 10;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (totalPages > maxPagesToShow) {
        if (currentPage > Math.floor(maxPagesToShow / 2)) {
            const prevButton = document.createElement('button');
            prevButton.innerHTML = '&laquo;';
            prevButton.classList.add('page-btn');
            prevButton.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage = Math.max(1, currentPage - 10);
                    updatePagination();
                    displayBooks();
                }
            });
            paginationContainer.appendChild(prevButton);
        }

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.add('page-btn');
        if (i === currentPage) pageButton.classList.add('active');
        pageButton.addEventListener('click', () => {
            currentPage = i;
            displayBooks();
            updatePagination();
        });
        paginationContainer.appendChild(pageButton);
    }

    if (totalPages > maxPagesToShow && endPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '&raquo;';
        nextButton.classList.add('page-btn');
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage = Math.min(totalPages, currentPage + 10);
                updatePagination();
                displayBooks();
            }
        });
        paginationContainer.appendChild(nextButton);
    }
}

function getBookFromRow(row) {
    const cells = row.querySelectorAll('td');
    return {
        id: row.querySelector('.edit-btn').dataset.id,
        number: cells[1].textContent,
        date_received: cells[2].textContent,
        class: cells[3].textContent,
        author: cells[4].textContent,
        title_of_book: cells[5].textContent,
        edition: cells[6].textContent,
        volume: cells[7].textContent,
        source_of_fund: cells[8].textContent,
        pages: cells[9].textContent,
        cost_price: cells[10].textContent,
        publisher: cells[11].textContent,
        year: cells[12].textContent,
        remarks: cells[13].textContent,
    };
}