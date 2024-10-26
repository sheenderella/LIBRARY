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

    // For Book Title
    if (event.target.classList.contains('book-title')) {
        const bookTitle = event.target.getAttribute('data-title');
        const bookId = event.target.getAttribute('data-book-id');

        // Log values for troubleshooting
        console.log("Retrieved Book ID:", bookId);
        console.log("Retrieved Book Title:", bookTitle);

        // Check if bookId and bookTitle exist
        if (bookId && bookTitle) {
            // Redirect to bookhistory.html with book title and book ID
            window.location.href = `bookhistory.html?bookTitle=${encodeURIComponent(bookTitle)}&bookId=${encodeURIComponent(bookId)}`;
        } else {
            console.error("Failed to retrieve book information: Missing book ID or title.");
        }
    }
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
        
        <td>
            <span class="book-title" data-book-id="${record.book_id || ''}" data-title="${record.book_title || ''}">
                ${record.book_title || record.book_id}
            </span>
        </td>

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


// Global set to track selected records across pages
let selectedRecords = new Set();

// Function to clear the table
function clearBorrowTable() {
    const borrowList = document.getElementById('borrowList');
    while (borrowList && borrowList.firstChild) {
        borrowList.removeChild(borrowList.firstChild);
    }
}

// "Select All" checkbox functionality
const selectAllCheckbox = document.getElementById('selectAll');
selectAllCheckbox.addEventListener('change', function () {
    const isChecked = this.checked;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    // Determine if filters are active (either search or status)
    const isFilterActive = searchQuery !== '' || statusFilter !== '';

    // Get all record IDs based on active filters or no filters
    const filteredRecordIds = allRecords.filter(record => {
        const borrowerName = record.borrower_name ? record.borrower_name.toLowerCase() : '';
        const bookTitle = record.book_title ? record.book_title.toLowerCase() : '';
        const matchesSearch = borrowerName.includes(searchQuery) || bookTitle.includes(searchQuery);
        const matchesStatus = statusFilter === '' || record.borrowStatus === statusFilter;
        return matchesSearch && matchesStatus;
    }).map(record => record.id);

    const recordsToSelect = isFilterActive ? filteredRecordIds : allRecords.map(record => record.id);

    if (isChecked) {
        // Add all filtered or all record IDs to the selectedRecords set (all pages)
        recordsToSelect.forEach(id => selectedRecords.add(id));
    } else {
        // Remove all filtered or all record IDs from the selectedRecords set
        recordsToSelect.forEach(id => selectedRecords.delete(id));
    }

    // Update checkboxes on the current page
    document.querySelectorAll('.select-borrow[data-id]').forEach(checkbox => {
        const recordId = checkbox.dataset.id;
        checkbox.checked = isChecked;
    });
});

function updateSelectAllCheckbox() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    // Get all filtered records
    const filteredRecords = allRecords.filter(record => {
        const borrowerName = record.name ? record.name.toLowerCase() : '';
        const bookTitle = record.title_of_book ? record.title_of_book.toLowerCase() : '';
        const matchesSearch = borrowerName.includes(searchQuery) || bookTitle.includes(searchQuery);
        const matchesStatus = statusFilter === '' || record.borrowStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Get records displayed on the current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const recordsOnCurrentPage = filteredRecords.slice(startIndex, endIndex).map(record => record.id);

    // Count how many records on the current page are selected
    const selectedCount = recordsOnCurrentPage.filter(id => selectedRecords.has(id)).length;

    // Update "Select All" checkbox state
    const selectAllCheckbox = document.getElementById('selectAll');
    selectAllCheckbox.checked = selectedCount > 0 && selectedCount === recordsOnCurrentPage.length;
    selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < recordsOnCurrentPage.length;
}

// DELETE ALL
document.getElementById('deleteSelected').addEventListener('click', function () {
    const selectedCount = selectedRecords.size;

    if (selectedCount === 0) {
        showNotification('No records selected for deletion.', 'error');
        return;
    }

    const title = 'Confirm Deletion';
    const message = `Are you sure you want to delete the ${selectedCount} selected record(s)?`;

    ipcRenderer.invoke('show-confirmation-dialog', { title, message })
        .then((confirmation) => {
            if (confirmation) {
                const selectedIds = Array.from(selectedRecords);

                const deletePromises = selectedIds.map(id => 
                    ipcRenderer.invoke('deleteBorrow', id)
                        .then(() => {
                            selectedRecords.delete(id);
                        })
                        .catch(error => {
                            console.error('Error deleting borrow record:', error);
                            showNotification(`Failed to delete record with ID ${id}.`, 'error');
                        })
                );

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

let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 7;

let allRecords = [];  // To store all the fetched records
let sortColumn = 'borrowerName';  // Default sort column
let sortDirection = 'asc';  // Default sort direction


document.addEventListener('DOMContentLoaded', () => {
    // Load records initially
    loadBorrowRecords();

    // Add event listeners for pagination buttons
    document.getElementById('firstPage').addEventListener('click', goToFirstPage);
    document.getElementById('prevPage').addEventListener('click', prevPage);
    document.getElementById('nextPage').addEventListener('click', nextPage);
    document.getElementById('lastPage').addEventListener('click', goToLastPage);

// Event listeners for search and status filter
['searchInput', 'statusFilter'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        selectedRecords.clear();  // Clear selection when filter changes
        selectAllCheckbox.checked = false;  // Uncheck "Select All"
        selectAllCheckbox.indeterminate = false;  // Reset indeterminate state
        resetAndLoadRecords();  // Reload records based on new filter criteria
    });
});

    // Event listener for sorting
    document.querySelectorAll('.sort-btn').forEach(button => {
        button.addEventListener('click', () => {
            const column = button.getAttribute('data-column');
            toggleSortDirection(column);  // Toggle sort direction if same column clicked
            loadBorrowRecords();  // Reload records with new sort settings
        });
    });

    ipcRenderer.on('borrow-record-added', loadBorrowRecords);
    ipcRenderer.on('borrow-record-updated', (event, updatedRecord) => {
        loadBorrowRecords();
        showNotification('Borrow record updated successfully!', 'success');
    });


    // Bind keydown event for Enter key to the pageLocation input field
    const pageInput = document.getElementById('pageLocation');
    pageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            goToPage(pageInput.value);
        }
    });

    // Bind blur event for losing focus on the pageLocation input field
    pageInput.addEventListener('blur', () => {
        goToPage(pageInput.value);
    });

    

});

async function loadBorrowRecords() {
    try {
        const borrowRecords = await ipcRenderer.invoke('getBorrows');
        allRecords = borrowRecords;  // Store all records globally

        clearBorrowTable();

        const searchQuery = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;

        // Filter records based on search and status filter
        let filteredRecords = allRecords.filter(record => {
            const borrowerName = record.borrower_name ? record.borrower_name.toLowerCase() : '';
            const bookTitle = record.book_title ? record.book_title.toLowerCase() : '';
            const matchesSearch = borrowerName.includes(searchQuery) || bookTitle.includes(searchQuery);
            const matchesStatus = statusFilter === '' || record.borrowStatus === statusFilter;
            return matchesSearch && matchesStatus;
        });

        // Map the data-column values to actual property names in the records
        const columnMap = {
            borrowerName: 'borrower_name',
            bookTitle: 'book_title'
        };

        // Sort records based on the selected column and direction
        filteredRecords.sort((a, b) => {
            const column = columnMap[sortColumn] || sortColumn;
            let aValue = a[column] ? a[column].toLowerCase() : '';  // Ensure a valid string for comparison
            let bValue = b[column] ? b[column].toLowerCase() : '';  // Ensure a valid string for comparison

            if (sortDirection === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });

        // Calculate total pages
        totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
        document.getElementById('totalPages').textContent = `of ${totalPages}`;

        // Display records for the current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const recordsToShow = filteredRecords.slice(startIndex, endIndex);

        if (recordsToShow.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 7;
            emptyCell.textContent = 'No records available.';
            emptyRow.appendChild(emptyCell);
            document.getElementById('borrowList').appendChild(emptyRow);
        } else {
            recordsToShow.forEach(record => {
                addBorrowToTable(record);

                // Ensure the individual checkboxes reflect the global selection
                const checkbox = document.querySelector(`.select-borrow[data-id="${record.id}"]`);
                if (checkbox) {
                    checkbox.checked = selectedRecords.has(record.id);  // Reflect global selection
                }
            });
        }

        // Update pagination controls
        updatePaginationControls();
        updateSelectAllCheckbox();  // Ensure "Select All" checkbox is updated

    } catch (error) {
        console.error('Error loading borrow records:', error);
        showNotification('Failed to load records. Please try again.', 'error');
    }
}

//SORT
function toggleSortDirection(column) {
    if (sortColumn === column) {
        // If the same column is clicked, toggle the sort direction
        sortDirection = (sortDirection === 'asc') ? 'desc' : 'asc';
    } else {
        // If a new column is clicked, reset to ascending sort
        sortDirection = 'asc';
    }
    sortColumn = column;

    // Reload records to reflect new sort order
    loadBorrowRecords();
}

// Function to toggle sort direction and set the column to be sorted
function toggleSortDirection(column) {
    if (sortColumn === column) {
        // If the same column is clicked, toggle the sort direction
        sortDirection = (sortDirection === 'asc') ? 'desc' : 'asc';
    } else {
        // If a new column is clicked, reset to ascending sort
        sortDirection = 'asc';
    }
    sortColumn = column;
}

function resetAndLoadRecords() {
    currentPage = 1;
    loadBorrowRecords();
    updateSelectAllCheckbox();  // Add this line
}


// Function to update pagination button states
function updatePaginationControls() {
    if (totalPages === 0) {
        // If no records are available, set input to 0
        document.getElementById('pageLocation').value = 0;
        document.getElementById('firstPage').disabled = true;
        document.getElementById('prevPage').disabled = true;
        document.getElementById('nextPage').disabled = true;
        document.getElementById('lastPage').disabled = true;
    } else {
        // Otherwise, update the controls based on the current page
        document.getElementById('firstPage').disabled = currentPage === 1;
        document.getElementById('prevPage').disabled = currentPage === 1;
        document.getElementById('nextPage').disabled = currentPage === totalPages;
        document.getElementById('lastPage').disabled = currentPage === totalPages;
        document.getElementById('pageLocation').value = currentPage;
    }
    console.log(`Pagination Updated: Current Page - ${currentPage}, Total Pages - ${totalPages}`);
}

document.addEventListener('DOMContentLoaded', () => {
    const pageInput = document.getElementById('pageLocation');
    const inputSizer = document.createElement('span'); // Create a hidden element to measure text width
    document.body.appendChild(inputSizer);  // Append to body to get accurate width


    // Function to update input width based on its content
    function adjustInputWidth() {
        inputSizer.style.position = 'absolute';  // Ensure the sizer is invisible and doesn't affect layout
        inputSizer.style.visibility = 'hidden';  // Hide it from view
        inputSizer.style.whiteSpace = 'nowrap';  // Prevent text wrapping

        // Set the sizer's text to the input value or default to '1'
        inputSizer.textContent = pageInput.value || '1';

        // Copy the font styling to match the input element's style
        const inputStyle = window.getComputedStyle(pageInput);
        inputSizer.style.font = inputStyle.font;
        inputSizer.style.padding = inputStyle.padding;

        // Calculate the width based on the sizer's width
        const newWidth = `${inputSizer.scrollWidth + 10}px`;
        pageInput.style.width = newWidth;
    }

    // Function to handle page input validation and clear if invalid
    function validatePageInput() {
        const pageNumber = parseInt(pageInput.value, 10); // Convert input to an integer

        if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
            // Show a notification for invalid page input
            showNotification(`Invalid Page Number. Please enter a number between 1 and ${totalPages}.`, 'error');

            // Invalid input, clear the field
            pageInput.value = '';
        } else {
            // Proceed to the page if valid
            goToPage(pageNumber);
        }

        // Adjust input width after validation
        adjustInputWidth();
    }

    // Listen to input and adjust the width dynamically
    pageInput.addEventListener('input', adjustInputWidth);

    // Validate the input when the user presses Enter
    pageInput.addEventListener('change', validatePageInput);  // Or use 'blur' for leaving focus

    // Initial adjustment for default value
    adjustInputWidth();
});

function goToPage(page) {
    const pageNumber = parseInt(page, 10);  // Convert input to an integer

    if (isNaN(pageNumber)) {
        showNotification("Please enter a valid number.", 'error');
        document.getElementById('pageLocation').value = currentPage;
        return;
    }

    if (pageNumber < 1 || pageNumber > totalPages) {
        showNotification(`Page ${pageNumber} is out of range.`, 'error');
        document.getElementById('pageLocation').value = currentPage;
        return;
    }

    // If valid, navigate to the specified page
    currentPage = pageNumber;
    console.log(`${pageNumber} out of ${totalPages}`);

    // Load records for the new page
    loadBorrowRecords();
    updateSelectAllCheckbox();  // Update the checkbox states
}

// Pagination functions
function goToFirstPage() {
    currentPage = 1;
    loadBorrowRecords();
    updateSelectAllCheckbox();  // Add this line
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadBorrowRecords();
        updateSelectAllCheckbox();  // Add this line
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        loadBorrowRecords();
        updateSelectAllCheckbox();  // Add this line
    }
}

function goToLastPage() {
    currentPage = totalPages;
    loadBorrowRecords();
    updateSelectAllCheckbox();  // Add this line
}

