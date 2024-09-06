const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const confirmButton = document.querySelector('.confirm');
    const cancelButton = document.querySelector('.cancel');
    const itemCountElement = document.getElementById('item-count');

    // Variable to hold the book IDs
    let bookIdsToDelete = [];

    ipcRenderer.on('set-book-id', (event, ids) => {
        bookIdsToDelete = ids || [];
            itemCountElement.textContent = `Are you sure you want to delete the ${bookIdsToDelete.length} selected book record(s)?`;
        if (bookIdsToDelete.length == undefined) {
            itemCountElement.textContent = `Are you sure you want to delete this book record?`;
        }
        if (bookIdsToDelete.length == 1) {
            itemCountElement.textContent = `Are you sure you want to delete the selected book record?`;
        }
    });

    confirmButton.addEventListener('click', () => {
        if (bookIdsToDelete) {
            // If bookIdsToDelete is an array, handle it accordingly
            if (Array.isArray(bookIdsToDelete)) {
                if (bookIdsToDelete.length > 0) {
                    Promise.all(bookIdsToDelete.map(id => ipcRenderer.invoke('deleteBook', id)))
                        .then(() => {
                            window.close(); // Close the notification window after all deletions
                        })
                        .catch(err => {
                            console.error('Error deleting books:', err); // Handle errors if needed
                        });
                }
            } else {
                // If it's a single value, handle it directly
                ipcRenderer.invoke('deleteBook', bookIdsToDelete)
                    .then(() => {
                        window.close(); // Close the notification window after deletion
                    })
                    .catch(err => {
                        console.error('Error deleting book:', err); // Handle errors if needed
                    });
            }
        }
    });
    

    cancelButton.addEventListener('click', () => {
        window.close(); // Close the notification window without deleting
    });
});
