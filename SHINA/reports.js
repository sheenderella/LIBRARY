// reports.js

const { ipcRenderer } = require('electron');

// Get references to the DOM elements
const listBooksBtn = document.getElementById('list-books-btn');
const generateReportBtn = document.getElementById('generate-report-btn');
const timePeriodSelect = document.getElementById('time-period');
const categorySelect = document.getElementById('category');

// Handle "List of Books" button click
listBooksBtn.addEventListener('click', () => {
    ipcRenderer.invoke('getBookTitles')
        .then((bookTitles) => {
            if (bookTitles.length > 0) {
                alert('Books:\n' + bookTitles.join('\n'));
            } else {
                alert('No books found.');
            }
        })
        .catch((error) => {
            console.error('Error fetching book titles:', error);
            alert('Failed to fetch book titles.');
        });
});

// Handle "Generate Report" button click
generateReportBtn.addEventListener('click', () => {
    const timePeriod = timePeriodSelect.value;
    const category = categorySelect.value;

    ipcRenderer.invoke('generateReport', { timePeriod, category })
        .then((reportData) => {
            displayReport(reportData);
        })
        .catch((error) => {
            console.error('Error generating report:', error);
            alert('Failed to generate report.');
        });
});

// Function to display the report data in a modal or new window (you can customize this part)
function displayReport(reportData) {
    let reportContent = '';

    if (Array.isArray(reportData) && reportData.length > 0) {
        reportContent = reportData.map(record => JSON.stringify(record)).join('\n');
    } else {
        reportContent = 'No data available for the selected criteria.';
    }

    // Show the report in an alert (you can improve this by displaying it in a modal or new section in the page)
    alert('Report Data:\n' + reportContent);
}

// Listen for success/failure events for reports
ipcRenderer.on('report-generated-success', (event, message) => {
    console.log(message); // Log success message
});

ipcRenderer.on('report-generated-failure', (event, message) => {
    console.error(message); // Log failure message
    alert(message); // Optionally, notify the user
});
