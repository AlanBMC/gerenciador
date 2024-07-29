const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const fs = require('fs')
const path = require('path')
const pdfParse = require('pdf-parse')
const { parseStringPromise } = require('xml2js')



const createWindow = () => {
  const win = new BrowserWindow({
    width: 1250,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('read-data', async () => {
  try {
    const data = fs.readFileSync('data.json', 'utf8')
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error reading data:', error)
    return []
  }
})

ipcMain.handle('write-data', async (event, data) => {
  try {
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error('Error writing data:', error)
    return false
  }
})

ipcMain.handle('select-xml-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'XML Files', extensions: ['xml'] }]
  })

  if (result.canceled) {
    return null
  } else {
    const filePath = result.filePaths[0]
    const xmlData = fs.readFileSync(filePath, 'utf8')
    return parseStringPromise(xmlData)
  }
})
ipcMain.handle('select-pdf-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  })

  if (result.canceled) {
    return null
  } else {
    const filePath = result.filePaths[0]
    const pdfData = fs.readFileSync(filePath)
    const data = await pdfParse(pdfData)
    return data.text
  }
})