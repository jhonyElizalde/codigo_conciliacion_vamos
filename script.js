// script.js
// Transformamos el Excel a JSON
let jsonData1 = [];
let jsonData2 = [];
let busplaceFormat = 'new'; // Variable para almacenar el formato de Busplace (new o old)

document.getElementById('input-excel-1').addEventListener('change', handleFile1, false);
document.getElementById('input-excel-2').addEventListener('change', handleFile2, false);
document.getElementById('btn-mostrar-datos-1').addEventListener('click', showData1, false);
document.getElementById('btn-minimizar-datos-1').addEventListener('click', minimizeData1, false);
document.getElementById('btn-mostrar-datos-2').addEventListener('click', showData2, false);
document.getElementById('btn-minimizar-datos-2').addEventListener('click', minimizeData2, false);

// Inicializar el botón Comparar como deshabilitado
const btnComparar = document.getElementById('btn-comparar');
if (btnComparar) {
    btnComparar.disabled = true;
    btnComparar.addEventListener('click', function() {
        console.log('Clic en Comparar y Validar detectado');
        console.log('Estado de datos:', {
            jsonData1Length: jsonData1 ? jsonData1.length : 'undefined',
            jsonData2Length: jsonData2 ? jsonData2.length : 'undefined'
        });
        if (!jsonData1 || jsonData1.length === 0 || !jsonData2 || jsonData2.length === 0) {
            alert('Por favor, carga ambos archivos Excel antes de comparar.');
            return;
        }
        try {
            window.compararYMostrarDatos();
        } catch (error) {
            console.error('Error al ejecutar compararYMostrarDatos:', error);
            alert('Error al comparar: ' + error.message);
        }
    });
} else {
    console.error('Botón btn-comparar no encontrado');
}

// Esta función lee el archivo Excel 1 y lo pasa a JSON
function handleFile1(event) {
    const file = event.target.files[0];
    if (!file) {
        console.error('No se eligió ningún archivo.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = e.target.result;
        try {
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            if (!sheet) {
                console.error('No hay hoja en el archivo.');
                return;
            }

            jsonData1 = XLSX.utils.sheet_to_json(sheet);

            // Procesamos las fechas
            jsonData1 = jsonData1.map(row => {
                if (row.departure_datetime) {
                    if (typeof row.departure_datetime === 'string') {
                        const dateMatch = row.departure_datetime.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(\s(\d{1,2}):(\d{2}))?/);
                        if (dateMatch) {
                            const [_, day, month, year, , hours, minutes] = dateMatch;
                            const timePart = hours && minutes ? ` ${hours.padStart(2, '0')}:${minutes}` : '';
                            row.departure_datetime = `${parseInt(day)}/${month.padStart(2, '0')}/${year}${timePart}`;
                        } else {
                            console.warn(`Formato de fecha no reconocido: ${row.departure_datetime}`);
                            row.departure_datetime_error = 'Formato de fecha inválido';
                        }
                    } else if (typeof row.departure_datetime === 'number') {
                        const convertedDate = excelDateToJSDate(row.departure_datetime);
                        if (convertedDate === null) {
                            row.departure_datetime_error = 'Error al convertir la fecha';
                        } else {
                            row.departure_datetime = convertedDate;
                        }
                    } else {
                        console.warn(`Tipo de fecha no manejado: ${typeof row.departure_datetime}`);
                        row.departure_datetime_error = 'Tipo de fecha no soportado';
                    }
                }
                return row;
            });

            console.log('Datos de Excel 1:', jsonData1);

            document.getElementById('btn-mostrar-datos-1').disabled = false;
            document.getElementById('btn-minimizar-datos-1').disabled = false;
            checkEnableCompareButton();
        } catch (err) {
            console.error('Error al procesar el archivo Excel 1:', err);
        }
    };
    reader.readAsBinaryString(file);
}

// Esta función lee el archivo Excel 2 y lo pasa a JSON, manejando ambos formatos
function handleFile2(event) {
    const file = event.target.files[0];
    if (!file) {
        console.error('No se eligió ningún archivo.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = e.target.result;
        try {
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            if (!sheet) {
                console.error('No se encontró la hoja.');
                return;
            }

            jsonData2 = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1 });

            // Buscar la fila de encabezados
            let headerRow = jsonData2.find(row => row.includes("Fecha Salida") || row.some(cell => cell && cell.toString().startsWith('__EMPTY')));
            let headerIndex = jsonData2.indexOf(headerRow);

            if (!headerRow) {
                console.error('No se encontraron los encabezados esperados en el archivo.');
                return;
            }

            const isNewFormat = headerRow.includes("Fecha Salida");
            busplaceFormat = isNewFormat ? 'new' : 'old';
            let dataRows, headers;

            if (isNewFormat) {
                // Normalizar encabezados (quitar espacios, pasar a minúsculas para comparación)
                headers = headerRow.map(h => h ? h.toString().trim() : '');
                console.log('Encabezados detectados:', headers); // Para depuración

                dataRows = jsonData2.slice(headerIndex + 1).filter(row => 
                    row.some(cell => cell !== "" && cell !== null && cell !== undefined)
                );

                jsonData2 = dataRows.map(row => {
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = row[index] !== undefined ? row[index] : "";
                    });

                    // Procesar fechas
                    if (rowData["Fecha Salida"]) {
                        if (typeof rowData["Fecha Salida"] === 'number' && !isNaN(rowData["Fecha Salida"])) {
                            const fechaSalida = excelDateToJSDate(rowData["Fecha Salida"]);
                            rowData["Fecha Salida"] = fechaSalida ? fechaSalida.split(' ')[0] : "";
                        } else {
                            console.warn(`Valor no numérico en Fecha Salida: ${rowData["Fecha Salida"]}`);
                            rowData["Fecha Salida"] = "";
                        }
                    }
                    if (rowData["Fecha venta"]) {
                        if (typeof rowData["Fecha venta"] === 'number' && !isNaN(rowData["Fecha venta"])) {
                            const fechaVenta = excelDateToJSDate(rowData["Fecha venta"]);
                            rowData["Fecha venta"] = fechaVenta ? fechaVenta.split(' ')[0] : "";
                        } else {
                            console.warn(`Valor no numérico en Fecha venta: ${rowData["Fecha venta"]}`);
                            rowData["Fecha venta"] = "";
                        }
                    }

                    // Procesar Valor
                    if (rowData["Valor"]) {
                        rowData["Valor"] = parseFloat(rowData["Valor"]) || 0;
                    }

                    // Manejar Boleto
                    if (!rowData["Boleto"] || String(rowData["Boleto"]).trim().toLowerCase() === 'undefined') {
                        rowData["Boleto"] = 'undefined';
                    }

                    // Depuración específica para Oficina
                    console.log('Valor de Oficina en rowData:', rowData["Oficina"]); // Verificar si Oficina tiene datos

                    return {
                        "Fecha Salida": rowData["Fecha Salida"] || "",
                        "Hora": rowData["Hora"] || "",
                        "Bus": rowData["Bus"] || "",
                        "Origen": rowData["Origen"] || "",
                        "Boleto": rowData["Boleto"] || "",
                        "Fecha Venta": rowData["Fecha venta"] || "",
                        "Tipo": rowData["Tipo"] || "",
                        "Pasajero": rowData["Pasajero"] || "",
                        "Destino": rowData["Destino"] || "",
                        "Valor": rowData["Valor"] || 0,
                        "Usuario": rowData["Usuario"] || "",
                        "Oficina": rowData["Oficina"] || "" // Asegurar que Oficina no quede vacía
                    };
                });
            } else {
                // Manejo del formato antiguo
                jsonData2 = XLSX.utils.sheet_to_json(sheet, { defval: "" });
                while (jsonData2.length > 0 && Object.values(jsonData2[0]).every(value => value === "")) {
                    jsonData2.shift();
                }
                if (jsonData2.length > 41) {
                    jsonData2 = jsonData2.slice(-41);
                }

                jsonData2 = jsonData2.map(item => {
                    let fechaSalida = convertirFecha(item["COOPERATIVA DE TRANSPORTES AMAZONAS"]);
                    let fechaVenta = convertirFecha(item["__EMPTY_4"]);
                    
                    if (fechaSalida) {
                        const [year, month, day] = fechaSalida.split('-');
                        fechaSalida = `${parseInt(day)}/${month}/${year}`;
                    }
                    if (fechaVenta) {
                        const [year, month, day] = fechaVenta.split('-');
                        fechaVenta = `${parseInt(day)}/${month}/${year}`;
                    }

                    let boleto = item["__EMPTY_3"] || "";
                    if (!boleto || String(boleto).trim().toLowerCase() === 'undefined') {
                        boleto = 'undefined';
                    }

                    return {
                        "Fecha Salida": fechaSalida || "",
                        "Hora": item["__EMPTY"] || "",
                        "Bus": item["__EMPTY_1"] || "",
                        "Origen": item["__EMPTY_2"] || "",
                        "Boleto": boleto,
                        "Fecha Venta": fechaVenta || "",
                        "Tipo": item["__EMPTY_5"] || "",
                        "Pasajero": item["__EMPTY_6"] || "",
                        "Destino": item["__EMPTY_7"] || "",
                        "Valor": parseFloat(item["__EMPTY_8"]) || 0,
                        "Usuario": item["__EMPTY_9"] || "",
                        "Oficina": item["__EMPTY_10"] || ""
                    };
                });
            }

            // Filtrar filas vacías o inválidas
            jsonData2 = jsonData2.filter(item => 
                item["Hora"] && 
                item["Boleto"] && 
                item["Boleto"] !== "Boleto" && 
                item["Hora"] !== "Hora"
            );

            if (jsonData2.length === 0) {
                console.warn('No hay datos válidos para mostrar después del filtrado en el archivo 2.');
            } else {
                console.log('Datos transformados de Excel 2:', jsonData2);
            }

            document.getElementById('btn-mostrar-datos-2').disabled = jsonData2.length === 0;
            document.getElementById('btn-minimizar-datos-2').disabled = jsonData2.length === 0;
            checkEnableCompareButton();
        } catch (err) {
            console.error('Error al procesar el archivo Excel 2:', err);
        }
    };
    reader.readAsBinaryString(file);
}

// Función para habilitar el botón Comparar cuando ambos archivos estén cargados
function checkEnableCompareButton() {
    if (jsonData1 && jsonData1.length > 0 && jsonData2 && jsonData2.length > 0) {
        btnComparar.disabled = false;
        console.log('Botón Comparar habilitado');
    } else {
        btnComparar.disabled = true;
        console.log('Botón Comparar deshabilitado: datos incompletos');
    }
}

// Convierte la fecha de Excel a formato JS
function excelDateToJSDate(excelDate) {
    if (typeof excelDate !== 'number' || isNaN(excelDate)) {
        console.error('Fecha de excel no es válida:', excelDate);
        return null;
    }
    const excelBaseDate = new Date(1899, 11, 30);
    const jsDate = new Date(excelBaseDate.getTime() + (excelDate * 86400 * 1000));
    if (isNaN(jsDate.getTime())) {
        console.error('Error en la conversión de fecha:', jsDate);
        return null;
    }

    const hours = Math.floor(excelDate % 1 * 24);
    const minutes = Math.round((excelDate % 1 * 24 * 60) % 60);
    jsDate.setHours(hours);
    jsDate.setMinutes(minutes);

    const day = jsDate.getDate();
    const month = jsDate.getMonth() + 1;
    const year = jsDate.getFullYear();
    
    return `${day}/${month}/${year} ${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
}

// Convierte fechas en Excel a formato texto
function convertirFecha(valor) {
    if (!valor || isNaN(valor)) return "";
    const excelBaseDate = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelBaseDate.getTime() + (valor * 86400 * 1000));
    return formatFecha(date);
}

// Da formato a la fecha
function formatFecha(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    return date.toISOString().split('T')[0];
}

// Muestra los datos del Excel 1 en HTML
function showData1() {
    if (!jsonData1 || jsonData1.length === 0) {
        alert("No hay datos para mostrar en el archivo 1.");
        return;
    }

    const jsonContainer = document.getElementById('json-container-1');
    
    let table = '<table>';
    table += '<thead><tr>';
    Object.keys(jsonData1[0]).forEach(key => {
        table += `<th>${key}</th>`;
    });
    table += '</tr></thead><tbody>';

    jsonData1.forEach(row => {
        table += '<tr>';
        Object.values(row).forEach(value => {
            table += `<td>${value}</td>`;
        });
        table += '</tr>';
    });
    table += '</tbody></table>';

    jsonContainer.innerHTML = table;
    jsonContainer.style.display = 'block';

    if (!dataShown1) {
        showOriginalCells(1);
        dataShown1 = true;
    }
}

// Oculta los datos
function minimizeData1() {
    const jsonContainer = document.getElementById('json-container-1');
    jsonContainer.style.display = 'none';
}

// Muestra los datos del Excel 2
function showData2() {
    if (!jsonData2 || jsonData2.length === 0) {
        alert("No hay datos para mostrar en el archivo 2.");
        return;
    }

    const jsonContainer = document.getElementById('json-container-2');
    
    let table = '<table>';
    table += '<thead><tr>';
    Object.keys(jsonData2[0]).forEach(key => {
        table += `<th>${key}</th>`;
    });
    table += '</tr></thead><tbody>';

    jsonData2.forEach(row => {
        table += '<tr>';
        Object.values(row).forEach(value => {
            table += `<td>${value}</td>`;
        });
        table += '</tr>';
    });
    table += '</tbody></table>';

    jsonContainer.innerHTML = table;
    jsonContainer.style.display = 'block';

    if (!dataShown2) {
        showOriginalCells(2);
        dataShown2 = true;
    }
}

// Oculta los datos del segundo archivo
function minimizeData2() {
    const jsonContainer = document.getElementById('json-container-2');
    jsonContainer.style.display = 'none';
}

// Muestra las celdas originales del Excel
function logCellPositionsOriginal(sheet, archivo) {
    console.group(`Datos de Excel ${archivo}`);
    console.log(`Mostrando datos del Excel ${archivo}...`);

    Object.keys(sheet).forEach(cellRef => {
        const cell = sheet[cellRef];
        
        const cellRow = cellRef.replace(/[^\d]/g, '');
        const cellCol = cellRef.replace(/[^\D]/g, '');

        console.log(`Celda [Fila ${cellRow}, Columna ${cellCol}] = ${cell.v}`);
    });

    console.groupEnd();
}

// Función auxiliar para mostrar celdas originales
function showOriginalCells(fileNumber) {
    const inputId = `input-excel-${fileNumber}`;
    const file = document.getElementById(inputId).files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        logCellPositionsOriginal(sheet, fileNumber);
    };
    reader.readAsBinaryString(file);
}

// Variables para verificar si ya se mostraron los datos
let dataShown1 = false;
let dataShown2 = false;

// Detecta cuando se limpia la consola
let previousConsole = console.log;
let consoleCleared = false;

console.log = function(...args) {
    previousConsole.apply(console, args);
    if (!consoleCleared && args.length === 0) {
        consoleCleared = true;
    }
};

function monitorConsoleClear() {
    const interval = setInterval(() => {
        if (consoleCleared) {
            resetDataFlags();
            console.log("Consola limpiada. Los datos pueden mostrarse nuevamente.");
            clearInterval(interval);
        }
    }, 500);
}

function resetDataFlags() {
    dataShown1 = false;
    dataShown2 = false;
    consoleCleared = false;
}

monitorConsoleClear();