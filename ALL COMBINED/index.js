document.getElementById('sidebarCollapse').addEventListener('click', function () {
    const wrapper = document.getElementById('wrapper');
    const sidebar = document.getElementById('sidebar-wrapper');
    
    wrapper.classList.toggle('collapsed');
    sidebar.classList.toggle('collapsed');
});

document.getElementById('logout-link').addEventListener('click', function(event) {
    event.preventDefault();
    window.location.href = 'login.html';
});
