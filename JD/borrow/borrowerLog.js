const { ipcRenderer } = require('electron');

let currentPage = 1;
const rowsPerPage = 3;
let logData = [];
let filteredLogData = []; // Store the filtered results

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

// Update borrower name in the UI
function updateBorrowerName(borrowerName) {
    document.getElementById('borrowerName').textContent = borrowerName;
}


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

// Fetch and display borrower log
async function fetchBorrowerLog(borrowerName) {
    try {
        const log = await ipcRenderer.invoke('getBorrowerLog', borrowerName);
        
        // Sort log data by borrowDate in descending order
        logData = log.sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));
        
        filteredLogData = logData; // Set the filtered data to full data initially
        displayLog();
    } catch (error) {
        console.error('Error fetching borrower log:', error);
    }
}


// Display paginated log entries
function displayLog() {
    const container = document.getElementById('borrowerLogContainer');
    container.innerHTML = '';

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedLog = filteredLogData.slice(start, end);

    paginatedLog.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.bookTitle}</td>
            <td>${entry.borrowDate}</td>
            
  <td>
                <span class="status-text ${entry.borrowStatus}">${entry.borrowStatus}</span>
            </td>
        `;
        container.appendChild(row);
    });

    updatePaginationControls();
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
// Update pagination controls
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredLogData.length / rowsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;

    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// Navigate to previous page
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayLog();
    }
}

// Navigate to next page
function nextPage() {
    const totalPages = Math.ceil(filteredLogData.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayLog();
    }
}
