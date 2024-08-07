/**
 * Provides utility functions for debouncing function calls and filtering borrow records
 * based on search input, status, and date filters, with pagination support.
 */


let debounceTimer;

const debounce = (func, delay) => {
    return (...args) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
};

const filterBorrowRecords = (allRecords, searchInput, statusFilter, dateFilter, pagination, renderBorrowRecords) => {
    const searchText = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;
    const dateValue = dateFilter.value;

    const filteredRecords = allRecords.filter(record => {
        const borrowerName = record.borrowerName ? record.borrowerName.toLowerCase() : '';
        const bookTitle = record.bookTitle ? record.bookTitle.toLowerCase() : '';
        const borrowDate = record.borrowDate || '';
        const borrowStatus = record.borrowStatus || '';

        return (
            (borrowerName.includes(searchText) || bookTitle.includes(searchText)) &&
            (statusValue === '' || borrowStatus === statusValue) &&
            (dateValue === '' || borrowDate === dateValue)
        );
    });

    pagination.setCurrentPage(1);
    pagination.renderBorrowRecords(filteredRecords, renderBorrowRecords);
};

module.exports = {
    debounce,
    filterBorrowRecords
};
