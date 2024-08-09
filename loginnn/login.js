const { ipcRenderer } = require('electron');

window.onload = function() {
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const btnlogin = document.getElementById("login");
    const showPassword = document.getElementById("show-password");

    showPassword.onclick = function() {
        password.type = showPassword.checked ? "text" : "password";
    };

btnlogin.onclick = function(event) {
    event.preventDefault(); // Prevent the default form submission

    const obj = { username: username.value.trim(), password: password.value.trim() };
    ipcRenderer.invoke("login", obj).then(result => {
        if (!result.success) {
            alert("Invalid username or password!");
            username.value = ''; // Clear the username input field
            password.value = ''; // Clear the password input field
            username.focus(); // Set focus back to the username field
        } else {
            // Store user ID for later use
            localStorage.setItem('userId', result.userId);
            // Handle successful login (e.g., redirect to main window)
        }
    }).catch(error => {
        console.error('Login error:', error);
        alert('An error occurred during login. Please try again.');
    });
};
};
