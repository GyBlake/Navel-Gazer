const { app, BrowserWindow, dialog } = require('electron');

let localApp = null;
let localUrl = null;
let isClosing = false;

app.setName('Navel Gazer');
app.setAppUserModelId('org.navelgazer.desktop');

async function createWindow() {
  const window = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 760,
    minHeight: 620,
    title: 'Navel Gazer',
    backgroundColor: '#101714',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (targetUrl !== localUrl) event.preventDefault();
  });
  window.once('ready-to-show', () => window.show());
  await window.loadURL(localUrl);
  return window;
}

app.whenReady().then(async () => {
  try {
    const { createLocalAppServer } = await import('../src/local-app-server.mjs');
    localApp = await createLocalAppServer({ port: 0, dataDir: process.env.NAVEL_GAZER_HOME });
    const address = await localApp.listen();
    localUrl = 'http://127.0.0.1:' + address.port + '/';
    await createWindow();

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) await createWindow();
    });
  } catch (error) {
    dialog.showErrorBox(
      'Navel Gazer could not start',
      'The local assistant could not start its private interface. Check the installation and local permissions, then try again.'
    );
    app.quit();
  }
});

app.on('before-quit', event => {
  if (!localApp || isClosing) return;
  event.preventDefault();
  isClosing = true;
  localApp.close().catch(() => {}).finally(() => app.quit());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
