let currentPage = 1;
const recordsPerPage = 3;  // Display 3 records per page
let filteredRecords = [];  // Store filtered records globally for pagination

// Pagination setup function
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

        if (isNaN(enteredPage) || enteredPage < 1 || enteredPage > totalPages) {
            showNotification('Invalid page number!', 'error');
            document.getElementById('pageLocation').value = currentPage; // Reset to current page
        } else {
            goToPage(enteredPage, totalPages);
        }
    });
}

// Change page and reload records
function goToPage(page, totalPages = Math.ceil(filteredRecords.length / recordsPerPage)) {
    if (page < 1) {
        currentPage = 1;  // Stay on first page
    } else if (page > totalPages) {
        currentPage = totalPages;  // Stay on last page
    } else {
        currentPage = page;  // Set to desired page
    }

    // Update pagination display
    updatePageNumber(currentPage);
    document.getElementById('totalPages').textContent = `of ${totalPages}`;

    // Reload the records for the new page
    loadBorrowRecords();
}

// Update pagination control button states
function updatePaginationControls(totalPages) {
    document.getElementById('firstPage').disabled = (currentPage === 1);
    document.getElementById('prevPage').disabled = (currentPage === 1);
    document.getElementById('nextPage').disabled = (currentPage === totalPages || totalPages === 0);
    document.getElementById('lastPage').disabled = (currentPage === totalPages || totalPages === 0);
}

//PAGINATION PAGE NO.
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
