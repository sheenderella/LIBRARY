const { ipcRenderer } = require('electron');

// Helper function to format the date as yyyy-MM-dd
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];  // Convert to "yyyy-MM-dd"
}

// Function to populate the form with existing borrow data
function populateBorrowForm(record) {
    console.log('Populating form with record:', record);  // Log the received record for debugging

    if (record) {
        document.getElementById('updateBorrowerId').value = record.id || '';
        document.getElementById('updateBorrowerName').value = record.borrowerName || '';
        document.getElementById('updateBookTitle').value = record.bookTitle || '';
        document.getElementById('updateBorrowDate').value = formatDate(record.borrowDate);  // Ensure date is formatted correctly
        document.getElementById('updateBorrowStatus').value = record.borrowStatus || 'borrowed';
    } else {
        console.error('No record received!');
    }
}

// Event listener for receiving data from the main process
ipcRenderer.on('fill-update-form', (event, record) => {
    populateBorrowForm(record);  // Call the new function to populate the form
});

// Handle form submission
document.getElementById('updateBorrowForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent the default form submission

    // Gather the form data
    const updatedRecord = {
        id: document.getElementById('updateBorrowerId').value,
        borrowerName: document.getElementById('updateBorrowerName').value,
        bookTitle: document.getElementById('updateBookTitle').value,
        borrowDate: document.getElementById('updateBorrowDate').value,
        borrowStatus: document.getElementById('updateBorrowStatus').value
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
