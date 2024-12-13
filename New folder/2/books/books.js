const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const addBookButton = document.getElementById('addBook');
    const searchInput = document.getElementById('searchInput');
    const searchColumn = document.getElementById('searchColumn');
    const sortButtons = document.querySelectorAll('.sort-btn');

    addBookButton.addEventListener('click', () => {
        openAddBookWindow();
    });

    searchInput.addEventListener('input', () => {
        filterBooks();
    });

    searchColumn.addEventListener('change', () => {
        filterBooks();
    });

    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            sortBooks(button.dataset.column, button.dataset.order);
        });
    });

    ipcRenderer.on('book-record-added', (event, record) => {
        addBookToTable(record);
    });

    ipcRenderer.on('book-record-updated', (event, record) => {
        updateBookInTable(record);
    });

    ipcRenderer.on('book-record-deleted', (event, id) => {
        deleteBookFromTable(id);
    });

    loadBooks();
});

function openAddBookWindow() {
    ipcRenderer.send('open-add-book-window');
}

function openEditBookWindow(record) {
    ipcRenderer.send('open-edit-book-window', record);
}

function loadBooks() {
    ipcRenderer.invoke('getBooks').then(books => {
        const bookList = document.getElementById('bookList');
        bookList.innerHTML = '';
        books.forEach(book => {
            addBookToTable(book);
        });
    });
}

function addBookToTable(book) {
    const bookList = document.getElementById('bookList');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${book.number}</td>
        <td>${book.date_received}</td>
        <td>${book.class}</td>
        <td>${book.author}</td>
        <td>${book.title_of_book}</td>
        <td>${book.edition}</td>
        <td>${book.volume}</td>
        <td>${book.source_of_fund}</td>
        <td>${book.pages}</td>
        <td>${book.cost_price}</td>
        <td>${book.publisher}</td>
        <td>${book.year}</td>        
        <td>${book.remarks}</td>
        <td>
            <button class="edit-btn" data-id="${book.id}">Edit</button>
            <button class="delete-btn" data-id="${book.id}">Delete</button>
        </td>
    `;

    row.querySelector('.edit-btn').addEventListener('click', () => {
        const record = getBookFromRow(row);
        openEditBookWindow(record);
    });

    row.querySelector('.delete-btn').addEventListener('click', () => {
        const id = book.id;
        ipcRenderer.invoke('deleteBook', id);
    });

    bookList.appendChild(row);
}

function updateBookInTable(book) {
    const row = document.querySelector(`button[data-id="${book.id}"]`).closest('tr');
    row.innerHTML = `
        <td>${book.number}</td>
        <td>${book.date_received}</td>
        <td>${book.class}</td>
        <td>${book.author}</td>
        <td>${book.title_of_book}</td>
        <td>${book.edition}</td>
        <td>${book.volume}</td>
        <td>${book.source_of_fund}</td>
        <td>${book.pages}</td>
        <td>${book.cost_price}</td>
        <td>${book.publisher}</td>
        <td>${book.year}</td>        
        <td>${book.remarks}</td>
        <td>
            <button class="edit-btn" data-id="${book.id}">Edit</button>
            <button class="delete-btn" data-id="${book.id}">Delete</button>
        </td>
    `;
}

function deleteBookFromTable(id) {
    const row = document.querySelector(`button[data-id="${id}"]`).closest('tr');
    row.remove();
}

function filterBooks() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const searchColumn = document.getElementById('searchColumn').value;
    const rows = document.querySelectorAll('#bookList tr');

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let matches = false;

        if (searchColumn === 'all') {
            matches = Array.from(cells).some(cell => cell.textContent.toLowerCase().includes(searchInput));
        } else {
            const cell = row.querySelector(`td:nth-child(${getColumnIndex(searchColumn)})`);
            matches = cell && cell.textContent.toLowerCase().includes(searchInput);
        }

        row.style.display = matches ? '' : 'none';
    });
}

function sortBooks(column, order) {
    const rows = Array.from(document.querySelectorAll('#bookList tr'));
    rows.sort((a, b) => {
        const aText = a.querySelector(`td:nth-child(${getColumnIndex(column)})`).textContent.trim();
        const bText = b.querySelector(`td:nth-child(${getColumnIndex(column)})`).textContent.trim();

        if (!isNaN(aText) && !isNaN(bText)) {
            return order === 'asc' ? aText - bText : bText - aText;
        } else {
            return order === 'asc' ? aText.localeCompare(bText) : bText.localeCompare(aText);
        }
    });

    const bookList = document.getElementById('bookList');
    bookList.innerHTML = '';
    rows.forEach(row => {
        bookList.appendChild(row);
    });
}

function getColumnIndex(columnName) {
    const columns = [
        'number', 'date_received', 'class', 'author', 'title_of_book', 
        'edition', 'volume', 'source_of_fund', 'pages', 'cost_price', 
        'publisher', 'year', 'remarks'
    ];
    return columns.indexOf(columnName) + 1;
}
