const { ipcRenderer } = require('electron');

// Event listener to load profiles when the DOM content is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    setUpIpcRenderer();
    // Call setupSortButtons to initialize sort functionality
    setupSortButtons();
    // Call loadProfiles to initially load and display profiles
    loadProfiles();
    
    document.getElementById('addProfile').addEventListener('click', openAddProfileWindow);
    // Event listener for clicks outside the sort buttons
    document.addEventListener('click', resetSortButtons);
    // Attach event listeners to search elements
    document.getElementById('searchInput').addEventListener('input', filterProfiles);
    document.getElementById('searchColumn').addEventListener('change', filterProfiles);
});

function setUpIpcRenderer() {
    // Listen for the profile-record-added event and add the profile to the table
        ipcRenderer.on('profile-record-added', (event, profile) => {
            // Dynamically add the new profile to the table
            addProfileToTable(profile, true);
        });
    
    // Listen for the profile-record-updated event and update the profile in the table
        ipcRenderer.on('profile-record-updated', (event, updatedProfile) => {
            updateProfileInTable(updatedProfile);
        });

}

// Function to dynamically add a profile to the table
function addProfileToTable(profile, prepend = false) {
    const profileList = document.getElementById('profileList');

    // Create a new table row
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td><input type="checkbox" data-id="${profile.id}"></td>
        <td>${profile.borrower_id}</td>
        <td>${profile.name}</td>
        <td>${profile.phone_number || 'N/A'}</td>
        <td>${profile.email || 'N/A'}</td>
        <td>
            <button class="btn btn-warning btn-sm edit-btn" data-id="${profile.id}"> <i class="fas fa-edit"></i> </button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${profile.id}"> <i class="fas fa-trash"></i> </button>
        </td>
    `;

    // Check if prepend is true, insert at the top, otherwise append at the end
    if (prepend) {
        profileList.insertBefore(row, profileList.firstChild); // Prepend the row
    } else {
        profileList.appendChild(row); // Append the row
    }

    // Attach event listeners to the edit and delete buttons for the new profile
    row.querySelector('.edit-btn').addEventListener('click', () => {
        openEditProfileWindow(profile);  // Pass the profile data to the edit window
    });

    row.querySelector('.delete-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this profile?')) {
            // Send the delete request to the main process
            ipcRenderer.invoke('deleteProfile', profile.id)
                .then(() => {
                    console.log(`Profile with ID ${profile.id} deleted`);
                    loadProfiles(); // Reload profiles after deletion
                })
                .catch(error => {
                    console.error('Error deleting profile:', error);
                });
        }
    });
}

// Function to update a profile in the table
function updateProfileInTable(profile) {
    const row = document.querySelector(`button[data-id="${profile.id}"]`).closest('tr');
    
    row.innerHTML = `
        <td><input type="checkbox" data-id="${profile.id}"></td>
        <td>${profile.borrower_id}</td>
        <td>${profile.name}</td>
        <td>${profile.phone_number || 'N/A'}</td>
        <td>${profile.email || 'N/A'}</td>
        <td>
            <button class="btn btn-warning btn-sm edit-btn" data-id="${profile.id}"> <i class="fas fa-edit"></i> </button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${profile.id}"> <i class="fas fa-trash"></i> </button>
        </td>
    `;

    // Reattach event listeners to the edit and delete buttons
    row.querySelector('.edit-btn').addEventListener('click', () => {
        openEditProfileWindow(profile); // Pass the profile data to the edit window
    });

    row.querySelector('.delete-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this profile?')) {
            // Send the delete request to the main process
            ipcRenderer.invoke('deleteProfile', profile.id)
                .then(() => {
                    console.log(`Profile with ID ${profile.id} deleted`);
                    row.remove(); // Remove the row from the table after deletion
                })
                .catch(error => {
                    console.error('Error deleting profile:', error);
                });
        }
    });
}

// Function to open the add profile window
function openAddProfileWindow() {
    ipcRenderer.send('open-add-profile-window');
}

// Function to open the edit profile window and send the selected record
function openEditProfileWindow(record) {
    ipcRenderer.send('open-edit-profile-window', record);
}

let currentProfiles = [];

// Function to load profiles and display them in the table
function loadProfiles() {
    ipcRenderer.invoke('getProfiles')
        .then(profiles => {
            currentProfiles = profiles; // Store the loaded profiles
            displayProfiles(); // Call the function to display profiles
            updatePagination();
        })
        .catch(error => {
            console.error('Error loading profiles:', error);
        });
}

// Function to display profiles in the table
function displayProfiles() {
    const profileList = document.getElementById('profileList');
    profileList.innerHTML = ''; // Clear existing table rows

    if (currentProfiles.length === 0) {
        const emptyMessageRow = document.createElement('tr');
        const emptyMessageCell = document.createElement('td');
        emptyMessageCell.colSpan = 6; // Adjust the colspan based on the number of columns
        emptyMessageCell.textContent = "Please Add a New Profile Record";
        emptyMessageCell.classList.add('empty-message-cell');
        emptyMessageRow.appendChild(emptyMessageCell);
        profileList.appendChild(emptyMessageRow);
        return;
    }

    const profilesToShow = getProfilesForCurrentPage();
    profilesToShow.forEach(profile => {
        addProfileToTable(profile);
    });
}

// Function to get the profiles for the current page
function getProfilesForCurrentPage() {
    const start = (currentPage - 1) * profilesPerPage;
    const end = start + profilesPerPage;
    return currentProfiles.slice(start, end);
}

function sortProfiles(column, button) {
    // Determine the current sort order
    const order = button.dataset.order === 'asc' ? 'desc' : 'asc';
    button.dataset.order = order;

    // Update the sort icon based on the current order
    const icon = button.querySelector('i');
    if (order === 'asc') {
        icon.className = 'fas fa-sort-up'; // Ascending
    } else {
        icon.className = 'fas fa-sort-down'; // Descending
    }

    // Sort the currentProfiles based on the selected column and order
    currentProfiles.sort((a, b) => {
        let valueA = a[column];
        let valueB = b[column];

        // Handle sorting based on data type
        if (typeof valueA === 'number' && typeof valueB === 'number') {
            return order === 'asc' ? valueA - valueB : valueB - valueA;
        } else {
            // Handle cases where valueA or valueB could be undefined or null
            if (valueA == null) return 1;
            if (valueB == null) return -1;
            return order === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        }
    });

    // Call function to update the display
    displayProfiles();
}

// Function to reset all sort buttons to their default state
function resetSortButtons() {
    const sortButtons = document.querySelectorAll('.sort-btn');
    sortButtons.forEach(button => {
        const icon = button.querySelector('i');
        icon.className = 'fas fa-sort'; // Reset to default sort icon
        button.dataset.order = ''; // Clear the sort order
        loadProfiles();
    });
}

// Event listener setup for sort buttons
function setupSortButtons() {
    const sortButtons = document.querySelectorAll('.sort-btn');

    sortButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            // Prevent the click event from bubbling up to the document
            event.stopPropagation();
            sortProfiles(button.dataset.column, button);
        });
    });
}

let currentPage = 1; // Current page number
let profilesPerPage = 10; // Change this to the number of profiles you want per page

// Function to filter and display profiles based on search criteria
function filterProfiles() {
    const searchColumn = document.getElementById('searchColumn').value;
    const searchInput = document.getElementById('searchInput').value.toLowerCase().trim();
    
    // Filter profiles based on selected column and input value
    const filteredProfiles = currentProfiles.filter(profile => {
        if (searchColumn === 'all') {
            return Object.values(profile).some(value => 
                String(value).toLowerCase().includes(searchInput)
            );
        } else {
            return String(profile[searchColumn] || '').toLowerCase().includes(searchInput);
        }
    });

    // Display filtered profiles and update pagination
    displayFilteredProfiles(filteredProfiles);
    updatePagination(filteredProfiles); // Pass filtered profiles to update pagination
}

// Function to display filtered profiles in the table
function displayFilteredProfiles(profiles) {
    const profileList = document.getElementById('profileList');
    profileList.innerHTML = ''; // Clear existing table rows

    if (profiles.length === 0) {
        const emptyMessageRow = document.createElement('tr');
        const emptyMessageCell = document.createElement('td');
        emptyMessageCell.colSpan = 6; // Adjust based on the number of columns
        emptyMessageCell.textContent = "No records found.";
        emptyMessageCell.classList.add('empty-message-cell');
        emptyMessageRow.appendChild(emptyMessageCell);
        profileList.appendChild(emptyMessageRow);
        return;
    }

    profiles.forEach(profile => {
        addProfileToTable(profile);
    });
}

// Update the updatePagination function to accept filtered profiles
function updatePagination(filteredProfiles) {
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');
    const pageLocationInput = document.getElementById('pageLocation');
    const totalPagesSpan = document.getElementById('totalPages');

    const totalPages = Math.ceil(filteredProfiles.length / profilesPerPage); // Use length of filtered profiles
    totalPagesSpan.textContent = `of ${totalPages}`;
    pageLocationInput.value = currentPage;

    firstPageBtn.disabled = currentPage === 1;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    lastPageBtn.disabled = currentPage === totalPages;

    firstPageBtn.onclick = () => {
        if (currentPage !== 1) {
            currentPage = 1;
            displayProfiles(filteredProfiles); // Update to display filtered profiles
            updatePagination(filteredProfiles);
        }
    };

    prevPageBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            displayProfiles(filteredProfiles); // Update to display filtered profiles
            updatePagination(filteredProfiles);
        }
    };

    nextPageBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayProfiles(filteredProfiles); // Update to display filtered profiles
            updatePagination(filteredProfiles);
        }
    };

    lastPageBtn.onclick = () => {
        if (currentPage !== totalPages) {
            currentPage = totalPages;
            displayProfiles(filteredProfiles); // Update to display filtered profiles
            updatePagination(filteredProfiles);
        }
    };

    pageLocationInput.onchange = () => {
        const pageNumber = parseInt(pageLocationInput.value, 10);
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            currentPage = pageNumber;
            displayProfiles(filteredProfiles); // Update to display filtered profiles
            updatePagination(filteredProfiles);
        } else {
            pageLocationInput.value = currentPage;
        }
    };

    syncSelectAllCheckbox();
}

// Sync the "Select All" checkbox state based on selected rows
function syncSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const allProfilesSelected = currentProfiles.every(profile => selectedBookIds.has(profile.id));
    selectAllCheckbox.checked = allProfilesSelected;
}

