const { ipcRenderer } = require('electron');

ipcRenderer.on('fill-edit-form', (event, record) => {
    document.getElementById('id').value = record.id;
    document.getElementById('number').value = record.number;
    document.getElementById('date_received').value = record.date_received;
    document.getElementById('class').value = record.class;
    document.getElementById('author').value = record.author;
    document.getElementById('title_of_book').value = record.title_of_book;
    document.getElementById('edition').value = record.edition;
    document.getElementById('volume').value = record.volume;
    document.getElementById('pages').value = record.pages;
    document.getElementById('source_of_fund').value = record.source_of_fund;
    document.getElementById('cost_price').value = record.cost_price;
    document.getElementById('publisher').value = record.publisher;
    document.getElementById('year').value = record.year; // Added Year field
    document.getElementById('remarks').value = record.remarks;
});

document.getElementById('editBookForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const record = {
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
        year: document.getElementById('year').value, // Added Year field
        remarks: document.getElementById('remarks').value,
    };
    ipcRenderer.invoke('updateBook', record).then(() => {
        window.close();
    });
});
