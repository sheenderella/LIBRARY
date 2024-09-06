const { ipcRenderer } = require('electron');

document.getElementById('change-username-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const newUsername = document.getElementById('new-username').value;
    const currentPassword = document.getElementById('current-password').value;

    const result = await ipcRenderer.invoke('change-username', { newUsername, currentPassword });

    if (result.success) {
        alert('Username changed successfully!');
        window.close(); // Close the window on success
    } else {
        alert(result.error || 'An error occurred. Please try again.');
    }
});
