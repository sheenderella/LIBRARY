/**
 * Handles the form submission for updating an existing borrow record. 
 * Collects form data, sends it to the main process via IPC, and closes 
 * the update window upon success.
 */


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
            id: parseInt(id),
            borrowerName,
            bookTitle,
            borrowDate,
            borrowStatus
        };
        await ipcRenderer.invoke('updateBorrow', updatedRecord);
        ipcRenderer.send('close-form-window'); // Close the update window after successful update
    } catch (error) {
        console.error('Error updating borrow record:', error);
    }
}

module.exports = handleUpdateBorrow;
