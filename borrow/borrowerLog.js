const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const borrowerName = urlParams.get('borrowerName');

    if (borrowerName) {
        updateBorrowerName(borrowerName);
        fetchBorrowerLog(borrowerName);
    } else {
        console.error('No borrower name specified in the URL.');
    }
});

async function fetchBorrowerLog(borrowerName) {
    try {
        const log = await ipcRenderer.invoke('getBorrowerLog', borrowerName);
        displayLog(log);
    } catch (error) {
        console.error('Error fetching borrower log:', error);
    }
}

function displayLog(log) {
    const container = document.getElementById('borrowerLogContainer');
    let rows = '';

    log.forEach(entry => {
        rows += `
            <tr>
                <td>${entry.bookTitle}</td>
                <td>${entry.borrowDate}</td>
                <td>${entry.borrowStatus}</td>
            </tr>
        `;
    });

    container.innerHTML = rows;
}

function updateBorrowerName(borrowerName) {
    document.getElementById('borrowerName').textContent = `Log for ${borrowerName}`;
}
