const { ipcRenderer } = require('electron');

async function handleAddBorrow(event) {
    event.preventDefault();

    const borrowerName = document.getElementById('addBorrowerName').value;
    const bookTitle = document.getElementById('addBookTitle').value;
    const borrowDate = document.getElementById('addBorrowDate').value;
    const borrowStatus = document.getElementById('addBorrowStatus').value;

    try {
        const newRecord = {
            borrowerName,
            bookTitle,
            borrowDate,
            borrowStatus
        };
        await ipcRenderer.invoke('addBorrow', newRecord);
        ipcRenderer.send('borrow-added-success'); // Send success message
        window.close(); // Close the add borrow window
        
    } catch (error) {
        console.error('Error adding borrow record:', error);
        ipcRenderer.send('borrow-added-failure'); // Send failure message
    }
}

document.getElementById('addBorrowForm').addEventListener('submit', handleAddBorrow);
