/**
 * Handles the deletion of a borrow record by sending a request to 
 * the main process via IPC. Notifies about the deletion upon success.
 */

async function handleDeleteBorrow(id) {
    try {
        await ipcRenderer.invoke('deleteBorrow', id);
        ipcRenderer.send('borrow-record-deleted', id); // Notify about the deletion
        return id;
    } catch (error) {
        console.error('Error deleting borrow record:', error);
    }
}

module.exports = handleDeleteBorrow;
