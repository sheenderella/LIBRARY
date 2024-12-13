const { ipcRenderer } = require('electron');

// Prepopulate the form with the profile data when 'fill-edit-form' event is triggered
ipcRenderer.on('fill-edit-form', (event, record) => {
    document.getElementById('profile_id').value = record.id;  // Hidden input for ID
    document.getElementById('borrower_id').value = record.borrower_id;
    document.getElementById('name').value = record.name;
    document.getElementById('phone_number').value = record.phone_number;
    document.getElementById('email').value = record.email;
});

// Handle the form submission
document.getElementById('editProfileForm').addEventListener('submit', function (e) {
    e.preventDefault();  // Prevent default form submission behavior

    // Gather form data
    const updatedProfile = {
        id: document.getElementById('profile_id').value,
        borrower_id: document.getElementById('borrower_id').value,
        name: document.getElementById('name').value,
        phone_number: document.getElementById('phone_number').value,
        email: document.getElementById('email').value
    };

    // Send the updated profile data to the main process for updating
    ipcRenderer.invoke('updateProfile', updatedProfile)
        .then(() => {
            console.log('Profile updated successfully');
            window.close(); // Close the edit window after successful update
        })
        .catch(error => {
            console.error('Error updating profile:', error);
        });
});
