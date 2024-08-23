document.addEventListener('DOMContentLoaded', () => {
    const closeButton = document.querySelector('.close-button');

    closeButton.addEventListener('click', () => {
        window.close(); // Close the alert window
    });
});
