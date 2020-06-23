const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

var mainWindow = null;

app.on('window-all-closed', function() {
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('ready', function() {
    mainWindow = new BrowserWindow({ 
        width: 800, 
        height: 600, 
        webPreferences: {
          nodeIntegration: true
        }
    });

    mainWindow.loadURL('file://' + __dirname + '/index.html');

    mainWindow.on('closed', function() {
        mainWindow = null;
    });

    mainWindow.on('app-command', (e, cmd) => {
        if (cmd === 'browser-backward' && mainWindow.webContents.canGoBack()) {
            mainWindow.webContents.goBack()
        }
        if (cmd === 'browser-forward' && mainWindow.webContents.canGoForward()) {
            mainWindow.webContents.goForward()
        }
    });


});
