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
        const result = await ipcRenderer.invoke('addProfile', record);

        // If profile was added successfully, close the window
        if (result.success) {
            window.close();
        }

    } catch (error) {
        // Log any unexpected errors
        console.error('Error adding profile:', error);
    }
});

// Listen for error messages from the main process
ipcRenderer.on('profile-add-error', (event, errorMessage) => {
    // Show the error dialog in the main process
    ipcRenderer.invoke('show-error-dialog', "Error", errorMessage);
});
