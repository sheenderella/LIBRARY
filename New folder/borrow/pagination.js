/**
 * Manages pagination for rendering borrow records, including functions for rendering records,
 * changing pages, and updating pagination info and button states.
 */


// Pagination variables
let currentPage = 1;
const recordsPerPage = 10;

// Render borrow records with pagination
function renderBorrowRecords(records, renderFunction) {
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const paginatedRecords = records.slice(start, end);

    renderFunction(paginatedRecords);

    // Update pagination info
    document.getElementById('pageInfo').textContent = `Page ${currentPage}`;

    // Update button states
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = end >= records.length;
}

// Change the current page
function changePage(direction, renderFunction) {
    currentPage += direction;
    renderBorrowRecords(allRecords, renderFunction);
}

// Setters for pagination variables
function setCurrentPage(page) {
    currentPage = page;
}

// Getters for pagination variables
function getCurrentPage() {
    return currentPage;
}

function getRecordsPerPage() {
    return recordsPerPage;
}

module.exports = {
    renderBorrowRecords,
    changePage,
    setCurrentPage,
    getCurrentPage,
    getRecordsPerPage
};
