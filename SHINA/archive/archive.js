// Import ipcRenderer from Electron
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {

    // Sidebar toggle functionality
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', function () {
            const wrapper = document.getElementById('wrapper');
            const sidebar = document.getElementById('sidebar-wrapper');
            if (wrapper && sidebar) {
                wrapper.classList.toggle('collapsed');
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    // LOGOUT
// Handle logout event
const logoutLink = document.getElementById('logout-link');
if (logoutLink) {
    logoutLink.addEventListener('click', function(event) {
        event.preventDefault(); // Prevent default link behavior
        
        // Invoke logout from the centralized login handler
        ipcRenderer.invoke('logout')
            .then(() => {
                // Close current window and load the login window to prevent multiple windows
                window.location.href = './login/login.html'; 
            })
            .catch(error => {
                console.error('Error during logout:', error);
                // Use the notification system from login.js if logout fails
                ipcRenderer.invoke('showNotification', 'An error occurred during logout. Please try again.', 'error');
            });
    });
}


});
    

// Toggle sidebar visibility on notification button click
document.getElementById('notificationButton').addEventListener('click', () => {
    const sidebar = document.getElementById('notificationSidebar');
    sidebar.classList.toggle('open');
});

// Close sidebar on close button click
document.getElementById('closeSidebarButton').addEventListener('click', () => {
    const sidebar = document.getElementById('notificationSidebar');
    sidebar.classList.remove('open');
});

// Load overdue notifications on app start
window.addEventListener('DOMContentLoaded', () => {
    checkForOverdueNotifications();
});
