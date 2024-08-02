const { ipcRenderer } = require('electron');

window.onload = function() { 
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const btnlogin = document.getElementById("login");

    btnlogin.onclick = function() {
        const obj = { username: username.value, password: password.value };
        ipcRenderer.invoke("login", obj);
    }
};
