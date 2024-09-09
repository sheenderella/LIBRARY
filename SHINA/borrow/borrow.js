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
        <td><input type="checkbox" class="select-borrow" data-id="${record.id}"></td>
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


document.getElementById('selectAll').addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('.select-borrow');
    checkboxes.forEach(checkbox => checkbox.checked = this.checked);
});


document.getElementById('deleteSelected').addEventListener('click', function() {
    const selectedIds = [];
    document.querySelectorAll('.select-borrow:checked').forEach(checkbox => {
        selectedIds.push(checkbox.dataset.id);
    });

    if (selectedIds.length === 0) {
        alert('No records selected for deletion.', 'error');
        return;
    }

    if (confirm('Are you sure you want to delete the selected records?')) {
        selectedIds.forEach(id => {
            ipcRenderer.invoke('deleteBorrow', id)
                .then(() => {
                    showNotification('Selected records deleted successfully!', 'delete');
                    loadBorrowRecords();
                })
                .catch(error => {
                    console.error('Error deleting borrow record:', error);
                    showNotification('Failed to delete some records.', 'error');
                });
        });
    }
});


let currentPage = 1;
const recordsPerPage = 4;  // Display 4 records per page
let filteredRecords = [];  // Store filtered records globally for pagination


document.addEventListener('DOMContentLoaded', () => {
    loadBorrowRecords();
    setupPagination();
    setupPagination();

    // Event listeners for search and filter functionality
    document.getElementById('searchInput').addEventListener('input', loadBorrowRecords);
    document.getElementById('statusFilter').addEventListener('change', loadBorrowRecords);
    document.getElementById('applyDateRange').addEventListener('click', loadBorrowRecords);
    document.getElementById('clearDateRange').addEventListener('click', () => {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        loadBorrowRecords();
    });

    // Handle multi-select functionality
    document.getElementById('selectAll').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.select-borrow');
        checkboxes.forEach(checkbox => checkbox.checked = this.checked);
    });

    // Reload the table when a new borrow record is added
    ipcRenderer.on('borrow-record-added', (event, newRecord) => {
        loadBorrowRecords();
    });

    // Reload the table when a borrow record is updated
    ipcRenderer.on('borrow-record-updated', (event, updatedRecord) => {
        console.log('Borrow record updated:', updatedRecord);
        loadBorrowRecords(); // Reload the table to reflect the updated record
        showNotification('Borrow record updated successfully!', 'success'); // Show success notification
    });



    
});










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

        // Filter records based on the search query, status, and date range
        filteredRecords = borrowRecords.filter(record => {
            const matchesSearch = record.borrowerName.toLowerCase().includes(searchQuery) || record.bookTitle.toLowerCase().includes(searchQuery);
            const matchesStatus = statusFilter === '' || record.borrowStatus === statusFilter;
            const matchesDateRange = filterByDateRange(record.borrowDate, dateRange, startDate, endDate);

            return matchesSearch && matchesStatus && matchesDateRange;
        });

        const totalRecords = filteredRecords.length;
        const totalPages = Math.ceil(totalRecords / recordsPerPage);
        
        // Update pagination controls
        updatePaginationControls(totalPages);

        // If currentPage is greater than totalPages (because of filtering), set currentPage to the last page
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        // Slice the records to show only the ones for the current page
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
    } catch (error) {
        console.error('Error loading borrow records:', error);
        showNotification('Failed to load records. Please try again.', 'error');
    }
}


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



//PAGINATION 
// Setup pagination controls
function setupPagination() {
    document.getElementById('firstPage').addEventListener('click', () => goToPage(1));
    document.getElementById('prevPage').addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
        goToPage(currentPage + 1, totalPages);
    });
    document.getElementById('lastPage').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
        goToPage(totalPages);
    });

    // Event listener for page input field
    document.getElementById('pageLocation').addEventListener('change', (event) => {
        const enteredPage = parseInt(event.target.value, 10);
        const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

        // Validate the entered page number
        if (isNaN(enteredPage) || enteredPage < 1 || enteredPage > totalPages) {
            showNotification('Invalid page number!', 'error');
            document.getElementById('pageLocation').value = currentPage; // Reset to current page
        } else {
            goToPage(enteredPage, totalPages);
        }
    });
}

// Function to change the page and reload records
function goToPage(page, totalPages = Math.ceil(filteredRecords.length / recordsPerPage)) {
    if (page < 1 || page > totalPages) return; // Invalid page

    currentPage = page;

    // Update the page location display
    document.getElementById('pageLocation').value = currentPage;
    document.getElementById('totalPages').textContent = `of ${totalPages}`;

    // Reload the records for the new page
    loadBorrowRecords();
}

// Update pagination control button states
function updatePaginationControls(totalPages) {
    document.getElementById('firstPage').disabled = (currentPage === 1);
    document.getElementById('prevPage').disabled = (currentPage === 1);
    document.getElementById('nextPage').disabled = (currentPage === totalPages);
    document.getElementById('lastPage').disabled = (currentPage === totalPages);
}