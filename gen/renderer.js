const { ipcRenderer } = require('electron')
const { electron } = window

const fs = require('fs');
const XLSX = require('xlsx');
const jsPDF = require('jspdf');
let ultimoArquivoLido = [];


const selectXmlButton = document.getElementById('select-xml')
const meiaNotaCheckbox = document.getElementById('meia-nota')
const selectPdfButton = document.getElementById('select-pdf')

const sections = {
    'tela-xml': document.getElementById('tela-xml'),
    'visualizador-de-dados': document.getElementById('visualizador-de-dados'),
    'wrapper': document.getElementById('wrapper'),
    'gerador-codigo-barras': document.getElementById('gerador-codigo-barras')
};


function showSection(sectionId) {
    Object.keys(sections).forEach(key => {
        sections[key].style.display = 'none';
    });
    sections[sectionId].style.display = 'block';
}

document.getElementById('arquivo-xml').addEventListener('click', () => showSection('tela-xml'));
document.getElementById('vision-data').addEventListener('click', () => showSection('visualizador-de-dados'));
document.getElementById('vision-data2').addEventListener('click', () => showSection('visualizador-de-dados'));
document.getElementById('tela-inicial').addEventListener('click', () => showSection('wrapper'));
document.getElementById('tela-inicial2').addEventListener('click', () => showSection('wrapper'));
document.getElementById('gerador-de-codigos').addEventListener('click', () => showSection('gerador-codigo-barras'));
document.getElementById('gerador-de-codigo').addEventListener('click', () => showSection('gerador-codigo-barras'));
document.getElementById('card-import-xml-pdf').addEventListener('click', () => showSection('tela-xml'));

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
selectPdfButton.addEventListener('click', async () =>{
    const pdfData = await ipcRenderer.invoke('select-pdf-file')
    const valor_adicional = parseFloat(document.getElementById('valor-adicional').value)
    const porcentagem = parseFloat(document.getElementById('porcentagem').value)
    
    processapdf(pdfData, valor_adicional, porcentagem)
})
function processapdf(pdfData, valor_adicional, porcentagem) {
    const regex = /(.+?)\s+R\$\s+\d+,\d+\s+UN\s+\d+\s+R\$\s+(\d+,\d+)\s+R\$\s+(\d+,\d+)\s+(\d+)\s+(\d+)/g
    const matches = [...pdfData.matchAll(regex)]
    const data = []
   
    for (const match of matches) {
      const nome_produto = match[1].trim().toUpperCase()
      let valor_unitario = match[2].replace(',', '.')
      valor_unitario = parseFloat(valor_unitario) + valor_adicional
      
      const valor_revenda = Math.floor(valor_unitario * porcentagem * 10) / 10 
      const valor_total = match[3]
      const codigo_ncm = match[4]
      const codigo_barras = match[5]
      data.push({
        "Nome do Produto": nome_produto,
        "Valor Unitário": valor_unitario.toFixed(2).replace('.', ','),
        "Valor Total": valor_total,
        "Código NCM": codigo_ncm,
        "Código de Barras": codigo_barras,
        "Valor Revenda": valor_revenda.toFixed(2).replace('.', ',')
      })
    }
  
   
    downloadExcel(data, 'produtos.xlsx')
    
  }

  function downloadExcel(data, filename) {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
    XLSX.writeFile(wb, filename)
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
    ultimoArquivoLido = newItems;
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

function ultimosdados() {
    createTable(ultimoArquivoLido);
}
function ultimosdados_baixar() {
    return ultimoArquivoLido;
}
function generateBarcode(prefix) {
    if (prefix !== '789' && prefix !== '790') {
        throw new Error("Prefix must be '789' or '790'");
    }
  
    // Generate the remaining digits
    let remainingDigits = '';
    for (let i = 0; i < 9; i++) {
        remainingDigits += Math.floor(Math.random() * 10).toString();
    }
  
    const fullCode = prefix + remainingDigits;
  
    // Calculate the checksum digit for EAN-13
function calculateChecksum(code) {
        const sumOdd = code
            .split('')
            .filter((_, index) => index % 2 === 0)
            .reduce((sum, digit) => sum + parseInt(digit), 0);
        const sumEven = code
            .split('')
            .filter((_, index) => index % 2 !== 0)
            .reduce((sum, digit) => sum + parseInt(digit), 0);
        const totalSum = sumOdd + sumEven * 3;
        const checksum = (10 - (totalSum % 10)) % 10;
        return checksum.toString();
    }
  
    const checksum = calculateChecksum(fullCode);
    const eanCode = fullCode + checksum;
  
    return eanCode;
  }
  
  function displayGeneratedBarcodes(prefix, count) {
    const barcodesContainer = document.getElementById('barcodes-container');
    barcodesContainer.innerHTML = ''; // Clear previous barcodes
    for (let i = 0; i < count; i++) {
        const barcode = generateBarcode(prefix);
        const barcodeElement = document.createElement('p');
        barcodeElement.textContent = barcode;
        barcodesContainer.appendChild(barcodeElement);
    }
  }
  
  document.getElementById('generate-barcodes-btn').addEventListener('click', () => {
    const prefix = document.querySelector('input[name="barcode-prefix"]:checked').value;
    const count = parseInt(document.getElementById('barcode-count').value, 10);
    displayGeneratedBarcodes(prefix, count);
  });
  document.getElementById('gera-codigos').addEventListener('click', () => {
    document.getElementById('codigos-de-barras').style.display = 'block';
  });

function downloadExcel(data, filename) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
}
document.getElementById('baixar').addEventListener('click', () => {
    dados = ultimosdados_baixar()
    downloadExcel(dados, 'excel_ultimosprodutos')
});

