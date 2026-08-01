const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Allow audio autoplay without user gesture
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow() {
    const win = new BrowserWindow({
        width: 1920,
        height: 1080,
        center: true,
        resizable: true,
        title: 'Tortue Survivor',
        icon: path.join(__dirname, 'source', 'tortuesurvivor.ico'),
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
    
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`Renderer: ${message}`);
    });
}

// IPC Handlers for window resizing & fullscreen
ipcMain.on('resize-window', (event, { width, height }) => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (win) {
        win.setFullScreen(false);
        win.setContentSize(width, height);
        win.center();
    }
});

ipcMain.on('set-fullscreen', (event, flag) => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (win) {
        win.setFullScreen(flag);
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});
