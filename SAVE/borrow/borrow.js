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

//ADD!!!
// Function to add a new row in the table
function addBorrowToTable(record) {
    const borrowList = document.getElementById('borrowList');
    if (!borrowList) {
        console.error('Table element with id "borrowList" not found!');
        return;
    }

    const row = document.createElement('tr');
    row.dataset.id = record.id;

    row.innerHTML = `
        <td><input type="checkbox" class="select-borrow" data-id="${record.id}" ${selectedRecords.has(record.id) ? 'checked' : ''}></td>
        <td><span class="borrower-name" data-name="${record.borrowerName}">${record.borrowerName}</span></td>
        <td>${record.bookTitle}</td>
        <td>${record.borrowDate}</td>
        
        <td>
            <select class="status-dropdown" data-id="${record.id}" ${record.borrowStatus === 'returned' ? 'disabled' : ''}>
                <option value="borrowed" class="status-borrowed" ${record.borrowStatus === 'borrowed' ? 'selected' : ''}>Borrowed</option>
                <option value="returned" class="status-returned" ${record.borrowStatus === 'returned' ? 'selected' : ''}>Returned</option>
            </select>
        </td>

        <td>${record.returnDate} </td>

        <td>
            <button class="btn btn-info edit-btn" data-id="${record.id}" ${record.borrowStatus === 'returned' ? 'disabled' : ''}> <i class="fas fa-pencil-alt"></i> </button>
            <button class="delete-btn" data-id="${record.id}"> <i class="fas fa-trash"></i> </button>
        </td>
    `;

        // Set initial background color based on the status
        const statusDropdown = row.querySelector('.status-dropdown');
        updateDropdownStyle(statusDropdown, record.borrowStatus);


// Inside the event listener for status change
statusDropdown.addEventListener('change', function () {
    const newStatus = this.value;
    const returnDate = newStatus === 'returned' ? new Date().toISOString().split('T')[0] : null;

    updateDropdownStyle(this, newStatus); // Update dropdown style on change

    // Update both status and return date
    ipcRenderer.invoke('updateBorrowStatus', { id: record.id, status: newStatus, returnDate })
        .then(() => {
            console.log('Borrow status and return date updated successfully!');
            // Dynamically update the return date field in the table
            row.querySelector('td:nth-child(6)').innerText = returnDate || '';
            showNotification('Borrow status and return date updated successfully!', 'success');
            loadBorrowRecords(); // Reload records to reflect status changes
        })
        .catch(error => {
            console.error('Error updating borrow status and return date:', error);
            showNotification('Failed to update borrow status and return date.', 'error');
        });
});

    // Event listener to handle individual checkbox changes
    row.querySelector('.select-borrow').addEventListener('change', function () {
        if (this.checked) {
            selectedRecords.add(record.id);
        } else {
            selectedRecords.delete(record.id);
        }
        updateSelectAllCheckbox();  // Update "Select All" checkbox based on full selection state
    });

    borrowList.appendChild(row);
}

// Function to update dropdown style based on status
function updateDropdownStyle(dropdown, status) {
    if (status === 'borrowed') {
        dropdown.style.backgroundColor = '#FBEEAD'; // Set background color to yellow for "Borrowed"
    } else {
        dropdown.style.backgroundColor = '#C2FFC8'; // Reset background color for "Returned"
    }
}

//Dropdown status


// Event listener for redirecting to borrower log
document.addEventListener('click', function (event) {
    if (event.target.classList.contains('borrower-name')) {
        const borrowerName = event.target.getAttribute('data-name');
        window.location.href = `borrowerLog.html?borrowerName=${encodeURIComponent(borrowerName)}`;
    }
});

// Function to clear the table
function clearBorrowTable() {
    const borrowList = document.getElementById('borrowList');
    while (borrowList && borrowList.firstChild) {
        borrowList.removeChild(borrowList.firstChild);
    }
}

//UPDATE!!!
// Add event listener for opening update window
document.addEventListener('click', function (event) {
    if (event.target.closest('.edit-btn')) {
        const id = event.target.closest('.edit-btn').getAttribute('data-id');
        ipcRenderer.invoke('getBorrowRecordById', id)
            .then(record => {
                if (record) {
                    ipcRenderer.invoke('open-update-window', record)
                        .catch(error => {
                            console.error('Error opening update window:', error);
                        });
                } else {
                    showNotification('Record not found.', 'error');
                }
            })
            .catch(error => {
                console.error('Error fetching borrow record:', error);
                showNotification('Error fetching borrow record.', 'error');
            });
    }
});

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

    //UPDATE
    // Handle when a borrow record is updated
    ipcRenderer.on('borrow-record-updated', (event, updatedRecord) => {
        console.log('Borrow record updated:', updatedRecord);
        loadBorrowRecords(); // Reload the table to reflect the updated record
        showNotification('Borrow record updated successfully!', 'success'); // Show success notification
    });

});



document.getElementById('searchInput').addEventListener('input', loadBorrowRecords);
document.getElementById('statusFilter').addEventListener('change', loadBorrowRecords);
document.getElementById('applyDateRange').addEventListener('click', loadBorrowRecords);
document.getElementById('clearDateRange').addEventListener('click', () => {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    loadBorrowRecords();
});

//SELECT ALL
document.getElementById('selectAll').addEventListener('change', function () {
    const isChecked = this.checked;

    filteredRecords.forEach(record => {
        const checkbox = document.querySelector(`.select-borrow[data-id="${record.id}"]`);
        if (checkbox) checkbox.checked = isChecked;  // Check/Uncheck boxes on the current page
        if (isChecked) {
            selectedRecords.add(record.id);  // Add all records (even across pages)
        } else {
            selectedRecords.delete(record.id);  // Remove all records (even across pages)
        }
    });

    updateSelectAllCheckbox();  // Update "Select All" based on the full selection state
});

// Update "Select All" checkbox based on the selection across all pages
function updateSelectAllCheckbox() {
    const totalRecords = filteredRecords.length;
    const allSelected = selectedRecords.size === totalRecords && totalRecords > 0;  // Ensure all records across pages are selected
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


    document.getElementById('applyDateRange').addEventListener('click', resetAndLoadRecords);
    document.getElementById('clearDateRange').addEventListener('click', () => {
        ['startDate', 'endDate'].forEach(id => document.getElementById(id).value = '');
        resetAndLoadRecords();
    });

    // Handle multi-select functionality across pages
    document.getElementById('selectAll').addEventListener('change', function () {
        const isChecked = this.checked;
        document.querySelectorAll('.select-borrow').forEach(checkbox => {
            checkbox.checked = isChecked;
            const recordId = checkbox.dataset.id;
            isChecked ? selectedRecords.add(recordId) : selectedRecords.delete(recordId);
        });
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
let sortColumn = 'borrowerName';  // Default sorting by borrower's name
let sortOrder = 'asc';            // Default sorting order

// Function to reload the entire borrow list
async function loadBorrowRecords() {
    try {
        const borrowRecords = await ipcRenderer.invoke('getBorrows');  // Fetch records
        clearBorrowTable();

        // Get filter values
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const dateRange = document.getElementById('dateRangeSelect').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        // Filter records based on search query, status, and date range
        filteredRecords = borrowRecords.filter(record => {
            const matchesSearch = record.borrowerName.toLowerCase().includes(searchQuery) || record.bookTitle.toLowerCase().includes(searchQuery);
            const matchesStatus = statusFilter === '' || record.borrowStatus === statusFilter;
            const matchesDateRange = filterByDateRange(record.borrowDate, dateRange, startDate, endDate);

            return matchesSearch && matchesStatus && matchesDateRange;
        });

        // Sort records
        filteredRecords.sort((a, b) => {
            let aVal = a[sortColumn]?.toLowerCase() || '';
            let bVal = b[sortColumn]?.toLowerCase() || '';

            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        const totalRecords = filteredRecords.length;
        const totalPages = Math.ceil(totalRecords / recordsPerPage);


        // Update the total pages display
        document.getElementById('totalPages').textContent = `of ${totalPages}`;

        // If currentPage is greater than totalPages, reset to last page (useful for filters)
        if (currentPage > totalPages) {
            currentPage = totalPages > 0 ? totalPages : 1;
        }

       // Slice the records for the current page
        const paginatedRecords = filteredRecords.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

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
            // Update buttons for first, previous, next, and last page
            document.getElementById('firstPage').disabled = (currentPage === 1);
            document.getElementById('prevPage').disabled = (currentPage === 1);
            document.getElementById('nextPage').disabled = (currentPage === totalPages || totalPages === 0);
            document.getElementById('lastPage').disabled = (currentPage === totalPages || totalPages === 0);

            // Update total pages display
            document.getElementById('totalPages').textContent = `of ${totalPages}`;

            // Update the input field for the current page
            updatePageNumber(currentPage);
        }

        // Update "Select All" checkbox based on full selection state
        updateSelectAllCheckbox();
    } catch (error) {
        console.error('Error loading borrow records:', error);
        showNotification('Failed to load records. Please try again.', 'error');
    }
}


//DATE
document.getElementById('dateRangeSelect').addEventListener('change', function () {
    const dateRange = document.getElementById('dateRangeSelect').value;
    const customDateRange = document.getElementById('customDateRange');

    if (dateRange === 'custom') {
        customDateRange.style.display = 'block';  // Show custom date inputs
    } else {
        customDateRange.style.display = 'none';   // Hide custom date inputs
        loadBorrowRecords();  // Automatically reload records on non-custom range selection
    }
});


document.getElementById('applyDateRange').addEventListener('click', function () {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    if (startDate && endDate) {
        loadBorrowRecords();  // Apply only when valid dates are provided
    } else {
        alert('Please select both start and end dates.');
    }
 });
 

document.getElementById('clearDateRange').addEventListener('click', function () {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    loadBorrowRecords();  // Reload records without date filter
});


// Helper function to filter by date range
function filterByDateRange(borrowDate, dateRange, startDate, endDate) {
    const recordDate = new Date(borrowDate);
    
    if (dateRange === 'last_7_days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return recordDate >= sevenDaysAgo;
    } else if (dateRange === 'last_30_days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return recordDate >= thirtyDaysAgo;
    } else if (dateRange === 'this_month') {
        const now = new Date();
        return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
    } else if (dateRange === 'last_month') {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return recordDate >= lastMonth && recordDate < nextMonth;
    } else if (dateRange === 'custom' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return recordDate >= start && recordDate <= end;
    } else {
        return true; // No date filter applied
    }
}
