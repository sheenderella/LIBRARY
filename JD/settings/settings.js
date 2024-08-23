const { ipcRenderer } = require('electron');

// Sidebar toggle functionality (from index.js)
document.getElementById('sidebarCollapse').addEventListener('click', function () {
    const wrapper = document.getElementById('wrapper');
    const sidebar = document.getElementById('sidebar-wrapper');
    
    wrapper.classList.toggle('collapsed');
    sidebar.classList.toggle('collapsed');
});

// Backup Database
document.getElementById('backup-btn').addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('exportDatabase');
    console.log('Backup result:', result);
    alert(result.message || 'An unexpected error occurred.');
});

// Restore Database
document.getElementById('restore-btn').addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('importDatabase');
    console.log('Restore result:', result);
    alert(result.message || 'An unexpected error occurred.');
});

// Handle logout
document.getElementById('logout-link').addEventListener('click', function(event) {
    event.preventDefault();
    window.location.href = '../login/login.html';
});
