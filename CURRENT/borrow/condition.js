const { ipcRenderer } = require('electron');

let bookId; // Variable to store the received book ID

// Receive the bookId when the window opens
ipcRenderer.on('set-book-id', (event, receivedId) => {
    bookId = receivedId;
    console.log(`Received book ID: ${bookId}`); // Log received book ID
});

// Ensure bookId is set before allowing form submission
document.getElementById('conditionForm').addEventListener('submit', (event) => {
    event.preventDefault();
    
    if (!bookId) {
        console.error('Error: Book ID not set');
        alert('Unable to submit without a valid book ID.');
        return;
    }
    
    const conditionInput = document.getElementById('bookCondition').value.trim();

    if (conditionInput !== "") {
        ipcRenderer.send('save-book-condition', { bookId, conditionInput });
        ipcRenderer.send('condition-satisfied');
    } else {
        alert('Please enter the book condition.');
    }
});

ipcRenderer.on('condition-save-success', () => {
    console.log('Condition successfully saved.');
    window.close();
});