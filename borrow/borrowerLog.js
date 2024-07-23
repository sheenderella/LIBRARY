const { ipcRenderer } = require('electron');

// Function to get query parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

window.onload = function() {
    const borrowerName = getQueryParam('borrowerName');
    if (borrowerName) {
        document.getElementById('logTitle').textContent = `${borrowerName}'s Borrow Log`;
        getBorrowerLog(borrowerName);
    }
};

async function getBorrowerLog(name) {
    const logs = await ipcRenderer.invoke('getBorrowerLog', name);
    const logList = document.getElementById('logList');
    let template = "";
    logs.forEach(log => {
        template += `
            <tr>
                <td>${log.bookTitle}</td>
                <td>${log.borrowDate}</td>
                <td>${log.borrowStatus}</td>
            </tr>
        `;
    });
    logList.innerHTML = template;
}
