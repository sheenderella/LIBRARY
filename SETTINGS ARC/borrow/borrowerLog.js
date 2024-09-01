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

//LOGOUT
document.getElementById('logout-link').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent default link behavior

    ipcRenderer.invoke('logout').then(() => {
        window.location.href = './login/login.html'; // Redirect to login page after logout
    }).catch(error => {
        console.error('Error during logout:', error);
        alert('An error occurred. Please try again.');
    });
});



document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const borrowerName = urlParams.get('borrowerName');

    if (borrowerName) {
        updateBorrowerName(borrowerName);
        fetchBorrowerLog(borrowerName);

        document.getElementById('searchTitle').addEventListener('input', debounce(applyFilters, 300));
        document.getElementById('filterStatus').addEventListener('change', applyFilters);

        const dateFilterDropdown = document.querySelector('.dropdown');
        const applyDateFilterBtn = document.getElementById('applyDateFilter');
        const clearDateFilterBtn = document.getElementById('clearDateFilter');

        // Date Filter Dropdown Toggle
        dateFilterDropdown.addEventListener('click', (event) => {
            dateFilterDropdown.classList.toggle('show');
            event.stopPropagation();
        });

        // Prevent closing dropdown when interacting with date inputs or buttons inside the dropdown
        const dropdownContent = document.querySelector('.dropdown-content');
        dropdownContent.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        // Apply Date Filter
        applyDateFilterBtn.addEventListener('click', () => {
            applyFilters();
            dateFilterDropdown.classList.remove('show');
        });

        // Clear Date Filter
        clearDateFilterBtn.addEventListener('click', () => {
            clearDateFilters();
            dateFilterDropdown.classList.remove('show');
        });

        // Close the dropdown if the user clicks outside of it
        document.addEventListener('click', () => {
            dateFilterDropdown.classList.remove('show');
        });

        // Pagination Controls
        document.getElementById('prevPage').addEventListener('click', prevPage);
        document.getElementById('nextPage').addEventListener('click', nextPage);
    } else {
        console.error('No borrower name specified in the URL.');
    }
});

async function fetchBorrowerLog(borrowerName) {
    try {
        const log = await ipcRenderer.invoke('getBorrowerLog', borrowerName);
        logData = log;
        filteredLogData = log; // Set the filtered data to full data initially
        displayLog();
    } catch (error) {
        console.error('Error fetching borrower log:', error);
    }
}

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
            <td>${entry.borrowStatus}</td>
        `;
        container.appendChild(row);
    });

    updatePaginationControls();
}

function updateBorrowerName(borrowerName) {
    document.getElementById('borrowerName').textContent = `Log for ${borrowerName}`;
}

function applyFilters() {
    const searchTitle = document.getElementById('searchTitle').value.toLowerCase();
    const filterStatus = document.getElementById('filterStatus').value;
    const startDate = document.getElementById('startDateFilter').value;
    const endDate = document.getElementById('endDateFilter').value;

    filteredLogData = logData.filter(entry => {
        const title = entry.bookTitle.toLowerCase();
        const status = entry.borrowStatus;
        const borrowDate = entry.borrowDate;

        const isTitleMatch = title.includes(searchTitle);
        const isStatusMatch = !filterStatus || filterStatus === "all" || status === filterStatus;
        const isDateMatch = (!startDate || new Date(borrowDate) >= new Date(startDate)) &&
                            (!endDate || new Date(borrowDate) <= new Date(endDate));

        return isTitleMatch && isStatusMatch && isDateMatch;
    });

    currentPage = 1; // Reset to first page after applying filters
    displayLog();
}

function clearDateFilters() {
    document.getElementById('startDateFilter').value = '';
    document.getElementById('endDateFilter').value = '';
    applyFilters();
}

function updatePaginationControls() {
    const totalPages = Math.ceil(filteredLogData.length / rowsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;

    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayLog();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredLogData.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayLog();
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
