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
    const searchColumn = document.getElementById('searchColumn');
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', filterBooks);

    // SEARCH BAR
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

        // MAKE A SCROLL BAR TOP OF THE TABLE
        const scrollbarTop = document.querySelector('.scrollbar-top');
        const tableContainer = document.querySelector('.table-container');

        // Function to update the dummy content width to match the table container's scroll width
        function updateScrollbarWidth() {
            const tableScrollWidth = tableContainer.scrollWidth;
            const dummyContent = scrollbarTop.querySelector('.dummy-content');

            // Set the dummy content width to match the table's full scroll width
            dummyContent.style.width = `${tableScrollWidth}px`;
        }

        // Ensure scroll synchronization between the top scrollbar and the table
        scrollbarTop.addEventListener('scroll', () => {
            tableContainer.scrollLeft = scrollbarTop.scrollLeft;
        });

        tableContainer.addEventListener('scroll', () => {
            scrollbarTop.scrollLeft = tableContainer.scrollLeft;
        });

        // Initialize the dummy content inside the scrollbar top
        const dummyContent = document.createElement('div');
        dummyContent.className = 'dummy-content';
        dummyContent.style.height = '1px'; // Minimal height to ensure the scrollbar is visible
        scrollbarTop.appendChild(dummyContent);

        // Update the scrollbar width on load, resize, and when the table content changes
        window.addEventListener('resize', updateScrollbarWidth);
        updateScrollbarWidth(); // Initial call to set the correct width

        // Use a ResizeObserver to monitor the table container for size changes
        const resizeObserver = new ResizeObserver(updateScrollbarWidth);
        resizeObserver.observe(tableContainer);

        // Add a MutationObserver to watch for changes in table content (e.g., rows added or removed)
        const mutationObserver = new MutationObserver(updateScrollbarWidth);
        mutationObserver.observe(tableContainer, { childList: true, subtree: true });

    
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
            checkbox.checked = true;
        });

            // Hide all columns except for the default ones
    // document.querySelectorAll('#columnForm input[type="checkbox"]').forEach(function(checkbox) {
    //     // Uncheck all checkboxes except for the default visible columns
    //     if (checkbox.getAttribute('data-column') !== 'checkbox' &&
    //         checkbox.getAttribute('data-column') !== 'number' &&
    //         checkbox.getAttribute('data-column') !== 'date_received' &&
    //         checkbox.getAttribute('data-column') !== 'author' &&
    //         checkbox.getAttribute('data-column') !== 'title_of_book' &&
    //         checkbox.getAttribute('data-column') !== 'actions') {
    //         checkbox.checked = true; // Set to unchecked
    //     } else {
    //         checkbox.checked = false; // Set to checked for default visible columns
    //     }
    // });

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
    document.getElementById('hideAll').addEventListener('click', function () {
        document.querySelectorAll('#columnForm input[type="checkbox"]').forEach(function (checkbox) {
            checkbox.checked = true;
        });
        document.querySelectorAll('#tableContainer table th, #tableContainer table td').forEach(function (el) {
            if (!el.classList.contains('column-date_received') &&
                !el.classList.contains('column-author') &&
                !el.classList.contains('column-number') &&
                !el.classList.contains('column-title_of_book') &&
                !el.classList.contains('column-actions') &&
                !el.classList.contains('column-checkbox') &&
                !el.classList.contains('empty-message-cell')) { // Exclude empty message cell
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

    // Get today's date in the format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // Set the 'max' attribute for the start and end date inputs
    document.getElementById('startDate').setAttribute('max', today);
    document.getElementById('endDate').setAttribute('max', today);

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
            showNotification('An error occurred. Please try again.', 'error');
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
        
// Set up the event listener for the "Select All" checkbox once
document.getElementById('selectAll').addEventListener('change', () => {
    const selectAll = document.getElementById('selectAll').checked;

    currentBooks.forEach((book) => {
        if (selectAll) {
            selectedBookIds.add(book.id);
        } else {
            selectedBookIds.delete(book.id);
        }
    });

    // Re-display books to reflect the updated selection state
    displayBooks();
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

function openEditBookWindow(record) {
    ipcRenderer.send('open-edit-book-window', record);
}

let originalBooks = [];
let currentBooks = [];
let currentPage = 1;
let booksPerPage = 1; // Default value
let selectedBookIds = new Set(); // Store selected book IDs

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
        filterBooks(); // Apply the current search filters
        displayBooks();
        updatePagination();;
    });
}

function displayBooks() {
    const bookList = document.getElementById('bookList');
    const selectAllCheckbox = document.getElementById('selectAll');
    bookList.innerHTML = '';

    if (currentBooks.length === 0) {
        selectAllCheckbox.style.display = 'none'; // Hide the "Select All" checkbox
        const emptyMessageRow = document.createElement('tr');
        const emptyMessageCell = document.createElement('td');
        emptyMessageCell.colSpan = 15;
        emptyMessageCell.textContent = "Please Add a New Book Record";
        emptyMessageCell.classList.add('empty-message-cell');
        emptyMessageRow.appendChild(emptyMessageCell);
        bookList.appendChild(emptyMessageRow);
        return;
    }

    selectAllCheckbox.style.display = 'inline-block'; // Show the "Select All" checkbox
    const booksToShow = getBooksForCurrentPage();
    booksToShow.forEach(book => {
        addBookToTable(book);
    });
}

function getBooksForCurrentPage() {
    const start = (currentPage - 1) * booksPerPage;
    const end = start + booksPerPage;
    return currentBooks.slice(start, end);
}


// Function to show notifications
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    
    // Set the message text
    notification.textContent = message;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50'; // Green for success
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336'; // Red for error
            break;
        case 'delete':
            notification.style.backgroundColor = '#FF5722'; // Orange for delete
            break;
        default:
            notification.style.backgroundColor = '#2196F3'; // Blue for default
    }
    
    // Add the show class to make it visible
    notification.classList.add('show');
    
    // Remove the show class after 3 seconds (notification will fade out)
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000); // 3 seconds
}

function addBookToTable(book, prepend = false) {
    const bookList = document.getElementById('bookList');
    const row = document.createElement('tr');

    const formattedCostPrice = book.cost_price
        ? `₱ ${parseFloat(book.cost_price).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          })}`
        : '';

    row.innerHTML = `
        <td class="column-checkbox">
            <input type="checkbox" title="Select" class="select-book" data-id="${book.id}" ${
        selectedBookIds.has(book.id) ? 'checked' : ''
    }>
        </td>
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
        <td class="column-condition">${book.condition}</td>
        <td class="column-remarks">${book.remarks}</td>
        <td class="column-actions">
            <button class="edit-btn" title="Edit" data-id="${book.id}">
                <i class="fas fa-edit"></i>
            </button>
            <button class="archive-btn" title="Archive" data-id="${book.id}">
            <i class="fas fa-archive"></i>
            </button>
            <button class="delete-btn"  title="Delete" data-id="${book.id}">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    row.querySelector('.select-book').addEventListener('change', (e) => {
        const bookId = book.id;
        if (e.target.checked) {
            selectedBookIds.add(bookId);
        } else {
            selectedBookIds.delete(bookId);
        }
        syncSelectAllCheckbox();
    });

    row.querySelector('.edit-btn').addEventListener('click', () => {
        const record = getBookFromRow(row);
        openEditBookWindow(record);
    });

    row.querySelector('.delete-btn').addEventListener('click', () => {
        // Prepare title and message for the confirmation dialog
        const title = 'Confirm Deletion';
        const message = 'Are you sure you want to delete this book record?';
    
        // Show the confirmation dialog
        ipcRenderer.invoke('show-confirmation-dialog', { title, message })
            .then((confirmation) => {
                if (confirmation) {
                    deleteBookFromTable(book.id); // Assuming this is your deletion function
                    showNotification('A Book has been Deleted!', 'delete');
                    
                    // Reload books and adjust pagination after deletion
                    loadBooks();
                    adjustBooksPerPage();
                }
            })
            .catch(error => {
                console.error('Error showing confirmation dialog:', error);
                showNotification('Error showing confirmation dialog!', 'error');
            });
    });
    

    if (prepend) {
        bookList.insertBefore(row, bookList.firstChild);
    } else {
        bookList.appendChild(row);
    }

    applyColumnVisibility(row);
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
        <td>${book.condition}</td>
        <td>${book.remarks}</td>
        <td>
            <button class="edit-btn" data-id="${book.id}"> <i class="fas fa-pencil-alt"></i> </button>
            <button class="delete-btn" data-id="${book.id}"> <i class="fas fa-trash"></i> </button>
        </td>
    `;
}

function deleteBookFromTable(id) {
    const row = document.querySelector(`button[data-id="${id}"]`).closest('tr');
    ipcRenderer.invoke('deleteBook', id); // Assuming this is how deletion is handled
    row.remove();
    updatePagination();;
    displayBooks();
}

function deleteSelectedBooks() {
    if (selectedBookIds.size === 0) {
        showNotification("No books selected", "error");
        return;
    }

    const count = selectedBookIds.size; // Count the number of selected books

    // Prepare title and message for the confirmation dialog
    const title = 'Confirm Deletion';
    const message = `Are you sure you want to delete ${count} selected book record(s)?`;

    // Show the confirmation dialog
    ipcRenderer.invoke('show-confirmation-dialog', { title, message })
        .then((confirmation) => {
            if (confirmation) {
                // Convert Set to Array for deletion
                const ids = Array.from(selectedBookIds);

                ids.forEach(id => {
                    ipcRenderer.invoke('deleteBook', id); // Assuming this is how deletion is handled
                });

                // Clear the selection after deletion
                selectedBookIds.clear();
                
                // Reload books and update UI
                loadBooks();
                adjustBooksPerPage();

                showNotification(`${count} book(s) have been deleted!`, 'warning');
            }
        })
        .catch(error => {
            console.error('Error showing confirmation dialog:', error);
            showNotification('Error showing confirmation dialog!', 'error');
        });
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
        condition: cells[13].textContent,
        remarks: cells[14].textContent,
    };
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
                } else if (startDate == null || endDate == null) {
                    matches = true;
                } else {
                    matches = false;
                }
            }
        }

        return matches;
    });

    const bookList = document.getElementById('bookList');
    const selectAllCheckbox = document.getElementById('selectAll');
    bookList.innerHTML = '';
    if (currentBooks.length === 0) {
        selectAllCheckbox.style.display = 'none'; // Hide the "Select All" checkbox
        const emptyMessageRow = document.createElement('tr');
        const emptyMessageCell = document.createElement('td');
        emptyMessageCell.colSpan = 15;
        emptyMessageCell.textContent = "No Records Found";
        emptyMessageCell.classList.add('empty-message-cell'); // Ensure the CSS class is defined
        emptyMessageRow.appendChild(emptyMessageCell);
        bookList.appendChild(emptyMessageRow);
        
        // Update pagination for zero books
        currentPage = 1; // Reset current page
        updatePagination(); // Call updatePagination to show "0 of 0"
        return;
    }

    // Reset to first page after filtering
    currentPage = 1;
    displayBooks();
    updatePagination();
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

function sortBooks(column, button) {
    // Determine the current sort order
    const order = button.dataset.order === 'asc' ? 'desc' : 'asc';
    button.dataset.order = order;

    // Update the sort icon based on the current order
    // button.querySelector('i').className = order === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';

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
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');
    const pageLocationInput = document.getElementById('pageLocation');
    const totalPagesSpan = document.getElementById('totalPages');

    const totalPages = Math.ceil(currentBooks.length / booksPerPage);
    
    // Update the display to show "0 of 0" if no books are found
    totalPagesSpan.textContent = `of ${totalPages > 0 ? totalPages : 0}`;
    pageLocationInput.value = currentBooks.length > 0 ? currentPage : 0;

    firstPageBtn.disabled = currentPage === 1;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    lastPageBtn.disabled = currentPage === totalPages || totalPages === 0;

    firstPageBtn.onclick = () => {
        if (currentPage !== 1) {
            currentPage = 1;
            displayBooks();
            updatePagination();
        }
    };

    prevPageBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            displayBooks();
            updatePagination();
        }
    };

    nextPageBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayBooks();
            updatePagination();
        }
    };

    lastPageBtn.onclick = () => {
        if (currentPage !== totalPages) {
            currentPage = totalPages;
            displayBooks();
            updatePagination();
        }
    };

    pageLocationInput.onchange = () => {
        const pageNumber = parseInt(pageLocationInput.value, 10);
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            currentPage = pageNumber;
            displayBooks();
            updatePagination();
        } else {
            pageLocationInput.value = currentPage;
        }
    };

    syncSelectAllCheckbox();
}

// Sync the "Select All" checkbox state based on selected rows
function syncSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const allBooksSelected = currentBooks.every(book => selectedBookIds.has(book.id));
    selectAllCheckbox.checked = allBooksSelected;
}