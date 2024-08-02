const { ipcRenderer } = require('electron');

document.getElementById('deleteBookForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const number = document.getElementById('number').value;

    try {
        await ipcRenderer.invoke('deleteBook', number);
        window.close();
    } catch (error) {
        console.error('Error deleting book:', error);
    }
});
