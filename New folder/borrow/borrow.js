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
let borrowList, searchInput, statusFilter, startDateFilter, endDateFilter;
let allRecords = [];
let currentSort = { column: null, direction: 'asc' };

document.addEventListener('DOMContentLoaded', init);

function init() {
    borrowList = document.getElementById("borrowList");
    searchInput = document.getElementById("searchInput");
    statusFilter = document.getElementById("statusFilter");
    startDateFilter = document.getElementById("startDateFilter");
    endDateFilter = document.getElementById("endDateFilter");

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
    const cancelDateFilterButton = document.getElementById('cancelDateFilter');
    const applyDateFilterButton = document.getElementById('applyDateFilter');
    const dateFilterButton = document.querySelector('.dropbtn');
    const dropdownContent = document.querySelector('.dropdown-content');

    if (cancelDateFilterButton) addEvent(cancelDateFilterButton, 'click', handleCancelDateFilter);
    if (applyDateFilterButton) addEvent(applyDateFilterButton, 'click', handleApplyDateFilter);
    if (dateFilterButton) addEvent(dateFilterButton, 'click', toggleDropdown);
    if (document) addEvent(document, 'click', closeDropdownOnOutsideClick);
    if (addBorrowForm) addEvent(addBorrowForm, 'submit', handleAddBorrowSubmit);
    if (updateBorrowForm) addEvent(updateBorrowForm, 'submit', handleUpdateBorrowSubmit);
    if (addBorrowButton) addEvent(addBorrowButton, 'click', () => ipcRenderer.send('open-add-borrow-window'));
    if (deleteSelectedButton) addEvent(deleteSelectedButton, 'click', handleDeleteSelected);
    if (selectAllCheckbox) addEvent(selectAllCheckbox, 'change', handleSelectAll);
    if (searchInput) addEvent(searchInput, 'input', debounce(filterAndRenderRecords, 300));
    if (statusFilter) addEvent(statusFilter, 'change', filterAndRenderRecords);
    if (prevPageButton) addEvent(prevPageButton, 'click', () => pagination.changePage(-1, renderBorrowRecords));
    if (nextPageButton) addEvent(nextPageButton, 'click', () => pagination.changePage(1, renderBorrowRecords));

    document.getElementById('statusFilter')?.addEventListener('change', function() {
        var selectedOption = this.options[this.selectedIndex].text;
        var statusText = selectedOption === 'All' ? 'Filter by Status' : selectedOption;
        document.getElementById('statusFilterText').textContent = statusText;
    });

    addSortEventListeners();

    ipcRenderer.on('borrow-record-added', (event, record) => updateRecordList(record, 'add'));
    ipcRenderer.on('borrow-record-updated', (event, record) => updateRecordList(record, 'update'));
    ipcRenderer.on('updateBorrow-renderer', (event, record) => updateRecordList(record, 'update'));
    ipcRenderer.on('load-borrower-log', (event, borrowerName) => loadBorrowerLog(borrowerName));
    ipcRenderer.on('fill-update-form', (event, record) => fillUpdateForm(record));
    ipcRenderer.on('borrow-record-deleted', (event, id) => handleRecordDeletion(id));
}


document.getElementById('statusFilter').addEventListener('change', function() {
    var selectedOption = this.options[this.selectedIndex].text;
    var statusText = selectedOption === 'All' ? 'Filter by Status' : selectedOption;
    document.getElementById('statusFilterText').textContent = statusText;

    // Call the function to filter and render records
    filterAndRenderRecords();
});

function handleCancelDateFilter() {
    startDateFilter.value = '';
    endDateFilter.value = '';
    filterAndRenderRecords();
    closeDropdown();
}

function handleApplyDateFilter() {
    filterAndRenderRecords();
    closeDropdown();
}

function toggleDropdown(event) {
    event.stopPropagation();
    const dropdownContent = document.querySelector('.dropdown-content');
    dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
}

function closeDropdown() {
    const dropdownContent = document.querySelector('.dropdown-content');
    dropdownContent.style.display = 'none';
}

function closeDropdownOnOutsideClick(event) {
    const dropdownContent = document.querySelector('.dropdown-content');
    if (!dropdownContent.contains(event.target) && !document.querySelector('.dropbtn').contains(event.target)) {
        closeDropdown();
    }
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
    filterAndRenderRecords();
}

function addEvent(element, event, handler) {
    if (element) element.addEventListener(event, handler);
}

function addSortEventListeners() {
    document.querySelectorAll('.sort-btn').forEach(button => {
        button.addEventListener('click', () => sortTable(button.dataset.column, button));
    });
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
        filterAndRenderRecords();
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
                <button class="btn btn-info edit-btn" data-id="${record.id}">  <i class="fas fa-pencil-alt"></i> </button>
                <button class="delete-btn" data-id="${record.id}"> <i class="fas fa-trash"></i> </button>
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
    const filteredRecords = filterBorrowRecords(allRecords, searchInput, statusFilter, startDateFilter, endDateFilter);
    const sortedRecords = sortRecords(filteredRecords, currentSort.column, currentSort.direction);
    pagination.setCurrentPage(1);
    pagination.renderBorrowRecords(sortedRecords, renderBorrowRecords);
}

function sortTable(column, button) {
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
        currentSort = { column, direction: 'asc' };
    } else if (order === 'desc') {
        currentIcon.classList.remove('fa-sort');
        currentIcon.classList.add('fa-sort-down');
        currentSort = { column, direction: 'desc' };
    } else {
        currentIcon.classList.remove('fa-sort-up', 'fa-sort-down');
        currentIcon.classList.add('fa-sort');
        currentSort = { column: null, direction: 'asc' };
    }

    filterAndRenderRecords();
}

function sortRecords(records, column, direction) {
    if (!column) return records;

    const sortedRecords = [...records];
    sortedRecords.sort((a, b) => {
        const aText = a[column] ? a[column].toString().trim() : '';
        const bText = b[column] ? b[column].toString().trim() : '';
        if (!isNaN(aText) && !isNaN(bText)) {
            return direction === 'asc' ? aText - bText : bText - aText;
        } else {
            return direction === 'asc' ? aText.localeCompare(bText) : bText.localeCompare(aText);
        }
    });

    return sortedRecords;
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
    filterAndRenderRecords();
}
