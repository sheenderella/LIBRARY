const { ipcRenderer } = require('electron');

document.getElementById('backup-btn').addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('exportDatabase');
    console.log('Backup result:', result);
    alert(result.message || 'An unexpected error occurred.');
});

document.getElementById('restore-btn').addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('importDatabase');
    console.log('Restore result:', result);
    alert(result.message || 'An unexpected error occurred.');
});

// Sidebar toggle functionality
document.getElementById('sidebarCollapse').addEventListener('click', function () {
    const wrapper = document.getElementById('wrapper');
    const sidebar = document.getElementById('sidebar-wrapper');
    
    wrapper.classList.toggle('collapsed');
    sidebar.classList.toggle('collapsed');
});

//LOGOUT
document.getElementById('logout-link').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent default link behavior

    ipcRenderer.invoke('logout').then(() => {
        window.location.href = './login/login.html'; // Redirect to login page after logout
    }).catch(error => {
        console.error('Error during logout:', error);
        alert('An error occurred. Please try again.');
    });
});
