const { ipcRenderer } = require('electron');

// Function to get query parameters from the URL
function getQueryParams() {
    console.log("Current URL:", window.location.href); // Log the full URL
    const params = new URLSearchParams(window.location.search);
    return {
        borrowerName: params.get('borrowerName') || '',
        borrowerId: params.get('borrowerId') || '',
        phoneNumber: params.get('phoneNumber') || '',
        email: params.get('email') || '',
    };
}

const queryParams = getQueryParams();
console.log("Query Parameters:", queryParams);


// Send the borrower details to the main process when ready
const borrowerDetails = getQueryParams();

// Sending borrowerDetails to the main process
ipcRenderer.send('send-borrower-details', borrowerDetails);


document.addEventListener('DOMContentLoaded', () => {
    const params = getQueryParams();
    const borrowerId = params.borrowerId;

    if (borrowerId) {
        // Request borrowing records
        ipcRenderer.invoke('getBorrowerLog', borrowerId).then(records => {
            console.log('Fetched Borrowing Records:', records);

            // Log each record in the console
            records.forEach(record => {
                console.log(`Record ID: ${record.record_id}, Book Title: ${record.book_title}, Borrow Date: ${record.borrow_date}, Due Date: ${record.due_date || 'N/A'}, Return Date: ${record.return_date || 'N/A'}, Status: ${record.status}`);
            });

            // Add event listener for export button, if it exists
            const exportButton = document.getElementById('export-report-btn');
            if (exportButton) {
                exportButton.addEventListener('click', () => {
                    const timePeriod = document.getElementById('time-period').value;
                    const startDate = document.getElementById('start-date').value;
                    const endDate = document.getElementById('end-date').value;

                    const filteredRecords = filterRecords(records, timePeriod, startDate, endDate);

                    if (filteredRecords.length === 0) {
                        ipcRenderer.invoke('showDialog', 'error', 'No records match the selected time period or date range.');
                        return;
                    }

                    ipcRenderer.invoke('exportBorrowingRecords', filteredRecords).then(response => {
                        if (response.success) {
                            ipcRenderer.invoke('showDialog', 'info', `Report exported successfully to: ${response.filePath}`);
                        } else {
                            ipcRenderer.invoke('showDialog', 'error', response.message || 'Export failed.');
                        }

                        // Close the window after export is done
                        window.close();
                    }).catch(error => {
                        console.error('Error exporting borrower records:', error);
                        ipcRenderer.invoke('showDialog', 'error', 'An unexpected error occurred while exporting records.');

                        // Close the window after error
                        window.close();
                    });

                    // Reset the form or inputs after exporting
                    document.getElementById('time-period').value = '';  // Reset time period
                    document.getElementById('start-date').value = '';   // Reset start date
                    document.getElementById('end-date').value = '';     // Reset end date
                });
            } else {
                console.error('Export button not found.');
            }
        }).catch(error => {
            console.error('Error fetching borrower records:', error);
        });
    } else {
        console.error('Borrower ID is missing in query parameters.');
    }
});

// Function to filter records based on time period and custom date range
function filterRecords(records, timePeriod, startDate, endDate) {
    const now = new Date();

    switch (timePeriod) {
        case 'weekly':
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return records.filter(record => new Date(record.borrow_date) >= oneWeekAgo);

        case 'monthly':
            return records.filter(record => {
                const borrowDate = new Date(record.borrow_date);
                return borrowDate.getMonth() === now.getMonth() && borrowDate.getFullYear() === now.getFullYear();
            });

        case 'custom':
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                return records.filter(record => {
                    const borrowDate = new Date(record.borrow_date);
                    return borrowDate >= start && borrowDate <= end;
                });
            }
            ipcRenderer.invoke('showDialog', 'error', 'Invalid custom date range. Please ensure both start and end dates are selected.');
            return [];

        default:
            return records; // Default to all records
    }
}
