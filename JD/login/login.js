const { ipcRenderer } = require('electron');

window.onload = function() {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("login");
    const togglePassword = document.getElementById("toggle-password");
    const alertModal = document.getElementById("alert-modal");
    const alertMessage = document.getElementById("alert-message");
    const closeButton = document.querySelector(".close-button");
    const errorMessage = document.getElementById("error-message");
    const forgotPasswordLink = document.getElementById('forgot-password-link'); 
    const loginForm = document.getElementById('login-form');

    // Initialize failed attempt counter
    let failedAttempts = 0;

    // Hide the forgot password link initially
    forgotPasswordLink.style.display = "none";

    // Show/Hide password functionality using icon
    togglePassword.onclick = function() {
        const passwordType = passwordInput.type === "password" ? "text" : "password";
        passwordInput.type = passwordType;
        togglePassword.innerHTML = passwordType === "text" ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    };

    // Forgot Password
    forgotPasswordLink.addEventListener('click', (event) => {
        event.preventDefault(); 
        ipcRenderer.send('open-forgot-password-window');
    });

    // Close alert modal
    closeButton.onclick = function() {
        alertModal.style.display = "none";
    };

    // Login button click
    loginButton.onclick = async function(event) {
        event.preventDefault(); 
        const username = usernameInput.value;
        const password = passwordInput.value;

        try {
            const response = await ipcRenderer.invoke("login", { username, password });

            // Check if the response is valid
            if (response && response.success) {
                alertModal.style.display = "none"; 
                failedAttempts = 0; // Reset failed attempts on successful login
                forgotPasswordLink.style.display = "none"; // Hide the forgot password link again
            } else {
                // Display alert if login fails
                alertMessage.textContent = (response && response.error) || 'Incorrect username or password';
                alertModal.style.display = "block";

                // Increment the failed attempts counter
                failedAttempts++;
                console.log(`Failed Attempts: ${failedAttempts}`);

                // Show the 'Forgot Password' link after 3 failed attempts
                if (failedAttempts >= 3) {
                    console.log('Displaying forgot password link.');
                    forgotPasswordLink.style.display = "block";
                }

                // Clear the fields and reset password visibility
                clearLoginFields();
            }
        } catch (error) {
            console.error('Login Error:', error);
            clearLoginFields();
        }
    };

    // Function to clear login fields and reset password visibility
    function clearLoginFields() {
        usernameInput.value = '';
        passwordInput.value = '';
        passwordInput.type = 'password'; 
        togglePassword.innerHTML = '<i class="fas fa-eye"></i>'; 
    }
};
