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

const filterBorrowRecords = (allRecords, searchInput, statusFilter, startDateFilter, endDateFilter) => {
    // Default to empty strings if elements are not available
    const searchText = searchInput ? searchInput.value.toLowerCase() : '';
    const statusValue = statusFilter ? statusFilter.value : '';
    const startDate = startDateFilter ? startDateFilter.value : '';
    const endDate = endDateFilter ? endDateFilter.value : '';

    const filteredRecords = allRecords.filter(record => {
        const borrowerName = record.borrowerName ? record.borrowerName.toLowerCase() : '';
        const bookTitle = record.bookTitle ? record.bookTitle.toLowerCase() : '';
        const borrowDate = record.borrowDate || '';
        const borrowStatus = record.borrowStatus || '';

        const isDateInRange = (!startDate || borrowDate >= startDate) && (!endDate || borrowDate <= endDate);

        return (
            (borrowerName.includes(searchText) || bookTitle.includes(searchText)) &&
            (statusValue === '' || borrowStatus === statusValue) &&
            isDateInRange
        );
    });

    return filteredRecords;
};

module.exports = {
    debounce,
    filterBorrowRecords
};
