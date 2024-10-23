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

// Update borrower details (name, ID, phone number, and email) in the UI
function updateBorrowerDetails(borrowerName, borrowerId, phoneNumber, email) {
    document.getElementById('borrowerName').textContent = borrowerName;
    document.getElementById('borrowerId').textContent = borrowerId;
    document.getElementById('borrowerPhone').textContent = phoneNumber;
    document.getElementById('borrowerEmail').textContent = email;
}
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const borrowerName = urlParams.get('borrowerName');
    const borrowerId = urlParams.get('borrowerId');
    const phoneNumber = urlParams.get('phoneNumber');
    const email = urlParams.get('email');

    console.log('Borrower Name:', borrowerName);  // Debug log
    console.log('Borrower ID:', borrowerId);      // Debug log
    console.log('Phone Number:', phoneNumber);    // Debug log
    console.log('Email:', email);                 // Debug log

    if (borrowerName && borrowerId && phoneNumber && email) {
        document.getElementById('borrowerName').textContent = borrowerName;
        const contactDetails = `ID: ${borrowerId}<br>Email: ${email}<br>Phone number: ${phoneNumber}`;
        document.getElementById('borrowerContactDetails').innerHTML = contactDetails;

        fetchBorrowerLog(borrowerId);  // Fetch logs by borrower ID
    } else {
        document.getElementById('borrowerContactDetails').textContent = `No borrower details found.`;
        console.error('Missing borrower details in the URL.');
    }
});


async function fetchBorrowerLog(borrowerId) {
    try {
        const log = await ipcRenderer.invoke('getBorrowerLog', borrowerId);
        console.log('Fetched log data:', log);

        logData = log;  // Storing fetched log data
        filteredLogData = logData;  // Initialize filtered data

        filteredLogData = logData.filter(entry => {
            const title = entry.book_title.toLowerCase();
            return title.includes(searchTitle);
        });

        currentPage = 1; // Reset to first page
        displayLog();
        updatePaginationControls();
    } catch (error) {
        console.error('Error fetching borrower log:', error);
    }
}



// Debounce function to limit the rate at which a function can fire
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

document.addEventListener('DOMContentLoaded', function() {
    // Apply 'borrowed' status filter by default when the page loads
    applyStatusFilter('borrowed');
});
function displayLog() {
    const container = document.getElementById('borrowerLogContainer');
    container.innerHTML = ''; // Clear previous entries

    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const paginatedLog = filteredLogData.slice(start, end); // Use filteredLogData instead

    if (paginatedLog.length === 0) {
        container.innerHTML = '<tr><td colspan="4">No records for the selected status.</td></tr>';
        return;
    }

    // Loop through each entry in the filtered log data
    paginatedLog.forEach(entry => {
        const bookTitle = entry.book_title || 'Unknown Title'; // Fallback for missing titles
        
        // Construct row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${bookTitle}</td>
            <td>${entry.borrowDate}</td>
            <td>${entry.dueDate || ''}</td>
            <td>${entry.returnDate || ''}</td>
        `;

        container.appendChild(row);
    });

    updatePaginationControls(); // Update pagination controls
}

function applyStatusFilter(status) {
    filteredLogData = logData.filter(entry => {
        return entry.borrowStatus === status;
    });

    currentPage = 1; // Reset to the first page after applying filter
    displayLog();
    updatePaginationControls();
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
            applyStatusFilter('returned overdue');
            break;
        default:
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

// Get the input element
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