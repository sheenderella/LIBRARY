const { ipcRenderer } = require('electron');

// Function to toggle password visibility
function togglePasswordVisibility(inputId, toggleIconId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = document.getElementById(toggleIconId);

    toggleIcon.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;

        // Toggle the eye icon
        toggleIcon.innerHTML = passwordInput.type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
}

// Attach password visibility toggling to the eye icons
togglePasswordVisibility('current-password', 'toggle-current-password');
togglePasswordVisibility('new-password', 'toggle-new-password');
togglePasswordVisibility('confirm-password', 'toggle-confirm-password');

// Function to clear input fields while keeping the error message visible
function clearInputFields() {
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    document.getElementById('password-hint').value = '';
}

// Handle password update form submission
document.getElementById('update-password-button').addEventListener('click', async () => {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const passwordHint = document.getElementById('password-hint').value;
    const errorContainer = document.getElementById('error-container');
    
    // Clear previous error messages
    errorContainer.style.display = 'none';
    errorContainer.textContent = '';

    if (newPassword !== confirmPassword) {
        errorContainer.textContent = 'New passwords do not match!';
        errorContainer.style.display = 'block';
        return;
    }

    try {
        const dbPassword = await ipcRenderer.invoke('get-current-password');

        // Check if the entered current password matches the one in the database
        if (currentPassword !== dbPassword) {
            errorContainer.textContent = 'The current password is incorrect!';
            errorContainer.style.display = 'block';
            clearInputFields(); // Clear input fields without reloading the page
            return;
        }

        // Check if the new password matches the current one
        if (newPassword === dbPassword) {
            errorContainer.textContent = 'The new password cannot be the same as the current password!';
            errorContainer.style.display = 'block';
            clearInputFields(); // Clear input fields without reloading the page
            return;
        }

        // Proceed to change the password
        const result = await ipcRenderer.invoke('change-password', {
            currentPassword: currentPassword,
            newPassword: newPassword,
            passwordHint: passwordHint
        });

        if (result.success) {
            // Show an alert and then close the window
            alert('Password changed successfully!');
            window.close();
        } else {
            errorContainer.textContent = result.error;
            errorContainer.style.display = 'block';
            clearInputFields(); // Clear input fields without reloading the page
        }
    } catch (error) {
        errorContainer.textContent = 'An error occurred. Please try again.';
        errorContainer.style.display = 'block';
        clearInputFields(); // Clear input fields without reloading the page
    }
});
