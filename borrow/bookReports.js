const { ipcRenderer } = require('electron');

// Function to get query parameters from the URL
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        bookTitle: params.get('bookTitle') || 'Unknown Title',
        bookId: params.get('bookId') || 'Unknown ID',
        recordId: params.get('recordId') || 'N/A',
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const params = getQueryParams();
    const bookId = params.bookId;

    // Log the query parameters to debug
    console.log('Query Parameters:', params);

    if (bookId === 'Unknown ID') {
        console.error('Book ID is missing or invalid!');
    } else {
        // Send book details to the main process
        ipcRenderer.send('send-book-details', params);

        // Request borrow records if bookId is valid
        ipcRenderer.invoke('getBookBorrowRecords', bookId).then(records => {
            console.log('Fetched Borrow Records:', records);

            // Combine parameters and records
            const dataToSend = {
                bookDetails: params,
                borrowRecords: records,
            };

            // Send combined data to the main process
            ipcRenderer.send('send-combined-data', dataToSend);

            // Add event listener for export button
            const exportButton = document.getElementById('export-report-btn');
            exportButton.addEventListener('click', () => {
                const timePeriod = document.getElementById('time-period').value;
                const startDate = document.getElementById('start-date').value;
                const endDate = document.getElementById('end-date').value;

                const filteredRecords = filterRecords(records, timePeriod, startDate, endDate);

                if (filteredRecords.length === 0) {
                    ipcRenderer.invoke('showDialog', 'error', 'No records match the selected time period or date range.');
                    return;
                }

                ipcRenderer.invoke('exportBorrowRecords', filteredRecords).then(response => {
                    if (response.success) {
                        ipcRenderer.invoke('showDialog', 'info', `Report exported successfully to: ${response.filePath}`);
                    } else {
                        ipcRenderer.invoke('showDialog', 'error', response.message || 'Export failed.');
                    }

                    // Close the window after export is done
                    window.close();
                }).catch(error => {
                    console.error('Error exporting borrow records:', error);
                    ipcRenderer.invoke('showDialog', 'error', 'An unexpected error occurred while exporting records.');

                    // Close the window after error
                    window.close();
                });

                // Reset the form or inputs after exporting
                document.getElementById('time-period').value = '';  // Reset time period
                document.getElementById('start-date').value = '';   // Reset start date
                document.getElementById('end-date').value = '';     // Reset end date
            });
        }).catch(error => {
            console.error('Error fetching borrow records:', error);
        });
    }
});




// Function to filter records based on time period and custom date range
function filterRecords(records, timePeriod, startDate, endDate) {
    const now = new Date();

    switch (timePeriod) {
        case 'weekly':
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return records.filter(record => new Date(record.borrowDate) >= oneWeekAgo);

        case 'monthly':
            return records.filter(record => {
                const borrowDate = new Date(record.borrowDate);
                return borrowDate.getMonth() === now.getMonth() && borrowDate.getFullYear() === now.getFullYear();
            });

        case 'custom':
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                return records.filter(record => {
                    const borrowDate = new Date(record.borrowDate);
                    return borrowDate >= start && borrowDate <= end;
                });
            }
            ipcRenderer.invoke('showDialog', 'error', 'Invalid custom date range. Please ensure both start and end dates are selected.');
            return [];

        default:
            return records; // Default to all records
    }
}
