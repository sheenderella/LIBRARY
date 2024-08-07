/**
 * Manages the main functionality for displaying, sorting, and filtering borrow records.
 * 
 * Handles user interactions, such as adding, updating, and deleting records, 
 * and updates the UI accordingly. Also manages pagination and provides 
 * integration with the Electron main process through IPC.
 */



const { ipcRenderer } = require('electron');
const handleAddBorrow = require('./addBorrow.js');
const handleUpdateBorrow = require('./updateBorrow.js');
const handleDeleteBorrow = require('./deleteBorrow.js');
const pagination = require('./pagination.js');
const { debounce, filterBorrowRecords } = require('./filters.js');

// DOM Elements
let borrowList, searchInput, statusFilter, dateFilter;
let allRecords = [];
let currentSort = { column: null, direction: 'asc' };

document.addEventListener('DOMContentLoaded', init);

function init() {
    borrowList = document.getElementById("borrowList");
    searchInput = document.getElementById("searchInput");
    statusFilter = document.getElementById("statusFilter");
    dateFilter = document.getElementById("dateFilter");

    setupEventListeners();
    fetchBorrowRecords();
}

function setupEventListeners() {
    const addBorrowForm = document.getElementById('addBorrowForm');
    const updateBorrowForm = document.getElementById('updateBorrowForm');
    const addBorrowButton = document.getElementById('addBorrow');
    const deleteSelectedButton = document.getElementById('deleteSelected');
    const selectAllCheckbox = document.getElementById('selectAll');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');

    addEvent(addBorrowForm, 'submit', handleAddBorrowSubmit);
    addEvent(updateBorrowForm, 'submit', handleUpdateBorrowSubmit);
    addEvent(addBorrowButton, 'click', () => ipcRenderer.send('open-add-borrow-window'));
    addEvent(deleteSelectedButton, 'click', handleDeleteSelected);
    addEvent(selectAllCheckbox, 'change', handleSelectAll);
    addEvent(searchInput, 'input', debounce(filterAndRenderRecords, 300));
    addEvent(statusFilter, 'change', filterAndRenderRecords);
    addEvent(dateFilter, 'change', filterAndRenderRecords);
    addEvent(prevPageButton, 'click', () => pagination.changePage(-1, renderBorrowRecords));
    addEvent(nextPageButton, 'click', () => pagination.changePage(1, renderBorrowRecords));

    addSortEventListeners();

    ipcRenderer.on('borrow-record-added', (event, record) => updateRecordList(record, 'add'));
    ipcRenderer.on('borrow-record-updated', (event, record) => updateRecordList(record, 'update'));
    ipcRenderer.on('updateBorrow-renderer', (event, record) => updateRecordList(record, 'update'));
    ipcRenderer.on('load-borrower-log', (event, borrowerName) => loadBorrowerLog(borrowerName));
    ipcRenderer.on('fill-update-form', (event, record) => fillUpdateForm(record));
    ipcRenderer.on('borrow-record-deleted', (event, id) => handleRecordDeletion(id));
}

function handleSelectAll(event) {
    const isChecked = event.target.checked;
    document.querySelectorAll('.select-record').forEach(checkbox => {
        checkbox.checked = isChecked;
    });
}

function handleDeleteSelected() {
    const selectedIds = Array.from(document.querySelectorAll('.select-record:checked')).map(checkbox => checkbox.getAttribute('data-id'));
    selectedIds.forEach(id => deleteBorrowRecord(id));
}




function handleRecordDeletion(id) {
    allRecords = allRecords.filter(record => record.id !== parseInt(id));
    pagination.renderBorrowRecords(allRecords, renderBorrowRecords);
}
function addEvent(element, event, handler) {
    if (element) element.addEventListener(event, handler);
}

function addSortEventListeners() {
    const sortBorrowerNameAsc = document.getElementById('sortBorrowerNameAsc');
    const sortBorrowerNameDesc = document.getElementById('sortBorrowerNameDesc');
    const sortBookTitleAsc = document.getElementById('sortBookTitleAsc');
    const sortBookTitleDesc = document.getElementById('sortBookTitleDesc');
    const sortBorrowDateAsc = document.getElementById('sortBorrowDateAsc');
    const sortBorrowDateDesc = document.getElementById('sortBorrowDateDesc');
    const sortBorrowStatusAsc = document.getElementById('sortBorrowStatusAsc');
    const sortBorrowStatusDesc = document.getElementById('sortBorrowStatusDesc');

    if (sortBorrowerNameAsc) {
        sortBorrowerNameAsc.addEventListener('click', () => sortTable('borrowerName', 'asc'));
    }

    if (sortBorrowerNameDesc) {
        sortBorrowerNameDesc.addEventListener('click', () => sortTable('borrowerName', 'desc'));
    }

    if (sortBookTitleAsc) {
        sortBookTitleAsc.addEventListener('click', () => sortTable('bookTitle', 'asc'));
    }

    if (sortBookTitleDesc) {
        sortBookTitleDesc.addEventListener('click', () => sortTable('bookTitle', 'desc'));
    }

    if (sortBorrowDateAsc) {
        sortBorrowDateAsc.addEventListener('click', () => sortTable('borrowDate', 'asc'));
    }

    if (sortBorrowDateDesc) {
        sortBorrowDateDesc.addEventListener('click', () => sortTable('borrowDate', 'desc'));
    }
}
async function handleAddBorrowSubmit(event) {
    event.preventDefault();
    try {
        const newRecord = await handleAddBorrow(event);
        ipcRenderer.send('addBorrow', newRecord);
        resetForm('addBorrowForm');
        ipcRenderer.send('close-form-window');
    } catch (error) {
        console.error('Error handling add borrow:', error);
    }
}

async function handleUpdateBorrowSubmit(event) {
    event.preventDefault();
    try {
        const updatedRecord = await handleUpdateBorrow(event);
        ipcRenderer.send('updateBorrow', updatedRecord);
    } catch (error) {
        console.error('Error handling update borrow:', error);
    }
}

async function fetchBorrowRecords() {
    try {
        allRecords = await ipcRenderer.invoke('getBorrows');
        allRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        pagination.renderBorrowRecords(allRecords, renderBorrowRecords);
    } catch (error) {
        console.error('Error fetching borrow records:', error);
    }
}

function renderBorrowRecords(records) {
    if (!borrowList) {
        console.error('Borrow list element not found');
        return;
    }

    borrowList.innerHTML = records.map(record => `
        <tr data-id="${record.id}">
            <td><input type="checkbox" class="select-record" data-id="${record.id}"></td>
            <td><a href="#" class="borrower-name" data-name="${record.borrowerName}">${record.borrowerName}</a></td>
            <td>${record.bookTitle}</td>
            <td>${record.borrowDate}</td>
            <td>${record.borrowStatus}</td>
            <td>
                <button class="btn btn-info edit-btn" data-id="${record.id}">Edit</button>
                <button class="btn btn-danger delete-btn" data-id="${record.id}">Delete</button>
            </td>
        </tr>
    `).join('');

    setupRecordEventListeners();
}

function setupRecordEventListeners() {
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', () => {
            const recordId = button.getAttribute('data-id');
            console.log('Edit button clicked for ID:', recordId);
            openUpdateWindow(recordId);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', () => {
            const recordId = button.getAttribute('data-id');
            console.log('Delete button clicked for ID:', recordId);
            deleteBorrowRecord(recordId);
        });
    });

    document.querySelectorAll('.borrower-name').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            const borrowerName = link.getAttribute('data-name');
            console.log('Borrower name link clicked:', borrowerName);
            showBorrowerLog(borrowerName);
        });
    });
}
async function deleteBorrowRecord(id) {
    try {
        console.log('Deleting record with ID:', id);
        await handleDeleteBorrow(id); // This will now also send the deletion event
    } catch (error) {
        console.error('Error handling delete borrow:', error);
    }
}


function openUpdateWindow(recordId) {
    const record = allRecords.find(r => r.id === parseInt(recordId));
    ipcRenderer.send('open-update-window', record);
}

function showBorrowerLog(borrowerName) {
    const url = `borrowerLog.html?borrowerName=${encodeURIComponent(borrowerName)}`;
    window.location.href = url;
}

async function loadBorrowerLog(borrowerName) {
    try {
        const log = await ipcRenderer.invoke('getBorrowerLog', borrowerName);
        displayLog(log);
    } catch (error) {
        console.error('Error loading borrower log:', error);
    }
}

function displayLog(log) {
    const container = document.getElementById('borrowerLogContainer');
    container.innerHTML = log.map(entry => `
        <div class="log-entry">
            <p><strong>Book Title:</strong> ${entry.bookTitle}</p>
            <p><strong>Borrow Date:</strong> ${entry.borrowDate}</p>
            <p><strong>Status:</strong> ${entry.borrowStatus}</p>
        </div>
    `).join('');
}

function fillUpdateForm(record) {
    document.getElementById('updateBorrowerId').value = record.id;
    document.getElementById('updateBorrowerName').value = record.borrowerName;
    document.getElementById('updateBookTitle').value = record.bookTitle;
    document.getElementById('updateBorrowDate').value = record.borrowDate;
    document.getElementById('updateBorrowStatus').value = record.borrowStatus;
}

function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
}

function filterAndRenderRecords() {
    filterBorrowRecords(allRecords, searchInput, statusFilter, dateFilter, pagination, renderBorrowRecords);
}

function sortTable(column, direction) {
    console.log(`Sorting by column: ${column}, direction: ${direction}`);
    if (currentSort.column === column && currentSort.direction === direction) {
        // If the same column and direction are clicked again, reset to default sort
        currentSort = { column: null, direction: 'asc' };
        allRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
        currentSort = { column, direction };

        allRecords.sort((a, b) => {
            const valueA = a[column] ? a[column].toString().toLowerCase() : '';
            const valueB = b[column] ? b[column].toString().toLowerCase() : '';
            
            console.log(`Comparing ${valueA} with ${valueB}`);

            if (valueA < valueB) return direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    renderBorrowRecords(allRecords);
    pagination.renderBorrowRecords(allRecords, renderBorrowRecords);
}


function updateRecordList(record, action) {
    if (action === 'add') {
        console.log('Adding new record:', record);
        allRecords.unshift(record);
    } else if (action === 'update') {
        console.log('Updating record:', record);
        const index = allRecords.findIndex(r => r.id === record.id);
        if (index !== -1) allRecords[index] = record;
    }
    allRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    renderBorrowRecords(allRecords);
    pagination.renderBorrowRecords(allRecords, renderBorrowRecords);
}