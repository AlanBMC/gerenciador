const { ipcRenderer } = require('electron')

const itemForm = document.getElementById('item-form')
const itemNameInput = document.getElementById('item-name')
const itemCodInput = document.getElementById('item-codigo')
const itemList = document.getElementById('item-list')
const selectXmlButton = document.getElementById('select-xml')
const meiaNotaCheckbox = document.getElementById('meia-nota')

itemForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const itemName = itemNameInput.value
    const itemCod = itemCodInput.value
    const items = await ipcRenderer.invoke('read-data')
    items.push({ name: itemName, codigo: itemCod })
    await ipcRenderer.invoke('write-data', items)
    renderItems(items)
    itemNameInput.value = ''
    itemCodInput.value = ''
})

selectXmlButton.addEventListener('click', async () => {
    const xmlData = await ipcRenderer.invoke('select-xml-file')
    const result = extractDetValues(xmlData, [
        'vUnCom', 'xProd', 'NCM', 'CFOP', 'CEST', 'vProd',
        'cEAN', 'qCom', 'uCom', 'qTrib', 'uTrib'
    ])
    const meiaNota = meiaNotaCheckbox.checked
    const processedData = processValues(result, meiaNota)
    await grava(processedData)
    console.log(JSON.stringify(processedData, null, 2))
})

function extractDetValues(data, keys) {
    const detValues = []

    function traverse(obj) {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (key === 'det') {
                    obj[key].forEach(detItem => {
                        const prodItem = detItem.prod[0]
                        const values = {}
                        keys.forEach(subKey => {
                            if (prodItem[subKey]) {
                                values[subKey] = prodItem[subKey][0]
                            }
                        })
                        detValues.push(values)
                    })
                } else if (typeof obj[key] === 'object') {
                    traverse(obj[key])
                }
            }
        }
    }

    traverse(data)
    return detValues
}

function processValues(data, meiaNota) {
    const itensSelecionados = ['vUnCom', 'xProd', 'NCM', 'CFOP', 'CEST', 'vProd', 'cEAN', 'qCom', 'uCom', 'qTrib', 'uTrib']

    return data.map(item => {
        let newItem = {}
        
        itensSelecionados.forEach(key => {
            if (item.hasOwnProperty(key)) {
                newItem[key] = item[key]
            }
        })
        
        if (newItem.hasOwnProperty('vUnCom')) {
            if (newItem['uTrib'] === 'DZ') {
                let valorUN
                if (meiaNota) {
                    valorUN = parseFloat(newItem['vProd'] * 2) / (parseFloat(newItem['qCom']) * 12)
                } else {
                    valorUN = parseFloat(newItem['vProd']) / (parseFloat(newItem['qCom']) * 12)
                }
                let valorRevenda = valorUN * 1.7
                newItem['Valor Un'] = valorUN.toFixed(2).replace('.', ',')
                newItem['Valor Revenda'] = Math.ceil(valorRevenda).toFixed(2).replace('.', ',')
                newItem['uTrib'] = newItem['uTrib'].replace('.', ',')
                newItem['qCom'] = newItem['qCom'].replace('.', ',')
            } else if (newItem['uTrib'] === 'UN' || newItem['uTrib'] === 'PC') {
                let valor
                if (meiaNota) {
                    valor = (parseFloat(newItem['vUnCom']) * 2) * 1.7
                    newItem['Valor Revenda'] = Math.ceil(valor).toFixed(2).replace('.', ',')
                    newItem['Valor Un'] = (parseFloat(newItem['vUnCom'].replace(',', '.')) * 2).toFixed(2).replace('.', ',')
                    newItem['qTrib'] = newItem['qTrib'].replace('.', ',')
                    newItem['qCom'] = newItem['qCom'].replace('.', ',')
                } else {
                    valor = parseFloat(newItem['vUnCom']) * 1.7
                    newItem['Valor Revenda'] = Math.ceil(valor).toFixed(2).replace('.', ',')
                    newItem['Valor Un'] = parseFloat(newItem['vUnCom'].replace(',', '.')).toFixed(2).replace('.', ',')
                    newItem['qTrib'] = newItem['qTrib'].replace('.', ',')
                    newItem['qCom'] = newItem['qCom'].replace('.', ',')
                }
            }
            newItem['qTrib'] = newItem['qTrib'].replace('.', ',')
            newItem['qCom'] = newItem['qCom'].replace('.', ',')
            newItem['Nome do produto'] = newItem['xProd'] ? newItem['xProd'] : ''
            delete newItem['vUnCom']
            delete newItem['xProd']
        } else {
            newItem['Valor de Revenda'] = ''
            newItem['Nome do produto'] = newItem['xProd'] ? newItem['xProd'] : ''
        }

        return newItem
    })
}

async function renderItems(items) {
    itemList.innerHTML = ''
    items.forEach((item, index) => {
        const li = document.createElement('li')
        li.innerHTML = `Name: ${item.nome_produto}, Code: ${item.codigo_de_barras}`
        const deleteButton = document.createElement('button')
        deleteButton.textContent = 'Delete'
        deleteButton.addEventListener('click', async () => {
            items.splice(index, 1)
            await ipcRenderer.invoke('write-data', items)
            renderItems(items)
        })
        li.appendChild(deleteButton)
        itemList.appendChild(li)
    })
}

async function initialize() {
    const items = await ipcRenderer.invoke('read-data')
    renderItems(items)
}

async function grava(newItems) {
    const items = await ipcRenderer.invoke('read-data')

    newItems.forEach(newItem => {
        const item = {
            nome_produto: newItem['Nome do produto'],
            codigo_de_barras: newItem['cEAN'],
            tipoUnidade: newItem['uCom'],
            tipoUnidade_uTrib: newItem['uTrib'],
            quantidade_QTRIB: newItem['qTrib'],
            quantidade_QCOM: newItem['qCom'],
            CFOP: newItem['CFOP'],
            NCM: newItem['NCM'],
            valor_unitario: newItem['Valor Un'],
            valor_revenda: newItem['Valor Revenda']
        }
        items.push(item)
    })

    await ipcRenderer.invoke('write-data', items)
}

initialize()
