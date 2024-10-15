// Sidebar toggle functionality
document.getElementById('sidebarCollapse').addEventListener('click', function () {
    const wrapper = document.getElementById('wrapper');
    const sidebar = document.getElementById('sidebar-wrapper');
    
    wrapper.classList.toggle('collapsed');
    sidebar.classList.toggle('collapsed');
});

// LOGOUT
document.getElementById('logout-link').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent default link behavior

    ipcRenderer.invoke('logout').then(() => {
        window.location.href = './login/login.html'; // Redirect to login page after logout
    }).catch(error => {
        console.error('Error during logout:', error);
        alert('An error occurred. Please try again.');
    });
});

const { ipcRenderer } = require('electron');
let logData = [];
let filteredLogData = []; // Store the filtered results


// Update borrower name in the UI
function updateBorrowerName(borrowerName) {
    document.getElementById('borrowerName').textContent = borrowerName;
}

//FILTERS
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const borrowerName = urlParams.get('borrowerName');

    if (borrowerName) {
        updateBorrowerName(borrowerName);
        fetchBorrowerLog(borrowerName);

        // Set up event listeners for filtering
        document.getElementById('searchTitle').addEventListener('input', debounce(applyFilters, 300));
        document.getElementById('filterStatus').addEventListener('change', applyFilters);

        const dateRangeSelect = document.getElementById('dateRangeSelect');
        const applyDateRangeBtn = document.getElementById('applyDateRange');
        const clearDateRangeBtn = document.getElementById('clearDateRange');
        const customDateRange = document.getElementById('customDateRange');

        // Show or hide custom date range inputs based on selection
        dateRangeSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customDateRange.style.display = 'block';
            } else {
                customDateRange.style.display = 'none';
                applyFilters();
            }
        });

        // Apply date range filter
        applyDateRangeBtn.addEventListener('click', () => {
            applyFilters();
        });

        // Clear date range filter
        clearDateRangeBtn.addEventListener('click', () => {
            resetDateFilters();
        });

        // Pagination Controls
        document.getElementById('prevPage').addEventListener('click', prevPage);
        document.getElementById('nextPage').addEventListener('click', nextPage);
    } else {
        console.error('No borrower name specified in the URL.');
    }
});

// DISPLAY
function displayLog() {
    const container = document.getElementById('borrowerLogContainer');
    container.innerHTML = '';

    const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format


    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const paginatedLog = filteredRecords.slice(start, end);

    paginatedLog.forEach(entry => {

        if (entry.dueDate && currentDate > entry.dueDate && entry.borrowStatus === 'borrowed') {
            entry.borrowStatus = 'overdue'; // Set the status to overdue if the current date is past the due date
        }


        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.bookTitle}</td>
            <td>${entry.borrowDate}</td>
            <td>${entry.dueDate || ''} </td> 
            <td>
                <select class="status-dropdown" data-id="${entry.id}" ${entry.borrowStatus === 'returned' || entry.borrowStatus === 'returned overdue' ? 'disabled' : ''}>
                    <option value="borrowed" ${entry.borrowStatus === 'borrowed' ? 'selected' : ''}>Borrowed</option>
                    <option value="returned" ${entry.borrowStatus === 'returned' ? 'selected' : ''}>Returned</option>
                    <option value="returned overdue" class="status-returned-overdue" ${entry.borrowStatus === 'returned overdue' ? 'selected' : ''}>Returned Overdue</option>
                </select>
            </td>
            <td> ${entry.returnDate || ''} </td>
        `;
        const statusDropdown = row.querySelector('.status-dropdown');
        updateDropdownStyle(statusDropdown, entry.borrowStatus);

        // Hide the "Returned Overdue" option if the status is not "Overdue"
        if (entry.borrowStatus !== 'overdue') {
            const returnedOverdueOption = statusDropdown.querySelector('option[value="returned overdue"]');
            returnedOverdueOption.style.display = 'none';
        }

        // Handle the "Overdue" status
        if (entry.borrowStatus === 'overdue') {
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
    
            ipcRenderer.invoke('updateBorrowStatus', { id: entry.id, status: newStatus, returnDate: newReturnDate })
                .then(() => {
                    
                    console.log('Borrow status and return date updated successfully!');
                    showNotification('Borrow status updated successfully!', 'success');

                })
                .catch(error => {
                    console.error('Error updating borrow status and return date:', error);
                    showNotification('Failed to update borrow status.', 'error');
                });
        });

        container.appendChild(row);
    });

    updatePaginationControls(); // Update the pagination controls based on the current page
}

// STATUS STYLE
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

// Fetch and display borrower log
async function fetchBorrowerLog(borrowerName) {
    try {
        const log = await ipcRenderer.invoke('getBorrowerLog', borrowerName);
        
        // Sort log data by borrowDate in descending order
        filteredRecords = log.sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));
        
        currentPage = 1; // Reset to the first page
        displayLog(); // Display the log for the current page
        updatePaginationControls(); // Update pagination controls
    } catch (error) {
        console.error('Error fetching borrower log:', error);
    }
}



// Apply filters to log data
function applyFilters() {
    // Get filter values
    const searchTitle = document.getElementById('searchTitle').value.toLowerCase();
    const filterStatus = document.getElementById('filterStatus').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const dateRangeSelect = document.getElementById('dateRangeSelect').value;

    let startDateFilter = startDate;
    let endDateFilter = endDate;

    // Handle preset date ranges
    if (dateRangeSelect === 'last_7_days') {
        startDateFilter = new Date();
        startDateFilter.setDate(startDateFilter.getDate() - 7);
        endDateFilter = new Date();
    } else if (dateRangeSelect === 'last_30_days') {
        startDateFilter = new Date();
        startDateFilter.setDate(startDateFilter.getDate() - 30);
        endDateFilter = new Date();
    } else if (dateRangeSelect === 'this_month') {
        startDateFilter = new Date();
        startDateFilter.setDate(1);
        endDateFilter = new Date();
        endDateFilter.setMonth(endDateFilter.getMonth() + 1);
        endDateFilter.setDate(0);
    } else if (dateRangeSelect === 'last_month') {
        startDateFilter = new Date();
        startDateFilter.setMonth(startDateFilter.getMonth() - 1);
        startDateFilter.setDate(1);
        endDateFilter = new Date();
        endDateFilter.setDate(0);
    } else if (dateRangeSelect === 'custom') {
        customDateRange.style.display = 'block';
        startDateFilter = startDate;
        endDateFilter = endDate;
    } else {
        // If no date filter is selected, clear date filters
        startDateFilter = null;
        endDateFilter = null;
    }

    // Filter log data based on search title, status, and date range
    filteredLogData = logData.filter(entry => {
        const title = entry.bookTitle.toLowerCase();
        const status = entry.borrowStatus;
        const borrowDate = new Date(entry.borrowDate);

        const isTitleMatch = title.includes(searchTitle);
        const isStatusMatch = !filterStatus || filterStatus === "all" || status === filterStatus;
        const isDateMatch = (!startDateFilter || borrowDate >= new Date(startDateFilter)) &&
                            (!endDateFilter || borrowDate <= new Date(endDateFilter));

        return isTitleMatch && isStatusMatch && isDateMatch;
    });

    currentPage = 1; // Reset to first page after applying filters
    displayLog();
}

// Reset date filters
function resetDateFilters() {
    // Clear the start and end date input values
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';

    // Reset the "Search by Date" dropdown to its default value (assumed to be '')
    document.getElementById('dateRangeSelect').value = '';

    // Hide the custom date range inputs
    document.getElementById('customDateRange').style.display = 'none';

    // Reapply filters with no date restrictions
    applyFilters();
}

// Debounce function to limit the rate at which a function is executed
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Close the custom date range filter when clicking outside of it
document.addEventListener('click', (event) => {
    const customDateRange = document.getElementById('customDateRange');
    const dateRangeSelect = document.getElementById('dateRangeSelect');

    if (!dateRangeSelect.contains(event.target) && !customDateRange.contains(event.target)) {
        customDateRange.style.display = 'none';
    }
});



// PAGINATION
let currentPage = 1;
const recordsPerPage = 3;  // Display 3 records per page
let filteredRecords = [];  // Store filtered records globally for pagination

// Initialize pagination setup
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
    pageLocationInput.addEventListener('change', (event) => {
        const enteredPage = parseInt(event.target.value, 10);
        const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

        if (isNaN(enteredPage) || enteredPage < 1 || enteredPage > totalPages) {
            showNotification('Invalid page number!', 'error');
            // Reset to the current page number and adjust width
            pageLocationInput.value = currentPage;
            adjustWidth();
        } else {
            goToPage(enteredPage, totalPages);
        }
    });
}
// Change page and reload records
function goToPage(page, totalPages = Math.ceil(filteredRecords.length / recordsPerPage)) {
    if (page < 1) {
        currentPage = 1; // Stay on the first page
    } else if (page > totalPages) {
        currentPage = totalPages; // Stay on the last page
    } else {
        currentPage = page; // Set to the desired page
    }

    // Update pagination display
    updatePageNumber(currentPage);
    document.getElementById('totalPages').textContent = `of ${totalPages}`;

    // Reload the records for the new page
    displayLog();
}

// Update pagination control button states
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

    document.getElementById('firstPage').disabled = (currentPage === 1);
    document.getElementById('prevPage').disabled = (currentPage === 1);
    document.getElementById('nextPage').disabled = (currentPage === totalPages || totalPages === 0);
    document.getElementById('lastPage').disabled = (currentPage === totalPages || totalPages === 0);

    // Update total page count display
    document.getElementById('totalPages').textContent = `of ${totalPages}`;
}

// Get input element
const pageLocationInput = document.getElementById('pageLocation');

// Function to adjust width based on the number of characters
function adjustWidth() {
    const textLength = pageLocationInput.value.length;
    // Set a base width for 1-digit numbers
    let width = 40; // Base width
    // Increase width by increments for each additional digit
    if (textLength > 1) {
        width += (textLength - 1) * 20; // Incremental width adjustment
    }
    pageLocationInput.style.width = width + 'px';
}

// Function to update the page number and adjust the input width
function updatePageNumber(newPageNumber) {
    pageLocationInput.value = newPageNumber;
    adjustWidth(); // Adjust width whenever page number is updated
}

// Initialize width for the first page number
adjustWidth();

// Initialize pagination width update based on user input
pageLocationInput.addEventListener('input', adjustWidth);

// Set up pagination controls when the page loads
setupPagination();