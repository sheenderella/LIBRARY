const { ipcRenderer } = require('electron');

window.onload = function() {
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const btnlogin = document.getElementById("login");
    const showPassword = document.getElementById("show-password");
    const errorMessage = document.getElementById("error-message");

    showPassword.onclick = function() {
        if (showPassword.checked) {
            password.type = "text";
        } else {
            password.type = "password";
        }
    };

    btnlogin.onclick = function() {
        const obj = { username: username.value, password: password.value };
        ipcRenderer.invoke("login", obj).then(result => {
            if (!result.success) {
                errorMessage.style.display = 'block'; // Show error message
                username.value = ''; // Clear the username input field
                password.value = ''; // Clear the password input field
                username.focus(); // Set focus back to the username field
            } else {
                errorMessage.style.display = 'none'; // Hide error message if login is successful
            }
        });
    };
};
