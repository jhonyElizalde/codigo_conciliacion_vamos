// script4.js
// Función para convertir un color CSS a RGB
function cssColorToRGB(color) {
    console.log(`cssColorToRGB input: ${color}`);
    let rgb;
    if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        rgb = [r, g, b];
    } else if (color.startsWith('rgb')) {
        rgb = color.match(/\d+/g).map(Number);
        rgb = rgb.length >= 3 ? rgb.slice(0, 3) : [255, 255, 255];
    } else if (color === 'red') {
        rgb = [255, 0, 0];
    } else if (color === 'green') {
        rgb = [0, 128, 0];
    } else {
        rgb = [255, 255, 255]; // Blanco por defecto
    }
    console.log(`cssColorToRGB output: [${rgb.join(', ')}]`);
    return rgb;
}

// Función para copiar el contenido de la tabla Detalles de Operaciones al portapapeles
function copiarDetallesOperaciones() {
    const resultados = JSON.parse(
        document.getElementById('contenedor-suma-nuevos-valores').dataset.tablaDatos || '{}'
    ).resultados || [];

    if (!resultados.length) {
        alert('No hay datos en Detalles de Operaciones para copiar.');
        console.error('No hay resultados en contenedor-suma-nuevos-valores.dataset.tablaDatos');
        return;
    }

    // Formatear el texto para copiar
    const textoCopiar = resultados
        .map(item => {
            const valorFormatted = Number(item.valor).toFixed(2);
            const comentario = item.comentario || 'Sin comentario';
            // Usar '+' para 'ignorar' o 'suma', '-' para 'resta'
            const signo = item.operacion === 'ignorar' || item.operacion === 'suma' ? '+' : '-';
            return `${item.codigo} --> ${comentario} (${signo}$${valorFormatted} valor airtable)`;
        })
        .join('\n');

    // Copiar al portapapeles
    navigator.clipboard.writeText(textoCopiar).then(
        () => {
            console.log('Texto copiado al portapapeles:', textoCopiar);
            mostrarCheckVerde('btn-copiar-detalles');
        },
        (err) => {
            console.error('Error al copiar al portapapeles:', err);
            alert('Error al copiar el texto. Verifica la consola para más detalles.');
        }
    );
}

// Función para exportar las tablas a PDF
function exportarTablasAPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let yOffset = 10;

    // Obtener resultados para identificar operaciones
    const resultados = JSON.parse(
        document.getElementById('contenedor-suma-nuevos-valores').dataset.tablaDatos || '{}'
    ).resultados || [];

    // Función auxiliar para agregar una tabla al PDF
    function agregarTablaPDF(containerId, titulo) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Contenedor ${containerId} no encontrado`);
            return yOffset;
        }

        const table = container.querySelector('table');
        if (!table) {
            console.error(`Tabla no encontrada en ${containerId}`);
            return yOffset;
        }

        // Obtener el color de fondo del contenedor
        let tableColor;
        if (containerId === 'tabla-suma-inicial') {
            tableColor = cssColorToRGB('#fff7e6'); // Naranja claro
            console.log(`Color para ${containerId}: #fff7e6 -> [${tableColor.join(', ')}]`);
        } else if (containerId === 'contenedor-suma-nuevos-valores') {
            const estiloColor = window.getComputedStyle(container).backgroundColor;
            console.log(`Estilo de fondo para ${containerId}: ${estiloColor}`);
            // Forzar #d8b4fe si hay mensaje de diferencia, #fff7e6 si no
            const mensajeElement = document.querySelector('#contenedor-suma-nuevos-valores p');
            const hasDifference = mensajeElement && mensajeElement.textContent.includes('Validar la diferencia');
            tableColor = cssColorToRGB(hasDifference ? '#d8b4fe' : '#fff7e6');
            console.log(`Color para ${containerId}: ${hasDifference ? '#d8b4fe' : '#fff7e6'} -> [${tableColor.join(', ')}]`);
        } else {
            tableColor = [255, 255, 255]; // Blanco por defecto
            console.log(`Color por defecto para ${containerId}: [${tableColor.join(', ')}]`);
        }

        // Asegurar que el título sea negro
        doc.setTextColor(0, 0, 0);
        console.log(`Color del texto para título "${titulo}": [0, 0, 0]`);
        doc.setFontSize(12);
        doc.text(titulo, 10, yOffset);
        yOffset += 10;

        // Extraer datos de la tabla
        let headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
        let rows = Array.from(table.querySelectorAll('tbody tr')).map((tr, index) => {
            const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent);
            let rowColor = null;
            if (containerId === 'contenedor-detalles-operaciones' && index < resultados.length) {
                const operacion = resultados[index].operacion;
                const rowStyle = window.getComputedStyle(tr).backgroundColor;
                console.log(`Fila ${index} en ${containerId}: operación=${operacion}, backgroundColor=${rowStyle}`);
                if (operacion === 'resta') {
                    rowColor = cssColorToRGB('#ffcccc'); // Rojo claro
                } else if (operacion === 'ignorar') {
                    rowColor = cssColorToRGB('#b3e5fc'); // Azul claro
                } else if (operacion === 'suma') {
                    rowColor = cssColorToRGB('#fff7e6'); // Naranja claro
                } else {
                    rowColor = cssColorToRGB('#ffffff'); // Blanco por defecto
                }
                console.log(`Color asignado a fila ${index}: [${rowColor.join(', ')}]`);
            }
            return { cells, rowColor };
        });

        // Excluir la columna "Acción" para la tabla Detalles de Operaciones
        if (containerId === 'contenedor-detalles-operaciones') {
            headers = headers.slice(0, -1); // Eliminar la última columna ("Acción")
            rows = rows.map(row => ({
                cells: row.cells.slice(0, -1), // Eliminar la última celda
                rowColor: row.rowColor
            }));
        }

        // Usar autoTable para renderizar la tabla
        doc.autoTable({
            head: [headers],
            body: rows.map(row => row.cells),
            startY: yOffset,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 2,
                textColor: [0, 0, 0], // Texto negro en celdas
                lineColor: [0, 0, 0], // Bordes negros
                lineWidth: 0.1 // Grosor del borde
            },
            headStyles: {
                fillColor: [200, 200, 200],
                textColor: [0, 0, 0], // Texto negro en encabezados
                lineColor: [0, 0, 0] // Bordes negros
            },
            margin: { top: 10, left: 10, right: 10 },
            didParseCell: (data) => {
                if (data.row.section === 'body') {
                    if (containerId === 'contenedor-detalles-operaciones' && rows[data.row.index].rowColor) {
                        data.cell.styles.fillColor = rows[data.row.index].rowColor; // Color por fila
                        console.log(`Aplicando color de fila ${data.row.index} en ${containerId}: [${rows[data.row.index].rowColor.join(', ')}]`);
                    } else {
                        data.cell.styles.fillColor = tableColor; // Color del contenedor
                        console.log(`Aplicando color de tabla en ${containerId}: [${tableColor.join(', ')}]`);
                    }
                    data.cell.styles.textColor = [0, 0, 0]; // Forzar texto negro en celdas
                }
            }
        });

        yOffset = doc.lastAutoTable.finalY + 10;
        return yOffset;
    }

    // Función para agregar mensaje de diferencia al PDF
    function agregarMensajeDiferencia() {
        const mensajeElement = document.querySelector('#contenedor-suma-nuevos-valores p');
        if (mensajeElement && mensajeElement.textContent.trim()) {
            const estiloColor = window.getComputedStyle(mensajeElement).color;
            console.log(`Color del mensaje de diferencia: ${estiloColor}`);
            const color = cssColorToRGB(estiloColor); // Rojo (#ff0000) o verde (#008000)
            doc.setFontSize(10);
            doc.setTextColor(...color); // Mantener rojo o verde para el mensaje
            doc.text(mensajeElement.textContent, 10, yOffset);
            yOffset += 10;
        } else {
            console.warn('No se encontró el elemento <p> en contenedor-suma-nuevos-valores o está vacío');
        }
        return yOffset;
    }

    // Agregar las tablas al PDF
    yOffset = agregarTablaPDF('tabla-suma-inicial', 'Suma Inicial de Valores');
    yOffset = agregarTablaPDF('contenedor-suma-nuevos-valores', 'Suma con Nuevos Valores');
    yOffset = agregarMensajeDiferencia();
    yOffset = agregarTablaPDF('contenedor-detalles-operaciones', 'Detalles de Operaciones');

    // Guardar el PDF
    doc.save('reporte_operaciones.pdf');
    console.log('PDF generado y descargado');
    mostrarCheckVerde('btn-exportar-pdf');
}

// Función para mostrar un check verde en el botón
function mostrarCheckVerde(btnId) {
    const boton = document.getElementById(btnId);
    if (!boton) {
        console.error(`Botón ${btnId} no encontrado`);
        return;
    }

    // Guardar el texto original
    const textoOriginal = boton.textContent;
    // Determinar el texto del check según el botón
    const textoCheck = btnId === 'btn-exportar-pdf' ? '✓ Descargado' : '✓ Copiado';
    // Cambiar el texto a un check y fondo verde
    boton.innerHTML = textoCheck;
    boton.style.backgroundColor = '#4CAF50';
    boton.style.color = 'white';
    boton.disabled = true;

    // Restaurar el botón después de 2 segundos
    setTimeout(() => {
        boton.innerHTML = textoOriginal;
        boton.style.backgroundColor = '';
        boton.style.color = '';
        boton.disabled = false;
    }, 2000);
}

// Modificar la función mostrarTablaDetallesOperaciones para agregar los botones
const originalMostrarTablaDetallesOperaciones = window.mostrarTablaDetallesOperaciones;
window.mostrarTablaDetallesOperaciones = function(resultados) {
    // Llamar a la función original
    originalMostrarTablaDetallesOperaciones(resultados);

    // Agregar los botones de Copiar y Exportar PDF
    const container = document.getElementById('contenedor-detalles-operaciones');
    if (!container) {
        console.error('Contenedor contenedor-detalles-operaciones no encontrado');
        return;
    }

    // Crear contenedor para los botones
    const botonesContainer = document.createElement('div');
    botonesContainer.style.marginTop = '10px';
    botonesContainer.style.display = 'flex';
    botonesContainer.style.gap = '10px';
    botonesContainer.style.justifyContent = 'center';

    // Botón Copiar
    const btnCopiar = document.createElement('button');
    btnCopiar.id = 'btn-copiar-detalles';
    btnCopiar.textContent = 'Copiar Detalles';
    btnCopiar.style.padding = '8px';
    btnCopiar.style.fontSize = '0.9em';
    btnCopiar.style.cursor = 'pointer';
    btnCopiar.addEventListener('click', copiarDetallesOperaciones);

    // Botón Exportar PDF
    const btnExportarPDF = document.createElement('button');
    btnExportarPDF.id = 'btn-exportar-pdf';
    btnExportarPDF.textContent = 'Exportar como PDF';
    btnExportarPDF.style.padding = '8px';
    btnExportarPDF.style.fontSize = '0.9em';
    btnExportarPDF.style.cursor = 'pointer';
    btnExportarPDF.addEventListener('click', exportarTablasAPDF);

    // Añadir botones al contenedor
    botonesContainer.appendChild(btnCopiar);
    botonesContainer.appendChild(btnExportarPDF);
    container.appendChild(botonesContainer);

    console.log('Botones Copiar y Exportar PDF añadidos al contenedor-detalles-operaciones');
};

// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('script4.js cargado');
});