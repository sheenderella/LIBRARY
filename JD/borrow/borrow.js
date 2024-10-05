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
            <span class="status-text ${record.borrowStatus}">${record.borrowStatus}</span>
        </td>
        <td>
            <button class="btn btn-info edit-btn" data-id="${record.id}"> <i class="fas fa-pencil-alt"></i> </button>
            <button class="delete-btn" data-id="${record.id}"> <i class="fas fa-trash"></i> </button>
        </td>
    `;

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
        const id = event.target.closest('.delete-btn').getAttribute('data-id');
        if (confirm('Are you sure you want to delete this record?')) {
            ipcRenderer.invoke('deleteBorrow', id)
                .then(() => {
                    showNotification('Borrow record deleted successfully!', 'delete');
                    loadBorrowRecords();
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

    //DELETE
    ipcRenderer.invoke('deleteBorrow', id)
    .then(() => {
        showNotification('Borrow record deleted successfully!', 'delete');
        loadBorrowRecords();
    })
    .catch(error => {
        console.error('Error deleting borrow record:', error);
        showNotification('Failed to delete borrow record.', 'error');
    });

    ipcRenderer.invoke('deleteSelectedBorrows', selectedIds)
    .then(() => {
        showNotification('Selected records deleted successfully!', 'delete');
        loadBorrowRecords();
    })
    .catch(error => {
        console.error('Error deleting selected borrow records:', error);
        showNotification('Failed to delete selected records.', 'error');
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
    loadBorrowRecords();  // Apply date range when the user clicks the Apply button
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
