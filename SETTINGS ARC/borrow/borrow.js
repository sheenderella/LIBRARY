const { ipcRenderer } = require('electron');
const handleAddBorrow = require('./addBorrow.js');

const handleDeleteBorrow = require('./deleteBorrow.js');
const pagination = require('./pagination.js');
const { debounce, filterBorrowRecords } = require('./filters.js');

// DOM Elements
let borrowList, searchInput, statusFilter, startDateFilter, endDateFilter;
let allRecords = [];
let currentSort = { column: null, direction: 'asc' };

document.addEventListener('DOMContentLoaded', init);

// Sidebar toggle functionality
document.getElementById('sidebarCollapse').addEventListener('click', function () {
    const wrapper = document.getElementById('wrapper');
    const sidebar = document.getElementById('sidebar-wrapper');
    
    wrapper.classList.toggle('collapsed');
    sidebar.classList.toggle('collapsed');
});

//LOGOUT
document.getElementById('logout-link').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent default link behavior

    ipcRenderer.invoke('logout').then(() => {
        window.location.href = './login/login.html'; // Redirect to login page after logout
    }).catch(error => {
        console.error('Error during logout:', error);
        alert('An error occurred. Please try again.');
    });
});


function init() {
    borrowList = document.getElementById("borrowList");
    searchInput = document.getElementById("searchInput");
    statusFilter = document.getElementById("statusFilter");
    startDateFilter = document.getElementById("startDateFilter");
    endDateFilter = document.getElementById("endDateFilter");

    console.log('Initialized DOM elements:', {
        borrowList,
        searchInput,
        statusFilter,
        startDateFilter,
        endDateFilter
    });

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



document.addEventListener('DOMContentLoaded', () => {
    const dateRangeSelect = document.getElementById('dateRangeSelect');
    const customDateRange = document.getElementById('customDateRange');
    const applyDateRangeButton = document.getElementById('applyDateRange');
    const clearDateRangeButton = document.getElementById('clearDateRange');

    // Show or hide the custom date range inputs based on the dropdown selection
    dateRangeSelect.addEventListener('change', (event) => {
        if (event.target.value === 'custom') {
            customDateRange.style.display = 'block';
        } else {
            customDateRange.style.display = 'none';
        }
    });

    // Apply custom date range
    applyDateRangeButton.addEventListener('click', () => {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        // Handle the date range filtering logic here
        console.log(`Applying date range from ${startDate} to ${endDate}`);
        customDateRange.style.display = 'none';
        dateRangeSelect.value = ''; // Optionally reset the dropdown
    });

    // Clear the date range selection
    clearDateRangeButton.addEventListener('click', () => {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        dateRangeSelect.value = '';
        customDateRange.style.display = 'none';
        // Handle clearing of date range filter here
        console.log('Cleared date range filter');
    });

    // Close custom date range if clicking outside of it
    document.addEventListener('click', (event) => {
        const isClickInside = customDateRange.contains(event.target) || dateRangeSelect.contains(event.target);
        if (!isClickInside) {
            customDateRange.style.display = 'none';
            dateRangeSelect.value = ''; // Optionally reset the dropdown
        }
    });
});


document.getElementById('dateRangeSelect').addEventListener('change', function() {
    const customDateRange = document.getElementById('customDateRange');
    if (this.value === 'custom') {
        customDateRange.style.display = 'block';
    } else {
        customDateRange.style.display = 'none';
    }
});

document.querySelector('.date-range-box').addEventListener('click', function() {
    document.getElementById('dateRangeSelect').click();
});


function filterByDateRange() {
    const selectedRange = dateRangeSelect.value;
    let startDate = '';
    let endDate = '';

    const today = new Date();
    if (selectedRange === 'last_7_days') {
        startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
    } else if (selectedRange === 'last_30_days') {
        startDate = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
    } else if (selectedRange === 'this_month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (selectedRange === 'last_month') {
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
        endDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
    } else if (selectedRange === 'reset') {
        // Reset date filters
        startDate = '';
        endDate = '';
    }

    // Filter the records based on the computed startDate and endDate
    const filteredRecords = allRecords.filter(record => {
        const recordDate = new Date(record.borrowDate);
        return (!startDate || recordDate >= new Date(startDate)) &&
               (!endDate || recordDate <= new Date(endDate));
    });

    renderBorrowRecords(filteredRecords);
}

// Event listener for date range selection
dateRangeSelect.addEventListener('change', filterByDateRange);


document.addEventListener('DOMContentLoaded', function () {
    // Date range selection and display logic
    const dateRangeSelect = document.getElementById('dateRangeSelect');
    const customRange = document.getElementById('customDateRange');
    const clearDateRangeButton = document.getElementById('clearDateRange');

    dateRangeSelect.addEventListener('change', function () {
        if (this.value === 'custom') {
            customRange.style.display = 'block';
        } else {
            customRange.style.display = 'none';
        }
    });

});



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
    
    // Set a custom attribute 'checked' in each record to keep track of selection state
    allRecords.forEach(record => {
        record.checked = isChecked;
    });

    // Update the checkbox state in the current page view
    document.querySelectorAll('.select-record').forEach(checkbox => {
        checkbox.checked = isChecked;
    });
}


function handleDeleteSelected() {
    const selectedIds = allRecords.filter(record => record.checked).map(record => record.id);

    if (selectedIds.length === 0) {
        alert('No records selected for deletion.');
        return;
    }

    const confirmation = confirm('Are you sure you want to delete the selected records?');

    if (confirmation) {
        selectedIds.forEach(id => deleteBorrowRecordWithoutConfirmation(id));
        alert('Selected records deleted successfully!');
    } else {
        console.log('Bulk deletion cancelled.');
    }
}


async function deleteBorrowRecordWithoutConfirmation(id) {
    try {
        console.log('Deleting record with ID:', id);
        await handleDeleteBorrow(id); // This will now also send the deletion event
    } catch (error) {
        console.error('Error handling delete borrow:', error);
    }
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
        alert('Record added successfully!'); // Alert for successful addition
        resetForm('addBorrowForm');
        ipcRenderer.send('close-form-window');
    } catch (error) {
        console.error('Error handling add borrow:', error);
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

    if (records.length === 0) {
        borrowList.innerHTML = `
            <tr>
                <td colspan="7" style="
                    text-align: center; 
                    font-style: italic; 
                    padding: 10px; 
                    background-color: #f2f2f2;
                    color: #6c757d;
                    height: 350px;
                    font-size: 1.25rem;
                ">
                    Table is empty
                </td>
            </tr>
        `;
        return;
    }

    borrowList.innerHTML = records.map(record => `
        <tr data-id="${record.id}">
            <td><input type="checkbox" class="select-record" data-id="${record.id}" ${record.checked ? 'checked' : ''}></td>
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
    const confirmation = confirm('Are you sure you want to delete this record?');

    if (confirmation) {
        try {
            console.log('Deleting record with ID:', id);
            await handleDeleteBorrow(id); // This will now also send the deletion event
            alert('Record deleted successfully!'); // Alert for successful deletion
        } catch (error) {
            console.error('Error handling delete borrow:', error);
        }
    } else {
        console.log('Deletion cancelled.');
    }
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


