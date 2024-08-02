const { ipcRenderer } = require('electron');

document.getElementById('addBookForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const bookData = {
        number: document.getElementById('number').value,
        date_received: document.getElementById('date_received').value,
        class: document.getElementById('class').value,
        author: document.getElementById('author').value,
        title_of_book: document.getElementById('title_of_book').value,
        edition: document.getElementById('edition').value,
        volume: document.getElementById('volume').value,
        pages: document.getElementById('pages').value,
        source_of_fund: document.getElementById('source_of_fund').value,
        cost_price: document.getElementById('cost_price').value,
        publisher: document.getElementById('publisher').value,
        remarks: document.getElementById('remarks').value,
    };

    try {
        await ipcRenderer.invoke('addBook', bookData);
        window.close();
    } catch (error) {
        console.error('Error adding book:', error);
    }
});
