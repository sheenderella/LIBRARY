const { ipcRenderer } = require('electron');

// Toggle password visibility (optional feature)
document.getElementById('toggle-current-password').addEventListener('click', () => {
    const passwordField = document.getElementById('current-password');
    const icon = document.getElementById('toggle-current-password').querySelector('i');
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordField.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

document.getElementById('change-username-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const newUsername = document.getElementById('new-username').value.trim(); 
    const confirmUsername = document.getElementById('confirm-username').value.trim();
    const currentPassword = document.getElementById('current-password').value.trim();
    const errorContainer = document.getElementById('error-container');
    const submitButton = event.target.querySelector('button[type="submit"]');

    // Clear previous error messages
    errorContainer.style.display = 'none';
    errorContainer.textContent = '';

    // Check for empty fields
    if (!newUsername || !currentPassword || !confirmUsername) {
        errorContainer.textContent = 'Please fill in all fields.';
        errorContainer.style.display = 'block';
        clearInputFields();
        return;
    }

    // Check if new username and confirmation match
    if (newUsername !== confirmUsername) {
        errorContainer.textContent = 'Usernames do not match. Please try again.';
        errorContainer.style.display = 'block';
        clearInputFields();
        return;
    }

    // Disable the button to prevent multiple submissions
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...'; // Optional: Change button text while processing

    try {
        const result = await ipcRenderer.invoke('change-username', { newUsername, currentPassword });

        if (result.success) {
            alert('Username changed successfully!');
            window.close(); // Close the window on success
        } else {
            errorContainer.textContent = result.error || 'An error occurred. Please try again.';
            errorContainer.style.display = 'block';
            clearInputFields(); // Clear input fields on error
        }
    } catch (error) {
        console.error('Error during username change:', error);
        errorContainer.textContent = 'An unexpected error occurred. Please try again later.';
        errorContainer.style.display = 'block';
        clearInputFields(); // Clear input fields on error
    } finally {
        // Re-enable the button after processing
        submitButton.disabled = false;
        submitButton.textContent = 'Change Username'; // Reset button text
    }
});

// Function to clear input fields
function clearInputFields() {
    document.getElementById('new-username').value = '';
    document.getElementById('confirm-username').value = '';
    document.getElementById('current-password').value = '';
}
