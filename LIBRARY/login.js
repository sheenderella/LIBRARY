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

    btnlogin.onclick = function() {
        const obj = { username: username.value, password: password.value };
        ipcRenderer.invoke("login", obj).then(result => {
            if (!result.success) {
                alert('Incorrect username or password. Please try again.');
                // Reload the page after incorrect login attempt
                location.reload();
            } else {
                // Handle successful login if needed
            }
        });
    }
};
