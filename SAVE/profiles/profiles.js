const { ipcRenderer } = require('electron');

// Function to load profiles and display them in the table
function loadProfiles() {
    ipcRenderer.invoke('getProfiles')
        .then(profiles => {
            const profileList = document.getElementById('profileList');
            profileList.innerHTML = ''; // Clear existing table rows

            // Loop through profiles and create table rows dynamically
            profiles.forEach(profile => {
                const row = document.createElement('tr');

                row.innerHTML = `
                    <td><input type="checkbox" data-id="${profile.id}"></td>
                    <td>${profile.borrower_id}</td>
                    <td>${profile.name}</td>
                    <td>${profile.phone_number || 'N/A'}</td>
                    <td>${profile.email || 'N/A'}</td>
                    <td>
                        <button class="btn btn-warning btn-sm" onclick="editProfile(${profile.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProfile(${profile.id})"><i class="fas fa-trash"></i></button>
                    </td>
                `;

                // Append row to the table body
                profileList.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading profiles:', error);
        });
}

// Event listener to load profiles when the DOM content is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    loadProfiles(); // Call the loadProfiles function here
});
