const { ipcRenderer } = require('electron');

// Username change button
document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('change-username-button');
    if (button) {
        button.addEventListener('click', () => {
            ipcRenderer.invoke('open-change-username-window');
        });
    } else {
        console.error('Change Username button not found!');
    }
});


    // Password change button
    const passwordButton = document.getElementById('password-btn');
    if (passwordButton) {
        passwordButton.addEventListener('click', () => {
            ipcRenderer.invoke('open-change-password-window');
        });
    } else {
        console.error('Change Password button not found!');
    }

    //SECURITY
document.getElementById('open-security-setup').addEventListener('click', () => {
    ipcRenderer.invoke('open-security-setup-window');
});


//BACKUP
document.getElementById('backup-btn').addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('exportDatabase');
    console.log('Backup result:', result);
    alert(result.message || 'An unexpected error occurred.');
});

document.getElementById('restore-btn').addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('importDatabase');
    console.log('Restore result:', result);
    alert(result.message || 'An unexpected error occurred.');
});

// Export Books
document.getElementById('export-btn').addEventListener('click', () => {
    document.getElementById('exportModal').querySelector('.btn-primary.mb-2').addEventListener('click', async () => {
        const result = await ipcRenderer.invoke('exportBooksToExcel');
        console.log('Export Books result:', result);
        alert(result.message || 'An unexpected error occurred while exporting books.');
    });
});

// Import Books

document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('importModal').querySelector('.btn-secondary.mb-2').addEventListener('click', async () => {
        const result = await ipcRenderer.invoke('importBooksFromExcel');
        console.log('Import Books result:', result);
        alert(result.message || 'An unexpected error occurred while importing books.');
    });
});


// Export Borrower Profiles
document.getElementById('export-btn').addEventListener('click', () => {
    document.getElementById('exportModal').querySelector('.btn-primary:last-child').addEventListener('click', async () => {
        const result = await ipcRenderer.invoke('exportProfilesToExcel');
        console.log('Export Profiles result:', result);
        alert(result.message || 'An unexpected error occurred while exporting borrower profiles.');
    });
});


// Import Borrower Profiles
document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('importModal').querySelector('.btn-secondary:last-child').addEventListener('click', async () => {
        const result = await ipcRenderer.invoke('importProfilesFromExcel');
        console.log('Import Profiles result:', result);
        alert(result.message || 'An unexpected error occurred while importing borrower profiles.');
    });
});



// Sidebar toggle functionality
document.getElementById('sidebarCollapse').addEventListener('click', function () {
    const wrapper = document.getElementById('wrapper');
    const sidebar = document.getElementById('sidebar-wrapper');
    
    wrapper.classList.toggle('collapsed');
    sidebar.classList.toggle('collapsed');
});

// LOGOUT
document.getElementById('logout-link').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent default link behavior

    ipcRenderer.invoke('logout').then(() => {
        window.location.href = './login/login.html'; // Redirect to login page after logout
    }).catch(error => {
        console.error('Error during logout:', error);
        alert('An error occurred. Please try again.');
    });
});


// Navigate to support page
document.getElementById('support-btn').addEventListener('click', () => {
    window.location.href = './support.html';
});
