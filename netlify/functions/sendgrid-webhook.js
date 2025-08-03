// netlify/functions/sendgrid-webhook.js
// Webhook para SendGrid - Versión funcional sin dependencias problemáticas

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
    console.log('🚀 Webhook iniciado');
    console.log('📨 Headers recibidos:', JSON.stringify(event.headers, null, 2));
    
    // Parsear eventos de SendGrid
    const eventos = JSON.parse(event.body || '[]');
    
    if (!Array.isArray(eventos)) {
      console.log('⚠️ Evento único recibido, convirtiendo a array');
      eventos = [eventos];
    }

    if (eventos.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No hay eventos válidos' })
      };
    }

    console.log(`📬 Procesando ${eventos.length} eventos de SendGrid`);

    // Procesar cada evento
    let procesados = 0;
    const eventosDetalles = [];

    for (const evento of eventos) {
      try {
        // Extraer información del evento
        const eventoInfo = {
          event: evento.event,
          email: evento.email,
          timestamp: evento.timestamp ? new Date(evento.timestamp * 1000).toISOString() : new Date().toISOString(),
          subject: evento.subject || 'N/A',
          cotizacion: evento.unique_args?.cotizacion || evento.cotizacion || 'N/A',
          vendedor: evento.unique_args?.vendedor || evento.vendedor || 'directo',
          modelo: evento.unique_args?.modelo || evento.modelo || 'N/A',
          url: evento.url || '',
          reason: evento.reason || '',
          userAgent: evento.useragent || '',
          ip: evento.ip || ''
        };

        // Log detallado del evento
        console.log(`📧 Evento: ${eventoInfo.event} | Email: ${eventoInfo.email} | Cotización: ${eventoInfo.cotizacion}`);
        
        // Solo procesar eventos relevantes de cotización
        const esEventoCotizacion = (
          evento.unique_args?.tipo === 'cotizacion' || 
          evento.category?.includes('cotizacion') ||
          evento.subject?.toLowerCase().includes('cotización') ||
          evento.subject?.toLowerCase().includes('cotizacion')
        );

        if (esEventoCotizacion || eventos.length === 1) {
          eventosDetalles.push(eventoInfo);
          procesados++;
          
          // Aquí podríamos agregar la lógica de Google Sheets más adelante
          // Por ahora solo loggeamos y confirmamos recepción
          console.log(`✅ Evento procesado correctamente: ${JSON.stringify(eventoInfo, null, 2)}`);
        } else {
          console.log(`⏭️ Evento omitido (no es de cotización): ${evento.event}`);
        }

      } catch (errorEvento) {
        console.error(`❌ Error procesando evento individual:`, errorEvento);
      }
    }

    // Verificar variables de entorno (sin mostrar valores)
    const configCompleta = !!(
      process.env.GOOGLE_SHEET_ID && 
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && 
      process.env.GOOGLE_PRIVATE_KEY
    );

    console.log(`🔧 Configuración Google Sheets: ${configCompleta ? 'COMPLETA' : 'INCOMPLETA'}`);
    console.log(`✅ Webhook completado. Total procesados: ${procesados}/${eventos.length}`);

    // Respuesta exitosa
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        mensaje: 'Webhook procesado correctamente',
        procesados: procesados,
        total: eventos.length,
        eventos: eventosDetalles,
        timestamp: new Date().toISOString(),
        config: {
          googleSheetsConfigurado: configCompleta
        }
      })
    };

  } catch (error) {
    console.error('❌ Error crítico en webhook SendGrid:', error);
    console.error('Stack trace:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};