const { ipcRenderer } = require('electron');

// Get the form element
const form = document.getElementById('addProfileForm');

// Add a submit event listener to handle the form submission
form.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent the default form submission

    // Create a profile record object from the form inputs
    const record = {
        borrower_id: document.getElementById('borrower_id').value,
        name: document.getElementById('name').value,
        phone_number: document.getElementById('phone_number').value,
        email: document.getElementById('email').value
    };

    try {
        // Send the record to the main process to add it to the database
        await ipcRenderer.invoke('addProfile', record);
        // Optionally close the add profile window
        window.close();

    } catch (error) {
        console.error('Error adding profile:', error);
    }
});
