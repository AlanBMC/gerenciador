const { ipcRenderer } = require('electron')
const fs = require('fs');


const selectXmlButton = document.getElementById('select-xml')
const meiaNotaCheckbox = document.getElementById('meia-nota')

document.getElementById('arquivo-xml').addEventListener('click', ()=>{
    document.getElementById('tela-xml').style.display = 'block';
    document.getElementById('wrapper').style.display = 'none';
    document.getElementById('visualizador-de-dados').style.display = 'none';

})
document.getElementById('vision-data').addEventListener('click', ()=>{
    document.getElementById('tela-xml').style.display = 'none';
    document.getElementById('wrapper').style.display = 'none';
    document.getElementById('visualizador-de-dados').style.display = 'block';
})
document.getElementById('vision-data2').addEventListener('click', ()=>{
    document.getElementById('tela-xml').style.display = 'none';
    document.getElementById('wrapper').style.display = 'none';
    document.getElementById('visualizador-de-dados').style.display = 'block';

})
document.getElementById('tela-inicial').addEventListener('click', ()=>{
    document.getElementById('tela-xml').style.display = 'none';
    document.getElementById('visualizador-de-dados').style.display = 'none';

    document.getElementById('wrapper').style.display = 'block';

})
document.getElementById('tela-inicial2').addEventListener('click', ()=>{
    document.getElementById('tela-xml').style.display = 'none';
    document.getElementById('visualizador-de-dados').style.display = 'none';
    document.getElementById('wrapper').style.display = 'block';
})

function loadData() {
    fs.readFile('data.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading the file:', err);
            return;
        }
        const jsonData = JSON.parse(data);
        createTable(jsonData);
    });
}

function createTable(data) {
    const table = document.createElement('table');
    const thead = table.createTHead();
    const tbody = table.createTBody();

    // Create table headers
    const headerRow = thead.insertRow();
    Object.keys(data[0]).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    });

    // Create table rows
    data.forEach(item => {
        const row = tbody.insertRow();
        Object.values(item).forEach(value => {
            const cell = row.insertCell();
            cell.textContent = value;
            cell.contentEditable = 'true';
        });
    });

    document.getElementById('data-preview').appendChild(table);
}

function salvarDados() {
    const table = document.querySelector('table');
    if (!table) {
        console.error('No table found to save data from.');
        return;
    }

    const data = [];
    const rows = table.tBodies[0].rows;
    const headers = Array.from(table.tHead.rows[0].cells).map(cell => cell.textContent);

    for (const row of rows) {
        const rowData = {};
        headers.forEach((header, index) => {
            rowData[header] = row.cells[index].textContent;
        });
        data.push(rowData);
    }

    fs.writeFile('data.json', JSON.stringify(data, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error writing to file:', err);
            return;
        }
        console.log('Data successfully saved to data.json');
    });
}
selectXmlButton.addEventListener('click', async () => {
    const xmlData = await ipcRenderer.invoke('select-xml-file')
    console.log('......')
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


document.getElementById('card-import-xml-pdf').addEventListener('click', ()=>{
    document.getElementById('wrapper').style.display = 'none';
    document.getElementById('tela-xml').style.display = 'block';
})


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

