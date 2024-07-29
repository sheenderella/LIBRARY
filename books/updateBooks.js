const { ipcRenderer } = require('electron');

ipcRenderer.on('fill-update-form', (event, book) => {
    document.getElementById('updateBookForm').innerHTML = `
        <input type="hidden" id="id" name="id" value="${book.id}">
        <label for="number">Number:</label>
        <input type="text" id="number" name="number" value="${book.number}" required>
        <label for="date_received">Date Received:</label>
        <input type="date" id="date_received" name="date_received" value="${book.date_received}" required>
        <label for="class">Class:</label>
        <input type="text" id="class" name="class" value="${book.class}" required>
        <label for="author">Author:</label>
        <input type="text" id="author" name="author" value="${book.author}" required>
        <label for="title_of_book">Title of Book:</label>
        <input type="text" id="title_of_book" name="title_of_book" value="${book.title_of_book}" required>
        <label for="edition">Edition:</label>
        <input type="text" id="edition" name="edition" value="${book.edition}" required>
        <label for="volume">Volume:</label>
        <input type="text" id="volume" name="volume" value="${book.volume}" required>
        <label for="pages">Pages:</label>
        <input type="number" id="pages" name="pages" value="${book.pages}" required>
        <label for="source_of_fund">Source of Fund:</label>
        <input type="text" id="source_of_fund" name="source_of_fund" value="${book.source_of_fund}" required>
        <label for="cost_price">Cost Price:</label>
        <input type="number" id="cost_price" name="cost_price" value="${book.cost_price}" required>
        <label for="publisher">Publisher:</label>
        <input type="text" id="publisher" name="publisher" value="${book.publisher}" required>
        <label for="remarks">Remarks:</label>
        <input type="text" id="remarks" name="remarks" value="${book.remarks}">
        <button type="submit">Update Book</button>
    `;
});

document.getElementById('updateBookForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const bookData = {
        id: document.getElementById('id').value,
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
        await ipcRenderer.invoke('updateBook', bookData);
        window.close();
    } catch (error) {
        console.error('Error updating book:', error);
    }
});
