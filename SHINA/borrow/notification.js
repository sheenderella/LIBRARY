// notification.js

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    
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
        case 'delete':
            notification.style.backgroundColor = '#4CAF50'; // Orange for delete
            break;
        default:
            notification.style.backgroundColor = '#2196F3'; // Blue for default
    }
    
    // Add the show class to make it visible
    notification.classList.add('show');
    
    // Remove the show class after 3 seconds (notification will fade out)
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000); // 3 seconds
}
