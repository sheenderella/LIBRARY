document.getElementById('logout-link').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent default link behavior

    ipcRenderer.invoke('logout')
        .then(() => {
            // Redirect to login page after logout, no notification needed
            window.location.href = './login/login.html';
        })
        .catch(error => {
            console.error('Error during logout:', error);
            showNotification('An error occurred during logout. Please try again.', 'error'); // Use notification instead of alert
        });
});

// Optional: You can add this function if notifications are used across your app
function showNotification(message, type = 'error') {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }

    notification.textContent = message;

    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50'; // Green for success (not used here)
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336'; // Red for error
            break;
        default:
            notification.style.backgroundColor = '#2196F3'; // Blue for default
    }

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000); // 3 seconds
}
