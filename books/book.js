const { ipcRenderer } = require('electron');
const handleAddBook = require('./addBook.js');
const pagination = require('./pagination.js');
const { debounce, filterBookRecords } = require('./filters.js');

// DOM Elements
let bookList, searchInput, classFilter, dateFilter;
let allRecords = [];
let currentSort = { column: null, direction: 'asc' };

document.addEventListener('DOMContentLoaded', init);

function init() {
    bookList = document.getElementById("bookList");
    searchInput = document.getElementById("searchInput");
    classFilter = document.getElementById("classFilter");
    dateFilter = document.getElementById("dateFilter");

    setupEventListeners();
    fetchBookRecords();
}

function setupEventListeners() {
    const addBookForm = document.getElementById('addBookForm');
    const addBookButton = document.getElementById('addBook');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');

    addEvent(addBookForm, 'submit', handleAddBookSubmit);
    addEvent(addBookButton, 'click', () => ipcRenderer.send('open-add-book-window'));
    addEvent(searchInput, 'input', debounce(filterAndRenderRecords, 300));
    addEvent(classFilter, 'change', filterAndRenderRecords);
    addEvent(dateFilter, 'change', filterAndRenderRecords);
    addEvent(prevPageButton, 'click', () => pagination.changePage(-1, renderBookRecords));
    addEvent(nextPageButton, 'click', () => pagination.changePage(1, renderBookRecords));

    addSortEventListeners();
}

function addEvent(element, event, handler) {
    if (element) element.addEventListener(event, handler);
}

function addSortEventListeners() {
    const sortNumberAsc = document.getElementById('sortNumberAsc');
    const sortNumberDesc = document.getElementById('sortNumberDesc');
    const sortDateReceivedAsc = document.getElementById('sortDateReceivedAsc');
    const sortDateReceivedDesc = document.getElementById('sortDateReceivedDesc');
    const sortClassAsc = document.getElementById('sortClassAsc');
    const sortClassDesc = document.getElementById('sortClassDesc');
    const sortAuthorAsc = document.getElementById('sortAuthorAsc');
    const sortAuthorDesc = document.getElementById('sortAuthorDesc');
    const sortTitleAsc = document.getElementById('sortTitleAsc');
    const sortTitleDesc = document.getElementById('sortTitleDesc');

    addEvent(sortNumberAsc, 'click', () => sortRecords('number', 'asc'));
    addEvent(sortNumberDesc, 'click', () => sortRecords('number', 'desc'));
    addEvent(sortDateReceivedAsc, 'click', () => sortRecords('dateReceived', 'asc'));
    addEvent(sortDateReceivedDesc, 'click', () => sortRecords('dateReceived', 'desc'));
    addEvent(sortClassAsc, 'click', () => sortRecords('class', 'asc'));
    addEvent(sortClassDesc, 'click', () => sortRecords('class', 'desc'));
    addEvent(sortAuthorAsc, 'click', () => sortRecords('author', 'asc'));
    addEvent(sortAuthorDesc, 'click', () => sortRecords('author', 'desc'));
    addEvent(sortTitleAsc, 'click', () => sortRecords('titleOfBook', 'asc'));
    addEvent(sortTitleDesc, 'click', () => sortRecords('titleOfBook', 'desc'));
}

async function fetchBookRecords() {
    try {
        allRecords = await ipcRenderer.invoke('listBookRecords');
        pagination.initialize(allRecords.length);
        renderBookRecords();
    } catch (error) {
        console.error('Error fetching book records:', error);
    }
}

function renderBookRecords() {
    const paginatedRecords = pagination.paginate(allRecords);

    bookList.innerHTML = '';
    paginatedRecords.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.number}</td>
            <td>${record.dateReceived}</td>
            <td>${record.class}</td>
            <td>${record.author}</td>
            <td>${record.titleOfBook}</td>
            <td>
                <button class="btn btn-edit" onclick="editBook(${record.number})">Edit</button>
                <button class="btn btn-delete" onclick="deleteBook(${record.number})">Delete</button>
            </td>
        `;
        bookList.appendChild(row);
    });
}

function filterAndRenderRecords() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedClass = classFilter.value;
    const selectedDate = dateFilter.value;

    const filteredRecords = filterBookRecords(allRecords, searchTerm, selectedClass, selectedDate);
    pagination.initialize(filteredRecords.length);
    renderBookRecords(filteredRecords);
}

function sortRecords(column, direction) {
    currentSort = { column, direction };
    allRecords.sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    renderBookRecords();
}

async function handleAddBookSubmit(event) {
    try {
        const newRecord = await handleAddBook(event);
        allRecords.push(newRecord);
        filterAndRenderRecords();
    } catch (error) {
        console.error('Error adding new book:', error);
    }
}

window.editBook = (number) => {
    // Open the edit book window, passing the book number
    ipcRenderer.send('open-edit-book-window', number);
};

window.deleteBook = async (number) => {
    try {
        await ipcRenderer.invoke('deleteBook', number);
        allRecords = allRecords.filter(record => record.number !== number);
        filterAndRenderRecords();
    } catch (error) {
        console.error('Error deleting book:', error);
    }
};
