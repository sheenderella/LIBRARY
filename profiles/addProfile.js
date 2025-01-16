const { ipcRenderer } = require('electron');

// Restrict borrower_id input to match the format XXX-XXX-XXXX
const borrowerIdInput = document.getElementById('borrower_id');

borrowerIdInput.addEventListener('input', () => {
    let value = borrowerIdInput.value;
    
    // Remove invalid characters and enforce the correct format
    value = value.replace(/[^\d]/g, ''); // Remove non-digit characters
    if (value.length > 3 && value.length <= 6) {
        value = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length > 6) {
        value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6, 10)}`;
    }
    
    // Restrict the length to exactly 13 characters including dashes
    borrowerIdInput.value = value.slice(0, 13);
});


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
