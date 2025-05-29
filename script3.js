// script3.js
// Objeto para almacenar comentarios
let comentarios = {};
let sumaBusplaceOriginal = 0; // Variable global para almacenar la suma original de Busplace

// Calcular sumaBusplaceOriginal cuando jsonData2 esté disponible
function calcularSumaBusplaceOriginal() {
    if (jsonData2 && jsonData2.length > 0) {
        sumaBusplaceOriginal = jsonData2.reduce((total, item) => {
            const valor = parseFloat(item.Valor) || 0;
            return total + valor;
        }, 0);
        console.log('sumaBusplaceOriginal calculada:', sumaBusplaceOriginal);
    } else {
        console.error('jsonData2 no está disponible para calcular sumaBusplaceOriginal');
    }
}

// Interceptar carga de jsonData2
function waitForJsonData2() {
    const checkData = setInterval(() => {
        if (jsonData2 && jsonData2.length > 0) {
            console.log('jsonData2 detectado, calculando sumaBusplaceOriginal');
            calcularSumaBusplaceOriginal();
            clearInterval(checkData);
        } else {
            console.log('jsonData2 no está definido aún, esperando...');
        }
    }, 500);
}

// Función para editar comentarios
window.editarComentario = function(boletoValue) {
    const nuevoComentario = prompt(`Editar comentario para el boleto ${boletoValue}:`, comentarios[boletoValue] || '');
    if (nuevoComentario !== null) {
        comentarios[boletoValue] = nuevoComentario.trim() || 'Sin comentario';
        console.log(`Comentario actualizado para boleto ${boletoValue}: ${comentarios[boletoValue]}`);
        const contenedor = document.getElementById('contenedor-suma-nuevos-valores');
        const tablaDatos = contenedor.dataset.tablaDatos ? JSON.parse(contenedor.dataset.tablaDatos) : null;
        if (tablaDatos) {
            // Actualizar los resultados con el nuevo comentario
            tablaDatos.resultados = tablaDatos.resultados.map(item => 
                item.boleto === boletoValue ? { ...item, comentario: comentarios[boletoValue] } : item
            );
            contenedor.dataset.tablaDatos = JSON.stringify(tablaDatos);
            mostrarTablaSumaNuevosValores(
                tablaDatos.sumaAirtableAjustada,
                sumaBusplaceOriginal,
                tablaDatos.resultados
            );
            const detallesContainer = document.getElementById('contenedor-detalles-operaciones');
            if (detallesContainer.style.display === 'block') {
                mostrarTablaDetallesOperaciones(tablaDatos.resultados);
            }
        }
    }
};

function activarBotonSumaInicial() {
    const btnSumaInicial = document.getElementById('btn-suma-inicial');
    if (btnSumaInicial) {
        btnSumaInicial.disabled = false;
        console.log('Botón Suma Inicial activado');
    } else {
        console.error('Error: Botón btn-suma-inicial no encontrado');
    }
}

// funcion para truncar en dos decimales
function truncateToTwoDecimals(number) {
    return Number(number).toFixed(2);
}

// para la diferencia
function formatearMensajeDiferencia(diferencia) {
    const dolares = Math.floor(diferencia);
    const centavos = Math.round((diferencia - dolares) * 100);
    
    let mensaje = 'Validar la diferencia de ';
    
    if (dolares > 0 && centavos > 0) {
        mensaje += `${dolares} ${dolares === 1 ? 'dólar' : 'dólares'} con ${centavos} ${centavos === 1 ? 'centavo' : 'centavos'}`;
    } else if (dolares > 0) {
        mensaje += `${dolares} ${dolares === 1 ? 'dólar' : 'dólares'}`;
    } else if (centavos > 0) {
        mensaje += `${centavos} ${centavos === 1 ? 'centavo' : 'centavos'}`;
    } else {
        mensaje += '0 dólares';
    }
    
    return mensaje;
}

// funcion mostrar table suma incial
function mostrarTablaSumaInicial(sumaAirtable, sumaBusplace) {
    const container = document.getElementById('tabla-suma-inicial');
    if (!container) {
        console.error('Error: Contenedor tabla-suma-inicial no encontrado');
        return;
    }

    const sumaAirtableFormatted = truncateToTwoDecimals(sumaAirtable);
    const sumaBusplaceFormatted = truncateToTwoDecimals(sumaBusplace);

    const tableHtml = `
        <style>
            @media (max-width: 768px) {
                #tabla-suma-inicial table {
                    width: 100%;
                    font-size: 0.8em;
                }
                #tabla-suma-inicial th, #tabla-suma-inicial td {
                    padding: 5px;
                    min-width: 80px;
                    word-wrap: break-word;
                }
            }
        </style>
        <h2>Suma Inicial de Valores</h2>
        <div style="width: 100%; max-width: 600px; margin: 0 0 0 0;">
            <table style="width: 100%; background-color: #fff7e6; border-collapse: collapse; font-size: 0.85em;">
                <thead>
                    <tr>
                        <th style="width: 70%; padding: 6px; border: 1px solid #ddd; min-width: 150px;">Concepto</th>
                        <th style="width: 30%; padding: 6px; border: 1px solid #ddd; min-width: 80px;">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 6px; border: 1px solid #ddd;">Valor Airtable (valor vamos inicial)</td>
                        <td style="padding: 6px; border: 1px solid #ddd;">$${sumaAirtableFormatted}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px; border: 1px solid #ddd;">Valor Busplace</td>
                        <td style="padding: 6px; border: 1px solid #ddd;">$${sumaBusplaceFormatted}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <button id="btn-suma-nuevos-valores" style="margin-top: 10px; padding: 8px; font-size: 0.9em;">Suma + Nuevos Valores</button>
        <div id="contenedor-suma-nuevos-valores" style="width: 100%; max-width: 600px; margin: 0 0 0 0;"></div>
    `;

    container.innerHTML = tableHtml;
    container.style.display = 'block';
    console.log('Tabla Suma Inicial mostrada:', { sumaAirtableFormatted, sumaBusplaceFormatted });

    const btnSumaNuevosValores = document.getElementById('btn-suma-nuevos-valores');
    if (btnSumaNuevosValores) {
        btnSumaNuevosValores.addEventListener('click', () => calcularSumaNuevosValores(sumaAirtable, sumaBusplaceOriginal));
        console.log('Event listener añadido a btn-suma-nuevos-valores');
    } else {
        console.error('Error: Botón btn-suma-nuevos-valores no encontrado');
    }
}

// funcion tabla detalles
function mostrarTablaDetallesOperaciones(resultados) {
    const container = document.getElementById('contenedor-detalles-operaciones');
    if (!container) {
        console.error('Error: Contenedor contenedor-detalles-operaciones no encontrado');
        return;
    }

    const screenWidth = window.innerWidth;
    console.log('Ancho de la pantalla:', screenWidth, 'px');

    let tableHtml = `
        <style>
            #contenedor-detalles-operaciones {
                width: 100%;
                max-width: 600px;
                margin: 20px 0;
                margin-left: 0;
                padding: 0;
                overflow-x: auto;
                box-sizing: border-box;
            }
            .tabla-detalles-operaciones {
                width: 100%;
                max-width: 600px;
                margin: 0;
                margin-left: 0;
                overflow-x: auto;
                box-sizing: border-box;
            }
            .tabla-detalles-operaciones table {
                width: 100%;
                background-color: #fff7e6;
                border-collapse: collapse;
                font-size: 0.95em;
            }
            .tabla-detalles-operaciones th, .tabla-detalles-operaciones td {
                padding: 9px;
                border: 1px solid #ddd;
                word-break: break-word;
                white-space: normal;
                box-sizing: border-box;
                text-align: left;
            }
            .tabla-detalles-operaciones th:nth-child(1), .tabla-detalles-operaciones td:nth-child(1) {
                width: 25%;
                min-width: 100px;
            }
            .tabla-detalles-operaciones th:nth-child(2), .tabla-detalles-operaciones td:nth-child(2) {
                width: 15%;
                min-width: 80px;
            }
            .tabla-detalles-operaciones th:nth-child(3), .tabla-detalles-operaciones td:nth-child(3) {
                width: 10%;
                min-width: 60px;
            }
            .tabla-detalles-operaciones th:nth-child(4), .tabla-detalles-operaciones td:nth-child(4) {
                width: 30%;
                min-width: 120px;
            }
            .tabla-detalles-operaciones th:nth-child(5), .tabla-detalles-operaciones td:nth-child(5) {
                width: 20%;
                min-width: 80px;
            }
            .replace-button {
                padding: 5px 10px;
                font-size: 0.9em;
                width: 100%;
                cursor: pointer;
                display: inline-block;
                box-sizing: border-box;
                white-space: normal;
            }
            @media (max-width: 768px) {
                .tabla-detalles-operaciones {
                    max-width: 100%;
                }
                .tabla-detalles-operaciones table {
                    font-size: 0.85em;
                }
                .tabla-detalles-operaciones th, .tabla-detalles-operaciones td {
                    padding: 6px;
                }
                .replace-button {
                    font-size: 0.8em;
                    padding: 4px 8px;
                }
                #contenedor-detalles-operaciones {
                    max-width: 100%;
                }
            }
            @media (max-width: 480px) {
                .tabla-detalles-operaciones table {
                    font-size: 0.8em;
                }
                .tabla-detalles-operaciones th, .tabla-detalles-operaciones td {
                    padding: 4px;
                }
                .replace-button {
                    font-size: 0.7em;
                    padding: 3px 6px;
                }
            }
        </style>
        <div class="tabla-detalles-operaciones">
            <h2>Detalles de Operaciones</h2>
            <table>
                <thead>
                    <tr>
                        <th>Boleto</th>
                        <th>Código</th>
                        <th>Valor</th>
                        <th>Comentario</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
    `;

    resultados.forEach(item => {
        const comentario = comentarios[item.boleto] || 'Sin comentario';
        const valorFormatted = truncateToTwoDecimals(item.valor);
        const valorDisplay = item.operacion === 'suma' ? `+$${valorFormatted}` :
                            item.operacion === 'resta' ? `-$${valorFormatted}` :
                            `$${valorFormatted}`;
        const rowStyle = item.operacion === 'resta' ? 'style="background-color: #ffcccc;"' :
                         item.operacion === 'ignorar' ? 'style="background-color: #b3e5fc;"' : '';

        console.log('Fila de datos:', {
            boleto: item.boleto,
            codigo: item.codigo,
            valor: valorDisplay,
            comentario: comentario,
            operacion: item.operacion
        });

        tableHtml += `
            <tr ${rowStyle}>
                <td>${item.boleto}</td>
                <td>${item.codigo}</td>
                <td>${valorDisplay}</td>
                <td>${comentario}</td>
                <td style="text-align: center;">
                    <button class="replace-button" onclick="editarComentario('${item.boleto}')">Editar Comentario</button>
                </td>
            </tr>
        `;
    });

    tableHtml += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = tableHtml;
    container.style.display = 'block';

    const containerWidth = container.offsetWidth;
    console.log('Ancho del contenedor #contenedor-detalles-operaciones:', containerWidth, 'px');

    const table = container.querySelector('table');
    if (table) {
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            const computedWidth = window.getComputedStyle(header).width;
            console.log(`Ancho de la columna ${header.textContent}: ${computedWidth}`);
        });
    }

    console.log('Tabla Detalles de Operaciones mostrada:', resultados);
}

// funcion mostrar tabla suma nuevos valores
function mostrarTablaSumaNuevosValores(sumaAirtableAjustada, sumaBusplaceInicial, resultados) {
    const container = document.getElementById('contenedor-suma-nuevos-valores');
    if (!container) {
        console.error('Error: Contenedor contenedor-suma-nuevos-valores no encontrado');
        return;
    }

    const sumaAirtableFormatted = truncateToTwoDecimals(sumaAirtableAjustada);
    const sumaBusplaceFormatted = truncateToTwoDecimals(sumaBusplaceInicial);
    const isMismatch = Math.abs(parseFloat(sumaAirtableFormatted) - parseFloat(sumaBusplaceFormatted)) > 0.01;
    const diferencia = Math.abs(sumaAirtableAjustada - sumaBusplaceInicial).toFixed(2);
    const mensajeValidacion = isMismatch
        ? `<p style="color: red; font-weight: bold; margin-top: 10px;">${formatearMensajeDiferencia(diferencia)}</p>`
        : `<p style="color: green; font-weight: bold; margin-top: 10px;">No toca validar nada</p>`;

    let tableHtml = `
        <style>
            #contenedor-suma-nuevos-valores {
                width: 100%;
                max-width: 600px;
                margin: 0 0 0 0;
                padding: 0;
                overflow-x: auto;
                box-sizing: border-box;
            }
            #tabla-suma-inicial {
                width: 100%;
                max-width: 600px;
                margin: 0 0 0 0;
                padding: 0;
                overflow-x: auto;
                box-sizing: border-box;
                float: none;
            }
            .tabla-suma-nuevos-valores {
                width: 100%;
                max-width: 600px;
                margin: 0 0 0 0;
                overflow-x: auto;
                box-sizing: border-box;
            }
            .tabla-suma-nuevos-valores table {
                width: 100%;
                background-color: #fff7e6;
                border-collapse: collapse;
                font-size: 0.85em;
            }
            .tabla-suma-nuevos-valores th, .tabla-suma-nuevos-valores td {
                padding: 6px;
                border: 1px solid #ddd;
                word-wrap: break-word;
            }
            @media (max-width: 768px) {
                .tabla-suma-nuevos-valores {
                    max-width: 100%;
                }
                .tabla-suma-nuevos-valores table {
                    font-size: 0.8em;
                }
                .tabla-suma-nuevos-valores th, .tabla-suma-nuevos-valores td {
                    padding: 5px;
                }
                #contenedor-suma-nuevos-valores {
                    max-width: 100%;
                }
            }
        </style>
        <div class="tabla-suma-nuevos-valores">
            <h2>Suma con Nuevos Valores</h2>
            <table>
                <thead>
                    <tr>
                        <th style="width: 65%;">Concepto</th>
                        <th style="width: 35%;">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    <tr ${isMismatch ? 'style="background-color: #d8b4fe;"' : ''}>
                        <td>Valor Airtable (valor vamos)</td>
                        <td>$${sumaAirtableFormatted}</td>
                    </tr>
                    <tr ${isMismatch ? 'style="background-color: #d8b4fe;"' : ''}>
                        <td>Valor Busplace</td>
                        <td>$${sumaBusplaceFormatted}</td>
                    </tr>
                </tbody>
            </table>
            ${mensajeValidacion}
        </div>
        <button id="btn-detalles-operaciones" style="margin-top: 10px; padding: 8px; font-size: 0.9em;">Detalles de Operaciones</button>
        <div id="contenedor-detalles-operaciones" style="width: 100%; max-width: 600px; margin: 0 0 0 0; display: none;"></div>
    `;

    container.innerHTML = tableHtml;
    container.dataset.tablaDatos = JSON.stringify({
        sumaAirtableAjustada,
        sumaBusplaceInicial,
        resultados
    });
    console.log('Tabla Suma con Nuevos Valores mostrada:', {
        sumaAirtableFormatted,
        sumaBusplaceFormatted,
        isMismatch,
        diferencia,
        resultados
    });

    const containerWidth = container.offsetWidth;
    console.log('Ancho del contenedor #contenedor-suma-nuevos-valores:', containerWidth, 'px');

    const btnDetallesOperaciones = document.getElementById('btn-detalles-operaciones');
    if (btnDetallesOperaciones) {
        btnDetallesOperaciones.addEventListener('click', () => {
            mostrarTablaDetallesOperaciones(resultados);
        });
        console.log('Event listener añadido a btn-detalles-operaciones');
    } else {
        console.error('Error: Botón btn-detalles-operaciones no encontrado');
    }
}

// ontner opreciones
function obtenerOperacionValida(boleto, codigo, valorFormatted) {
    let operacion = null;
    while (!operacion) {
        operacion = prompt(`Para el boleto ${boleto} con código ${codigo} y valor $${valorFormatted}, escriba "suma", "resta", "restar" o "ignorar":`);
        if (operacion === null) {
            return null;
        }
        operacion = operacion.toLowerCase().trim();
        if (!['suma', 'resta', 'ignorar', 'restar'].includes(operacion)) {
            alert('Por favor, ingrese "suma", "resta", "restar" o "ignorar".');
            operacion = null;
        }
    }
    return operacion === 'restar' ? 'resta' : operacion;
}

// calcular suma nuevos valores
function calcularSumaNuevosValores(sumaAirtableInicial, sumaBusplaceInicial) {
    if (!window.noRepetidosConCodigo || !Array.isArray(window.noRepetidosConCodigo)) {
        alert('Error: No hay datos de valores no duplicados disponibles.');
        console.error('noRepetidosConCodigo no definido o no es un array:', window.noRepetidosConCodigo);
        return;
    }

    const undefinedBoletos = window.noRepetidosConCodigo.filter(item => 
        String(item.value).trim().toLowerCase() === 'undefined'
    );
    console.log('Boletos undefined detectados:', undefinedBoletos);

    let procesarUndefined = true;
    if (undefinedBoletos.length > 0) {
        procesarUndefined = confirm('Tienes un indefinido, ¿quieres continuar?');
        if (!procesarUndefined) {
            console.log('Boletos undefined excluidos del procesamiento');
            alert('Boletos indefinidos excluidos. Continuando con los boletos válidos.');
        } else {
            console.log('Usuario eligió procesar boletos undefined');
        }
    }

    const duplicadosSet = new Set(Object.keys(window.duplicadosValores || {}).map(key => String(key).trim()));
    console.log('Duplicados en duplicadosValores:', Array.from(duplicadosSet));

    const valoresReemplazados = window.noRepetidosConCodigo.filter(item => {
        const itemValue = String(item.value).trim();
        const isInDuplicados = duplicadosSet.has(itemValue);
        const isUndefined = itemValue.toLowerCase() === 'undefined';
        if (isInDuplicados) {
            console.log(`Excluyendo boleto ${itemValue} de valoresReemplazados porque está en duplicadosValores`);
        }
        if (isUndefined && !procesarUndefined) {
            console.log(`Excluyendo boleto undefined ${item.booking_number} porque el usuario canceló procesar undefined`);
            return false;
        }
        return item.booking_number !== 'VXXXXXX' && !isInDuplicados;
    });
    console.log('Valores reemplazados filtrados:', valoresReemplazados);

    const resultados = [];
    let sumaAirtableAjustada = parseFloat(sumaAirtableInicial);

    valoresReemplazados.forEach(item => {
        const valor = parseFloat(item.busplaceValue) || 0;
        const valorFormatted = truncateToTwoDecimals(valor);
        const boletoPrompt = item.value === 'undefined' ? `undefined_${Math.random().toString(36).substr(2, 5)}` : item.value;
        const boletoTabla = item.value === 'undefined' ? '000000000000000' : item.value;

        const operacion = obtenerOperacionValida(boletoPrompt, item.booking_number, valorFormatted);

        let comentario = comentarios[boletoTabla] || 'Sin comentario';
        if (operacion === null) {
            comentario = 'Operación cancelada';
            console.log(`Operación cancelada para boleto ${boletoPrompt}`);
        } else {
            const motivo = prompt(`¿Por qué quieres ${operacion} el boleto ${boletoPrompt}?`) || 'Sin motivo especificado';
            comentario = motivo.trim();
            if (operacion === 'suma') {
                sumaAirtableAjustada += valor;
                console.log(`Sumando ${valor} a Airtable para boleto ${boletoPrompt} con comentario: ${comentario}`);
            } else if (operacion === 'resta') {
                sumaAirtableAjustada -= valor;
                console.log(`Restando ${valor} a Airtable para boleto ${boletoPrompt} con comentario: ${comentario}`);
            } else {
                sumaAirtableAjustada -= valor;
                console.log(`Ignorando boleto ${boletoPrompt} con comentario: ${comentario}, restando ${valor} a Airtable`);
            }
        }

        comentarios[boletoTabla] = comentario;
        resultados.push({
            boleto: boletoTabla,
            codigo: item.booking_number,
            valor: valor,
            comentario: comentario,
            operacion: operacion || 'cancelada'
        });
    });

    console.log('Boletos en duplicadosValores ignorados:', Object.keys(window.duplicadosValores || {}));

    if (resultados.length === 0) {
        alert('No hay boletos válidos para procesar.');
        console.log('No se procesaron boletos válidos.');
        return;
    }

    // Usar sumaBusplaceOriginal en lugar de recalcular
    console.log('Valores antes de mostrar tabla:', { sumaAirtableAjustada, sumaBusplaceOriginal });
    mostrarTablaSumaNuevosValores(sumaAirtableAjustada, sumaBusplaceOriginal, resultados);
}

// calcular suma incial
function calcularSumaInicial() {
    if (!jsonData1 || !jsonData2 || jsonData1.length === 0 || jsonData2.length === 0) {
        alert('Error: Los datos de Airtable o Busplace no están cargados correctamente.');
        console.error('jsonData1:', jsonData1, 'jsonData2:', jsonData2);
        return;
    }

    const sumaAirtable = jsonData1.reduce((total, item) => {
        const valor = parseFloat(item.price_to_pay_carrier) || 0;
        return total + valor;
    }, 0);

    // No recalcular sumaBusplace, usar sumaBusplaceOriginal
    console.log('Suma Inicial calculada:', { sumaAirtable, sumaBusplace: sumaBusplaceOriginal });
    mostrarTablaSumaInicial(sumaAirtable, sumaBusplaceOriginal);
}

// para obtnener datos
function waitForCompararYMostrarDatos() {
    const checkFunction = setInterval(() => {
        if (typeof window.compararYMostrarDatos === 'function') {
            console.log('compararYMostrarDatos encontrado, modificando...');
            const originalCompararYMostrarDatos = window.compararYMostrarDatos;
            window.compararYMostrarDatos = function() {
                console.log('Ejecutando compararYMostrarDatos desde script3.js');
                originalCompararYMostrarDatos();
                activarBotonSumaInicial();
            };
            clearInterval(checkFunction);
        } else {
            console.log('compararYMostrarDatos no está definido aún, esperando...');
        }
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    waitForCompararYMostrarDatos();
    waitForJsonData2(); // Iniciar la espera para jsonData2
});

const btnSumaInicial = document.getElementById('btn-suma-inicial');
if (btnSumaInicial) {
    console.log('Añadiendo event listener a btn-suma-inicial');
    btnSumaInicial.addEventListener('click', function() {
        if (btnSumaInicial.disabled) {
            alert('Por favor, realiza la comparación primero');
        } else {
            calcularSumaInicial();
        }
    });
} else {
    console.error('Error: Botón btn-suma-inicial no encontrado');
}