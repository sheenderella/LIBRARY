/**
 * Handles the form submission for updating the user's login credentials.
 * Collects form data, sends it to the main process via IPC, and provides feedback to the user.
 */

const { ipcRenderer } = require('electron');

async function handleUpdateCredentials(event) {
    event.preventDefault();

    const oldUsername = document.getElementById('old-username').value;
    const oldPassword = document.getElementById('old-password').value;
    const newUsername = document.getElementById('new-username').value;
    const newPassword = document.getElementById('new-password').value;

    try {
        const credentials = {
            oldUsername,
            oldPassword,
            newUsername,
            newPassword
        };
        
        const result = await ipcRenderer.invoke('update-login-credentials', credentials);
        
        const messageDiv = document.getElementById('message');
        if (result.success) {
            messageDiv.innerText = 'Username and password updated successfully!';
        } else {
            messageDiv.innerText = `Error: ${result.message}`;
        }
    } catch (error) {
        console.error('Error updating credentials:', error);
        document.getElementById('message').innerText = 'An unexpected error occurred.';
    }
}

module.exports = handleUpdateCredentials;
