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
        <td>${record.book_title || record.book_id}</td>
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
        if (confirm('Are you sure you want to delete this record?')) {
            ipcRenderer.invoke('deleteBorrow', id) // Now `id` is defined
                .then(() => {
                    showNotification('Borrow record deleted successfully!', 'delete');
                    loadBorrowRecords(); // Reload records after deletion
                })
                .catch(error => {
                    console.error('Error deleting borrow record:', error);
                    showNotification('Failed to delete borrow record.', 'error');
                });
        }
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

// SELECT ALL
document.getElementById('selectAll').addEventListener('change', function () {
    const isChecked = this.checked;
    
    console.log(`Select All checkbox clicked. Checked: ${isChecked}`);
    
    // Select all individual checkboxes with class 'select-borrow'
    const checkboxes = document.querySelectorAll('.select-borrow');
    if (checkboxes.length === 0) {
        console.log('No checkboxes found to update.');
        return;
    }

    checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;  // Set the checked state

        // Log the state change
        console.log(`Checkbox with data-id ${checkbox.dataset.id} checked state: ${checkbox.checked}`);

        const recordId = checkbox.dataset.id;
        if (isChecked) {
            selectedRecords.add(recordId);  // Add to selected records
        } else {
            selectedRecords.delete(recordId);  // Remove from selected records
        }

        // Trigger the change event to ensure visual update
        checkbox.dispatchEvent(new Event('change')); // This ensures UI reflects the new state
    });

    updateSelectAllCheckbox();  // Update the "Select All" checkbox state
});



function updateSelectAllCheckbox() {
    const totalRecords = filteredRecords.length;
    const allSelected = selectedRecords.size === totalRecords && totalRecords > 0;
    document.getElementById('selectAll').checked = allSelected;
}

//DELETE ALL
document.getElementById('deleteSelected').addEventListener('click', function () {
    if (selectedRecords.size === 0) {
        alert('No records selected for deletion.', 'error');
        return;
    }

    if (confirm('Are you sure you want to delete the selected records?')) {
        const selectedIds = Array.from(selectedRecords);  // Convert Set to Array for processing

        selectedIds.forEach(id => {
            ipcRenderer.invoke('deleteBorrow', id)
                .then(() => {
                    selectedRecords.delete(id);  // Remove deleted record from selectedRecords
                    showNotification('Selected records deleted successfully!', 'delete');
                    loadBorrowRecords();  // Reload records after deletion
                })
                .catch(error => {
                    console.error('Error deleting borrow record:', error);
                    showNotification('Failed to delete some records.', 'error');
                });
        });
    }
});
let selectedRecords = new Set();  // Track selected records across pages


document.addEventListener('DOMContentLoaded', () => {
    loadBorrowRecords();
    setupPagination();

    // "Select All" checkbox functionality - Consolidated logic here
    const selectAllCheckbox = document.getElementById('selectAll');
    selectAllCheckbox.addEventListener('change', function () {
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
        updateSelectAllCheckbox();  // Update the "Select All" based on selection state
    });

// Add event listeners to column headers for sorting
document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', function () {
        const column = this.dataset.column;

        // Toggle sort order with third state (reset)
        if (sortColumn === column) {
            if (sortOrder === 'asc') {
                sortOrder = 'desc';
            } else if (sortOrder === 'desc') {
                sortOrder = null; // Reset to null for third click
            } else {
                sortOrder = 'asc'; // Reset to ascending when switching columns
            }
        } else {
            sortColumn = column;
            sortOrder = 'asc'; // Reset to ascending when switching columns
        }

        // Reset all column icons to neutral
        document.querySelectorAll('.sortable i').forEach(icon => {
            icon.className = 'fas fa-sort';
        });

        // Update the clicked column icon based on sort order
        const icon = this.querySelector('i');
        if (sortOrder === 'asc') {
            icon.className = 'fas fa-sort-up';
        } else if (sortOrder === 'desc') {
            icon.className = 'fas fa-sort-down';
        } else {
            icon.className = 'fas fa-sort'; // Reset icon to neutral
            sortColumn = null; // Reset sorting column
        }

        // Reload the records with new sorting or reset if sorting is null
        loadBorrowRecords();
    });
});

    // Event listeners for search and filter functionality
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

// Helper function to reset to the first page and reload records
function resetAndLoadRecords() {
    currentPage = 1;
    loadBorrowRecords();
}

// Sorting variables
let sortColumn = 'createdAt';  // Default sorting by createdAt
let sortOrder = 'desc';         // Default sorting order

async function loadBorrowRecords() {
    try {
        const borrowRecords = await ipcRenderer.invoke('getBorrows');  // Fetch records with names and titles
        console.log('Fetched Borrow Records:', borrowRecords); // Log fetched records
        
        clearBorrowTable();

        // Get filter values
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;

        // Filter records based on search query and status
        let filteredRecords = borrowRecords.filter(record => {
            const borrowerName = record.name ? record.name.toLowerCase() : ''; // 'name' instead of 'borrower_name'
            const bookTitle = record.title_of_book ? record.title_of_book.toLowerCase() : ''; // 'title_of_book' instead of 'book_title'
            
            const matchesSearch = borrowerName.includes(searchQuery) || bookTitle.includes(searchQuery);
            const matchesStatus = statusFilter === '' || record.borrowStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });

        // Log filtered records
        console.log('Filtered Records:', filteredRecords); // Log filtered records

        // If there's a sort column and order, apply sorting based on that
        if (sortColumn) {
            filteredRecords.sort((a, b) => {
                let aVal = a[sortColumn];
                let bVal = b[sortColumn];

                // Parse the 'createdAt' string as a date
                if (sortColumn === 'createdAt') {
                    aVal = new Date(aVal.replace(' ', 'T')); // Convert to a format JavaScript Date can handle
                    bVal = new Date(bVal.replace(' ', 'T'));
                }

                return sortOrder === 'desc' ? (aVal > bVal ? -1 : 1) : (aVal < bVal ? -1 : 1);
            });
        }

        const totalRecords = filteredRecords.length;
        const totalPages = Math.ceil(totalRecords / recordsPerPage);

        // Update total pages display
        document.getElementById('totalPages').textContent = `of ${totalPages}`;

        // If currentPage is greater than totalPages, reset to last page
        if (currentPage > totalPages) {
            currentPage = totalPages > 0 ? totalPages : 1;
        }

        // Slice the records for the current page
        const paginatedRecords = filteredRecords.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

        // Log paginated records
        console.log('Paginated Records:', paginatedRecords); // Log paginated records
        
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

        // Update pagination controls based on new data
        updatePaginationControls(totalPages);

        function updatePaginationControls(totalPages) {
            document.getElementById('firstPage').disabled = (currentPage === 1);
            document.getElementById('prevPage').disabled = (currentPage === 1);
            document.getElementById('nextPage').disabled = (currentPage === totalPages || totalPages === 0);
            document.getElementById('lastPage').disabled = (currentPage === totalPages || totalPages === 0);

            document.getElementById('totalPages').textContent = `of ${totalPages}`;
            updatePageNumber(currentPage);
        }

        updateSelectAllCheckbox();
    } catch (error) {
        console.error('Error loading borrow records:', error);
        showNotification('Failed to load records. Please try again.', 'error');
    }
}
