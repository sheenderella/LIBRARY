const { ipcRenderer } = require('electron');

//SIDEBAR !!!
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

    ipcRenderer.invoke('logout').then(() => {
        window.location.href = './login/login.html';
    }).catch(error => {
        console.error('Error during logout:', error);
        alert('An error occurred. Please try again.');
    });
});

//NOTIFICATION ADDBORROW
// Listen for success or error messages from the main process
ipcRenderer.on('borrow-error', (event, data) => {
    showNotification(data.message, data.type); // Display error notification
});

ipcRenderer.on('borrow-record-added', (event, data) => {
    showNotification(data.message, data.type); // Display success notification
});

function addBorrowToTable(record) {
    const borrowList = document.getElementById('borrowList');
    if (!borrowList) {
        console.error('Table element with id "borrowList" not found!');
        return;
    }

    const row = document.createElement('tr');
    row.dataset.id = record.id;

    const currentDate = new Date().toISOString().split('T')[0];
    if (record.dueDate && currentDate > record.dueDate && record.borrowStatus === 'borrowed') {
        record.borrowStatus = 'overdue';
        
        // Automatically update the status in the database
        updateBorrowStatus(record.id, 'overdue');
    }

    // Ensure you're using the right field names from the database query
    row.innerHTML = `
        <td><input type="checkbox" class="select-borrow" data-id="${record.id}" ${selectedRecords.has(record.id) ? 'checked' : ''}></td>
        <td><span class="borrower-name" data-name="${record.borrower_name || ''}" data-id="${record.borrower_id || ''}" data-phone="${record.phone_number || ''}" data-email="${record.email || ''}">
            ${record.borrower_name || record.borrower_id}
        </span></td>
        
        <td><span class="book-title" data-title="${record.book_title || ''}" data-id="${record.book_id || ''}">
            ${record.book_title || record.book_id}
        </span></td>

        <td>
            <select class="status-dropdown" data-id="${record.id}" ${record.borrowStatus === 'returned' || record.borrowStatus === 'returned overdue' ? 'disabled' : ''}>
                <option value="borrowed" class="status-borrowed" ${record.borrowStatus === 'borrowed' ? 'selected' : ''}>Borrowed</option>
                <option value="returned" class="status-returned" ${record.borrowStatus === 'returned' ? 'selected' : ''}>Returned</option>
                <option value="returned overdue" class="status-returned-overdue" ${record.borrowStatus === 'returned overdue' ? 'selected' : ''}>Returned Overdue</option>
            </select>
        </td>
        <td>
            <button class="delete-btn" data-id="${record.id}"> 
                <i class="fas fa-trash"></i> 
            </button>
        </td>
    `;

    // Event listener for the individual checkbox
    const checkbox = row.querySelector('.select-borrow');
    checkbox.checked = selectedRecords.has(record.id); // Ensure the checkbox reflects the correct state

    checkbox.addEventListener('change', function () {
        const recordId = record.id;
        
        if (this.checked) {
            selectedRecords.add(recordId);
            console.log(`Checkbox with data-id ${recordId} is checked.`);
        } else {
            selectedRecords.delete(recordId);
            console.log(`Checkbox with data-id ${recordId} is unchecked.`);
        }
        
        // Update the "Select All" checkbox based on the current selection
        updateSelectAllCheckbox();  
    });


    const statusDropdown = row.querySelector('.status-dropdown');
    updateDropdownStyle(statusDropdown, record.borrowStatus);

    // Hide the "Returned Overdue" option if the status is not "Overdue"
    if (record.borrowStatus !== 'overdue') {
        const returnedOverdueOption = statusDropdown.querySelector('option[value="returned overdue"]');
        returnedOverdueOption.style.display = 'none';
    }

    // Handle the "Overdue" status
    if (record.borrowStatus === 'overdue') {
        const overdueOption = document.createElement('option');
        overdueOption.value = 'overdue';
        overdueOption.className = 'status-overdue';
        overdueOption.textContent = 'Overdue';
        overdueOption.selected = true;
        statusDropdown.appendChild(overdueOption);

        statusDropdown.querySelector('option[value="borrowed"]').style.display = 'none';
        statusDropdown.querySelector('option[value="returned"]').style.display = 'none';
    }

    statusDropdown.addEventListener('change', function () {
        const newStatus = this.value;
        let newReturnDate = null;
    
        if (newStatus === 'returned' || newStatus === 'returned overdue') {
            newReturnDate = new Date().toISOString().split('T')[0];
            this.disabled = true; // Disable dropdown when returned or returned overdue is selected
        }
    
        updateDropdownStyle(this, newStatus);
    
        // Send the updated status to the backend or main process to update the database
        updateBorrowStatus(record.id, newStatus, newReturnDate);
    });


    borrowList.appendChild(row);
}

function updateBorrowStatus(id, newStatus, returnDate) {
    const updatedStatus = {
        id: id,
        status: newStatus,
        returnDate: returnDate
    };

    // Send the updated status to the main process via IPC
    ipcRenderer.send('update-borrow-status', updatedStatus);
}

// Function to update dropdown style based on status
function updateDropdownStyle(dropdown, status) {
    switch (status) {
        case 'borrowed':
            dropdown.style.backgroundColor = '#FBEEAD'; // Light blue for borrowed
            break;
        case 'returned':
            dropdown.style.backgroundColor = '#C2FFC8'; // Light green for returned
            break;
        case 'overdue':
            dropdown.style.backgroundColor = '#f8d7da'; // Light red for overdue
            break;
        case 'returned overdue':
            dropdown.style.backgroundColor = '#f5c6cb'; // Light pink for returned overdue
            break;
        default:
            dropdown.style.backgroundColor = ''; // Default
    }
}

// Event listener for redirecting to borrower log
document.addEventListener('click', function (event) {
    if (event.target.classList.contains('borrower-name')) {
        const borrowerName = event.target.getAttribute('data-name');
        const borrowerId = event.target.getAttribute('data-id');
        const phoneNumber = event.target.getAttribute('data-phone'); // Get phone number
        const email = event.target.getAttribute('data-email'); // Get email

        // Redirect to borrowerLog.html with all necessary data
        window.location.href = `borrowerLog.html?borrowerName=${encodeURIComponent(borrowerName)}&borrowerId=${encodeURIComponent(borrowerId)}&phoneNumber=${encodeURIComponent(phoneNumber)}&email=${encodeURIComponent(email)}`;
    }

    // Event listener for redirecting to book history
    if (event.target.classList.contains('book-title')) {
        const bookTitle = event.target.getAttribute('data-title');
        const bookId = event.target.getAttribute('data-id');

        // Redirect to bookhistory.html with book title and book ID
        window.location.href = `bookhistory.html?bookTitle=${encodeURIComponent(bookTitle)}&bookId=${encodeURIComponent(bookId)}`;
    }


});

// Function to clear the table
function clearBorrowTable() {
    const borrowList = document.getElementById('borrowList');
    while (borrowList && borrowList.firstChild) {
        borrowList.removeChild(borrowList.firstChild);
    }
}

// DELETE!!!
document.addEventListener('click', function (event) {
    if (event.target.closest('.delete-btn')) {
        const id = event.target.closest('.delete-btn').getAttribute('data-id'); // Fetch the ID correctly
        
        // Prepare the title and message for the confirmation dialog
        const title = 'Confirm Deletion';
        const message = 'Are you sure you want to delete this borrow record?';

        // Show the confirmation dialog using Electron's ipcRenderer
        ipcRenderer.invoke('show-confirmation-dialog', { title, message })
            .then((confirmation) => {
                if (confirmation) {
                    // Proceed with deletion if the user confirms
                    ipcRenderer.invoke('deleteBorrow', id)
                        .then(() => {
                            showNotification('Borrow record deleted successfully!', 'delete');
                            loadBorrowRecords(); // Reload records after deletion
                        })
                        .catch(error => {
                            console.error('Error deleting borrow record:', error);
                            showNotification('Failed to delete borrow record.', 'error');
                        });
                }
            })
            .catch(error => {
                console.error('Error showing confirmation dialog:', error);
                showNotification('Error showing confirmation dialog!', 'error');
            });
    }
});

// CRUD
document.addEventListener('DOMContentLoaded', () => {
    
    // DISPLAY
    loadBorrowRecords(); // Initial load

    document.getElementById('addBorrow').addEventListener('click', () => {
        ipcRenderer.send('open-add-borrow-window');
    });

    //ADD
    // Handle successful addition of a borrow record
    ipcRenderer.on('borrow-added-success', () => {
        console.log('Notification: Borrow record added successfully!');
        showNotification('Borrow record added successfully!', 'success');
    });
    
    ipcRenderer.on('borrow-added-failure', () => {
        console.log('Notification: Failed to add borrow record.');
        showNotification('Failed to add borrow record. Please try again.', 'error');
    });
    

    // Reload the table when a new borrow record is added
    ipcRenderer.on('borrow-record-added', (event, newRecord) => {
        loadBorrowRecords();

    });

});

let selectedRecords = new Set();  // Track selected records across pages


// SELECT ALL
// "Select All" checkbox listener to update based on current records displayed
document.getElementById('selectAll').addEventListener('change', function () {
    const isChecked = this.checked;
    document.querySelectorAll('.select-borrow').forEach(checkbox => {
        checkbox.checked = isChecked; // Check/Uncheck all checkboxes on the current page
        const recordId = checkbox.dataset.id;
        if (isChecked) {
            selectedRecords.add(recordId); // Add to selected records
        } else {
            selectedRecords.delete(recordId); // Remove from selected records
        }
    });
    updateSelectAllCheckbox();  // Ensure "Select All" reflects the updated state
});

function updateSelectAllCheckbox() {
    const checkboxes = document.querySelectorAll('.select-borrow'); // Get checkboxes on the current page
    const totalCheckboxes = checkboxes.length;
    const checkedCheckboxes = [...checkboxes].filter(checkbox => checkbox.checked).length;
    
    const selectAllCheckbox = document.getElementById('selectAll');
    
    if (totalCheckboxes === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCheckboxes === totalCheckboxes) {
        selectAllCheckbox.checked = true;  // All checkboxes are checked
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCheckboxes > 0) {
        selectAllCheckbox.checked = false;  // Not all are checked
        selectAllCheckbox.indeterminate = true;  // Some are checked
    } else {
        selectAllCheckbox.checked = false;  // None are checked
        selectAllCheckbox.indeterminate = false;
    }
}

// DELETE ALL
document.getElementById('deleteSelected').addEventListener('click', function () {
    const selectedCount = selectedRecords.size;  // Count the selected records

    if (selectedCount === 0) {
        showNotification('No records selected for deletion.', 'error');
        return;
    }

    // Prepare the title and message for the confirmation dialog
    const title = 'Confirm Deletion';
    const message = `Are you sure you want to delete the ${selectedCount} selected record(s)?`;  // Display count

    // Show the confirmation dialog using Electron's ipcRenderer
    ipcRenderer.invoke('show-confirmation-dialog', { title, message })
        .then((confirmation) => {
            if (confirmation) {
                const selectedIds = Array.from(selectedRecords);  // Convert Set to Array for processing

                // Process deletions in parallel
                const deletePromises = selectedIds.map(id => 
                    ipcRenderer.invoke('deleteBorrow', id)
                        .then(() => {
                            selectedRecords.delete(id);  // Remove deleted record from selectedRecords
                        })
                        .catch(error => {
                            console.error('Error deleting borrow record:', error);
                            showNotification(`Failed to delete record with ID ${id}.`, 'error');
                        })
                );

                // Wait for all deletions to complete
                Promise.all(deletePromises)
                    .then(() => {
                        showNotification(`${selectedCount} selected record(s) deleted successfully!`, 'delete');
                        loadBorrowRecords();  // Reload records after deletion
                    })
                    .catch(() => {
                        showNotification('Error occurred during bulk deletion.', 'error');
                    });
            }
        })
        .catch(error => {
            console.error('Error showing confirmation dialog:', error);
            showNotification('Error showing confirmation dialog!', 'error');
        });
});


document.addEventListener('DOMContentLoaded', () => {
    setupPagination();
    loadBorrowRecords();

    // "Select All" checkbox functionality
    const selectAllCheckbox = document.getElementById('selectAll');
    selectAllCheckbox.addEventListener('change', function () {
        const isChecked = this.checked;
        document.querySelectorAll('.select-borrow').forEach(checkbox => {
            checkbox.checked = isChecked;
            const recordId = checkbox.dataset.id;
            if (isChecked) {
                selectedRecords.add(recordId);
            } else {
                selectedRecords.delete(recordId);
            }
        });
        updateSelectAllCheckbox();
    });

    // Event listeners for sorting columns
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', function () {
            const column = this.dataset.column;

            if (sortColumn === column) {
                if (sortOrder === 'asc') {
                    sortOrder = 'desc';
                } else if (sortOrder === 'desc') {
                    sortOrder = null;
                } else {
                    sortOrder = 'asc';
                }
            } else {
                sortColumn = column;
                sortOrder = 'asc';
            }

            document.querySelectorAll('.sortable i').forEach(icon => {
                icon.className = 'fas fa-sort';
            });

            const icon = this.querySelector('i');
            if (sortOrder === 'asc') {
                icon.className = 'fas fa-sort-up';
            } else if (sortOrder === 'desc') {
                icon.className = 'fas fa-sort-down';
            } else {
                icon.className = 'fas fa-sort';
                sortColumn = null;
            }

            loadBorrowRecords();
        });
    });

    // Event listeners for search and status filter
    ['searchInput', 'statusFilter'].forEach(id => {
        document.getElementById(id).addEventListener('input', resetAndLoadRecords);
    });

    ipcRenderer.on('borrow-record-added', loadBorrowRecords);
    ipcRenderer.on('borrow-record-updated', (event, updatedRecord) => {
        console.log('Borrow record updated:', updatedRecord);
        loadBorrowRecords();
        showNotification('Borrow record updated successfully!', 'success');
    });
});

function resetAndLoadRecords() {
    currentPage = 1;  // Reset the page to 1 when loading new records
    loadBorrowRecords();  // Load records for the first page
}

let currentPage = 1;
const recordsPerPage = 3;  // Set how many records you want per page
let totalPages = 1;
let filteredRecords = [];
const pageLocationInput = document.getElementById('pageLocation'); // Define pageLocationInput here

// Debugging: Track page changes to see if it skips
function goToPage(page) {
    console.log(`Attempting to go to page: ${page}`);  // Log the page navigation attempt

    // Calculate total pages based on the filtered records
    totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    
    // Ensure page is within valid bounds
    if (page < 1) {
        currentPage = 1;
    } else if (page > totalPages) {
        currentPage = totalPages;
    } else {
        currentPage = page;
    }

    console.log(`Navigating to page: ${currentPage} of ${totalPages}`);  // Log actual page navigation

    // Update the page number and input field
    updatePageNumber(currentPage);
    
    // Load records for the current page
    loadBorrowRecords();
}


async function loadBorrowRecords() {
    try {
        const borrowRecords = await ipcRenderer.invoke('getBorrows');
        console.log('Fetched Borrow Records:', borrowRecords);

        clearBorrowTable();

        const searchQuery = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;

        // Filter records based on search and status
        filteredRecords = borrowRecords.filter(record => {
            const borrowerName = record.name ? record.name.toLowerCase() : '';
            const bookTitle = record.title_of_book ? record.title_of_book.toLowerCase() : '';

            const matchesSearch = borrowerName.includes(searchQuery) || bookTitle.includes(searchQuery);
            const matchesStatus = statusFilter === '' || record.borrowStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });

        const totalRecords = filteredRecords.length;
        totalPages = Math.ceil(totalRecords / recordsPerPage); // Calculate total pages after filtering

        // Ensure currentPage is not out of bounds
        if (currentPage > totalPages) {
            currentPage = totalPages > 0 ? totalPages : 1;
        }

        // Update page number display
        document.getElementById('totalPages').textContent = `of ${totalPages}`;
        updatePageNumber(currentPage);

        // Get records for the current page
        const startIndex = (currentPage - 1) * recordsPerPage;
        const paginatedRecords = filteredRecords.slice(startIndex, startIndex + recordsPerPage); // Correct slicing logic

        // Log to check which records are being displayed
        console.log(`Records for page ${currentPage}:`, paginatedRecords);

        if (paginatedRecords.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 7;
            emptyCell.textContent = 'No records available.';
            emptyRow.appendChild(emptyCell);
            document.getElementById('borrowList').appendChild(emptyRow);
        } else {
            paginatedRecords.forEach(addBorrowToTable);
        }

        updateSelectAllCheckbox();
        updatePaginationControls(totalPages); // Make sure totalPages is passed here

    } catch (error) {
        console.error('Error loading borrow records:', error);
        showNotification('Failed to load records. Please try again.', 'error');
    }
}

// Pagination Controls Setup
function updatePaginationControls(totalPages) {
    document.getElementById('firstPage').disabled = (currentPage === 1);
    document.getElementById('prevPage').disabled = (currentPage === 1);
    document.getElementById('nextPage').disabled = (currentPage === totalPages || totalPages === 0);
    document.getElementById('lastPage').disabled = (currentPage === totalPages || totalPages === 0);
}


// Setup pagination event listeners
function setupPagination() {
    document.getElementById('firstPage').addEventListener('click', () => goToPage(1));

    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
    });

    document.getElementById('lastPage').addEventListener('click', () => goToPage(totalPages));

    pageLocationInput.addEventListener('change', (event) => {
        const enteredPage = parseInt(event.target.value, 10);
        if (isNaN(enteredPage) || enteredPage < 1 || enteredPage > totalPages) {
            showNotification('Invalid page number!', 'error');
            pageLocationInput.value = currentPage;
            adjustWidth();
        } else {
            goToPage(enteredPage);
        }
    });
}

// Update the displayed page number
function updatePageNumber(newPageNumber) {
    pageLocationInput.value = newPageNumber;
    adjustWidth();
}

// Adjust input width for the page input field
function adjustWidth() {
    const textLength = pageLocationInput.value.length;
    let width = 40;
    if (textLength > 1) {
        width += (textLength - 1) * 20;
    }
    pageLocationInput.style.width = width + 'px';
}

function updatePaginationControls() {
    document.getElementById('firstPage').disabled = (currentPage === 1);
    document.getElementById('prevPage').disabled = (currentPage === 1);
    document.getElementById('nextPage').disabled = (currentPage === totalPages || totalPages === 0);
    document.getElementById('lastPage').disabled = (currentPage === totalPages || totalPages === 0);
}

// Initial setup
adjustWidth();
pageLocationInput.addEventListener('input', adjustWidth);
setupPagination();
