const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupIpcRenderers();
    // Initial adjustment
    setupSortButtons();
    adjustBooksPerPage();
    loadBooks();
});

function openAddBookWindow() {
    ipcRenderer.send('open-add-book-window');
}

// Function to apply column visibility settings
function applyColumnVisibility() {
    var checkboxes = document.querySelectorAll('#columnForm input[type="checkbox"]');
    
    checkboxes.forEach(function(checkbox) {
        var columnClass = 'column-' + checkbox.getAttribute('data-column');
        var columnHeaders = document.querySelectorAll('#tableContainer table th.' + columnClass);
        var columnDataCells = document.querySelectorAll('#tableContainer table td.' + columnClass);

        columnHeaders.forEach(function(th) {
            th.style.display = checkbox.checked ? 'none' : '';  // Hide if checked, show if unchecked
        });

        columnDataCells.forEach(function(td) {
            td.style.display = checkbox.checked ? 'none' : '';  // Hide if checked, show if unchecked
        });
    });
}

function setupEventListeners() {
    const addBookButton = document.getElementById('addBook');
    const deleteSelectedButton = document.getElementById('deleteSelected');
    const selectAllCheckbox = document.getElementById('selectAll');

    const searchColumn = document.getElementById('searchColumn');
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', filterBooks);

    // Close the form when clicking outside of it
    document.addEventListener('click', function(event) {
        var form = document.getElementById('columnVisibilityForm');
        var toggleButton = document.getElementById('toggleColumns');
        if (form.style.display === 'block' && !form.contains(event.target) && event.target !== toggleButton) {
            form.style.display = 'none';  // Hide the form
        }
    });

        // Ensure all columns are visible initially
        document.querySelectorAll('#tableContainer table th, #tableContainer table td').forEach(function(el) {
            el.style.display = '';  // Show all columns
        });
    
        // Ensure checkboxes are unchecked (columns visible)
        document.querySelectorAll('#columnForm input[type="checkbox"]').forEach(function(checkbox) {
            checkbox.checked = false;
        });

    //HIDE/UNHIDE COLUMNS
    // Initial call to apply column visibility settings
    applyColumnVisibility();

// Toggle column visibility form
document.getElementById('toggleColumns').addEventListener('click', function() {
    var form = document.getElementById('columnVisibilityForm');
    var checkboxes = document.querySelectorAll('#columnForm input[type="checkbox"]');

    if (form.style.display === 'none' || form.style.display === '') {
        form.style.display = 'block';
        // No need to uncheck checkboxes again or show all columns here; handled in DOMContentLoaded
    } else {
        form.style.display = 'none';
    }
});

// Show all columns
document.getElementById('showAll').addEventListener('click', function() {
    document.querySelectorAll('#columnForm input[type="checkbox"]').forEach(function(checkbox) {
        checkbox.checked = false;
    });
    document.querySelectorAll('#tableContainer table th, #tableContainer table td').forEach(function(el) {
        el.style.display = '';  // Show all columns
    });
});

// Hide all columns except specific ones
document.getElementById('hideAll').addEventListener('click', function() {
    document.querySelectorAll('#columnForm input[type="checkbox"]').forEach(function(checkbox) {
        checkbox.checked = true;
    });
    document.querySelectorAll('#tableContainer table th, #tableContainer table td').forEach(function(el) {
        if (!el.classList.contains('column-title_of_book') &&
            !el.classList.contains('column-actions') &&
            !el.classList.contains('column-checkbox')) {
            el.style.display = 'none';  // Hide columns
        }
    });
});

// Handle individual column visibility changes
document.querySelectorAll('#columnForm input[type="checkbox"]').forEach(function(checkbox) {
    checkbox.addEventListener('change', function() {
        var columnClass = 'column-' + this.getAttribute('data-column');
        var columnHeaders = document.querySelectorAll('#tableContainer table th.' + columnClass);
        var columnDataCells = document.querySelectorAll('#tableContainer table td.' + columnClass);

        columnHeaders.forEach(function(th) {
            th.style.display = checkbox.checked ? 'none' : '';  // Hide if checked, show if unchecked
        });

        columnDataCells.forEach(function(td) {
            td.style.display = checkbox.checked ? 'none' : '';  // Hide if checked, show if unchecked
        });
    });
}); 

    document.getElementById('dateRangeSelect').addEventListener('change', function() {
        const customRange = document.getElementById('customDateRange');
        if (this.value === 'custom') {
            customRange.style.display = 'block';
        } else {
            customRange.style.display = 'none';
        }
    });

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
            loadBooks();
            adjustBooksPerPage();
        });
    
        searchInput.addEventListener('input', () => {
            filterBooks();
        });
    
        searchColumn.addEventListener('change', () => {
            filterBooks();
        });
    
        selectAllCheckbox.addEventListener('change', () => {
            const selectAll = selectAllCheckbox.checked;
            const checkboxes = document.querySelectorAll('.select-book');
            checkboxes.forEach(checkbox => {
                checkbox.checked = selectAll;
            });
        });

        window.addEventListener('resize', adjustBooksPerPage);
}

function setupIpcRenderers() {
    // Listen for book record added event
    ipcRenderer.on('book-record-added', (event, record) => {
        addBookToTable(record, true);
        showNotification('Book added successfully!', 'success');
        loadBooks();
        adjustBooksPerPage();
    });

    // Listen for book record updated event
    ipcRenderer.on('book-record-updated', (event, record) => {
        updateBookInTable(record);
        showNotification('Book updated successfully!', 'success');
        loadBooks();
        adjustBooksPerPage();
    });

    // Optional: Handle any errors
    ipcRenderer.on('error', (event, error) => {
        console.error('Error:', error);
        showNotification('An error occurred while processing the request.', 'error');
    });

    ipcRenderer.on('book-record-deleted', (event, id) => {
        deleteBookFromTable(id);
        loadBooks();
        adjustBooksPerPage();
    });
}

// Event listener setup for sort buttons
function setupSortButtons() {
    const sortButtons = document.querySelectorAll('.sort-btn');

    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            sortBooks(button.dataset.column, button);
        });
    });
}

function openDeleteNotifWindow(ids) {
    if (ids.length === 0) {
        console.error('No IDs provided for deletion.');
        return;
    }

    ipcRenderer.once('delete-confirmed', () => {
        ids.forEach(id => {
            ipcRenderer.invoke('deleteBook', id);
        });
        updatePagination();;
    });

    ipcRenderer.send('open-delete-notif-window', ids);
}


function openEditBookWindow(record) {
    ipcRenderer.send('open-edit-book-window', record);
}

let originalBooks = [];
let currentBooks = [];
let currentPage = 1;
let booksPerPage = 1; // Default value

function adjustBooksPerPage() {
    // Adjust the number of books per page based on window width
    const isNotMaximized = window.innerWidth < screen.width;
    booksPerPage = isNotMaximized ? 5 : 10;
    displayBooks();
    updatePagination();;
}

function loadBooks() {
    ipcRenderer.invoke('getBooks').then(books => {
        originalBooks = books.slice();
        currentBooks = originalBooks;
        displayBooks();
        updatePagination();;
    });
}

function displayBooks() {
    const bookList = document.getElementById('bookList');
    bookList.innerHTML = '';

    if (currentBooks.length === null) {
        const emptyMessageRow = document.createElement('tr');
        const emptyMessageCell = document.createElement('td');
        emptyMessageCell.colSpan = 15;
        emptyMessageCell.textContent = "Please Add a New Book Record";
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
        <td class="column-checkbox"><input type="checkbox" class="select-book" data-id="${book.id}"></td>
        <td class="column-number">${book.number}</td>
        <td class="column-date_received">${book.date_received}</td>
        <td class="column-class">${book.class}</td>
        <td class="column-author">${book.author}</td>
        <td class="column-title_of_book">${book.title_of_book}</td>
        <td class="column-edition">${book.edition}</td>
        <td class="column-volume">${book.volume}</td>
        <td class="column-source_of_fund">${book.source_of_fund}</td>
        <td class="column-pages">${book.pages}</td>
        <td class="column-cost_price">${formattedCostPrice}</td>
        <td class="column-publisher">${book.publisher}</td>
        <td class="column-year">${book.year}</td>
        <td class="column-remarks">${book.remarks}</td>
        <td class="column-actions">
            <button class="edit-btn" data-id="${book.id}"> <i class="fas fa-pencil-alt"></i> </button>
            <button class="delete-btn" data-id="${book.id}"> <i class="fas fa-trash"></i> </button>
        </td>
    `;

    row.querySelector('.edit-btn').addEventListener('click', () => {
        const record = getBookFromRow(row);
        openEditBookWindow(record);
    });

    row.querySelector('.delete-btn').addEventListener('click', () => {
        openDeleteNotifWindow(book.id); // Open the confirmation popup with the book ID
        updatePagination();
    });

    if (prepend) {
        bookList.insertBefore(row, bookList.firstChild);
    } else {
        bookList.appendChild(row);
    }

    // Apply column visibility rules to the new row
    applyColumnVisibility(row);

    updatePagination();
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
    updatePagination();;
    displayBooks();
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
                else if(startDate==null || endDate==null) {
                    matches = true;
                }
                else {
                    matches = false;
                }
            }
        }

        return matches;
    });

    const bookList = document.getElementById('bookList');
    bookList.innerHTML = '';
    if (currentBooks.length === 0) {
        const emptyMessageRow = document.createElement('tr');
        const emptyMessageCell = document.createElement('td');
        emptyMessageCell.colSpan = 15;
        emptyMessageCell.textContent = "Book Not Found";
        emptyMessageCell.classList.add('empty-message-cell'); // Ensure the CSS class is defined
        emptyMessageRow.appendChild(emptyMessageCell);
        bookList.appendChild(emptyMessageRow);
        return;
    }

    // Reset to first page after filtering
    currentPage = 1;
    displayBooks();
    updatePagination();;
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
    // Determine the current sort order
    const order = button.dataset.order === 'asc' ? 'desc' : 'asc';
    button.dataset.order = order;

    // Update the sort icon based on the current order
    button.querySelector('i').className = order === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';

    // Sort the books based on the selected column and order
    currentBooks.sort((a, b) => {
        let valueA = a[column];
        let valueB = b[column];

        // Handle sorting based on data type
        if (typeof valueA === 'number' && typeof valueB === 'number') {
            return order === 'asc' ? valueA - valueB : valueB - valueA;
        } else {
            // Handle cases where valueA or valueB could be undefined or null
            if (valueA == null) return 1;
            if (valueB == null) return -1;
            return order === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        }
    });

    // Reset to first page after sorting
    currentPage = 1; 

    // Call functions to update the display and pagination
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
                    updatePagination();;
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
            updatePagination();;
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
                updatePagination();;
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