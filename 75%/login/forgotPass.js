// Simulated list of users (this would normally come from a server)
const users = {
    "john_doe": "password123",
    "jane_smith": "mysecurepassword"
};

const forgotPasswordForm = document.getElementById('forgot-password-form');
const resetPasswordForm = document.getElementById('reset-password-form');
const responseMessage = document.getElementById('response-message');
const resetMessage = document.getElementById('reset-message');

let currentUser = null;

// Handle the "Forgot Password" form submission
forgotPasswordForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting in the traditional way

    const username = document.getElementById('username').value;

    // Check if the username exists in the users object
    if (users[username]) {
        currentUser = username; // Set the current user
        responseMessage.textContent = 'Username found. Please enter your new password.';
        responseMessage.style.color = 'green';

        // Hide forgot password form and show reset password form
        forgotPasswordForm.style.display = 'none';
        resetPasswordForm.style.display = 'block';
    } else {
        responseMessage.textContent = 'Username not found. Please try again.';
        responseMessage.style.color = 'red';
    }
});

// Handle the "Reset Password" form submission
resetPasswordForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting in the traditional way

    const newPassword = document.getElementById('new-password').value;

    if (newPassword) {
        // Simulate password reset by updating the user's password in the object
        users[currentUser] = newPassword;
        resetMessage.textContent = 'Password reset successfully!';
        resetMessage.style.color = 'green';

        // Clear the form and hide it after resetting the password
        resetPasswordForm.reset();
        setTimeout(() => {
            resetPasswordForm.style.display = 'none';
        }, 2000); // Hide after 2 seconds
    } else {
        resetMessage.textContent = 'Please enter a valid password.';
        resetMessage.style.color = 'red';
    }
});
