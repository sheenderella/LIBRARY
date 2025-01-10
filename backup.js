const { app, ipcMain, dialog } = require('electron');
const betterSqlite = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = app.isPackaged
  ? path.join(app.getPath('userData'), 'library.db')
  : path.resolve(__dirname, '../library.db');
