const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
    readData: () => ipcRenderer.invoke('read-data'),
    writeData: (data) => ipcRenderer.invoke('write-data', data),
    selectXmlFile: () => ipcRenderer.invoke('select-xml-file'),
    selectPdfFile: () => ipcRenderer.invoke('select-pdf-file')
})
