const { ipcRenderer } = require('electron');

// Handle form submission for adding a borrow record
async function handleAddBorrow(event) {
    event.preventDefault();
    const borrowerName = document.getElementById('addBorrowerName').value;
    const bookTitle = document.getElementById('addBookTitle').value;
    const borrowDate = document.getElementById('addBorrowDate').value;
    const borrowStatus = document.getElementById('addBorrowStatus').value;

    try {
        const newRecord = await ipcRenderer.invoke('addBorrow', {
            borrowerName,
            bookTitle,
            borrowDate,
            borrowStatus
        });

        return newRecord;
    } catch (error) {
        console.error('Error adding borrow record:', error);
        throw error;
    }
}

module.exports = handleAddBorrow;
