const { ipcRenderer } = require('electron');

// Event listener for the 'List of Books' button
document.getElementById('list-books-btn').addEventListener('click', async () => {
    try {
        // Trigger the Excel export via ipcRenderer
        const result = await ipcRenderer.invoke('exportBooksToExcel');
        
        // Notify the user of the result
        alert(result.message);
    } catch (error) {
        console.error('Error generating book list:', error);
        alert('An error occurred while generating the book list.');
    }
});


//BOOKS AVAILABILITY
// Event listener for the 'Books Availability' button
document.getElementById('books-availability-btn').addEventListener('click', async () => {
    try {
        // Trigger the Excel export for books availability
        const result = await ipcRenderer.invoke('checkBooksAvailability');
        
        // Notify the user of the result
        alert(result.message);
    } catch (error) {
        console.error('Error generating books availability:', error);
        alert('An error occurred while generating the books availability report.');
    }
});

//


document.addEventListener('DOMContentLoaded', () => {
    const reportFilterForm = document.getElementById('reportFilterForm');

    reportFilterForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const timePeriod = document.getElementById('time-period').value;
        const category = document.getElementById('category').value;

        ipcRenderer.invoke('generateReport', timePeriod, category)
            .then(response => {
                alert(response.message);
            })
            .catch(error => {
                console.error('Error generating report:', error);
            });
    });
});