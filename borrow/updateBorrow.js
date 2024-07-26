const { ipcRenderer } = require('electron');

async function handleUpdateBorrow(event) {
    event.preventDefault();
    const id = document.getElementById('updateBorrowerId').value;
    const borrowerName = document.getElementById('updateBorrowerName').value;
    const bookTitle = document.getElementById('updateBookTitle').value;
    const borrowDate = document.getElementById('updateBorrowDate').value;
    const borrowStatus = document.getElementById('updateBorrowStatus').value;

    try {
        const updatedRecord = {
            id,
            borrowerName,
            bookTitle,
            borrowDate,
            borrowStatus
        };
        const response = await ipcRenderer.invoke('updateBorrow', updatedRecord);
        ipcRenderer.send('updateBorrow-renderer', response);
    } catch (error) {
        console.error('Error updating borrow record:', error);
    }
}

module.exports = handleUpdateBorrow;
