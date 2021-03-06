/**
 * SwitchHosts!
 *
 * @author oldj
 * @blog http://oldj.net
 * @homepage https://oldj.github.io/SwitchHosts/
 * @source https://github.com/oldj/SwitchHosts
 */

const electron = require('electron')
const fs = require('fs')
const app = electron.app
const BrowserWindow = electron.BrowserWindow

const pref = require('./server/pref')
let user_language = pref.get('user_language') ||
                    (app.getLocale() || '').split('-')[0].toLowerCase() || 'en'
global.user_language = user_language

const tray = require('./menu/tray')
const SHServer = require('./server/Server')
const svr = require('./server/svr')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let contents
let willQuitApp = false
let is_tray_initialized
let renderer

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800
    , height: 500
    , minWidth: 400
    , minHeight: 250
    , fullscreenable: true
  })
  contents = mainWindow.webContents
  app.mainWindow = mainWindow

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html?lang=${user_language}`)

  if (process.env && process.env.ENV === 'dev') {
    // Open the DevTools.
    mainWindow.webContents.openDevTools()
  }

  if (pref.get('hide_at_launch')) {
    // mainWindow.minimize();
    mainWindow.hide()
  }

  mainWindow.on('close', (e) => {
    if (willQuitApp) {
      /* the user tried to quit the app */
      mainWindow = null
    } else {
      /* the user only tried to close the window */
      e.preventDefault()
      mainWindow.hide()
    }
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
    contents = null
  })

  contents.on('did-finish-load', () => {
    if (!is_tray_initialized) {
      tray.makeTray(app, contents, user_language)
      is_tray_initialized = true
    }
  })

  //require('./bg/events').init(app, contents)

  svr.win = mainWindow
}

const should_quit = app.makeSingleInstance((commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    // mainWindow.focus();
  }
})

if (should_quit) {
  app.quit()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow()
  require('./menu/main_menu').init(app, user_language)

  setTimeout(() => {
    if (renderer) {
      require('./server/checkUpdate').check(true)
    }
  }, 1000)
})

electron.ipcMain.on('reg_renderer', (e) => {
  renderer = e.sender
})

electron.ipcMain.on('relaunch', () => {
  app.relaunch({args: process.argv.slice(1) + ['--relaunch']});
  app.exit(0);
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // if (process.platform !== 'darwin') {
  //     app.quit();
  // }
})

app.on('show', function () {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
  } else {
    createWindow()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  } else if (mainWindow.isMinimized()) {
    mainWindow.restore()
  } else {
    mainWindow.show()
  }
})

app.on('before-quit', () => willQuitApp = true)
