const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const addBookButton = document.getElementById('addBook');
    const deleteSelectedButton = document.getElementById('deleteSelected');
    const searchInput = document.getElementById('searchInput');
    const searchColumn = document.getElementById('searchColumn');
    const sortButtons = document.querySelectorAll('.sort-btn');
    const selectAllCheckbox = document.getElementById('selectAll');
    const paginationContainer = document.getElementById('pagination');
    
    const scrollbarTop = document.querySelector('.scrollbar-top');
    const tableContainer = document.querySelector('.table-container');
  
    // Synchronize scrolling between top scrollbar and table container
    scrollbarTop.addEventListener('scroll', function() {
        tableContainer.scrollLeft = scrollbarTop.scrollLeft;
    });
  
    tableContainer.addEventListener('scroll', function() {
        scrollbarTop.scrollLeft = tableContainer.scrollLeft;
    });
  
    // Create a dummy content to ensure scrollbar appears
    const dummyContent = document.createElement('div');
    dummyContent.style.width = tableContainer.scrollWidth + 'px';
    dummyContent.style.height = '1px';
    scrollbarTop.appendChild(dummyContent);

    // Center the scrollbar and table content horizontally
    const centerScroll = () => {
        const maxScrollLeft = tableContainer.scrollWidth - tableContainer.clientWidth;
        const centerPosition = maxScrollLeft / 2;

        tableContainer.scrollLeft = centerPosition;
        scrollbarTop.scrollLeft = centerPosition;
    };

    // Initial centering after the table is loaded
    loadBooks().then(centerScroll);

    // Event listeners for various actions
    addBookButton.addEventListener('click', openAddBookWindow);
    deleteSelectedButton.addEventListener('click', deleteSelectedBooks);
    searchInput.addEventListener('input', filterBooks);
    searchColumn.addEventListener('change', filterBooks);

    sortButtons.forEach(button => {
        button.addEventListener('click', () => sortBooks(button.dataset.column, button));
    });

    selectAllCheckbox.addEventListener('change', () => {
        const selectAll = selectAllCheckbox.checked;
        document.querySelectorAll('.select-book').forEach(checkbox => {
            checkbox.checked = selectAll;
        });
    });

    ipcRenderer.on('book-record-added', (event, record) => {
        addBookToTable(record, true);
        updatePagination();
        centerScroll(); // Re-center the table after a new book is added
    });

    ipcRenderer.on('book-record-updated', (event, record) => {
        updateBookInTable(record);
    });

    ipcRenderer.on('book-record-deleted', (event, id) => {
        deleteBookFromTable(id);
        updatePagination();
        centerScroll(); // Re-center the table after a book is deleted
    });

    window.addEventListener('resize', () => {
        adjustBooksPerPage();
        centerScroll(); // Re-center the table when window is resized
    });
    
    adjustBooksPerPage();
});



function openAddBookWindow() {
    ipcRenderer.send('open-add-book-window');
}

function openEditBookWindow(record) {
    ipcRenderer.send('open-edit-book-window', record);
}

let originalBooks = [];
let currentBooks = [];
let currentPage = 1;
let booksPerPage = 10; // Default value

function adjustBooksPerPage() {
    // Adjust the number of books per page based on window width
    const isNotMaximized = window.innerWidth < screen.width;
    booksPerPage = isNotMaximized ? 5 : 10;
    currentPage = 1; // Reset to the first page when changing books per page
    displayBooks();
    updatePagination();
}

function loadBooks() {
    ipcRenderer.invoke('getBooks').then(books => {
        originalBooks = books.slice();
        currentBooks = originalBooks;
        displayBooks();
        updatePagination();
    });
}

function displayBooks() {
    const bookList = document.getElementById('bookList');
    bookList.innerHTML = '';

    if (currentBooks.length === 0) {
        const emptyMessageRow = document.createElement('tr');
        const emptyMessageCell = document.createElement('td');
        emptyMessageCell.colSpan = 15;
        emptyMessageCell.textContent = "You haven't added any books yet";
        emptyMessageCell.classList.add('empty-message-cell'); // Add this line
        emptyMessageRow.appendChild(emptyMessageCell);
        bookList.appendChild(emptyMessageRow);
        return;
    }

    const start = (currentPage - 1) * booksPerPage;
    const end = start + booksPerPage;
    const booksToShow = currentBooks.slice(start, end);

    booksToShow.forEach(book => {
        addBookToTable(book);
    });
}


function addBookToTable(book, prepend = false) {
    const bookList = document.getElementById('bookList');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="checkbox" class="select-book" data-id="${book.id}"></td>
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
            <button class="edit-btn" data-id="${book.id}"> <i class="fas fa-pencil-alt"></i> </button>
            <button class="delete-btn" data-id="${book.id}"> <i class="fas fa-trash"></i> </button>
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

    if (prepend) {
        bookList.insertBefore(row, bookList.firstChild);
    } else {
        bookList.appendChild(row);
    }
}

function updateBookInTable(book) {
    const row = document.querySelector(`button[data-id="${book.id}"]`).closest('tr');
    row.innerHTML = `
        <td><input type="checkbox" class="select-book" data-id="${book.id}"></td>
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
            <button class="edit-btn" data-id="${book.id}"> <i class="fas fa-pencil-alt"></i> </button>
            <button class="delete-btn" data-id="${book.id}"> <i class="fas fa-trash"></i> </button>
        </td>
    `;
}

function deleteBookFromTable(id) {
    const row = document.querySelector(`button[data-id="${id}"]`).closest('tr');
    row.remove();
}

function deleteSelectedBooks() {
    const selectedBooks = document.querySelectorAll('.select-book:checked');
    const ids = Array.from(selectedBooks).map(book => book.dataset.id);

    ids.forEach(id => {
        ipcRenderer.invoke('deleteBook', id);
    });
    updatePagination();
}

function filterBooks() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const searchColumn = document.getElementById('searchColumn').value;
    currentBooks = originalBooks.filter(book => {
        const cells = Object.values(book);
        if (searchColumn === 'all') {
            return cells.some(cell => String(cell).toLowerCase().includes(searchInput));
        } else {
            return String(book[searchColumn]).toLowerCase().includes(searchInput);
        }
    });
    currentPage = 1;
    displayBooks();
    updatePagination();
}

function sortBooks(column, button) {
    const bookList = document.getElementById('bookList');
    const rows = Array.from(bookList.querySelectorAll('tr'));
    let order = button.dataset.order || 'asc';

    if (order === 'asc') {
        order = 'desc';
    } else if (order === 'desc') {
        order = 'default';
    } else {
        order = 'asc';
    }
    button.dataset.order = order;

    const currentIcon = button.querySelector('i');
    document.querySelectorAll('.sort-btn i').forEach(icon => {
        icon.classList.remove('fa-sort-up', 'fa-sort-down');
        icon.classList.add('fa-sort');
    });

    if (order === 'asc') {
        currentIcon.classList.remove('fa-sort');
        currentIcon.classList.add('fa-sort-up');
        currentBooks.sort((a, b) => {
            const aText = a[column].toString().trim();
            const bText = b[column].toString().trim();
            return !isNaN(aText) && !isNaN(bText) ? aText - bText : aText.localeCompare(bText);
        });
    } else if (order === 'desc') {
        currentIcon.classList.remove('fa-sort');
        currentIcon.classList.add('fa-sort-down');
        currentBooks.sort((a, b) => {
            const aText = a[column].toString().trim();
            const bText = b[column].toString().trim();
            return !isNaN(aText) && !isNaN(bText) ? bText - aText : bText.localeCompare(aText);
        });
    } else {
        currentBooks = originalBooks.slice();
    }

    currentPage = 1;
    displayBooks();
    updatePagination();
}

function updatePagination() {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';

    const totalPages = Math.ceil(currentBooks.length / booksPerPage);
    if (totalPages <= 1) return;

    const maxPagesToShow = 10;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (totalPages > maxPagesToShow) {
        if (currentPage > Math.floor(maxPagesToShow / 2)) {
            const prevButton = document.createElement('button');
            prevButton.innerHTML = '&laquo;';
            prevButton.classList.add('page-btn');
            prevButton.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage = Math.max(1, currentPage - 10);
                    updatePagination();
                    displayBooks();
                }
            });
            paginationContainer.appendChild(prevButton);
        }

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.add('page-btn');
        if (i === currentPage) pageButton.classList.add('active');
        pageButton.addEventListener('click', () => {
            currentPage = i;
            displayBooks();
            updatePagination();
        });
        paginationContainer.appendChild(pageButton);
    }

    if (totalPages > maxPagesToShow && endPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '&raquo;';
        nextButton.classList.add('page-btn');
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage = Math.min(totalPages, currentPage + 10);
                updatePagination();
                displayBooks();
            }
        });
        paginationContainer.appendChild(nextButton);
    }
}

function getBookFromRow(row) {
    const cells = row.querySelectorAll('td');
    return {
        id: row.querySelector('.edit-btn').dataset.id,
        number: cells[1].textContent,
        date_received: cells[2].textContent,
        class: cells[3].textContent,
        author: cells[4].textContent,
        title_of_book: cells[5].textContent,
        edition: cells[6].textContent,
        volume: cells[7].textContent,
        source_of_fund: cells[8].textContent,
        pages: cells[9].textContent,
        cost_price: cells[10].textContent,
        publisher: cells[11].textContent,
        year: cells[12].textContent,
        remarks: cells[13].textContent,
    };
}
