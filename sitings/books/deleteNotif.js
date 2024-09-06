// deleteNotif.js
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const confirmButton = document.querySelector('.confirm');
    const cancelButton = document.querySelector('.cancel');

    // Get the book ID from the main process (if needed)
    let bookIdToDelete;

    ipcRenderer.on('set-book-id', (event, id) => {
        bookIdToDelete = id;
    });

    confirmButton.addEventListener('click', () => {
        // Check if bookIdToDelete is an array or a single ID
        if (Array.isArray(bookIdToDelete)) {
            // For multiple deletions, use Promise.all to ensure all deletions are done before closing the window
            Promise.all(bookIdToDelete.map(id => ipcRenderer.invoke('deleteBook', id)))
                .then(() => {
                    window.close(); // Close the notification window after all deletions
                })
                .catch(err => {
                    console.error('Error deleting books:', err); // Handle errors if needed
                });
        } else {
            // Single book deletion
            ipcRenderer.invoke('deleteBook', bookIdToDelete).then(() => {
                window.close(); // Close the notification window after deletion
            });
        }
    });    

    cancelButton.addEventListener('click', () => {
        window.close(); // Close the notification window without deleting
    });
});
