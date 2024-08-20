const { ipcRenderer } = require('electron');

document.getElementById('change-form').onsubmit = async function(event) {
    event.preventDefault();

    const newUsername = document.getElementById('username').value || null;
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value || null;

    try {
        const result = await ipcRenderer.invoke('change-credentials', {
            newUsername,
            currentPassword,
            newPassword
        });

        const alertMessage = document.getElementById('alert-message');
        alertMessage.classList.remove('hidden');
        
        if (result.success) {
            alertMessage.textContent = 'Credentials updated successfully!';
            document.getElementById('change-form').reset();
        } else {
            alertMessage.textContent = result.error;
        }
    } catch (error) {
        console.error('Error updating credentials:', error);
        document.getElementById('alert-message').textContent = 'An error occurred. Please try again.';
    }
};
