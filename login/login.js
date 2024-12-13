const { ipcRenderer } = require('electron');
let lastLoginUsername = ''; // Variable to store the last attempted username

window.onload = function() {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("login");
    const togglePassword = document.getElementById("toggle-password");
    const forgotPasswordLink = document.getElementById('forgot-password-link'); 
    const hintMessage = document.getElementById("hint-message");

    let failedAttemptsMap = {};

    forgotPasswordLink.style.display = "none";
    hintMessage.style.display = "none";

    togglePassword.onclick = function() {
        const passwordType = passwordInput.type === "password" ? "text" : "password";
        passwordInput.type = passwordType;
        togglePassword.innerHTML = passwordType === "text" ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    };

    loginButton.onclick = async function(event) {
        event.preventDefault();
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!username || !password) {
            showNotification("Username and password are required.", "error");
            return;
        }

        lastLoginUsername = username; // Store the username for use in password reset
        localStorage.setItem('lastUsername', lastLoginUsername); // Store it in localStorage

        try {
            const response = await ipcRenderer.invoke("login", { username, password });

            if (response && response.success === true) {
                // Successful login
                setTimeout(() => {
                    window.location.href = 'dashboard.html'; // Redirect to dashboard
                }, 1500); // 1.5 seconds delay for better UX
            } else {
                showNotification("Invalid username or password.", "error");
                
                if (!failedAttemptsMap[username]) {
                    failedAttemptsMap[username] = 0;
                }
                failedAttemptsMap[username]++;

                if (failedAttemptsMap[username] >= 3) {
                    forgotPasswordLink.style.display = "block";

                    const hintResponse = await ipcRenderer.invoke('get-password-hint', username);
                    hintMessage.classList.add('hint-message'); // Add the CSS class
                    
                    if (hintResponse && hintResponse.success) {
                        hintMessage.textContent = `Password Hint: ${hintResponse.hint || 'No hint added'}`; // Use 'No hint added' if hint is null
                        hintMessage.classList.add('success'); // Add success class (optional)
                        hintMessage.classList.remove('error'); // Remove error class if present
                    } else {
                        hintMessage.textContent = "No hint found for this username.";
                        hintMessage.classList.add('error'); // Add error class (optional)
                        hintMessage.classList.remove('success'); // Remove success class if present
                    }
                    
                    // Show the hint message
                    hintMessage.style.display = "block"; // You can also handle this in CSS
                }

                clearLoginFields();
            }
        } catch (error) {
            console.error('Login Error:', error);
            showNotification("An error occurred during login.", "error");
            clearLoginFields();
        }
    };

    forgotPasswordLink.addEventListener('click', async (event) => {
        event.preventDefault();

        if (!lastLoginUsername) {
            return;
        }

        // Open the reset password window
        await ipcRenderer.invoke('open-reset-password-window', lastLoginUsername);

        // Refresh the page
        window.location.reload();
    });

    function clearLoginFields() {
        usernameInput.value = '';
        passwordInput.value = '';
        passwordInput.type = 'password'; 
        togglePassword.innerHTML = '<i class="fas fa-eye"></i>'; 
    }

    // Refresh the page when receiving the 'refresh-login' signal
    ipcRenderer.on('refresh-login', () => {
        window.location.reload();
    });

    function showNotification(message, type = 'error') {
        const notification = document.getElementById('notification');
        
        if (!notification) {
            console.error("Notification element not found!");
            return;
        }
        
        notification.textContent = message;
    
        if (type === 'error') {
            notification.style.backgroundColor = '#f44336'; 
        } else {
            notification.style.backgroundColor = '#4CAF50'; 
        }
    
        notification.classList.add('show');
    
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
};
