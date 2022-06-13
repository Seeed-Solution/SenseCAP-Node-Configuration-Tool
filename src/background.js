// 'use strict'

import { app, protocol, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import {
  createProtocol,
  /* installVueDevtools */
} from 'vue-cli-plugin-electron-builder/lib'
const {SerialPort} = require('serialport')
const Menu = require("electron-create-menu")
import i18next from 'i18next'
const { autoUpdater } = require("electron-updater")
const {yModem} = require('./ymodem')
const path = require('path')
const fs = require('fs')
const fsPromises = fs.promises
const Store = require('electron-store')
const store = new Store()

let appName = "SenseCAP Node Configuration Tool"
app.name = appName

const logger = require("electron-log")
autoUpdater.logger = logger

const isDevelopment = process.env.NODE_ENV !== 'production'
autoUpdater.logger.transports.file.level = isDevelopment ? "debug" : "info"

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
let sysLocale

let serialPorts = []
let selectedSerialPort
let serial
let ymodem = new yModem(true, logger.debug)
let updating = false

let autoUpdateTimeHandler = null

/**
 * The Menu's locale only follows the system, the user selection from the GUI doesn't affect
 */
async function translateMenu() {
  sysLocale = store.get('chosenLocale') || process.env.LOCALE || app.getLocale()
  logger.info('the sys locale:', sysLocale)

  await i18next.init({
    lng: sysLocale,
    fallbackLng: 'en',
    debug: isDevelopment,
    resources: {
      zh: {
        translation: {
          "File": "文件",
          "Edit": "编辑",
          "Speech": "语音",
          "View": "视图",
          "Window": "窗口",
          "Help": "帮助",
          "About": "关于",
          "Hide": "隐藏",
          "Quit": "退出",
          "Report an issue": "报告错误",
        } //other keywords are translated by the OS automatically
      }
    }
  }).then((t) => {
    Menu((defaultMenu, separator) => {
      defaultMenu[0].submenu[0].label = t('About') + " " + appName
      defaultMenu[0].submenu[4].label = t('Hide') + " " + appName
      defaultMenu[0].submenu[8].label = t('Quit') + " " + appName
      if (!isDevelopment) defaultMenu[3].submenu[2].showOn = 'neverMatch'
      defaultMenu[4].label = t('Window')
      defaultMenu[5].label = t('Help')
      defaultMenu[5].submenu.push({
        label: t('Report an issue'),
        click: () => {
          shell.openExternal('https://github.com/Seeed-Solution/SenseCAP-Node-Configuration-Tool/issues')
        }
      })
      logger.debug(JSON.stringify(defaultMenu))
      return defaultMenu
    },
    // This function is used to translate the default labels
    t
  )})
}

if (process.platform === 'darwin') {
  app.setAboutPanelOptions({
    applicationName: appName,
  })
}

// AutoUpdater
autoUpdater.on('update-available', (info) => {
  logger.info('update-available', JSON.stringify(info))
  let {version} = info
  if (win && version) win.webContents.send('update-available', version)
})

autoUpdater.on('update-not-available', (info) => {
  logger.info('update-not-available', JSON.stringify(info))
})

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{scheme: 'app', privileges: { secure: true, standard: true } }])

function createWindow () {
  // Create the browser window.
  let w = 1024
  let h = 620

  if (process.platform === 'win32') {
    h += 30  //for menu bar
  }

  win = new BrowserWindow({
    show: false,
    width: w,
    height: h,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  win.on('closed', () => {
    win = null
  })

  win.once('ready-to-show', () => {
    win.show()
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    serialClose()
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

app.on('before-quit', () => {
  if (autoUpdateTimeHandler) clearTimeout(autoUpdateTimeHandler)
  serialClose()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {

  await translateMenu()

  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    // Devtools extensions are broken in Electron 6.0.0 and greater
    // See https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/378 for more info
    // Electron will not launch with Devtools extensions installed on Windows 10 with dark mode
    // If you are not using Windows 10 dark mode, you may uncomment these lines
    // In addition, if the linked issue is closed, you can upgrade electron and uncomment these lines
    // try {
    //   await installVueDevtools()
    // } catch (e) {
    //   console.error('Vue Devtools failed to install:', e.toString())
    // }

  }

  createWindow()

  autoUpdateTimeHandler = setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify()
    autoUpdateTimeHandler = null
  }, 10000)
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', data => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      serialClose()
      ipcMain.removeAllListeners()
      app.quit()
    })
  }
}

// IPC
ipcMain.on('init-serial-req', (event, arg) => {
  logger.info('init-serial-req ...')

  SerialPort.list().then(ports => {
    serialPorts = ports
    logger.debug(ports)

    let opened = false
    if (serial && serial.isOpen) opened = true

    let resp = {
      ports: ports,
      selectedPort: selectedSerialPort,
      opened: opened
    }

    event.reply('init-serial-resp', resp)
  })
})

function serialOpen(event) {
  serial = new SerialPort(selectedSerialPort, {
    baudRate: 115200,
    autoOpen: false
  })

  let h = setTimeout(() => {
    event.reply('serial-open-resp', {opened: false, reason: 'timeout'})
  }, 5000)

  serial.on('open', () => {
    clearTimeout(h)
    event.reply('serial-open-resp', {opened: true, reason: ''})
  })

  serial.on('data', (data) => {
    if (win) {
      win.webContents.send('serial-tx', data)
    }
    if (ymodem && updating) {
      ymodem.emit('rx', data)
    }
  })

  serial.on('error', (err) => {
    logger.warn('serial error:', err)
  })

  serial.open()
}

function serialClose(cb) {
  if (serial) {
    serial.close((err) => {
      serial = null
      if (cb) cb()
    })
  }
}

async function serialCloseAsync() {
  return new Promise((resolve, reject) => {
    serialClose(resolve)
  })
}

ipcMain.on('serial-open-req', (event, selPort) => {
  logger.info('serial-open-req ...', selPort)

  if (serial && serial.isOpen) {
    if (selPort === selectedSerialPort) {
      logger.info('already opened')
      event.reply('serial-open-resp', {opened: true, reason: 'already opened'})
      return
    } else {
      logger.warn('request to open another port, rather', selectedSerialPort)
      selectedSerialPort = selPort
      serialClose(() => {
        serialOpen(event)
      })
    }
  } else {
    selectedSerialPort = selPort
    serialOpen(event)
  }
})

ipcMain.on('serial-close-req', (event, arg) => {
  logger.info('serial-close-req ...')

  if (!serial || !serial.isOpen) {
    logger.info('already closed')
    event.reply('serial-close-resp', {closed: true, reason: 'already closed'})
    return
  }

  let h = setTimeout(() => {
    event.reply('serial-close-resp', {closed: false, reason: 'timeout'})
  }, 1000)

  serialClose(() => {
    clearTimeout(h)
    event.reply('serial-close-resp', {closed: true, reason: ''})
  })
})

ipcMain.on('serial-rx', (event, arg) => {
  if (serial && serial.isOpen) {
    serial.write(arg)
  }
})

ipcMain.on('current-version-req', (event, arg) => {
  logger.info('current-version-req ...')
  let currentVersion = autoUpdater.currentVersion.version
  logger.info(`the current version is: ${currentVersion}`)
  event.reply('current-version-resp', {currentVersion: currentVersion})
})

async function sendToTerm(str) {
  if (win) {
    await win.webContents.send('serial-tx', str)
  }
}

let updateTimeoutHandler
async function progressCallback(val) {
  let percent = `${val.toFixed(1)}%`
  await sendToTerm('\r' + percent)
}

async function updateTimeout() {
  if (win) {
    win.webContents.send('update-fw-end')
  }
  updating = false
  updateTimeoutHandler = null
}

function ymodemWrite(chunk, resolve, reject) {
  if (serial) {
    serial.write(chunk, (err) => {
      if (err) reject()
      else resolve()
    })
  }
}

ipcMain.on('select-file', async (event, selPort) => {
  logger.info('select file ...')
  let {canceled, filePaths} = await dialog.showOpenDialog({
    filters: [{ name: 'Binaries', extensions: ['bin', 'hex']}, { name: 'All Files', extensions: ['*']}],
    properties: ['openFile', 'noResolveAliases']
  })

  if (!canceled) {
    let filePath = filePaths[0]
    logger.info('selected file:', filePath)
    if (!filePath) return

    try {
      await fsPromises.access(filePath, fs.constants.R_OK)
    } catch (error) {
      logger.warn('can not access file:', filePath)
      logger.debug(error)
      return
    }

    let fileName = path.basename(filePath)
    await sendToTerm('\n\r\nStart to update the firmware ...\r\n')
    let {size} = await fsPromises.stat(filePath)
    await sendToTerm(`${fileName}\r\nsize: ${size}\r\n`)

    let fileContent = await fsPromises.readFile(filePath)
    if (fileContent) {
      event.reply('update-fw-begin')
      updateTimeoutHandler = setTimeout(updateTimeout, 300000)

      ymodem.clearStream()
      ymodem.on('progress', progressCallback)
      ymodem.on('tx', ymodemWrite)
      updating = true
      try {
        await ymodem.transfer(fileContent)
      } catch (error) {
        logger.warn('ymodem transfer error:', error)
        await sendToTerm(`\r\nerror: ${error.message} \r\n`)
      }
      updating = false
      ymodem.removeAllListeners('progress')
      ymodem.removeAllListeners('tx')
      if (updateTimeoutHandler) {
        clearTimeout(updateTimeoutHandler)
        updateTimeoutHandler = null
      }
      if (win) {
        win.webContents.send('update-fw-end')
      }
    }
  } else {
    logger.info('file selection cancelled by user')
    serial.write('a')
  }

})

// locale
ipcMain.on('locale-req', (event) => {
  logger.info('locale-req ...')
  event.reply('locale-resp', sysLocale)
})

ipcMain.on('locale-change', (event, arg) => {
  logger.info('locale-change, ', arg)
  if (arg === sysLocale) return
  i18next.changeLanguage(arg)
  translateMenu()
})

ipcMain.on('goto-new-version', (event) => {
  shell.openExternal('https://github.com/Seeed-Solution/SenseCAP-Node-Configuration-Tool/releases/latest')
})

