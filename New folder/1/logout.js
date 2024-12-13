// logout.js

const { ipcRenderer } = require('electron');

document.getElementById('logout-link').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent default link behavior

    ipcRenderer.invoke('logout').then(() => {
        window.location.href = '/login.html'; // Redirect to login page after logout
    }).catch(error => {
        console.error('Error during logout:', error);
        alert('An error occurred. Please try again.');
    });
});
