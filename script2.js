// script2.js
// Declarar noRepetidosConCodigo como global
window.noRepetidosConCodigo = [];
window.duplicadosRecientes = new Set();
window.duplicadosValores = {};
let datosMostrados = false;
const desplazamientoAirtable = 2;
const desplazamientoBusplace = 10;

// Función para separar los valores con "/"
function separarValores(valor) {
    if (typeof valor === 'string' && valor.includes('/')) {
        return valor.split('/').map(v => v.trim());
    }
    return [String(valor || '')];
}

// Función para extraer columnas de Airtable y Busplace
function extraerColumnas() {
    const bookingNumbers = (jsonData1 || []).flatMap((item, index) => {
        if (!item) return [];
        const valores = item.booking_number_carrier ? separarValores(item.booking_number_carrier) : ['undefined'];
        return valores.map(valor => ({
            value: valor === '' ? 'undefined' : String(valor),
            row: index + desplazamientoAirtable,
            column: "H",
            origen: "Airtable",
            original: item.booking_number_carrier || '',
            booking_number: item.booking_number || 'VXXXXXX',
            price_to_pay_carrier: parseFloat(item.price_to_pay_carrier) || 0,
            rowIndex: index // Añadir rowIndex para entradas de Airtable
        })).filter(num => num.value !== '');
    });

    const boletos = (jsonData2 || []).flatMap((item, index) => {
        if (!item || !item["Boleto"]) return [];
        const valores = separarValores(item["Boleto"]);
        return valores.map(valor => ({
            value: valor === '' ? 'undefined' : String(valor),
            row: index + desplazamientoBusplace,
            column: "E",
            origen: "Busplace",
            original: item["Boleto"] || '',
            valor: parseFloat(item.Valor) || 0,
            rowIndex: index
        }));
    });

    return { bookingNumbers, boletos };
}

// Función para mover un boleto a Duplicados
function moverADuplicados(boletoValue, bookingNumber, busplaceValue) {
    console.log('Moviendo a Duplicados:', boletoValue, 'con booking_number:', bookingNumber, 'y valor:', busplaceValue);

    const boletoExists = window.noRepetidosConCodigo.some(item => String(item.value) === String(boletoValue));
    if (!boletoExists && boletoValue !== 'undefined') {
        console.warn(`El boleto ${boletoValue} no se encontró en noRepetidosConCodigo. No se eliminará.`);
        return;
    }

    window.noRepetidosConCodigo = window.noRepetidosConCodigo.filter(item => String(item.value) !== String(boletoValue));

    const airtableEntry = jsonData1 && jsonData1.find(item => item && item.booking_number === bookingNumber && (!item.booking_number_carrier || item.booking_number_carrier.trim() === ''));
    if (airtableEntry) {
        window.noRepetidosConCodigo = window.noRepetidosConCodigo.filter(item => !(item.value === 'undefined' && item.booking_number === bookingNumber));
        window.duplicadosRecientes.add('undefined_' + bookingNumber);
        console.log(`Eliminado undefined con booking_number: ${bookingNumber}`);
    }

    window.duplicadosRecientes.add(String(boletoValue));
    window.duplicadosValores[boletoValue] = { booking_number: bookingNumber, busplaceValue: busplaceValue };

    console.log('noRepetidosConCodigo después de mover:', window.noRepetidosConCodigo);
    window.compararYMostrarDatos();
}

// Función para reemplazar el código y agregar el valor de Busplace
function replaceCode(boletoValue, containerId, rowIndex) {
    console.log('replaceCode ejecutado con:', { boletoValue, containerId, rowIndex });
    console.log('noRepetidosConCodigo actual:', window.noRepetidosConCodigo);
    console.log('jsonData1:', jsonData1);
    console.log('jsonData2:', jsonData2);
    console.log('duplicadosRecientes:', window.duplicadosRecientes);
    console.log('duplicadosValores:', window.duplicadosValores);

    const boletoEntry = window.noRepetidosConCodigo.find(item => 
        String(item.value) === String(boletoValue) && 
        item.origen === 'Busplace' && 
        (!rowIndex || item.rowIndex === Number(rowIndex))
    );
    if (!boletoEntry) {
        alert('Este boleto no es de Busplace o no está disponible para reemplazo.');
        return;
    }

    const newCode = prompt(`Ingrese el booking_number para el Boleto ${boletoValue}:`);
    if (!newCode) {
        alert('Por favor, ingrese un booking_number válido.');
        return;
    }

    // Normalizar newCode para evitar problemas de formato
    const normalizedNewCode = String(newCode).trim().toUpperCase();
    console.log('newCode normalizado:', normalizedNewCode);

    // Restricción 1: Verificar si el código ya fue usado en otro boleto no duplicado de Busplace
    const usedInBusplace = window.noRepetidosConCodigo.find(item => 
        item.origen === 'Busplace' && 
        String(item.booking_number).trim().toUpperCase() === normalizedNewCode && 
        String(item.value) !== String(boletoValue)
    );
    if (usedInBusplace) {
        console.log(`El código ${normalizedNewCode} ya fue usado en boleto ${usedInBusplace.value}.`);
        alert(`El código ${newCode} ya está asignado al boleto ${usedInBusplace.value}.`);
        return;
    }

    // Restricción 2: Verificar si el nuevo código está en Duplicados
    const isInDuplicados = window.duplicadosRecientes.has(normalizedNewCode) || window.duplicadosValores[normalizedNewCode];
    if (isInDuplicados) {
        console.log(`El código ${normalizedNewCode} ya está en la tabla de Duplicados.`);
        alert(`El código ${newCode} ya fue comparado y está en la tabla de Duplicados. No se puede usar.`);
        return;
    }

    // Restricción 3: Verificar si el nuevo código existe en Busplace
    const isInBusplace = jsonData2 && jsonData2.some(item => 
        item && separarValores(item["Boleto"]).map(v => String(v).trim().toUpperCase()).includes(normalizedNewCode)
    );
    if (isInBusplace) {
        console.log(`El código ${normalizedNewCode} ya existe en Busplace.`);
        alert(`No se puede reemplazar un código de Busplace con otro código de Busplace, ya que no tienen equivalente en Airtable.`);
        return;
    }

    // Restricción 4: Verificar si el boleto asociado al nuevo código está en duplicados
    const airtableEntryForNewCode = jsonData1 && jsonData1.find(item => 
        item && String(item.booking_number).trim().toUpperCase() === normalizedNewCode
    );
    if (airtableEntryForNewCode && airtableEntryForNewCode.booking_number_carrier) {
        const associatedBoleto = String(airtableEntryForNewCode.booking_number_carrier).trim().toUpperCase();
        const isBoletoDuplicado = window.duplicadosRecientes.has(associatedBoleto) || 
                                 window.duplicadosValores[associatedBoleto] ||
                                 jsonData1.some(item => 
                                     item !== airtableEntryForNewCode && 
                                     separarValores(item.booking_number_carrier || '').map(v => String(v).trim().toUpperCase()).includes(associatedBoleto)
                                 ) ||
                                 jsonData2.some(item => 
                                     item && separarValores(item["Boleto"]).map(v => String(v).trim().toUpperCase()).includes(associatedBoleto) && 
                                     item["Boleto"] !== boletoValue
                                 );
        if (isBoletoDuplicado) {
            console.log(`El boleto ${associatedBoleto} asociado al código ${normalizedNewCode} ya está en duplicados.`);
            alert(`El boleto ${associatedBoleto} (${newCode}) ya se manejó tanto en Busplace como Airtable y está en duplicados, no puedes hacer esa comparación.`);
            return;
        }
    }

    // Restricción 5: Verificar si el nuevo código está en un booking_number de No Duplicados de Airtable (solo para boletos definidos)
    if (boletoValue !== 'undefined') {
        const isInAirtableNoDuplicados = window.noRepetidosConCodigo && window.noRepetidosConCodigo.some(item => {
            if (item.origen === 'Airtable') {
                const bookingNumber = String(item.booking_number).trim().toUpperCase();
                console.log(`Comparando item.booking_number de Airtable:`, { booking_number: item.booking_number, normalizedNewCode });
                const airtableEntry = jsonData1.find(a => String(a.booking_number).trim().toUpperCase() === bookingNumber);
                const isCarrierUndefined = !airtableEntry || !airtableEntry.booking_number_carrier || airtableEntry.booking_number_carrier.trim().toUpperCase() === '';
                return bookingNumber === normalizedNewCode && !isCarrierUndefined;
            }
            return false;
        });
        if (isInAirtableNoDuplicados) {
            console.log(`El código ${normalizedNewCode} ya está en No Duplicados de Airtable como número de reserva con un boleto definido.`);
            alert(`No se puede reemplazar un código de Busplace con un código que está en No Duplicados de Airtable como número de reserva (${newCode}), ya que tienen numeraciones distintas.`);
            return;
        }
    } else {
        console.log('Boleto es undefined, omitiendo restricción de Airtable No Duplicados.');
    }

    // Buscar el código en Airtable
    const airtableEntry = jsonData1 && jsonData1.find(item => 
        item && String(item.booking_number).trim().toUpperCase() === normalizedNewCode
    );
    let busplaceValue;

    if (airtableEntry) {
        // Código encontrado en Airtable
        busplaceValue = parseFloat(airtableEntry.price_to_pay_carrier) || 0;
        console.log(`Código ${normalizedNewCode} encontrado en Airtable con valor: ${busplaceValue}`);
    } else {
        // Código no está en Airtable, pedir valor manual
        const manualValue = prompt(`Código ${newCode} no encontrado en Airtable. Ingrese el valor de Busplace para el Boleto ${boletoValue} (ejemplo: 10.50):`);
        if (!manualValue || isNaN(parseFloat(manualValue))) {
            alert('Por favor, ingrese un valor numérico válido.');
            return;
        }
        busplaceValue = parseFloat(manualValue);
        console.log(`Valor manual asignado para Busplace: ${busplaceValue}`);
    }

    // Caso especial: si el boleto es undefined
    if (boletoValue === 'undefined') {
        if (airtableEntry) {
            const carrier = airtableEntry.booking_number_carrier ? String(airtableEntry.booking_number_carrier).trim().toUpperCase() : '';
            if (!carrier || carrier === 'UNDEFINED') {
                // Caso 1: booking_number_carrier es undefined o vacío
                console.log(`Código ${normalizedNewCode} no tiene un número de serie válido en Airtable.`);
                alert(`No vale para la comparación, busca su número de serie.`);
                return;
            } else {
                // Caso 2: booking_number_carrier es un boleto válido (por ejemplo, 009003000000830)
                const associatedBoleto = carrier;
                console.log(`Código ${normalizedNewCode} encontrado en Airtable con boleto asociado: ${associatedBoleto}`);

                // Verificar si el boleto asociado está duplicado
                const isBoletoDuplicado = window.duplicadosRecientes.has(associatedBoleto) || 
                                         window.duplicadosValores[associatedBoleto] ||
                                         jsonData1.some(item => 
                                             item !== airtableEntry && 
                                             separarValores(item.booking_number_carrier || '').map(v => String(v).trim().toUpperCase()).includes(associatedBoleto)
                                         ) ||
                                         jsonData2.some(item => 
                                             item && separarValores(item["Boleto"]).map(v => String(v).trim().toUpperCase()).includes(associatedBoleto) && 
                                             item["Boleto"] !== boletoValue
                                         );

                if (isBoletoDuplicado) {
                    console.log(`El boleto ${associatedBoleto} ya está duplicado.`);
                    alert(`El boleto ${associatedBoleto} asociado al código ${newCode} ya está duplicado, no se puede reemplazar.`);
                    return;
                }

                // Obtener el valor original de Busplace
                const busplaceIndex = jsonData2.findIndex(item => item && separarValores(item["Boleto"]).includes(boletoValue));
                let busplaceOriginalValue = null;
                if (busplaceIndex !== -1) {
                    busplaceOriginalValue = parseFloat(jsonData2[busplaceIndex]["Valor"]) || 0;
                }
                const airtableValue = busplaceValue;
                const valuesMatch = busplaceOriginalValue === airtableValue;

                console.log('Comparación de valores:', {
                    busplaceOriginalValue,
                    airtableValue,
                    valuesMatch
                });

                // Actualizar noRepetidosConCodigo
                const index = window.noRepetidosConCodigo.findIndex(item => 
                    String(item.value) === String(boletoValue) && 
                    item.origen === 'Busplace' && 
                    item.rowIndex === Number(rowIndex)
                );
                if (index === -1) {
                    console.error('Boleto undefined no encontrado en noRepetidosConCodigo:', boletoValue);
                    alert('Error: No se encontró el boleto undefined en la lista de no repetidos.');
                    return;
                }

                window.noRepetidosConCodigo[index].value = associatedBoleto;
                window.noRepetidosConCodigo[index].booking_number = newCode;
                window.noRepetidosConCodigo[index].busplaceValue = airtableValue;
                console.log('noRepetidosConCodigo actualizado:', window.noRepetidosConCodigo[index]);

                // Actualizar jsonData2
                if (busplaceIndex !== -1) {
                    jsonData2[busplaceIndex]["Boleto"] = associatedBoleto;
                    jsonData2[busplaceIndex]["Valor"] = airtableValue;
                    console.log('jsonData2 actualizado:', jsonData2[busplaceIndex]);
                } else {
                    console.warn('No se encontró el boleto undefined en jsonData2 para actualizar.');
                }

                // Mover a duplicados
                window.duplicadosRecientes.add(String(associatedBoleto));
                window.duplicadosValores[associatedBoleto] = { 
                    booking_number: newCode, 
                    busplaceValue: airtableValue,
                    valuesMatch: valuesMatch
                };
                console.log('Boleto movido a duplicados:', associatedBoleto, 'valuesMatch:', valuesMatch);

                // Eliminar el boleto undefined de Busplace
                window.noRepetidosConCodigo = window.noRepetidosConCodigo.filter(item => 
                    !(item.value === boletoValue && 
                      item.origen === 'Busplace' && 
                      item.rowIndex === Number(rowIndex))
                );
                console.log('noRepetidosConCodigo después de eliminar:', window.noRepetidosConCodigo);

                alert(`Los valores ${valuesMatch ? 'coinciden' : 'no coinciden'}, se actualizó el boleto y se movió a duplicados.`);
            }
        } else {
            // Caso 3: newCode no está en Airtable
            console.log(`Código ${normalizedNewCode} no encontrado en Airtable, usando valor manual.`);
            const index = window.noRepetidosConCodigo.findIndex(item => 
                String(item.value) === String(boletoValue) && 
                item.origen === 'Busplace' && 
                item.rowIndex === Number(rowIndex)
            );
            if (index === -1) {
                console.error('Boleto no encontrado en noRepetidosConCodigo:', boletoValue);
                alert('Error: No se encontró el boleto en la lista de no repetidos.');
                return;
            }

            window.noRepetidosConCodigo[index].booking_number = newCode;
            window.noRepetidosConCodigo[index].busplaceValue = busplaceValue;
            console.log('noRepetidosConCodigo actualizado:', window.noRepetidosConCodigo[index]);

            // Actualizar jsonData2
            const busplaceIndex = jsonData2.findIndex(item => item && separarValores(item["Boleto"]).includes(boletoValue));
            if (busplaceIndex !== -1) {
                jsonData2[busplaceIndex]["Valor"] = busplaceValue;
                console.log('jsonData2 actualizado:', jsonData2[busplaceIndex]);
            }
        }

        window.compararYMostrarDatos();
        return;
    }

    // Lógica para boletos definidos
    if (airtableEntry) {
        const valoresAirtable = separarValores(airtableEntry.booking_number_carrier || '').map(v => String(v).trim().toUpperCase());
        if (valoresAirtable.includes(String(boletoValue).trim().toUpperCase())) {
            alert(`El boleto ${boletoValue} coincide con el booking_number_carrier de Airtable para el código ${newCode}. Se moverá a la tabla de Duplicados.`);
            moverADuplicados(boletoValue, newCode, busplaceValue);
            return;
        }

        if (!airtableEntry.booking_number_carrier || airtableEntry.booking_number_carrier.trim() === '') {
            alert(`El código ${newCode} no tiene un boleto asociado en Airtable. Se moverá a Duplicados.`);
            moverADuplicados(boletoValue, newCode, busplaceValue);
            return;
        }
    }

    // Actualizar noRepetidosConCodigo
    const index = window.noRepetidosConCodigo.findIndex(item => 
        String(item.value) === String(boletoValue) && 
        item.origen === 'Busplace' && 
        item.rowIndex === Number(rowIndex)
    );
    if (index === -1) {
        console.error('Boleto no encontrado en noRepetidosConCodigo:', boletoValue, 'Lista actual:', window.noRepetidosConCodigo);
        alert(`Error: No se encontró el boleto ${boletoValue} en la lista de no repetidos. Verifique los datos cargados.`);
        return;
    }

    window.noRepetidosConCodigo[index].booking_number = newCode;
    window.noRepetidosConCodigo[index].busplaceValue = busplaceValue;
    console.log('Boleto actualizado:', boletoValue, 'nuevo código:', newCode, 'nuevo valor:', busplaceValue);

    // Actualizar jsonData2
    const busplaceIndex = jsonData2.findIndex(item => item && separarValores(item["Boleto"]).includes(boletoValue));
    if (busplaceIndex !== -1) {
        jsonData2[busplaceIndex]["Boleto"] = boletoValue;
        jsonData2[busplaceIndex]["Valor"] = busplaceValue;
        console.log('jsonData2 actualizado:', jsonData2[busplaceIndex]);
    }

    window.compararYMostrarDatos();
}

// Función para editar undefined de Airtable
function editUndefined(bookingNumber, containerId) {
    console.log('editUndefined llamado con:', { bookingNumber, containerId });

    // Buscar la entrada en Airtable
    const airtableEntry = jsonData1.find(item => item && item.booking_number === bookingNumber);
    if (!airtableEntry) {
        console.error('No se encontró el registro en jsonData1 para:', bookingNumber);
        alert('No se encontró el registro de Airtable correspondiente.');
        return;
    }

    // Pedir el nuevo boleto (booking_number_carrier)
    const newBoleto = prompt(`Ingrese el Boleto para el booking_number ${bookingNumber}:`);
    if (!newBoleto || newBoleto.trim() === '') {
        alert('Por favor, ingrese un Boleto válido.');
        return;
    }

    // Normalizar newBoleto para evitar problemas de formato
    const normalizedNewBoleto = String(newBoleto).trim().toUpperCase();
    console.log('newBoleto normalizado:', normalizedNewBoleto);

    // Restricción 1: Verificar si el nuevo boleto está en noRepetidosConCodigo como boleto de Airtable
    const isInAirtableNoDuplicados = window.noRepetidosConCodigo && window.noRepetidosConCodigo.some(item => {
        if (item.origen === 'Airtable' && item.value !== 'undefined') {
            const airtableBoleto = String(item.value).trim().toUpperCase();
            return airtableBoleto === normalizedNewBoleto;
        }
        return false;
    });
    if (isInAirtableNoDuplicados) {
        console.log(`El boleto ${normalizedNewBoleto} ya está en no duplicados de Airtable.`);
        alert(`No se puede hacer comparaciones de Airtable con Airtable porque estos tienen un código, haz alguna comparación con uno de Busplace por favor.`);
        return;
    }

    // Restricción 2: Verificar si el nuevo boleto está en duplicados
    const isInDuplicados = window.duplicadosRecientes.has(normalizedNewBoleto) || 
                          window.duplicadosValores[normalizedNewBoleto] ||
                          jsonData1.some(item => 
                              item !== airtableEntry && 
                              separarValores(item.booking_number_carrier || '').map(v => String(v).trim().toUpperCase()).includes(normalizedNewBoleto)
                          ) ||
                          jsonData2.some(item => 
                              item && 
                              separarValores(item["Boleto"]).map(v => String(v).trim().toUpperCase()).includes(normalizedNewBoleto) &&
                              !window.noRepetidosConCodigo.some(nr => 
                                  nr.origen === 'Busplace' && 
                                  String(nr.value).trim().toUpperCase() === normalizedNewBoleto
                              )
                          );
    if (isInDuplicados) {
        console.log(`El boleto ${normalizedNewBoleto} ya está en duplicados.`);
        alert(`No se puede utilizar este ${newBoleto} porque ya se hizo una comparación tanto en Airtable como Busplace y está en duplicados.`);
        return;
    }

    // Verificar si el boleto existe en Busplace
    const busplaceEntry = jsonData2.find(item => item && separarValores(item["Boleto"]).includes(normalizedNewBoleto));
    if (busplaceEntry) {
        // Si existe en Busplace, mover a Duplicados
        const busplaceValue = parseFloat(busplaceEntry.Valor) || 0;
        console.log('Boleto encontrado en Busplace:', { normalizedNewBoleto, busplaceValue });
        alert(`El Boleto ${newBoleto} existe en Busplace. Se moverá a la tabla de Duplicados.`);
        moverADuplicados(normalizedNewBoleto, bookingNumber, busplaceValue);

        // Eliminar de noRepetidosConCodigo
        const index = window.noRepetidosConCodigo.findIndex(item => item.value === 'undefined' && item.booking_number === bookingNumber && item.origen === 'Airtable');
        if (index !== -1) {
            window.noRepetidosConCodigo.splice(index, 1);
            console.log('Entrada undefined eliminada de noRepetidosConCodigo:', { bookingNumber, normalizedNewBoleto });
        }
    } else {
        // Si no existe en Busplace ni en Airtable como duplicado, mantener en No Duplicados
        const index = window.noRepetidosConCodigo.findIndex(item => item.value === 'undefined' && item.booking_number === bookingNumber && item.origen === 'Airtable');
        if (index === -1) {
            console.error('No se encontró undefined en noRepetidosConCodigo para:', bookingNumber);
            alert('Error: No se encontró el registro en la lista de no repetidos.');
            return;
        }

        // Actualizar noRepetidosConCodigo con el nuevo boleto
        window.noRepetidosConCodigo[index].value = normalizedNewBoleto;
        window.noRepetidosConCodigo[index].busplaceValue = parseFloat(airtableEntry.price_to_pay_carrier) || 0;
        console.log('noRepetidosConCodigo actualizado:', window.noRepetidosConCodigo[index]);

        // Actualizar jsonData1
        const airtableIndex = jsonData1.findIndex(item => item && item.booking_number === bookingNumber);
        if (airtableIndex !== -1) {
            jsonData1[airtableIndex].booking_number_carrier = normalizedNewBoleto;
            console.log('jsonData1 actualizado:', jsonData1[airtableIndex]);
        }
    }

    // Refrescar la tabla
    window.compararYMostrarDatos();
    console.log('noRepetidosConCodigo después de actualizar:', window.noRepetidosConCodigo);
}

// Función para comparar y mostrar datos
window.compararYMostrarDatos = function() {
    console.log('Ejecutando compararYMostrarDatos');
    console.log('jsonData1 (Airtable):', jsonData1);
    console.log('jsonData2 (Busplace):', jsonData2);

    if (!jsonData1 || jsonData1.length === 0) {
        console.error('Datos de Airtable no disponibles:', { jsonData1 });
        alert('Error: Los datos de Airtable no están cargados correctamente.');
        return;
    }

    try {
        if (!datosMostrados) {
            console.log("Booking Numbers (Airtable):", (jsonData1 || []).flatMap(item => item ? separarValores(item.booking_number_carrier) : []));
            console.log("Boletos (Busplace):", (jsonData2 || []).flatMap(item => item ? separarValores(item["Boleto"]) : []));

            console.group("Separador de /");
            (jsonData1 || []).forEach(item => {
                if (item && item.booking_number_carrier && item.booking_number_carrier.includes('/')) {
                    const valores = separarValores(item.booking_number_carrier);
                    console.log(`Airtable - Valor original: ${item.booking_number_carrier}`);
                    valores.forEach((val, idx) => {
                        console.log(`  Separado ${idx + 1}: ${val}`);
                    });
                }
            });
            (jsonData2 || []).forEach(item => {
                if (item && item["Boleto"] && item["Boleto"].includes('/')) {
                    const valores = separarValores(item["Boleto"]);
                    console.log(`Busplace - Valor original: ${item["Boleto"]}`);
                    valores.forEach((val, idx) => {
                        console.log(`  Separado ${idx + 1}: ${val}`);
                    });
                }
            });
            console.groupEnd();

            console.group("Duplicados");
            const { bookingNumbers, boletos } = extraerColumnas();
            const valoresDuplicados = new Set();
            boletos.forEach(boleto => {
                const matchingBooking = bookingNumbers.find(booking => String(booking.value) === String(boleto.value));
                if (matchingBooking) {
                    console.log(`Busplace: ${boleto.value}`);
                    console.log(`Airtable: ${matchingBooking.value} ${matchingBooking.booking_number}`);
                    valoresDuplicados.add(String(boleto.value));
                }
            });
            console.groupEnd();

            console.group("No Duplicados");
            boletos.forEach(boleto => {
                if (!valoresDuplicados.has(String(boleto.value))) {
                    console.log(`Busplace: ${boleto.value}`);
                }
            });
            bookingNumbers.forEach(booking => {
                if (!valoresDuplicados.has(String(booking.value))) {
                    console.log(`Airtable: ${booking.value} ${booking.booking_number || ''}`);
                }
            });
            console.groupEnd();

            console.log("\nCeldas y Filas Originales:");
            console.group("Airtable - Celdas y Filas Originales (Booking Numbers)");
            bookingNumbers.forEach(item => {
                console.log(`Airtable - Booking Number: ${item.value}, Celda: [Fila ${item.row}, Columna ${item.column}]`);
            });
            console.groupEnd();

            console.group("Busplace - Celdas y Filas Originales (Boletos)");
            boletos.forEach(item => {
                console.log(`Busplace - Boleto: ${item.value}, Celda: [Fila ${item.row}, Columna ${item.column}]`);
            });
            console.groupEnd();

            datosMostrados = true;
        }

        const { bookingNumbers, boletos } = extraerColumnas();

        console.log('Boletos extraídos:', boletos);
        console.log('BookingNumbers extraídos:', bookingNumbers);

        const repetidos = [];
        const noRepetidos = [];
        const valoresDuplicados = new Set();
        const processedBookingNumbers = new Set();
        const processedBusplaceUndefined = new Set();

        if (boletos.length > 0) {
            boletos.forEach(boleto => {
                const matchingBooking = bookingNumbers.find(booking => String(booking.value) === String(boleto.value) && booking.value !== 'undefined');
                if (matchingBooking) {
                    repetidos.push(boleto);
                    repetidos.push(matchingBooking);
                    valoresDuplicados.add(String(boleto.value));
                } else if (!window.duplicadosRecientes.has(String(boleto.value))) {
                    noRepetidos.push(boleto);
                }
            });
        }

        // Manejar entradas de Airtable
        bookingNumbers.forEach(booking => {
            const isMoved = window.duplicadosValores && Object.values(window.duplicadosValores).some(data => data.booking_number === booking.booking_number);
            if (!valoresDuplicados.has(String(booking.value)) && !window.duplicadosRecientes.has(String(booking.value)) && !window.duplicadosRecientes.has('undefined_' + booking.booking_number) && !isMoved) {
                if (booking.value === 'undefined' && processedBookingNumbers.has(booking.booking_number)) {
                    return; // Evitar entradas undefined duplicadas con el mismo booking_number
                }
                noRepetidos.push(booking);
                if (booking.value === 'undefined') {
                    processedBookingNumbers.add(booking.booking_number);
                }
            }
        });

        // Asociar entradas undefined de Busplace con valores únicos
        const undefinedBusplaceEntries = boletos.filter(b => b.value === 'undefined' && !valoresDuplicados.has('undefined') && !window.duplicadosRecientes.has('undefined') && !processedBusplaceUndefined.has(b.rowIndex));
        undefinedBusplaceEntries.forEach(busplaceEntry => {
            if (!noRepetidos.some(nr => nr.origen === 'Busplace' && nr.value === 'undefined' && nr.rowIndex === busplaceEntry.rowIndex)) {
                noRepetidos.push({
                    value: 'undefined',
                    booking_number: 'VXXXXXX',
                    busplaceValue: busplaceEntry.valor,
                    origen: 'Busplace',
                    rowIndex: busplaceEntry.rowIndex
                });
                processedBusplaceUndefined.add(busplaceEntry.rowIndex);
            }
        });

        console.log('No repetidos calculados:', noRepetidos);

        // Construir noRepetidosConCodigo preservando valores existentes
        const existingNoRepetidosConCodigo = [...window.noRepetidosConCodigo];
        window.noRepetidosConCodigo = noRepetidos.map(item => {
         let airtableEntry = null;
            if (item.origen === 'Airtable') {
             airtableEntry = (jsonData1 || []).find(a => a && a.booking_number === item.booking_number && (!a.booking_number_carrier || a.booking_number_carrier === '' || separarValores(a.booking_number_carrier).includes(item.value)));
                if (!airtableEntry && item.value === 'undefined') {
                 airtableEntry = (jsonData1 || []).find(a => a && a.booking_number === item.booking_number && (!a.booking_number_carrier || a.booking_number_carrier === ''));
              }
             }
            // Buscar entrada existente para preservar valores
            const existingEntry = existingNoRepetidosConCodigo.find(e => 
                 String(e.value) === String(item.value) && 
                     e.origen === item.origen && 
                        (e.rowIndex === item.rowIndex || (item.value === 'undefined' && item.origen === 'Airtable' && e.booking_number === item.booking_number))
                    );
                const shouldResetValue = item.origen === 'Busplace' && (!existingEntry || existingEntry.booking_number === 'VXXXXXX');
                return {
                value: String(item.value),
                booking_number: existingEntry && existingEntry.booking_number !== 'VXXXXXX' ? existingEntry.booking_number : 
                       (item.origen === 'Airtable' ? (airtableEntry ? airtableEntry.booking_number : item.booking_number || 'VXXXXXX') : 'VXXXXXX'),
                         busplaceValue: shouldResetValue ? null : 
                      (existingEntry && existingEntry.busplaceValue !== null ? existingEntry.busplaceValue : 
                      (item.origen === 'Airtable' ? (airtableEntry ? parseFloat(airtableEntry.price_to_pay_carrier) || 0 : 0) : 
                      (item.value === 'undefined' ? item.valor : item.valor || 0))),
                    origen: item.origen,
                rowIndex: item.rowIndex // Preservar rowIndex para identificar entradas únicas
             };
        });

        console.log('noRepetidosConCodigo inicializado:', window.noRepetidosConCodigo);
        // Construir repetidosUnicos
        const repetidosUnicos = [];
        const processedBookings = new Set();
        repetidos.forEach(item => {
            if (item.origen === 'Airtable' && !processedBookings.has(item.booking_number)) {
                const airtableEntry = (jsonData1 || []).find(a => a && a.booking_number === item.booking_number);
                if (!airtableEntry) return;
                const valores = separarValores(airtableEntry.booking_number_carrier || '');
                let sumaBusplace = 0;
                valores.forEach(val => {
                    const busplaceEntry = (jsonData2 || []).find(b => b && separarValores(b["Boleto"]).includes(val));
                    if (busplaceEntry) {
                        sumaBusplace += parseFloat(busplaceEntry.Valor) || 0;
                    }
                });
                valores.forEach(val => {
                    repetidosUnicos.push({
                        value: val,
                        booking_number: item.booking_number,
                        sumaBusplace: sumaBusplace,
                        airtableValue: parseFloat(airtableEntry.price_to_pay_carrier) || 0,
                        esNuevo: window.duplicadosRecientes.has(val)
                    });
                });
                processedBookings.add(item.booking_number);
            }
        });

        if (window.duplicadosValores) {
            const bookingNumberToSum = {};
            Object.entries(window.duplicadosValores).forEach(([value, data]) => {
                const busplaceEntry = (jsonData2 || []).find(b => b && separarValores(b["Boleto"]).includes(value));
                if (busplaceEntry) {
                    if (!bookingNumberToSum[data.booking_number]) {
                        bookingNumberToSum[data.booking_number] = 0;
                    }
                    bookingNumberToSum[data.booking_number] += parseFloat(busplaceEntry.Valor) || 0;
                }
            });

            Object.entries(window.duplicadosValores).forEach(([value, data]) => {
                const airtableEntry = (jsonData1 || []).find(a => a && a.booking_number === data.booking_number);
                if (airtableEntry) {
                    const sumaBusplace = bookingNumberToSum[data.booking_number] || data.busplaceValue || 0;
                    repetidosUnicos.push({
                        value: value,
                        booking_number: data.booking_number,
                        sumaBusplace: sumaBusplace,
                        airtableValue: parseFloat(airtableEntry.price_to_pay_carrier) || 0,
                        esNuevo: window.duplicadosRecientes.has(value)
                    });
                }
            });
        }

        console.log('Mostrando tablas...');
        repetidosUnicos.sort((a, b) => a.value.localeCompare(b.value));
        window.noRepetidosConCodigo.sort((a, b) => a.value.localeCompare(b.value));
        mostrarTabla(repetidosUnicos, 'tabla-duplicados', 'Duplicados', 'lightblue');
        mostrarTabla(window.noRepetidosConCodigo, 'tabla-no-duplicados', 'No Duplicados', 'lightgreen');
        mostrarTablaAirtableBusplace();
        console.log('Tablas mostradas correctamente');
    } catch (error) {
        console.error('Error en compararYMostrarDatos:', error);
        alert('Error en la comparación: ' + error.message);
    }
};

// Función para mostrar tablas
function mostrarTabla(valores, containerId, titulo, color) {
    const jsonContainer = document.getElementById(containerId);
    if (!jsonContainer) {
        console.error(`Elemento con ID ${containerId} no encontrado`);
        return;
    }

    let table = `<h2>${titulo}</h2><table style="width: 100%; border-collapse: collapse;">`;
    const headerColor = '#ececec';

    if (containerId === 'tabla-duplicados') {
        let hasMismatch = false;
        (valores || []).forEach(item => {
            if (item && item.sumaBusplace !== item.airtableValue && item.airtableValue !== 0 && item.sumaBusplace !== 0) {
                hasMismatch = true;
            }
        });

        table += `<thead><tr><th style="padding: 8px; border: 1px solid #ddd; background-color: ${headerColor}; color: black;">Valor</th><th style="padding: 8px; border: 1px solid #ddd; background-color: ${headerColor}; color: black;">Código</th><th style="padding: 8px; border: 1px solid #ddd; background-color: ${headerColor}; color: black;">Valor</th>${hasMismatch ? `<th style="padding: 8px; border: 1px solid #ddd; background-color: ${headerColor}; color: black;">Acción</th>` : ''}</tr></thead><tbody>`;
        
        (valores || []).forEach(item => {
            if (!item) return;
            const busplaceValue = item.sumaBusplace || 0;
            let action = '';
            let rowColor = item.esNuevo ? '#ffcccc' : color;
            if (item.sumaBusplace !== item.airtableValue && item.airtableValue !== 0 && item.sumaBusplace !== 0) {
                rowColor = 'yellow';
                action = `No coincide con el valor de Airtable: $${(item.airtableValue || 0).toFixed(2)}`;
            }
            table += `<tr style="background-color: ${rowColor};"><td style="padding: 8px; border: 1px solid #ddd;">${item.value || ''}</td><td style="padding: 8px; border: 1px solid #ddd;">${item.booking_number || ''}</td><td style="padding: 8px; border: 1px solid #ddd;">$${busplaceValue.toFixed(2)}</td>${hasMismatch ? `<td style="padding: 8px; border: 1px solid #ddd;">${action}</td>` : ''}</tr>`;
        });
    } else {
        const hasEditable = (valores || []).some(item => item && ((item.booking_number === 'VXXXXXX' && item.origen === 'Busplace') || (item.value === 'undefined' && item.origen === 'Airtable')));
        table += `<thead><tr><th style="padding: 8px; border: 1px solid #ddd; background-color: ${headerColor}; color: black;">Valor</th><th style="padding: 8px; border: 1px solid #ddd; background-color: ${headerColor}; color: black;">Código</th><th style="padding: 8px; border: 1px solid #ddd; background-color: ${headerColor}; color: black;">Valor</th>${hasEditable ? `<th style="padding: 8px; border: 1px solid #ddd; background-color: ${headerColor}; color: black;">Acción</th>` : ''}</tr></thead><tbody>`;
        
        (valores || []).forEach(item => {
            if (!item) return;
            let action = '';
            if (item.origen === 'Busplace' && item.booking_number === 'VXXXXXX') {
                action = `<button class="replace-button" onclick="replaceCode('${item.value}', '${containerId}', ${item.rowIndex})">Reemplazar Código</button>`;
            } else if (item.value === 'undefined' && item.origen === 'Airtable') {
                action = `<button class="edit-button" onclick="editUndefined('${item.booking_number}', '${containerId}')">Editar Boleto</button>`;
            }
            const busplaceValue = item.busplaceValue !== null && item.busplaceValue !== undefined ? `$${item.busplaceValue.toFixed(2)}` : '';
            table += `<tr style="background-color: ${color};"><td style="padding: 8px; border: 1px solid #ddd;">${item.value || ''}</td><td style="padding: 8px; border: 1px solid #ddd;">${item.booking_number || ''}</td><td style="padding: 8px; border: 1px solid #ddd;">${busplaceValue}</td>${hasEditable ? `<td style="padding: 8px; border: 1px solid #ddd;">${action}</td>` : ''}</tr>`;
        });
    }

    table += '</tbody></table>';
    jsonContainer.innerHTML = table;
    jsonContainer.style.display = 'block';
}

// Función para mostrar tablas de Airtable y Busplace
function mostrarTablaAirtableBusplace() {
    const container = document.getElementById('tablas-archivos');
    if (!container) {
        console.error('Elemento con ID tablas-archivos no encontrado');
        return;
    }

    let html = '';
    const modifiedJsonData1 = JSON.parse(JSON.stringify(jsonData1 || []));
    if (window.duplicadosValores) {
        Object.entries(window.duplicadosValores).forEach(([boletoValue, data]) => {
            const index = modifiedJsonData1.findIndex(item => item && item.booking_number === data.booking_number && (!item.booking_number_carrier || item.booking_number_carrier.trim() === ''));
            if (index !== -1) {
                modifiedJsonData1[index].booking_number_carrier = boletoValue;
            }
        });
    }

    // Tabla Airtable
    const airtableRows = [];
    modifiedJsonData1.forEach(item => {
        if (!item) return;
        const valores = item.booking_number_carrier ? separarValores(item.booking_number_carrier) : ['undefined'];
        valores.forEach(valor => {
            airtableRows.push({ valor, booking_number: item.booking_number || '' });
        });
    });
    airtableRows.sort((a, b) => a.valor.localeCompare(b.valor));

    let airtableTable = '<div><h3>Tabla Airtable</h3><table style="width: 100%; border-collapse: collapse;">';
    airtableTable += '<thead><tr><th style="padding: 8px; border: 1px solid #ddd; background-color: #ececec; color: black;">Booking Number Carrier</th><th style="padding: 8px; border: 1px solid #ddd; background-color: #ececec; color: black;">Código</th></tr></thead><tbody>';
    airtableRows.forEach(row => {
        const isModified = window.duplicadosRecientes.has(row.valor);
        const isNoDuplicado = window.noRepetidosConCodigo.some(item => String(item.value) === String(row.valor));
        let rowStyle = '';
        if (isModified) {
            rowStyle = 'background-color: #ffcccc;';
        } else if (isNoDuplicado) {
            rowStyle = 'background-color: lightgreen;';
        }
        airtableTable += `<tr style="${rowStyle}"><td style="padding: 8px; border: 1px solid #ddd;">${row.valor}</td><td style="padding: 8px; border: 1px solid #ddd;">${row.booking_number}</td></tr>`;
    });
    airtableTable += '</tbody></table></div>';

    // Tabla Busplace
    const busplaceRows = [];
    (jsonData2 || []).forEach(item => {
        if (!item || !item["Boleto"]) return;
        const valores = separarValores(item["Boleto"]);
        valores.forEach(valor => {
            busplaceRows.push({ valor });
        });
    });
    busplaceRows.sort((a, b) => a.valor.localeCompare(b.valor));

    let busplaceTable = '<div><h3>Tabla Busplace</h3><table style="width: 100%; border-collapse: collapse;">';
    busplaceTable += '<thead><tr><th style="padding: 8px; border: 1px solid #ddd; background-color: #ececec; color: black;">Boleto</th></tr></thead><tbody>';
    busplaceRows.forEach(row => {
        const isNoDuplicado = window.noRepetidosConCodigo.some(item => String(item.value) === String(row.valor));
        const rowStyle = isNoDuplicado ? 'background-color: lightgreen;' : '';
        busplaceTable += `<tr style="${rowStyle}"><td style="padding: 8px; border: 1px solid #ddd;">${row.valor}</td></tr>`;
    });
    busplaceTable += '</tbody></table></div>';

    html = airtableTable + busplaceTable;
    container.innerHTML = html;
    container.style.display = 'flex';
}

// Event listeners
function initializeEventListeners() {
    const btnMinimizar = document.getElementById('btn-minimizar-comparacion');
    const btnComparar = document.getElementById('btn-comparar');

    if (btnMinimizar) {
        btnMinimizar.addEventListener('click', function() {
            const duplicadosContainer = document.getElementById('tabla-duplicados');
            const noDuplicadosContainer = document.getElementById('tabla-no-duplicados');
            const archivosContainer = document.getElementById('tablas-archivos');

            if (duplicadosContainer && noDuplicadosContainer && archivosContainer) {
                if (duplicadosContainer.style.display === 'none' && 
                    noDuplicadosContainer.style.display === 'none' && 
                    archivosContainer.style.display === 'none') {
                    duplicadosContainer.style.display = 'block';
                    noDuplicadosContainer.style.display = 'block';
                    archivosContainer.style.display = 'flex';
                } else {
                    duplicadosContainer.style.display = 'none';
                    noDuplicadosContainer.style.display = 'none';
                    archivosContainer.style.display = 'none';
                }
            } else {
                console.error('Uno o más contenedores no encontrados:', { duplicadosContainer, noDuplicadosContainer, archivosContainer });
            }
        });
    } else {
        console.error('Botón btn-minimizar-comparacion no encontrado');
    }

    if (btnComparar) {
        btnComparar.addEventListener('click', function() {
            console.log('Clic en Comparar y Validar detectado');
            console.log('Estado de datos:', {
                jsonData1Length: jsonData1 ? jsonData1.length : 'undefined',
                jsonData2Length: jsonData2 ? jsonData2.length : 'undefined'
            });
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
}

document.addEventListener('DOMContentLoaded', initializeEventListeners); 