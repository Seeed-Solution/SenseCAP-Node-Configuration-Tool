'use strict'

import { app, protocol, BrowserWindow, shell, ipcMain } from 'electron'
import {
  createProtocol,
  /* installVueDevtools */
} from 'vue-cli-plugin-electron-builder/lib'
const SerialPort = require('serialport')
const Menu = require("electron-create-menu")
import i18next from 'i18next'

const isDevelopment = process.env.NODE_ENV !== 'production'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

let serialPorts = []
let selectedSerialPort
let serial

let appName = "SenseCAP Node Configuration Tool"

/**
 * The Menu's locale only follows the system, the user selection from the GUI doesn't affect
 */
async function translateMenu() {
  let sysLocale = process.env.LOCALE || app.getLocale()
  console.log('the sys locale:', sysLocale)

  await i18next.init({
    lng: sysLocale,
    fallbackLng: 'en',
    debug: true,
    resources: {
      zh: {
        translation: {
          "File": "文件",
          "Edit": "编辑",
          "Speech": "语音",
          "View": "视图",
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
      defaultMenu[5].submenu.push({
        label: t('Report an issue'),
        click: () => {
          shell.openExternal('https://github.com/Seeed-Solution/SenseCAP-Node-Configuration-Tool/issues')
        }
      })
      console.log(JSON.stringify(defaultMenu))
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
      nodeIntegration: true
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

app.on('will-quit', () => {
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
  console.log('init-serial-req ...')

  SerialPort.list().then(ports => {
    serialPorts = ports
    console.log(ports)

    let opened = false
    if (serial && serial.isOpen) opened = true;

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

ipcMain.on('serial-open-req', (event, selPort) => {
  console.log('serial-open-req ...', selPort)

  if (serial && serial.isOpen) {
    if (selPort === selectedSerialPort) {
      console.log('already opened')
      event.reply('serial-open-resp', {opened: true, reason: 'already opened'})
      return
    } else {
      console.warn('request to open another port, rather', selectedSerialPort)
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
  console.log('serial-close-req ...')

  if (!serial || !serial.isOpen) {
    console.log('already closed')
    event.reply('serial-close-resp', {closed: true, reason: 'already closed'})
    return
  }

  let h = setTimeout(() => {
    event.reply('serial-close-resp', {closed: false, reason: 'timeout'})
  })

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

