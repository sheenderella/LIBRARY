const { ipcRenderer } = require('electron');

window.onload = async function() {
    ipcRenderer.on('set-username', async (event, username) => {
        // Check if username is available
        if (username) {
            try {
                // Send IPC request to retrieve the security question for the username
                const response = await ipcRenderer.invoke('get-security-question', username);
                
                console.log('Response from get-security-question:', response);

                if (response && response.success) {
                    const securityQuestionElement = document.querySelector('.security-question');
                    securityQuestionElement.textContent = response.question;
                    securityQuestionElement.setAttribute('data-username', username); // Store the username for later use
                } else {
                    showNotification('Unable to retrieve security question: ' + (response.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error('Error retrieving security question:', error);
                showNotification('Error retrieving security question', 'error');
            }
        } else {
            console.error('No username provided.');
            showNotification('No username provided.', 'error');
        }
    });

    // Handle form submission for answer verification
    document.getElementById('reset-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        const answer = document.getElementById('answer').value;
        const username = document.querySelector('.security-question').getAttribute('data-username'); // Retrieve stored username

        console.log('Username on form submission:', username); // Log username for debugging

        if (!username) {
            showNotification('No username available for verification.', 'error');
            return;
        }

        try {
            // Send IPC request to verify the answer
            const verifyResponse = await ipcRenderer.invoke('verify-security-answer', { username, answer });
            
            if (verifyResponse && verifyResponse.success) {
                showNotification('Security answer verified!', 'success');
                // Redirect to password change page after showing the notification
                setTimeout(() => {
                    window.location.href = `change.html?username=${username}`;
                }, 1000); 
            } else {
                showNotification((verifyResponse.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error verifying security answer:', error);
            showNotification('Error verifying security answer', 'error');
        }
    });
};

// Notification function integrated directly in reset.js
function showNotification(message, type = 'success') {
    // Create the notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }

    // Set the message text
    notification.textContent = message;

    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50'; // Green for success
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336'; // Red for error
            break;
        default:
            notification.style.backgroundColor = '#2196F3'; // Blue for default
    }

    // Add the show class to make it visible
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 1000);
}
