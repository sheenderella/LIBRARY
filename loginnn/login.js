const { ipcRenderer } = require('electron');

window.onload = function() {
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const btnlogin = document.getElementById("login");
    const showPassword = document.getElementById("show-password");

    showPassword.onclick = function() {
        if (showPassword.checked) {
            password.type = "text";
        } else {
            password.type = "password";
        }
    };

    btnlogin.onclick = function(event) {
        event.preventDefault(); // Prevent the default form submission
    
        const obj = { username: username.value, password: password.value };
        ipcRenderer.invoke("login", obj).then(result => {
            if (!result.success) {
                alert("Invalid username or password!"); // Show error message as a notification
                username.value = ''; // Clear the username input field
                password.value = ''; // Clear the password input field
                username.focus(); // Set focus back to the username field
            } else {
                // Handle successful login
            }
        });
    };
};