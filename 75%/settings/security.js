const { ipcRenderer } = require('electron');

// Handle form submission for security setup
document.getElementById('security-setup-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const securityQuestion = document.getElementById('security-question').value.trim();
    const customQuestion = document.getElementById('custom-question').value.trim();
    const answer = document.getElementById('answer').value.trim();
    const currentPassword = document.getElementById('current-password').value.trim();
    const errorContainer = document.getElementById('error-container');
    const submitButton = event.target.querySelector('button[type="submit"]');

    // Clear previous error messages
    errorContainer.style.display = 'none';
    errorContainer.textContent = '';

    // Input validation
    if (!securityQuestion && !customQuestion) {
        showError("Please select a security question or enter a custom one.");
        return;
    }
    if (!answer || !currentPassword) {
        showError("Please fill in all required fields.");
        return;
    }

    const question = customQuestion || securityQuestion; // Use custom question if provided

    // Disable the button to prevent multiple submissions
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...'; // Optional: Change button text while processing

    try {
        // Send data to the main process via ipcRenderer
        const result = await ipcRenderer.invoke('save-security-question', { question, answer, currentPassword });

        if (result.success) {
            alert("Security setup saved successfully.");
            window.location.reload(); // Optional: refresh page after saving
        } else {
            showError(result.error || "An error occurred. Please try again.");
        }
    } catch (error) {
        console.error("Error saving security setup:", error);
        showError("An unexpected error occurred. Please try again later.");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save'; // Reset button text
    }
});

// Toggle password visibility
const toggleCurrentPassword = document.getElementById('toggle-current-password');
const currentPasswordInput = document.getElementById('current-password');

toggleCurrentPassword.addEventListener('click', () => {
    const type = currentPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    currentPasswordInput.setAttribute('type', type);
    toggleCurrentPassword.classList.toggle('fa-eye');
    toggleCurrentPassword.classList.toggle('fa-eye-slash');
});

// Function to show error messages
function showError(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.style.display = 'block';
    errorContainer.textContent = message;
}

// Disable one input field based on the other
const securityQuestionInput = document.getElementById('security-question');
const customQuestionInput = document.getElementById('custom-question');

// Handle changes in the security question dropdown
securityQuestionInput.addEventListener('change', () => {
    if (securityQuestionInput.value === "cancel") {
        // If "Cancel Selection" is selected, reset the dropdown and re-enable the custom question input
        securityQuestionInput.selectedIndex = 0; // Reset dropdown to default value
        customQuestionInput.disabled = false;    // Enable custom question input
    } else if (securityQuestionInput.value.trim() !== "") {
        customQuestionInput.disabled = true;     // Disable custom question input
    } else {
        customQuestionInput.disabled = false;    // Enable custom question input
    }
});

// Handle input in the custom question field
customQuestionInput.addEventListener('input', () => {
    if (customQuestionInput.value.trim() !== "") {
        securityQuestionInput.disabled = true;    // Disable the security question dropdown
    } else {
        securityQuestionInput.disabled = false;   // Enable the security question dropdown
    }
});
