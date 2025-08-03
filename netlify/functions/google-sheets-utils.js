// netlify/functions/google-sheets-utils.js
// Funciones para Google Sheets usando APIs REST directas
// Sin dependencias problemáticas - Solo fetch() nativo

// Función para crear JWT token manualmente
function createJWT(serviceAccountEmail, privateKey, scopes) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountEmail,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  // Convertir a base64url
  const base64UrlEncode = (obj) => {
    return Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Para el signing usaremos crypto nativo de Node.js
  const crypto = require('crypto');
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingInput)
    .sign(privateKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signingInput}.${signature}`;
}

// Función para obtener access token
async function getGoogleAccessToken() {
  const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Credenciales de Google no configuradas');
  }

  const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
  const jwt = createJWT(GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, scopes);

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo token: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error obteniendo access token:', error);
    throw error;
  }
}

// Función para obtener datos de una hoja
async function getSheetData(spreadsheetId, range, accessToken) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo datos: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error obteniendo datos de sheet:', error);
    throw error;
  }
}

// Función para crear hoja si no existe
async function createSheetIfNotExists(spreadsheetId, sheetName, headers, accessToken) {
  try {
    // Primero verificar si la hoja existe
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const metadataResponse = await fetch(metadataUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (metadataResponse.ok) {
      const metadata = await metadataResponse.json();
      const sheetExists = metadata.sheets.some(sheet => sheet.properties.title === sheetName);
      
      if (sheetExists) {
        console.log(`✅ Hoja "${sheetName}" ya existe`);
        return true;
      }
    }

    // Crear la hoja
    console.log(`📝 Creando hoja "${sheetName}"`);
    const createUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`Error creando hoja: ${createResponse.status}`);
    }

    // Agregar headers
    await appendRowToSheet(spreadsheetId, sheetName, headers, accessToken);
    console.log(`✅ Hoja "${sheetName}" creada con headers`);
    return true;

  } catch (error) {
    console.error('Error creando hoja:', error);
    return false;
  }
}

// Función para agregar fila a una hoja
async function appendRowToSheet(spreadsheetId, sheetName, values, accessToken) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:append`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: sheetName,
        majorDimension: 'ROWS',
        values: [values],
        insertDataOption: 'INSERT_ROWS',
        valueInputOption: 'RAW',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Error agregando fila: ${response.status} - ${errorData}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error agregando fila:', error);
    throw error;
  }
}

// Función para actualizar fila específica
async function updateSheetRow(spreadsheetId, sheetName, rowIndex, values, accessToken) {
  const range = `${sheetName}!A${rowIndex}:ZZ${rowIndex}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: range,
        majorDimension: 'ROWS',
        values: [values],
        valueInputOption: 'RAW',
      }),
    });

    if (!response.ok) {
      throw new Error(`Error actualizando fila: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error actualizando fila:', error);
    throw error;
  }
}

// Función principal para registrar cotización
async function registrarCotizacionEnGoogleSheets(datos, cotizacion) {
  try {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      console.warn('⚠️ GOOGLE_SHEET_ID no configurado');
      return false;
    }

    console.log('🔐 Obteniendo access token...');
    const accessToken = await getGoogleAccessToken();
    
    const sheetName = 'Cotizaciones Freelance';
    const headers = [
      'Fecha/Hora', 'N° Cotización', 'Nombre Cliente', 'Email Cliente', 
      'Teléfono Cliente', 'Modelo Solicitado', 'Habitaciones Necesarias', 
      'Sucursal Cercana', 'M2 Útiles', 'M2 Terraza', 'M2 Totales', 
      'Dormitorios', 'Baños', 'Precio Económica (CLP)', 'Precio Premium (CLP)', 
      'Precio Estructural (CLP)', 'Precio Económica (UF)', 'Precio Premium (UF)', 
      'Precio Estructural (UF)', 'Valor UF', 'Vigencia', 'Interesado en Financiar', 
      'Monto Financiamiento', 'RUT Cliente', 'Comentarios', 'Vendedor Freelance', 
      'Código Vendedor', 'Región Vendedor', 'Ciudad Vendedor', 'Teléfono Vendedor', 
      'Tipo Lead', 'Estado', 'Notas Internas',
      // Columnas de tracking de email
      'Email Entregado', 'Fecha Entrega Email', 'Aperturas Email', 'Primera Apertura', 
      'Última Apertura', 'Clicks Email', 'Primer Click', 'Último Click', 
      'URL Clickeada', 'Email Rebotado', 'Motivo Rebote', 'Email Descartado', 
      'Motivo Descarte', 'Marcado Spam', 'Desuscrito'
    ];

    // Crear hoja si no existe
    await createSheetIfNotExists(SHEET_ID, sheetName, headers, accessToken);

    // Preparar datos de la fila
    const modeloInfo = cotizacion.modelo_info;
    const vendedor = datos.vendedor;
    const precios = cotizacion.precios;

    const fila = [
      new Date().toLocaleString('es-CL'), // Fecha/Hora
      cotizacion.numero, // N° Cotización
      datos.nombre || '', // Nombre Cliente
      datos.correo || '', // Email Cliente
      datos.telefono || '', // Teléfono Cliente
      datos.modelo || '', // Modelo Solicitado
      datos.habitaciones || '', // Habitaciones Necesarias
      datos.sucursal || '', // Sucursal Cercana
      modeloInfo?.m2_utiles || '', // M2 Útiles
      modeloInfo?.m2_terraza || '', // M2 Terraza
      modeloInfo?.m2_total || '', // M2 Totales
      modeloInfo?.dormitorios || '', // Dormitorios
      modeloInfo?.baños || '', // Baños
      precios?.economica?.clp || '', // Precio Económica (CLP)
      precios?.premium?.clp || '', // Precio Premium (CLP)
      precios?.estructural?.clp || '', // Precio Estructural (CLP)
      precios?.economica?.uf || '', // Precio Económica (UF)
      precios?.premium?.uf || '', // Precio Premium (UF)
      precios?.estructural?.uf || '', // Precio Estructural (UF)
      cotizacion.uf?.valor || '', // Valor UF
      cotizacion.vigencia || '', // Vigencia
      datos.financia === 'si' ? 'SÍ' : 'NO', // Interesado en Financiar
      datos.monto || '', // Monto Financiamiento
      datos.rut || '', // RUT Cliente
      datos.comentario || '', // Comentarios
      vendedor?.nombre || '', // Vendedor Freelance
      vendedor?.codigo || '', // Código Vendedor
      vendedor?.region || '', // Región Vendedor
      vendedor?.ciudad || '', // Ciudad Vendedor
      vendedor?.telefono || '', // Teléfono Vendedor
      'Freelance', // Tipo Lead
      'Nuevo', // Estado
      '', // Notas Internas
      // Campos de tracking de email inicializados
      'Pendiente', // Email Entregado
      '', // Fecha Entrega Email
      '0', // Aperturas Email
      '', // Primera Apertura
      '', // Última Apertura
      '0', // Clicks Email
      '', // Primer Click
      '', // Último Click
      '', // URL Clickeada
      'NO', // Email Rebotado
      '', // Motivo Rebote
      'NO', // Email Descartado
      '', // Motivo Descarte
      'NO', // Marcado Spam
      'NO' // Desuscrito
    ];

    // Agregar fila
    console.log('📊 Agregando fila a Google Sheets...');
    await appendRowToSheet(SHEET_ID, sheetName, fila, accessToken);
    
    console.log('✅ Cotización registrada en Google Sheets:', cotizacion.numero);
    return true;

  } catch (error) {
    console.error('❌ Error registrando en Google Sheets:', error);
    return false;
  }
}

// Función para actualizar métricas de email (para el webhook)
async function actualizarMetricasEmailEnSheets(evento) {
  try {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      console.warn('⚠️ GOOGLE_SHEET_ID no configurado');
      return false;
    }

    console.log('🔐 Obteniendo access token para webhook...');
    const accessToken = await getGoogleAccessToken();
    
    const sheetName = 'Cotizaciones Freelance';
    
    // Obtener datos de la hoja para buscar la fila
    console.log('🔍 Buscando fila en Google Sheets...');
    const sheetData = await getSheetData(SHEET_ID, `${sheetName}!A:ZZ`, accessToken);
    
    if (!sheetData.values || sheetData.values.length < 2) {
      console.warn('⚠️ No hay datos en la hoja');
      return false;
    }

    const headers = sheetData.values[0];
    const rows = sheetData.values.slice(1);
    
    // Extraer información del evento
    const info = {
      numeroCotizacion: evento.unique_args?.cotizacion || 'N/A',
      email: evento.email,
      timestamp: new Date(evento.timestamp * 1000).toLocaleString('es-CL')
    };

    // Buscar la fila correspondiente
    let targetRowIndex = -1;
    const cotizacionCol = headers.indexOf('N° Cotización');
    const emailCol = headers.indexOf('Email Cliente');
    
    if (cotizacionCol === -1 || emailCol === -1) {
      console.warn('⚠️ No se encontraron columnas requeridas');
      return false;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row[cotizacionCol] === info.numeroCotizacion || row[emailCol] === info.email) {
        targetRowIndex = i + 2; // +2 porque: +1 para base 1, +1 para skip headers
        break;
      }
    }

    if (targetRowIndex === -1) {
      console.warn(`⚠️ No se encontró fila para cotización: ${info.numeroCotizacion} o email: ${info.email}`);
      return false;
    }

    // Preparar actualizaciones según el tipo de evento
    const currentRow = rows[targetRowIndex - 2]; // -2 para volver al índice 0
    let updates = [...currentRow]; // Copia de la fila actual

    // Asegurar que el array tenga suficientes elementos
    while (updates.length < headers.length) {
      updates.push('');
    }

    // Indices de las columnas de tracking
    const trackingCols = {
      emailEntregado: headers.indexOf('Email Entregado'),
      fechaEntrega: headers.indexOf('Fecha Entrega Email'),
      aperturas: headers.indexOf('Aperturas Email'),
      primeraApertura: headers.indexOf('Primera Apertura'),
      ultimaApertura: headers.indexOf('Última Apertura'),
      clicks: headers.indexOf('Clicks Email'),
      primerClick: headers.indexOf('Primer Click'),
      ultimoClick: headers.indexOf('Último Click'),
      urlClickeada: headers.indexOf('URL Clickeada'),
      rebotado: headers.indexOf('Email Rebotado'),
      motivoRebote: headers.indexOf('Motivo Rebote'),
      descartado: headers.indexOf('Email Descartado'),
      motivoDescarte: headers.indexOf('Motivo Descarte'),
      spam: headers.indexOf('Marcado Spam'),
      desuscrito: headers.indexOf('Desuscrito')
    };

    // Actualizar según el tipo de evento
    switch (evento.event) {
      case 'delivered':
        if (trackingCols.emailEntregado !== -1) updates[trackingCols.emailEntregado] = 'SÍ';
        if (trackingCols.fechaEntrega !== -1) updates[trackingCols.fechaEntrega] = info.timestamp;
        break;
        
      case 'open':
        const aperturas = parseInt(currentRow[trackingCols.aperturas] || '0') + 1;
        if (trackingCols.aperturas !== -1) updates[trackingCols.aperturas] = aperturas.toString();
        if (trackingCols.primeraApertura !== -1 && !currentRow[trackingCols.primeraApertura]) {
          updates[trackingCols.primeraApertura] = info.timestamp;
        }
        if (trackingCols.ultimaApertura !== -1) updates[trackingCols.ultimaApertura] = info.timestamp;
        break;
        
      case 'click':
        const clicks = parseInt(currentRow[trackingCols.clicks] || '0') + 1;
        if (trackingCols.clicks !== -1) updates[trackingCols.clicks] = clicks.toString();
        if (trackingCols.primerClick !== -1 && !currentRow[trackingCols.primerClick]) {
          updates[trackingCols.primerClick] = info.timestamp;
        }
        if (trackingCols.ultimoClick !== -1) updates[trackingCols.ultimoClick] = info.timestamp;
        if (trackingCols.urlClickeada !== -1) updates[trackingCols.urlClickeada] = evento.url || '';
        
        // Actualizar estado si es primer click
        const estadoCol = headers.indexOf('Estado');
        if (clicks === 1 && estadoCol !== -1 && currentRow[estadoCol] === 'Nuevo') {
          updates[estadoCol] = 'Interesado';
        }
        break;
        
      case 'bounce':
        if (trackingCols.rebotado !== -1) updates[trackingCols.rebotado] = 'SÍ';
        if (trackingCols.motivoRebote !== -1) updates[trackingCols.motivoRebote] = evento.reason || '';
        break;
        
      case 'dropped':
        if (trackingCols.descartado !== -1) updates[trackingCols.descartado] = 'SÍ';
        if (trackingCols.motivoDescarte !== -1) updates[trackingCols.motivoDescarte] = evento.reason || '';
        break;
        
      case 'spam_report':
        if (trackingCols.spam !== -1) updates[trackingCols.spam] = 'SÍ';
        break;
        
      case 'unsubscribe':
        if (trackingCols.desuscrito !== -1) updates[trackingCols.desuscrito] = 'SÍ';
        break;
    }

    // Actualizar la fila
    console.log('📝 Actualizando fila en Google Sheets...');
    await updateSheetRow(SHEET_ID, sheetName, targetRowIndex, updates, accessToken);
    
    console.log(`✅ Métricas actualizadas para ${info.numeroCotizacion}: ${evento.event}`);
    return true;

  } catch (error) {
    console.error('❌ Error actualizando métricas en Google Sheets:', error);
    return false;
  }
}

module.exports = {
  registrarCotizacionEnGoogleSheets,
  actualizarMetricasEmailEnSheets
};