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
let currentPage = 1;
const recordsPerPage = 1; // Display 7 records per page

document.addEventListener('DOMContentLoaded', () => {
    initializeBorrowerDetails();
    initializeSearchEvent();
    initializePaginationControls();
});

function initializeBorrowerDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const borrowerName = urlParams.get('borrowerName');
    const borrowerId = urlParams.get('borrowerId');
    const phoneNumber = urlParams.get('phoneNumber');
    const email = urlParams.get('email');

    if (borrowerName && borrowerId && phoneNumber && email) {
        document.getElementById('borrowerName').textContent = borrowerName;
        document.getElementById('borrowerContactDetails').innerHTML = `ID: ${borrowerId}<br>Email: ${email}<br>Phone: ${phoneNumber}`;
        fetchBorrowerLog(borrowerId).then(() => applyStatusFilter('borrowed')).catch(error => console.error('Error fetching borrower log:', error));
    } else {
        document.getElementById('borrowerContactDetails').textContent = 'No borrower details found.';
    }
}

async function fetchBorrowerLog(borrowerId) {
    try {
        logData = await ipcRenderer.invoke('getBorrowerLog', borrowerId);
        filteredLogData = logData;
        displayLog();
    } catch (error) {
        console.error('Error fetching borrower log:', error);
    }
}

function initializeSearchEvent() {
    document.getElementById('searchTitle').addEventListener('input', () => {
        const activeStatus = document.querySelector('#statusRow .active').dataset.status;
        applyStatusFilter(activeStatus);
    });
}
function applyStatusFilter(status) {
    highlightActiveStatus(status);
    const searchTerm = document.getElementById('searchTitle').value.toLowerCase();

    // Filter by status and search term
    filteredLogData = logData.filter(entry => entry.borrowStatus === status && entry.book_title.toLowerCase().includes(searchTerm));

    // If no records are found, set page to 0; otherwise, reset to 1
    if (filteredLogData.length === 0) {
        currentPage = 0;
        updatePageNumber(0);
    } else {
        currentPage = 1;
        updatePageNumber(1);
    }

    // Display the filtered log and update pagination
    displayLog();
    updatePaginationControls();
}


function highlightActiveStatus(status) {
    document.querySelectorAll('#statusRow th').forEach(el => el.classList.remove('active'));
    document.querySelector(`#statusRow th[data-status="${status}"]`).classList.add('active');
}

function displayLog() {
    const container = document.getElementById('borrowerLogContainer');
    container.innerHTML = ''; // Clear previous entries

    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const paginatedLog = filteredLogData.slice(start, end);

    if (paginatedLog.length === 0) {
        container.innerHTML = '<tr><td colspan="4">No records for the selected status and search.</td></tr>';
        return;
    }

    paginatedLog.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.book_title || 'Unknown Title'}</td>
            <td>${entry.borrowDate}</td>
            <td>${entry.dueDate || ''}</td>
            <td>${entry.returnDate || ''}</td>
        `;
        container.appendChild(row);
    });

    updatePaginationControls();
}

// Pagination Controls and Events
function initializePaginationControls() {
    document.getElementById('firstPage').addEventListener('click', () => goToPage(1));
    document.getElementById('prevPage').addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('nextPage').addEventListener('click', () => goToPage(currentPage + 1));
    document.getElementById('lastPage').addEventListener('click', () => goToPage(Math.ceil(filteredLogData.length / recordsPerPage)));

    const pageInput = document.getElementById('pageLocation');
    pageInput.addEventListener('input', adjustInputWidth);
    pageInput.addEventListener('change', validatePageInput);
    adjustInputWidth();
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredLogData.length / recordsPerPage);
    if (isNaN(page) || page < 1 || page > totalPages) {
        showNotification(`Invalid page number! Please enter a number between 1 and ${totalPages}.`, 'error');
        updatePageNumber(currentPage);
        return;
    }
    currentPage = page;
    updatePageNumber(currentPage);
    displayLog();
}

function updatePageNumber(newPageNumber) {
    const pageInput = document.getElementById('pageLocation');
    pageInput.value = newPageNumber;
    adjustInputWidth();
}

function adjustInputWidth() {
    const pageInput = document.getElementById('pageLocation');
    const width = Math.max(40, pageInput.value.length * 12);
    pageInput.style.width = `${width}px`;
}

function validatePageInput() {
    const pageInput = document.getElementById('pageLocation');
    const pageNumber = parseInt(pageInput.value, 10);
    if (!isNaN(pageNumber)) goToPage(pageNumber);
    else pageInput.value = currentPage;
}
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredLogData.length / recordsPerPage);
    
    // If there are no records, set currentPage to 0 and disable all buttons
    if (currentPage === 0 || totalPages === 0) {
        document.getElementById('firstPage').disabled = true;
        document.getElementById('prevPage').disabled = true;
        document.getElementById('nextPage').disabled = true;
        document.getElementById('lastPage').disabled = true;
        document.getElementById('totalPages').textContent = `of 0`;
    } else {
        // Enable or disable buttons based on the current page and total pages
        document.getElementById('firstPage').disabled = (currentPage === 1);
        document.getElementById('prevPage').disabled = (currentPage === 1);
        document.getElementById('nextPage').disabled = (currentPage === totalPages);
        document.getElementById('lastPage').disabled = (currentPage === totalPages);
        document.getElementById('totalPages').textContent = `of ${totalPages}`;
    }
}

// Event listener for status row
document.getElementById('statusRow').addEventListener('click', (event) => {
    const clickedStatus = event.target.getAttribute('data-status');
    if (clickedStatus) applyStatusFilter(clickedStatus);
});

// Notification function
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}
