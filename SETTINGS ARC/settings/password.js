document.addEventListener('DOMContentLoaded', () => {
    const updatePasswordButton = document.getElementById('update-password-button');

    if (updatePasswordButton) {
        updatePasswordButton.addEventListener('click', async () => {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                alert('Please fill in all the fields.');
                return;
            }

            if (newPassword !== confirmPassword) {
                alert('New password and confirmation password do not match.');
                return;
            }

            if (currentPassword === newPassword) {
                alert('The new password cannot be the same as the current password.');
                return;
            }

            try {
                const response = await updatePassword(currentPassword, newPassword);

                if (response.success) {
                    alert('Password updated successfully!');
                    window.location.href = './settings.html'; // Redirect to settings after updating
                } else {
                    alert(`Error: ${response.error || 'Failed to update password'}`);
                }
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    } else {
        console.error("Update Password button not found.");
    }

    async function updatePassword(currentPassword, newPassword) {
        try {
            const response = await ipcRenderer.invoke('change-password', { currentPassword, newPassword });
            return response;
        } catch (error) {
            return { success: false, error: 'An unexpected error occurred' };
        }
    }
});
