const { ipcRenderer } = require('electron');

// Delete borrow record
async function handleDeleteBorrow(id) {
    try {
        await ipcRenderer.invoke('deleteBorrow', id);
        return id;
    } catch (error) {
        console.error('Error deleting borrow record:', error);
    }
}

module.exports = handleDeleteBorrow;
