const fs = require('fs');
const path = require('path');

function getWindowState(windowName) {
    const windowStateFilePath = path.join(app.getPath('userData'), `${windowName}-window-state.json`);
    try {
        return JSON.parse(fs.readFileSync(windowStateFilePath, 'utf8'));
    } catch (e) {
        return {
            width: 800,
            height: 600,
            x: undefined,
            y: undefined
        };
    }
}

function saveWindowState(window, windowName) {
    const windowStateFilePath = path.join(app.getPath('userData'), `${windowName}-window-state.json`);
    const windowBounds = window.getBounds();
    fs.writeFileSync(windowStateFilePath, JSON.stringify(windowBounds));
}

module.exports = { getWindowState, saveWindowState };
