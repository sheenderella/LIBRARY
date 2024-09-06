const { ipcRenderer } = require('electron');

window.onload = function() { 
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const btnlogin = document.getElementById("login");
    const showPasswordCheckbox = document.getElementById("show-password");

    // Show/Hide password functionality
    showPasswordCheckbox.onchange = function() {
        password.type = showPasswordCheckbox.checked ? "text" : "password";
    };

    btnlogin.onclick = function(event) {
        event.preventDefault(); // Prevent form from submitting
        const obj = { username: username.value, password: password.value };
        
        ipcRenderer.invoke("login", obj).then(response => {
            if (response.success) {
                console.log('Login successful!');
            } else {
                alert('Incorrect username or password');
                resetForm();
            }
        }).catch(error => {
            console.error('Login Error:', error);
            alert('An unexpected error occurred during login. Please try again.');
            resetForm();
        });

        return false; // Prevent any further event propagation
    };

    function resetForm() {
        username.value = '';
        password.value = '';
        password.type = 'password';
        showPasswordCheckbox.checked = false;
    }
};
