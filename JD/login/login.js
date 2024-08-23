const { ipcRenderer } = require('electron');

window.onload = function() { 
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const btnlogin = document.getElementById("login");
    const showPasswordCheckbox = document.getElementById("show-password");
    const alertModal = document.getElementById("alert-modal");
    const alertMessage = document.getElementById("alert-message");
    const closeButton = document.querySelector(".close-button");
    const errorMessage = document.getElementById("error-message");

    // Show/Hide password functionality
    showPasswordCheckbox.onchange = function() {
        password.type = showPasswordCheckbox.checked ? "text" : "password";
    };

    // Close alert modal functionality
    closeButton.onclick = function() {
        alertModal.style.display = "none";
    };

    btnlogin.onclick = function(event) {
        event.preventDefault(); // Prevent form from submitting
        const obj = { username: username.value, password: password.value };
        ipcRenderer.invoke("login", obj).then(response => {
            if (response.success) {
                alertModal.style.display = "none"; // Hide alert if successful
            } else {
                // Display alert if login fails
                alertMessage.textContent = 'Incorrect username or password';
                alertModal.style.display = "block";

                // Clear the username and password fields, and reset the checkbox
                username.value = '';
                password.value = '';
                password.type = 'password'; // Ensure password field is hidden
                showPasswordCheckbox.checked = false;
            }
        }).catch(error => {
            console.error('Login Error:', error);
            
            // Clear the username and password fields, and reset the checkbox
            username.value = '';
            password.value = '';
            password.type = 'password';
            showPasswordCheckbox.checked = false;
        });
    };
};
