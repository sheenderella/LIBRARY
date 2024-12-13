const { ipcRenderer } = require('electron');

window.onload = function() {
    const params = new URLSearchParams(window.location.search);
    const username = params.get('username');

    // Add event listeners for eye icons to toggle password visibility
    document.getElementById('toggle-new-password').addEventListener('click', function() {
        togglePasswordVisibility('new-password', this);
    });

    document.getElementById('toggle-confirm-password').addEventListener('click', function() {
        togglePasswordVisibility('confirm-password', this);
    });

    document.getElementById('change-password-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Check if new password is empty
        if (!newPassword || !confirmPassword) {
            showNotification('Please enter and confirm your new password', 'error');
            return;
        }

        // Validate password matching
        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        try {
            // Send IPC request to change the password
            const response = await ipcRenderer.invoke('change', { username, newPassword });
            
            if (response && response.success) {
                showNotification('Password changed successfully!', 'success');
                // Send an IPC event to the main process to close the window
                setTimeout(() => {
                    ipcRenderer.send('close-window');
                }, 1000);
            } else {
                showNotification(response.error || 'Unknown error', 'error');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            showNotification('Error changing password', 'error');
        }
    });
};

// Toggle password visibility
function togglePasswordVisibility(inputId, toggleIcon) {
    const input = document.getElementById(inputId);
    const icon = toggleIcon.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Notification function integrated directly in change.js
function showNotification(message, type = 'success') {
    let notification = document.getElementById('notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }

    notification.textContent = message;

    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        default:
            notification.style.backgroundColor = '#2196F3';
    }

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 1000);
}
