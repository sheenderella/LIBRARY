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



// Add event listener to the "Generate Report" button
document.addEventListener('DOMContentLoaded', () => {
    const generateReportButton = document.getElementById('generateReport');
    if (generateReportButton) {
        generateReportButton.addEventListener('click', () => {
            const params = getQueryParams(); // Retrieve the parameters from the URL
            console.log('Sending parameters:', params); // Log the params for debugging

            // Send event to main process with parameters
            ipcRenderer.send('open-book-reports', {
                bookTitle: params.bookTitle,
                bookId: params.bookId,
                recordId: params.recordId,
            });
        });
    }
});

// BOOK DETAILS DISPLAY
// Function to get query parameters from the URL
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        bookTitle: params.get('bookTitle'),
        bookId: params.get('bookId'),
        recordId: params.get('recordId') // Retrieve the record ID
    };
}


// Function to update the HTML elements with the book details
async function displayBookDetails() {
    const { bookTitle, bookId } = getQueryParams();

    // Set the book title and ID in the HTML
    document.getElementById('bookTitle').innerText = bookTitle || 'No title available';
    document.getElementById('bookDetails').innerText = `Book ID: ${bookId || 'No ID available'}`;

    // Fetch additional details for the book using the bookId
    if (bookId) {
        try {
            const bookDetails = await ipcRenderer.invoke('fetch-book-details', bookId);
            if (bookDetails) {
                document.getElementById('bookNumber').innerText = `${bookDetails.number || 'N/A'}`;
                document.getElementById('dateReceived').innerText = ` ${bookDetails.date_received || 'N/A'}`;
                document.getElementById('author').innerText = `${bookDetails.author || 'N/A'}`;
                document.getElementById('edition').innerText = `${bookDetails.edition || 'N/A'}`;
                document.getElementById('sourceOfFund').innerText = `${bookDetails.source_of_fund || 'N/A'}`;
                document.getElementById('costPrice').innerText = ` ${bookDetails.cost_price || 'N/A'}`;
                document.getElementById('publisher').innerText = ` ${bookDetails.publisher || 'N/A'}`;
                document.getElementById('year').innerText = `${bookDetails.year || 'N/A'}`;
                document.getElementById('remarks').innerText = `${bookDetails.remarks || 'N/A'}`;
                document.getElementById('volume').innerText = `${bookDetails.volume || 'N/A'}`;
                document.getElementById('pages').innerText = `${bookDetails.pages || 'N/A'}`;
                document.getElementById('condition').innerText = `${bookDetails.condition || 'N/A'}`;
                document.getElementById('class').innerText = `${bookDetails.class || 'N/A'}`;
            } else {
                console.error('Book details not found');
            }
        } catch (error) {
            console.error('Error fetching book details:', error);
        }
    }
}

// Call the function to display book details on page load
window.onload = displayBookDetails;


//TABLE
// Function to fetch and display borrow records for a specific book
// Function to get query parameters from the URL
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        bookTitle: params.get('bookTitle'),
        bookId: params.get('bookId'),
        recordId: params.get('recordId') // Retrieve the record ID
    };
}

// Function to update the HTML elements with the book details
async function displayBookDetails() {
    const { bookTitle, bookId } = getQueryParams();

    // Set the book title and ID in the HTML
    document.getElementById('bookTitle').innerText = bookTitle || 'No title available';
    document.getElementById('bookDetails').innerText = `${bookId || ''}`;

    // Fetch additional details for the book using the bookId
    if (bookId) {
        try {
            const bookDetails = await ipcRenderer.invoke('fetch-book-details', bookId);
            if (bookDetails) {
                document.getElementById('bookNumber').innerText = `${bookDetails.number || ''}`;
                document.getElementById('dateReceived').innerText = `${bookDetails.date_received || ''}`;
                document.getElementById('author').innerText = `${bookDetails.author || ''}`;
                document.getElementById('edition').innerText = `${bookDetails.edition || ''}`;
                document.getElementById('sourceOfFund').innerText = `${bookDetails.source_of_fund || ''}`;
                document.getElementById('costPrice').innerText = `${bookDetails.cost_price || ''}`;
                document.getElementById('publisher').innerText = `${bookDetails.publisher || ''}`;
                document.getElementById('year').innerText = `${bookDetails.year || ''}`;
                document.getElementById('remarks').innerText = `${bookDetails.remarks || ''}`;
                document.getElementById('volume').innerText = `${bookDetails.volume || ''}`;
                document.getElementById('pages').innerText = `${bookDetails.pages || ''}`;
                document.getElementById('condition').innerText = `${bookDetails.condition || ''}`;
                document.getElementById('class').innerText = `${bookDetails.class || ''}`;
            } else {
                console.error('Book details not found');
            }
        } catch (error) {
            console.error('Error fetching book details:', error);
        }
    }
}

// Call the function to display book details on page load
window.onload = displayBookDetails;

let logData = [];
let filteredLogData = [];
let currentPage = 1;
const recordsPerPage = 7; 

document.addEventListener('DOMContentLoaded', () => {
    initializeBorrowerDetails();
    initializeSearchEvent();
    initializePaginationControls();
});

function initializeBorrowerDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId');

    if (bookId) {
        fetchBorrowerLog(bookId).then(() => applyStatusFilter('borrowed')).catch(error => console.error('Error fetching borrower log:', error));
    } else {
        document.getElementById('borrowerContactDetails').textContent = 'No book details found.';
    }
}

async function fetchBorrowerLog(bookId) {
    try {
        logData = await ipcRenderer.invoke('getBookBorrowRecords', bookId);
        filteredLogData = logData;
        displayLog();
    } catch (error) {
        console.error('Error fetching borrower log:', error);
    }
}

function initializeSearchEvent() {
    document.getElementById('searchTitle').addEventListener('input', () => {
        const activeStatus = document.querySelector('#statusRow .active')?.dataset.status || 'borrowed';
        applyStatusFilter(activeStatus);
    });
}

function applyStatusFilter(status) {
    highlightActiveStatus(status);
    const searchTerm = document.getElementById('searchTitle').value.toLowerCase();

    // Filter by status and borrower name
    filteredLogData = logData.filter(entry => 
        entry.borrowStatus === status && 
        entry.borrower_name.toLowerCase().includes(searchTerm)
    );

    // Adjust page number based on filtered results
    if (filteredLogData.length === 0) {
        currentPage = 0;
        updatePageNumber(0);
    } else {
        currentPage = 1;
        updatePageNumber(1);
    }

    displayLog();
    updatePaginationControls();
}

function highlightActiveStatus(status) {
    document.querySelectorAll('#statusRow th').forEach(el => el.classList.remove('active'));
    document.querySelector(`#statusRow th[data-status="${status}"]`).classList.add('active');
}

function displayLog() {
    const container = document.getElementById('borrowerLogContainer');
    container.innerHTML = '';

    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const paginatedLog = filteredLogData.slice(start, end);

    if (paginatedLog.length === 0) {
        container.innerHTML = '<tr><td colspan="4">No records found.</td></tr>';
        return;
    }

    paginatedLog.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.borrower_name}</td>
            <td>${entry.borrowDate}</td>
            <td>${entry.dueDate || ''}</td>
            <td>${entry.returnDate || ''}</td>
        `;
        container.appendChild(row);
    });

    updatePaginationControls();
}

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
    
    if (currentPage === 0 || totalPages === 0) {
        document.getElementById('firstPage').disabled = true;
        document.getElementById('prevPage').disabled = true;
        document.getElementById('nextPage').disabled = true;
        document.getElementById('lastPage').disabled = true;
        document.getElementById('totalPages').textContent = `of 0`;
    } else {
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
