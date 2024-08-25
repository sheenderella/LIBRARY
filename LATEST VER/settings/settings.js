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
