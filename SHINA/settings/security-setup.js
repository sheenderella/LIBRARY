
const { ipcRenderer } = require('electron');

document.getElementById('security-setup-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const securityQuestion = document.getElementById('security-question').value;
    const customQuestion = document.getElementById('custom-question').value;
    const answer = document.getElementById('answer').value;

    if (!securityQuestion && !customQuestion) {
        alert('Please select or provide a security question.');
        return;
    }

    const data = {
        securityQuestion,
        customQuestion,
        answer,
    };

    const result = await ipcRenderer.invoke('save-security-setup', data);

    if (result.success) {
        alert('Security setup saved successfully!');
    } else {
        alert('Failed to save security setup.');
    }
});
