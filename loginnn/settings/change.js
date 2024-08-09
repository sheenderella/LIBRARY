const { ipcRenderer } = require('electron');

// Assume id is set somewhere in the app and you retrieve it when needed
document.getElementById('update-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const oldUsername = document.getElementById('old-username').value;
    const oldPassword = document.getElementById('old-password').value;
    const newUsername = document.getElementById('new-username').value;
    const newPassword = document.getElementById('new-password').value;

    try {
        const result = await ipcRenderer.invoke('update-login-credentials', {
            id: userId, oldUsername, oldPassword, newUsername, newPassword
        });

        const messageDiv = document.getElementById('message');
        messageDiv.innerText = result.success ? 'Username and password updated successfully!' : `Error: ${result.message}`;
    } catch (error) {
        console.error('Error invoking IPC:', error);
        document.getElementById('message').innerText = 'An unexpected error occurred.';
    }
});
