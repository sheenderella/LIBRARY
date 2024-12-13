const { ipcRenderer } = require('electron');
document.addEventListener('DOMContentLoaded', () => {
    ipcRenderer.on('set-book-id', (event, { bookId, borrowId }) => {
        console.log(`Received bookId in condition window: ${bookId}, borrowId: ${borrowId}`);
        
        const bookConditionInput = document.getElementById('bookCondition');
        const conditionForm = document.getElementById('conditionForm');

        conditionForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const bookCondition = bookConditionInput.value;

            // Send the bookId and condition to main process
            ipcRenderer.send('submit-book-condition', { bookId, bookCondition });
        });
    });

});
