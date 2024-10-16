const { ipcRenderer } = require('electron');

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


let logData = [];
let filteredLogData = [];

// Update borrower name in the UI
function updateBorrowerName(borrowerName) {
    document.getElementById('borrowerName').textContent = borrowerName;
}

// FILTERS
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const borrowerName = urlParams.get('borrowerName');

    if (borrowerName) {
        updateBorrowerName(borrowerName);
        fetchBorrowerLog(borrowerName);

        // Set up event listeners for filtering
        document.getElementById('searchTitle').addEventListener('input', debounce(applyFilters, 300));

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
    container.innerHTML = ''; // Clear previous entries

    const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const paginatedLog = filteredLogData.slice(start, end); // Use filteredLogData instead

    if (paginatedLog.length === 0) {
        container.innerHTML = '<tr><td colspan="4">No records for the selected status.</td></tr>';
        return;
    }

    paginatedLog.forEach(entry => {
        if (entry.dueDate && currentDate > entry.dueDate && entry.borrowStatus === 'borrowed') {
            entry.borrowStatus = 'overdue'; // Set the status to overdue if the current date is past the due date
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.bookTitle}</td>
            <td>${entry.borrowDate}</td>
            <td>${entry.dueDate || ''}</td>
            <td>${entry.returnDate || ''}</td>
        `;

        container.appendChild(row);
    });

    updatePaginationControls(); // Update the pagination controls based on the current page
}

// Fetch and display borrower log
async function fetchBorrowerLog(borrowerName) {
    try {
        const log = await ipcRenderer.invoke('getBorrowerLog', borrowerName);
        logData = log; // Assign the fetched log to logData
        filteredLogData = logData; // Initialize filteredLogData with the full log data
        
        // Sort log data by borrowDate in descending order
        filteredLogData.sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));
        
        currentPage = 1; // Reset to the first page
        displayLog(); // Display the log for the current page
        updatePaginationControls(); // Update pagination controls
    } catch (error) {
        console.error('Error fetching borrower log:', error);
    }
}

// Apply filters based on search input
function applyFilters() {
    const searchTitle = document.getElementById('searchTitle').value.toLowerCase();
    
    // Filter log data based on search title
    filteredLogData = logData.filter(entry => {
        const title = entry.bookTitle.toLowerCase();
        return title.includes(searchTitle);
    });

    currentPage = 1; // Reset to first page after applying filters
    displayLog();
}

// Apply status filters based on clicked status
function applyStatusFilter(status) {
    filteredLogData = logData.filter(entry => {
        if (status === 'borrowed' && entry.borrowStatus === 'borrowed') return true;
        if (status === 'returned' && entry.borrowStatus === 'returned') return true;
        if (status === 'overdue' && entry.borrowStatus === 'overdue') return true;
        if (status === 'returnedOverdue' && entry.borrowStatus === 'returnedOverdue') return true;
        return false;
    });

    currentPage = 1; // Reset to the first page after applying the status filter

    if (filteredLogData.length === 0) {
        const container = document.getElementById('borrowerLogContainer');
        container.innerHTML = '<tr><td colspan="4">No records for the selected status.</td></tr>';
    } else {
        displayLog(); // Display filtered log data
    }

    updatePaginationControls(); // Update pagination based on the filtered data
}

// Add event listeners to the status row
document.getElementById('statusRow').addEventListener('click', function(event) {
    const clickedStatus = event.target.textContent.toLowerCase();

    switch (clickedStatus) {
        case 'borrowed':
            applyStatusFilter('borrowed');
            break;
        case 'returned':
            applyStatusFilter('returned');
            break;
        case 'overdue':
            applyStatusFilter('overdue');
            break;
        case 'returned overdue':
            applyStatusFilter('returnedOverdue');
            break;
        default:
            // If none of the statuses match, do nothing
            break;
    }
});

// Update pagination controls
function updatePaginationControls() {
    // Implement pagination control updates here if necessary
}


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