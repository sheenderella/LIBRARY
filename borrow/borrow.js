const { ipcRenderer } = require('electron');

let borrowList;
let borrowerId;
let borrowerName;
let bookTitle;
let borrowDate;
let borrowStatus;
let addBorrow;
let updateBorrow;
let searchInput;
let statusFilter;
let dateFilter;

window.onload = function() {
    borrowList = document.getElementById("borrowList");
    borrowerId = document.getElementById("borrowerId");
    borrowerName = document.getElementById("borrowerName");
    bookTitle = document.getElementById("bookTitle");
    borrowDate = document.getElementById("borrowDate");
    borrowStatus = document.getElementById("borrowStatus");
    addBorrow = document.getElementById("addBorrow");
    updateBorrow = document.getElementById("updateBorrow");
    searchInput = document.getElementById("searchInput");
    statusFilter = document.getElementById("statusFilter");
    dateFilter = document.getElementById("dateFilter");

    addBorrow.addEventListener('click', addBorrowRecord);
    updateBorrow.addEventListener('click', updateBorrowRecord);
    searchInput.addEventListener('input', filterBorrowRecords);
    statusFilter.addEventListener('change', filterBorrowRecords);
    dateFilter.addEventListener('change', filterBorrowRecords);

    document.getElementById("sortBorrowerNameAsc").addEventListener('click', () => sortBorrowRecords('borrowerName', 'asc'));
    document.getElementById("sortBorrowerNameDesc").addEventListener('click', () => sortBorrowRecords('borrowerName', 'desc'));
    document.getElementById("sortBookTitleAsc").addEventListener('click', () => sortBorrowRecords('bookTitle', 'asc'));
    document.getElementById("sortBookTitleDesc").addEventListener('click', () => sortBorrowRecords('bookTitle', 'desc'));
    document.getElementById("sortBorrowDateAsc").addEventListener('click', () => sortBorrowRecords('borrowDate', 'asc'));
    document.getElementById("sortBorrowDateDesc").addEventListener('click', () => sortBorrowRecords('borrowDate', 'desc'));
    document.getElementById("sortBorrowStatusAsc").addEventListener('click', () => sortBorrowRecords('borrowStatus', 'asc'));
    document.getElementById("sortBorrowStatusDesc").addEventListener('click', () => sortBorrowRecords('borrowStatus', 'desc'));

    getBorrowRecords();
};

async function getBorrowRecords() {
    const borrowRecords = await ipcRenderer.invoke('getBorrows');
    let template = "";
    borrowRecords.forEach(record => {
        template += `
            <tr>
                <td><a href="#" class="borrower-name" data-name="${record.borrowerName}">${record.borrowerName}</a></td>
                <td>${record.bookTitle}</td>
                <td>${record.borrowDate}</td>
                <td>${record.borrowStatus}</td>
                <td>
                    <button class="btn btn-info edit-btn" data-id="${record.id}">Edit</button>
                    <button class="btn btn-danger delete-btn" data-id="${record.id}">Delete</button>
                </td>
            </tr>
        `;
    });
    borrowList.innerHTML = template;

    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', () => editBorrowRecord(button.getAttribute('data-id')));
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', () => deleteBorrowRecord(button.getAttribute('data-id')));
    });

    document.querySelectorAll('.borrower-name').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            showBorrowerLog(link.getAttribute('data-name'));
        });
    });
}

async function addBorrowRecord() {
    const record = {
        borrowerName: borrowerName.value,
        bookTitle: bookTitle.value,
        borrowDate: borrowDate.value,
        borrowStatus: borrowStatus.value
    };
    await ipcRenderer.invoke('addBorrow', record);
    clearForm();
    getBorrowRecords();
}

async function editBorrowRecord(id) {
    const record = await ipcRenderer.invoke('getBorrow', id);
    borrowerId.value = record.id;
    borrowerName.value = record.borrowerName;
    bookTitle.value = record.bookTitle;
    borrowDate.value = record.borrowDate;
    borrowStatus.value = record.borrowStatus;
}

async function updateBorrowRecord() {
    const record = {
        id: borrowerId.value,
        borrowerName: borrowerName.value,
        bookTitle: bookTitle.value,
        borrowDate: borrowDate.value,
        borrowStatus: borrowStatus.value
    };
    await ipcRenderer.invoke('updateBorrow', record);
    clearForm();
    getBorrowRecords();
}

async function deleteBorrowRecord(id) {
    await ipcRenderer.invoke('deleteBorrow', id);
    getBorrowRecords();
}

function clearForm() {
    borrowerId.value = "";
    borrowerName.value = "";
    bookTitle.value = "";
    borrowDate.value = "";
    borrowStatus.value = "borrowed";
}

function filterBorrowRecords() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;
    const dateValue = dateFilter.value;

    document.querySelectorAll('#borrowList tr').forEach(row => {
        const borrowerName = row.children[0].textContent.toLowerCase();
        const bookTitle = row.children[1].textContent.toLowerCase();
        const borrowStatus = row.children[3].textContent.toLowerCase();
        const borrowDate = row.children[2].textContent;

        const matchesSearch = borrowerName.includes(searchTerm) || bookTitle.includes(searchTerm);
        const matchesStatus = !statusValue || borrowStatus === statusValue;
        const matchesDate = !dateValue || borrowDate === dateValue;

        if (matchesSearch && matchesStatus && matchesDate) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function sortBorrowRecords(field, order) {
    const rows = Array.from(document.querySelectorAll('#borrowList tr'));
    rows.sort((a, b) => {
        const aField = a.querySelector(`td:nth-child(${getFieldIndex(field)})`).textContent.toLowerCase();
        const bField = b.querySelector(`td:nth-child(${getFieldIndex(field)})`).textContent.toLowerCase();

        if (aField < bField) {
            return order === 'asc' ? -1 : 1;
        }
        if (aField > bField) {
            return order === 'asc' ? 1 : -1;
        }
        return 0;
    });
    rows.forEach(row => borrowList.appendChild(row));
}

function getFieldIndex(field) {
    switch (field) {
        case 'borrowerName':
            return 1;
        case 'bookTitle':
            return 2;
        case 'borrowDate':
            return 3;
        case 'borrowStatus':
            return 4;
        default:
            return 1;
    }
}

function showBorrowerLog(name) {
    window.location.href = `borrowerLog.html?borrowerName=${encodeURIComponent(name)}`;
}

