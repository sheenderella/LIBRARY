const { ipcRenderer } = require('electron');

// Function to populate the form with existing borrow data
function populateBorrowForm(record) {
    console.log('Populating form with record:', record);  // Log the received record for debugging

    if (record) {
        document.getElementById('updateBorrowerId').value = record.id || '';
        document.getElementById('updateBorrowerName').value = record.borrowerName || '';
        document.getElementById('updateBookTitle').value = record.bookTitle || '';
    } else {
        console.error('No record received!');
    }
}

// Event listener for receiving data from the main process
ipcRenderer.on('fill-update-form', (event, record) => {
    populateBorrowForm(record);  // Call the function to populate the form
});

// Handle form submission
document.getElementById('updateBorrowForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent the default form submission

    // Gather the form data
    const updatedRecord = {
        id: document.getElementById('updateBorrowerId').value,
        borrowerName: document.getElementById('updateBorrowerName').value,
        bookTitle: document.getElementById('updateBookTitle').value,
        borrowStatus: 'borrowed' // Automatically set the status to "borrowed"
    };

    // Send the updated record to the main process to update the database
    ipcRenderer.invoke('updateBorrowRecord', updatedRecord)
        .then(() => {
            console.log('Record updated successfully!');
            // Optionally close the update window or show a success notification
            ipcRenderer.send('close-form-window');
        })
        .catch((error) => {
            console.error('Error updating record:', error);
            // Optionally show an error notification
        });
});
