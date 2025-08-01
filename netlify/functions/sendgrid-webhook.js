// netlify/functions/sendgrid-webhook.js
// Handler para webhooks de SendGrid - Tracking de emails

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Función para conectar a Google Sheets
async function conectarGoogleSheets() {
  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Configuración de Google Sheets incompleta');
  }

  const serviceAccountAuth = new JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  
  return doc;
}

// Función para extraer información del email custom args
function extraerInfoEmail(customArgs) {
  return {
    numeroCotizacion: customArgs?.cotizacion || 'N/A',
    vendedorCodigo: customArgs?.vendedor || 'directo',
    modelo: customArgs?.modelo || 'N/A',
    tipoEmail: customArgs?.tipo || 'cotizacion'
  };
}

// Función para actualizar métricas en Google Sheets
async function actualizarMetricasEmail(doc, evento) {
  try {
    // Buscar la hoja de cotizaciones
    let sheet = doc.sheetsByTitle['Cotizaciones Freelance'];
    if (!sheet) {
      console.warn('Hoja "Cotizaciones Freelance" no encontrada');
      return false;
    }

    // Extraer información del evento
    const info = extraerInfoEmail(evento.unique_args || {});
    const email = evento.email;
    const timestamp = new Date(evento.timestamp * 1000).toLocaleString('es-CL');
    
    console.log(`📧 Evento SendGrid: ${evento.event} para ${email} - Cotización: ${info.numeroCotizacion}`);

    // Cargar todas las filas
    await sheet.loadCells();
    const rows = await sheet.getRows();
    
    // Buscar la fila correspondiente por número de cotización o email
    let targetRow = null;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.get('N° Cotización') === info.numeroCotizacion || 
          row.get('Email Cliente') === email) {
        targetRow = row;
        break;
      }
    }

    if (!targetRow) {
      console.warn(`No se encontró fila para cotización: ${info.numeroCotizacion} o email: ${email}`);
      return false;
    }

    // Actualizar según el tipo de evento
    switch (evento.event) {
      case 'delivered':
        targetRow.set('Email Entregado', 'SÍ');
        targetRow.set('Fecha Entrega Email', timestamp);
        break;
        
      case 'open':
        const aperturas = parseInt(targetRow.get('Aperturas Email') || '0') + 1;
        targetRow.set('Aperturas Email', aperturas.toString());
        targetRow.set('Primera Apertura', targetRow.get('Primera Apertura') || timestamp);
        targetRow.set('Última Apertura', timestamp);
        break;
        
      case 'click':
        const clicks = parseInt(targetRow.get('Clicks Email') || '0') + 1;
        targetRow.set('Clicks Email', clicks.toString());
        targetRow.set('Primer Click', targetRow.get('Primer Click') || timestamp);
        targetRow.set('Último Click', timestamp);
        targetRow.set('URL Clickeada', evento.url || '');
        
        // Actualizar estado si es primer click
        if (clicks === 1 && targetRow.get('Estado') === 'Nuevo') {
          targetRow.set('Estado', 'Interesado');
        }
        break;
        
      case 'bounce':
        targetRow.set('Email Rebotado', 'SÍ');
        targetRow.set('Motivo Rebote', evento.reason || '');
        break;
        
      case 'dropped':
        targetRow.set('Email Descartado', 'SÍ');
        targetRow.set('Motivo Descarte', evento.reason || '');
        break;
        
      case 'spam_report':
        targetRow.set('Marcado Spam', 'SÍ');
        break;
        
      case 'unsubscribe':
        targetRow.set('Desuscrito', 'SÍ');
        break;
    }

    // Guardar cambios
    await targetRow.save();
    console.log(`✅ Métricas actualizadas para ${info.numeroCotizacion}: ${evento.event}`);
    
    return true;

  } catch (error) {
    console.error('❌ Error actualizando métricas:', error);
    return false;
  }
}

// Función principal del webhook
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Solo aceptar POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    // Parsear eventos de SendGrid
    const eventos = JSON.parse(event.body);
    
    if (!Array.isArray(eventos) || eventos.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No hay eventos válidos' })
      };
    }

    console.log(`📬 Recibidos ${eventos.length} eventos de SendGrid`);

    // Conectar a Google Sheets
    const doc = await conectarGoogleSheets();
    
    // Procesar cada evento
    let procesados = 0;
    let errores = 0;

    for (const evento of eventos) {
      try {
        // Solo procesar eventos de emails de cotización
        if (evento.unique_args?.tipo === 'cotizacion' || 
            evento.category?.includes('cotizacion') ||
            evento.subject?.includes('Cotización')) {
          
          const actualizado = await actualizarMetricasEmail(doc, evento);
          if (actualizado) {
            procesados++;
          } else {
            errores++;
          }
        }
      } catch (error) {
        console.error(`❌ Error procesando evento:`, error);
        errores++;
      }
    }

    console.log(`✅ Webhook completado. Procesados: ${procesados}, Errores: ${errores}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        procesados,
        errores,
        total: eventos.length
      })
    };

  } catch (error) {
    console.error('❌ Error en webhook SendGrid:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      })
    };
  }
};