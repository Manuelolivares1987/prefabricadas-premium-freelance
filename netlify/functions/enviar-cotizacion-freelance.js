// netlify/functions/enviar-cotizacion-freelance.js
// Versión COMPLETA con Google Sheets usando APIs REST

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Importar funciones de Google Sheets REST
const { registrarCotizacionEnGoogleSheets } = require('./google-sheets-utils');

// Configuración
let valorUF = 37500; // Valor de respaldo

// Datos de modelos con imágenes agregadas
const modelos = {
  'Milán': {
    m2_utiles: 230,
    m2_terraza: 81,
    entrepiso: 84,
    logia: 0,
    dormitorios: 5,
    baños: 4,
    pdf: 'pdfs/milan.pdf',
    imagen: 'modelos/milan.jpg',
    descripcion: 'Casa familiar de gran tamaño con espacios amplios y distribución premium'
  },
  'Marbella': {
    m2_utiles: 139,
    m2_terraza: 50,
    entrepiso: 0,
    logia: 0,
    dormitorios: 4,
    baños: 2,
    pdf: 'pdfs/marbella.pdf',
    imagen: 'modelos/marbella.jpg',
    descripcion: 'Diseño moderno de 4 dormitorios con amplia terraza'
  },
  'Praga': {
    m2_utiles: 180,
    m2_terraza: 18,
    entrepiso: 0,
    logia: 0,
    dormitorios: 4,
    baños: 3,
    pdf: 'pdfs/praga.pdf',
    imagen: 'modelos/praga.jpg',
    descripcion: 'Casa de 4 dormitorios con distribución eficiente'
  },
  'Barcelona': {
    m2_utiles: 150,
    m2_terraza: 9,
    entrepiso: 0,
    logia: 0,
    dormitorios: 3,
    baños: 2,
    pdf: 'pdfs/barcelona.pdf',
    imagen: 'modelos/barcelona.jpg',
    descripcion: 'Casa mediterránea de 3 dormitorios con estilo clásico'
  },
  'Málaga': {
    m2_utiles: 139,
    m2_terraza: 25,
    entrepiso: 0,
    logia: 0,
    dormitorios: 3,
    baños: 2,
    pdf: 'pdfs/malaga.pdf',
    imagen: 'modelos/malaga.jpg',
    descripcion: 'Diseño compacto y funcional con terraza integrada'
  },
  'Capri': {
    m2_utiles: 92,
    m2_terraza: 36,
    entrepiso: 0,
    logia: 0,
    dormitorios: 3,
    baños: 2,
    pdf: 'pdfs/capri.pdf',
    imagen: 'modelos/capri.jpg',
    descripcion: 'Casa acogedora con terraza generosa para la vida al aire libre'
  },
  'Cádiz': {
    m2_utiles: 114,
    m2_terraza: 11,
    entrepiso: 0,
    logia: 0,
    dormitorios: 3,
    baños: 2,
    pdf: 'pdfs/cadiz.pdf',
    imagen: 'modelos/cadiz.jpg',
    descripcion: 'Casa de tamaño medio con distribución práctica y funcional'
  },
  'Toscana': {
    m2_utiles: 72,
    m2_terraza: 0,
    entrepiso: 0,
    logia: 0,
    dormitorios: 3,
    baños: 2,
    pdf: 'pdfs/toscana.pdf',
    imagen: 'modelos/toscana.jpg',
    descripcion: 'Casa starter perfecta para comenzar, diseño compacto e inteligente'
  },
  'Mónaco': {
    m2_utiles: 132,
    m2_terraza: 15,
    entrepiso: 36,
    logia: 7,
    dormitorios: 3,
    baños: 2,
    pdf: 'pdfs/monaco.pdf',
    imagen: 'modelos/monaco.jpg',
    descripcion: 'Casa de 2 pisos con espacios diferenciados y logia privada'
  },
  'Eclipse': {
    m2_utiles: 86,
    m2_terraza: 0,
    entrepiso: 36,
    logia: 0,
    dormitorios: 3,
    baños: 2,
    pdf: 'pdfs/eclipse.pdf',
    imagen: 'modelos/eclipse.jpg',
    descripcion: 'Diseño moderno de 2 pisos compacto y eficiente'
  },
  'Amalfitano': {
    m2_utiles: 230,
    m2_terraza: 71,
    entrepiso: 0,
    logia: 0,
    dormitorios: 4,
    baños: 3,
    pdf: 'pdfs/amalfitano.pdf',
    imagen: 'modelos/amalfitano.jpg',
    descripcion: 'Casa premium de gran tamaño en un piso con diseño mediterráneo'
  },
  'Santorini': {
   m2_utiles: 120,
   m2_terraza: 0,
   entrepiso: 0,
   logia: 3,
   dormitorios: 4,
   baños: 3,
   pdf: 'pdfs/santorini.pdf',
   imagen: 'modelos/santorini.jpg',
   descripcion: 'Arquitectura contemporánea de 4 dormitorios y 3 baños que combina elegancia, amplitud y confort familiar en cada detalle',
   precio_fijo: {
   modalidad: 'SIP_VOLCANBOARD',
   precio_clp: 19990000,
   precio_uf: 533.07
   }
  },
   'Santorini Base': {
    m2_utiles: 74,
    m2_terraza: 0,
    entrepiso: 0,
    logia: 0,
    dormitorios: 2,
    baños: 1,
    pdf: 'pdfs/santorini-base.pdf',
    imagen: 'modelos/santorini-base.jpg',
    descripcion: 'Diseño moderno y luminoso de 2 dormitorios y 1 baño, ideal para quienes buscan estilo y funcionalidad en espacios compactos',
    precio_fijo: {
    modalidad: 'SIP_VOLCANBOARD',
    precio_clp: 11790000,
    precio_uf: 314.4
    }
  }
};

// Tarifas
const tarifas = {
  'MADERA_OSB': { util: 3.6, terraza: 2, entrepiso: 0.72, logia: 2.7 },
  'SIP_VOLCANBOARD': { util: 4.8, terraza: 2, entrepiso: 0.72, logia: 3 },
  'METALCON_VOLCANBOARD': { util: 4.6, terraza: 2, entrepiso: 1.72, logia: 3 }
};

// Función para calcular m2 totales (sin entrepiso)
function calcularM2Totales(modelo) {
  return (modelo.m2_utiles || 0) + (modelo.m2_terraza || 0) + (modelo.logia || 0);
}

// Preguntas frecuentes actualizadas
const preguntasFrecuentes = [
  {
    categoria: "Construcción y Calidad",
    pregunta: "¿Cuánto tiempo demora la construcción?",
    respuesta: "La fabricación toma 6-8 semanas en condiciones controladas de fábrica, más 1-2 semanas de montaje en sitio. Total: 2-3 meses versus 6-12 meses de construcción tradicional."
  },
  {
    categoria: "Construcción y Calidad",
    pregunta: "¿Trabajan con materiales certificados?",
    respuesta: "Sí, nuestros materiales cuentan con certificación para cada mundo constructivo: Madera (Certificación estructural y de impregnación al vacío), Metalcon (Respaldo de CINTAC), Premium SIP (Certificado al corte por IDIEM)."
  },
  {
    categoria: "Construcción y Calidad",
    pregunta: "¿Qué otros modelos y tamaños tienen disponibles?",
    respuesta: "Además de las opciones mostradas, tenemos múltiples variantes para cada modelo con diferentes metrajes y configuraciones. Consulta con tu agente de ventas por todas las opciones disponibles según tus necesidades específicas."
  },
  {
    categoria: "Financiamiento",
    pregunta: "¿Puedo financiar mi casa prefabricada?",
    respuesta: "Sí, trabajamos con SALVUM donde, bajo evaluación crediticia, puedes financiar hasta en 60 cuotas. También te asesoramos en la postulación a subsidios DS1, DS49 y DS19 sin costo adicional."
  },
  {
    categoria: "Financiamiento",
    pregunta: "¿Cómo funciona el pago por etapas?",
    respuesta: "Todos nuestros proyectos se pueden comprar a través de etapas, donde alrededor del 50% del proyecto se paga una semana antes de la entrega. El resto se puede financiar según las condiciones acordadas."
  },
  {
    categoria: "Materialidad y Servicios",
    pregunta: "¿Qué incluye? / ¿Trabajan llave en mano?",
    respuesta: "Podemos realizar el radier y armar tu proyecto, o entregarte el KIT de autoconstrucción con asesoría de un ITO (Inspector Técnico de Obra) y listado de maestros calificados."
  },
  {
    categoria: "Materialidad y Servicios",
    pregunta: "¿Qué incluye el kit y qué no?",
    respuesta: "Incluimos estructura, revestimientos y herrajes para obra gruesa. NO incluye: electricidad, gasfitería, pavimentos, puertas, ventanas. Aislación solo incluida en Panel SIP. Tenemos alianzas para adquirir especialidades a precios económicos."
  }
];

// Funciones auxiliares
async function obtenerValorUF() {
  try {
    const response = await fetch('https://mindicador.cl/api/uf');
    const data = await response.json();
    
    if (data && data.serie && data.serie[0]) {
      valorUF = parseFloat(data.serie[0].valor);
      return {
        valor: valorUF,
        fecha: new Date(data.serie[0].fecha).toLocaleDateString('es-CL')
      };
    }
  } catch (error) {
    console.error('Error al obtener UF:', error);
  }
  
  return {
    valor: valorUF,
    fecha: new Date().toLocaleDateString('es-CL')
  };
}

function calcularPrecio(nombreModelo, materialidad, valorUF) {
  const modelo = modelos[nombreModelo];
  
  if (modelo && modelo.precio_fijo) {
    if (materialidad === modelo.precio_fijo.modalidad) {
      return {
        uf: modelo.precio_fijo.precio_uf,
        clp: modelo.precio_fijo.precio_clp
      };
    } else {
      return null;
    }
  }
  
  const tarifa = tarifas[materialidad];
  
  if (!modelo || !tarifa) return null;

  let totalUF = 0;
  
  if (modelo.m2_utiles) {
    totalUF += modelo.m2_utiles * tarifa.util;
  }
  
  if (modelo.m2_terraza) {
    totalUF += modelo.m2_terraza * tarifa.terraza;
  }
  
  if (modelo.entrepiso && tarifa.entrepiso) {
    totalUF += modelo.entrepiso * tarifa.entrepiso;
  }
  
  if (modelo.logia && tarifa.logia) {
    totalUF += modelo.logia * tarifa.logia;
  }

  return {
    uf: Math.ceil(totalUF),
    clp: Math.round(Math.ceil(totalUF) * valorUF)
  };
}

function generarNumeroCotizacion() {
  const fecha = new Date();
  const año = fecha.getFullYear().toString().slice(-2);
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const dia = fecha.getDate().toString().padStart(2, '0');
  const timestamp = Date.now().toString().slice(-4);
  
  return `PP${año}${mes}${dia}-FL${timestamp}`;
}

function generarWhatsAppURL(datos, cotizacion, vendedor) {
  const telefono = vendedor ? vendedor.telefono : '56955278508';
  
  let mensaje = `🏠 *NUEVA COTIZACIÓN - CASAS PREFABRICADAS*\n\n`;
  mensaje += `👤 *CLIENTE:*\n`;
  mensaje += `• Nombre: ${datos.nombre}\n`;
  mensaje += `• Email: ${datos.correo}\n`;
  mensaje += `• Teléfono: ${datos.telefono}\n`;
  mensaje += `• Habitaciones necesarias: ${datos.habitaciones}\n`;
  mensaje += `• Sucursal cercana: ${datos.sucursal}\n\n`;
  
  mensaje += `🏠 *MODELO SOLICITADO:*\n`;
  mensaje += `• ${datos.modelo}\n`;
  
  const modeloInfo = modelos[datos.modelo];
  if (modeloInfo) {
    const m2Total = calcularM2Totales(modeloInfo);
    mensaje += `• ${m2Total}m² totales (${modeloInfo.m2_utiles}m² útiles)\n`;
    mensaje += `• ${modeloInfo.dormitorios} dormitorios, ${modeloInfo.baños} baños\n`;
  }
  
  mensaje += `\n💰 *COTIZACIÓN #${cotizacion.numero}:*\n`;
  if (cotizacion.precios.economica) {
    mensaje += `• Madera+OSB: $${cotizacion.precios.economica.clp.toLocaleString('es-CL')} + IVA\n`;
  }
  if (cotizacion.precios.premium) {
    mensaje += `• Premium SIP: $${cotizacion.precios.premium.clp.toLocaleString('es-CL')} + IVA\n`;
  }
  if (cotizacion.precios.estructural) {
    mensaje += `• Metalcon: $${cotizacion.precios.estructural.clp.toLocaleString('es-CL')} + IVA\n`;
  }
  
  if (datos.financia === 'si') {
    mensaje += `\n💳 *FINANCIAMIENTO:*\n`;
    mensaje += `• Interesado en financiar\n`;
    if (datos.monto) {
      mensaje += `• Monto deseado: $${parseInt(datos.monto).toLocaleString('es-CL')}\n`;
    }
    if (datos.rut) {
      mensaje += `• RUT: ${datos.rut}\n`;
    }
  }
  
  if (datos.comentario) {
    mensaje += `\n💬 *COMENTARIOS:*\n${datos.comentario}\n`;
  }
  
  if (vendedor) {
    mensaje += `\n🤝 *VENDEDOR FREELANCE:*\n`;
    mensaje += `• Nombre: ${vendedor.nombre}\n`;
    mensaje += `• Código: ${vendedor.codigo}\n`;
    mensaje += `• Región: ${vendedor.region}\n`;
    mensaje += `\n✅ *Este cliente fue referido por ${vendedor.nombre}*\n`;
    mensaje += `💰 *Corresponde comisión por venta*`;
  }
  
  mensaje += `\n⏰ Vigencia: ${cotizacion.vigencia}`;
  
  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
}

// Función principal
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Método no permitido' 
      })
    };
  }

  try {
    const datos = JSON.parse(event.body);
    
    console.log('📝 Procesando cotización freelance:', {
      cliente: datos.nombre,
      modelo: datos.modelo,
      vendedor: datos.vendedor ? datos.vendedor.nombre : 'Sin vendedor'
    });

    if (!datos.nombre || !datos.correo || !datos.telefono || !datos.modelo) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Faltan datos requeridos'
        })
      };
    }

    const ufInfo = await obtenerValorUF();
    const numeroCotizacion = generarNumeroCotizacion();
    
    const precios = {};
    const modelo = modelos[datos.modelo];
    
    if (modelo && modelo.precio_fijo) {
      const precio = calcularPrecio(datos.modelo, modelo.precio_fijo.modalidad, ufInfo.valor);
      if (precio) {
        if (modelo.precio_fijo.modalidad === 'SIP_VOLCANBOARD') {
          precios.premium = precio;
        }
      }
    } else {
      const economica = calcularPrecio(datos.modelo, 'MADERA_OSB', ufInfo.valor);
      const premium = calcularPrecio(datos.modelo, 'SIP_VOLCANBOARD', ufInfo.valor);
      const estructural = calcularPrecio(datos.modelo, 'METALCON_VOLCANBOARD', ufInfo.valor);
      
      if (economica) precios.economica = economica;
      if (premium) precios.premium = premium;
      if (estructural) precios.estructural = estructural;
    }

    const vigencia = new Date();
    vigencia.setDate(vigencia.getDate() + 15);
    
    const modeloConM2Total = {
      ...modelo,
      m2_total: calcularM2Totales(modelo)
    };
    
    const cotizacion = {
      numero: numeroCotizacion,
      modelo: datos.modelo,
      modelo_info: modeloConM2Total,
      precios: precios,
      uf: ufInfo,
      vigencia: vigencia.toLocaleDateString('es-CL'),
      fecha: new Date().toLocaleDateString('es-CL'),
      vendedor: datos.vendedor || null
    };

    const whatsappURL = generarWhatsAppURL(datos, cotizacion, datos.vendedor);

    // Enviar email con tracking de SendGrid
    try {
      const emailHTML = generarEmailCotizacion(datos, cotizacion);
      
      const msg = {
        to: datos.correo,
        from: 'cotizacion@prefabricadaspremium.cl',
        subject: `Cotización #${numeroCotizacion} - ${datos.modelo} - Prefabricadas Premium`,
        html: emailHTML,
        categories: ['cotizacion', 'freelance'],
        custom_args: {
          cotizacion: numeroCotizacion,
          vendedor: datos.vendedor?.codigo || 'directo',
          modelo: datos.modelo,
          tipo: 'cotizacion',
          cliente_email: datos.correo,
          fecha: new Date().toISOString()
        },
        tracking_settings: {
          click_tracking: {
            enable: true,
            enable_text: true
          },
          open_tracking: {
            enable: true,
            substitution_tag: '%open-track%'
          },
          subscription_tracking: {
            enable: false
          }
        }
      };

      await sgMail.send(msg);
      console.log('✅ Email enviado correctamente con tracking habilitado');
      
    } catch (emailError) {
      console.error('⚠️ Error al enviar email:', emailError);
    }

    // NUEVO: Registrar en Google Sheets usando APIs REST
    try {
      console.log('📊 Registrando en Google Sheets con APIs REST...');
      const sheetRegistrado = await registrarCotizacionEnGoogleSheets(datos, cotizacion);
      if (sheetRegistrado) {
        console.log('✅ Lead registrado exitosamente en Google Sheets:', numeroCotizacion);
      }
    } catch (sheetError) {
      console.error('⚠️ Error al registrar en Google Sheets:', sheetError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        cotizacion: cotizacion,
        whatsapp_url: whatsappURL,
        vendedor: datos.vendedor ? datos.vendedor.nombre : null,
        message: datos.vendedor ? 
          `Cotización enviada. Serás contactado por ${datos.vendedor.nombre}` :
          'Cotización enviada correctamente'
      })
    };

  } catch (error) {
    console.error('❌ Error en enviar-cotizacion-freelance:', error);
    
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

// FUNCIÓN DE EMAIL COMPLETA
function generarEmailCotizacion(datos, cotizacion) {
  const preciosOrdenados = ['economica', 'premium', 'estructural'].map(tipo => {
    if (cotizacion.precios[tipo]) {
      return { tipo, ...cotizacion.precios[tipo] };
    }
    return null;
  }).filter(precio => precio && precio.uf);

  const vendedor = datos.vendedor;
  const trackingParams = `utm_source=email_freelance&utm_medium=cotizacion&utm_campaign=${cotizacion.numero}&utm_content=${cotizacion.modelo}&vendedor=${vendedor?.codigo || 'directo'}`;
  
  const whatsappTelefono = vendedor ? vendedor.telefono : '56955278508';
  const whatsappUrl = `https://wa.me/${whatsappTelefono}?text=${encodeURIComponent(`¡Hola! 👋 Soy ${datos.nombre}, recibí la cotización ${cotizacion.numero} para el modelo ${datos.modelo}. ${vendedor ? `Me contacté a través de ${vendedor.nombre}.` : ''} Me interesa conocer más detalles sobre el proyecto. ¿Cuándo podríamos conversar? ¡Gracias!`)}&${trackingParams}`;
  
  const pdfUrl = `https://premiumfreelance.netlify.app/${cotizacion.modelo_info?.pdf || 'pdfs/modelo.pdf'}?${trackingParams}`;
  
  const googleDriveFileId = '1p8NDSfSiBR8KgbQI_U_cGoJQ5WTOVuDz';
  const brochureUrl = `https://drive.google.com/file/d/${googleDriveFileId}/view?${trackingParams}&referrer=email_freelance`;

  const OPCIONES_EMAIL = {
    economica: {
      titulo: 'Panel Madera', subtitulo: 'Madera + OSB',
      descripcion: 'Excelente relación calidad-precio',
      color: '#6c757d', icono: '🏠',
      incluye: [
        'Estructura de madera certificada',
        'Revestimiento OSB resistente',
        'Kit de autoconstrucción completo',
        'Asesoría técnica con I.T.O',
        'Manual de montaje detallado',
        'Garantía de materiales estructurales'
      ]
    },
    premium: {
      titulo: 'Panel Premium SIP', subtitulo: 'SIP + Volcanboard',
      descripcion: 'Máxima eficiencia energética',
      color: '#28a745', icono: '⭐', recomendada: true,
      incluye: [
        'Paneles SIP con aislación incluida',
        'Certificado IDIEM al corte',
        'Volcanboard 8mm ambas caras',
        'Sistema de construcción rápida',
        'Asesoría técnica especializada',
        'Máxima eficiencia energética'
      ]
    },
    estructural: {
      titulo: 'Panel Metalcon', subtitulo: 'Metalcon + Volcanboard',
      descripcion: 'Máxima resistencia sísmica',
      color: '#0074D9', icono: '🔩',
      incluye: [
        'Estructura Steel Frame CINTAC',
        'Volcanboard estructural 8mm',
        'Sistema antisísmico reforzado',
        'Perfiles galvanizados certificados',
        'Certificación de resistencia sísmica',
        'Garantía estructural extendida'
      ]
    }
  };

  return `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml" lang="es">
  <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>✅ Tu Cotización ${cotizacion.numero} - ${vendedor ? vendedor.nombre : 'Prefabricadas Premium'}</title>
      
      <img src="https://api.sendgrid.com/v3/tracking/open.gif?cotizacion=${cotizacion.numero}&email=${encodeURIComponent(datos.correo)}&vendedor=${vendedor?.codigo || 'directo'}" width="1" height="1" style="display:none;">
      
      <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
              line-height: 1.5; 
              color: #2C1810; 
              background: #f5f5f5;
              -webkit-text-size-adjust: 100%;
          }
          
          table { border-collapse: collapse; width: 100%; }
          
          .email-container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          
          .header { 
              background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
              color: white; 
              text-align: center; 
              padding: 40px 30px;
              position: relative;
          }
          
          .header::before {
              content: '🤝';
              position: absolute;
              top: 15px;
              right: 20px;
              font-size: 24px;
          }
          
          .header h1 { 
              font-size: 28px; 
              font-weight: 700; 
              margin-bottom: 8px;
          }
          
          .header .subtitle { 
              font-size: 16px; 
              opacity: 0.9;
              margin-bottom: 20px;
          }
          
          .cotizacion-badge {
              background: rgba(255,255,255,0.2);
              padding: 8px 20px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              display: inline-block;
          }
          
          .vendedor-hero {
              background: linear-gradient(135deg, #e7f3ff 0%, #cce7ff 100%);
              border: 2px solid #007bff;
              border-radius: 12px;
              padding: 25px;
              margin: 20px 0;
              text-align: center;
          }
          
          .vendedor-hero h3 {
              color: #007bff;
              font-size: 22px;
              margin-bottom: 10px;
              font-weight: 700;
          }
          
          .vendedor-hero p {
              color: #0056b3;
              margin: 8px 0;
              font-size: 16px;
          }
          
          .vendedor-badge {
              background: #007bff;
              color: white;
              padding: 6px 16px;
              border-radius: 15px;
              font-size: 14px;
              font-weight: 600;
              display: inline-block;
              margin-top: 10px;
          }
          
          .section {
              padding: 30px;
              border-bottom: 1px solid #f0f0f0;
          }
          
          .section:last-child {
              border-bottom: none;
          }
          
          .section-title {
              color: #8B5A3C;
              font-size: 20px;
              font-weight: 700;
              margin-bottom: 20px;
              text-align: center;
          }
          
          .cliente-info {
              background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
              border-left: 4px solid #8B5A3C;
              border-radius: 8px;
              padding: 20px;
          }
          
          .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #f0f0f0;
          }
          
          .info-row:last-child {
              border-bottom: none;
          }
          
          .info-label {
              font-weight: 600;
              color: #8B5A3C;
              font-size: 14px;
          }
          
          .info-value {
              font-weight: 500;
              color: #2C1810;
              font-size: 14px;
              text-align: right;
          }
          
          .modelo-card {
              background: linear-gradient(135deg, #8B5A3C 0%, #A67C52 100%);
              color: white;
              text-align: center;
              border-radius: 12px;
              padding: 30px;
              margin-bottom: 20px;
          }
          
          .modelo-name {
              font-size: 32px;
              font-weight: 800;
              margin-bottom: 10px;
          }
          
          .modelo-description {
              font-size: 16px;
              opacity: 0.9;
              margin-bottom: 25px;
              font-style: italic;
          }
          
          .specs-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
              gap: 15px;
              margin: 20px 0;
          }
          
          .spec-item {
              background: rgba(255,255,255,0.2);
              padding: 12px;
              border-radius: 8px;
              text-align: center;
          }
          
          .spec-number {
              font-size: 20px;
              font-weight: 700;
              display: block;
          }
          
          .spec-label {
              font-size: 12px;
              opacity: 0.9;
              text-transform: uppercase;
              letter-spacing: 0.5px;
          }
          
          .casa-imagen {
              text-align: center;
              margin: 25px 0;
          }
          
          .casa-imagen img {
              max-width: 100%;
              height: auto;
              border-radius: 12px;
              box-shadow: 0 8px 25px rgba(0,0,0,0.15);
          }
          
          .precio-card {
              border: 2px solid #e9ecef;
              border-radius: 12px;
              padding: 25px;
              margin-bottom: 20px;
              position: relative;
              text-align: left;
              transition: all 0.3s ease;
          }
          
          .precio-card.destacado {
              border-color: #28a745;
              background: linear-gradient(135deg, #f8fff8 0%, #e8f5e8 100%);
              transform: scale(1.02);
          }
          
          .precio-card.destacado::before {
              content: '⭐ RECOMENDADO';
              position: absolute;
              top: -12px;
              left: 50%;
              transform: translateX(-50%);
              background: #28a745;
              color: white;
              padding: 6px 16px;
              border-radius: 15px;
              font-size: 12px;
              font-weight: 700;
          }
          
          .precio-titulo {
              font-size: 18px;
              font-weight: 700;
              margin-bottom: 5px;
              color: #8B5A3C;
              text-align: center;
          }
          
          .precio-subtitulo {
              font-size: 14px;
              color: #666;
              margin-bottom: 20px;
              text-align: center;
          }
          
          .precio-valores {
              text-align: center;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
              margin-bottom: 20px;
          }
          
          .precio-principal {
              font-size: 28px;
              font-weight: 800;
              color: #8B5A3C;
              margin-bottom: 5px;
          }
          
          .precio-uf {
              font-size: 16px;
              color: #666;
              margin-bottom: 10px;
          }
          
          .precio-iva {
              font-size: 14px;
              color: #e74c3c;
              font-weight: 600;
          }
          
          .incluye-section {
              margin-top: 20px;
          }
          
          .incluye-titulo {
              font-size: 16px;
              font-weight: 700;
              color: #8B5A3C;
              margin-bottom: 12px;
              text-align: center;
          }
          
          .incluye-lista {
              list-style: none;
              padding: 0;
              margin: 0;
          }
          
          .incluye-lista li {
              padding: 6px 0 6px 20px;
              font-size: 14px;
              line-height: 1.4;
              position: relative;
              border-bottom: 1px solid #f0f0f0;
          }
          
          .incluye-lista li:last-child {
              border-bottom: none;
          }
          
          .incluye-lista li::before {
              content: '✓';
              position: absolute;
              left: 0;
              color: #28a745;
              font-weight: 900;
              font-size: 14px;
          }
          
          .faq-section {
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              border-radius: 12px;
              padding: 25px;
              margin: 25px 0;
          }
          
          .faq-title {
              color: #8B5A3C;
              font-size: 20px;
              font-weight: 700;
              margin-bottom: 20px;
              text-align: center;
          }
          
          .faq-categoria {
              color: #007bff;
              font-size: 16px;
              font-weight: 700;
              margin: 20px 0 10px 0;
              padding-bottom: 5px;
              border-bottom: 2px solid #007bff;
          }
          
          .faq-categoria:first-child {
              margin-top: 0;
          }
          
          .faq-item {
              background: white;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 12px;
              border-left: 4px solid #28a745;
          }
          
          .faq-question {
              font-weight: 700;
              color: #2C1810;
              margin-bottom: 8px;
              font-size: 14px;
          }
          
          .faq-answer {
              color: #666;
              font-size: 13px;
              line-height: 1.5;
          }
          
          .btn {
              display: inline-block;
              padding: 14px 28px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              font-size: 16px;
              text-align: center;
              transition: all 0.3s ease;
              border: none;
              cursor: pointer;
          }
          
          .btn-primary {
              background: #8B5A3C;
              color: white;
          }
          
          .btn-secondary {
              background: #28a745;
              color: white;
          }
          
          .btn-whatsapp {
              background: #25D366;
              color: white;
              font-size: 18px;
              padding: 16px 32px;
              border-radius: 10px;
              display: block;
              text-align: center;
              margin: 20px 0;
          }
          
          .info-importante {
              background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
              border: 2px solid #ffc107;
              border-radius: 12px;
              padding: 25px;
              margin: 30px 0;
              text-align: center;
          }
          
          .info-importante h4 {
              color: #856404;
              margin-bottom: 15px;
              font-weight: 700;
          }
          
          .info-importante p {
              color: #856404;
              margin: 8px 0;
              font-size: 14px;
          }
          
          .footer {
              background: #2C1810;
              color: white;
              padding: 30px;
              text-align: center;
          }
          
          .footer h3 {
              margin-bottom: 15px;
              font-size: 20px;
          }
          
          .footer p {
              margin: 5px 0;
              opacity: 0.9;
          }
          
          @media only screen and (max-width: 600px) {
              .email-container {
                  margin: 0;
                  box-shadow: none;
              }
              
              .section {
                  padding: 20px;
              }
              
              .header {
                  padding: 30px 20px;
              }
              
              .specs-grid {
                  grid-template-columns: repeat(2, 1fr);
              }
              
              .precio-principal {
                  font-size: 24px;
              }
          }
      </style>
  </head>
  <body>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
              <td align="center" style="padding: 20px 10px;">
                  <div class="email-container">
                      
                      <!-- HEADER FREELANCE -->
                      <div class="header">
                          <h1>${vendedor ? '🤝 Tu Asesor Personal' : '🏠 Prefabricadas Premium'}</h1>
                          <div class="subtitle">${vendedor ? 'Red de Vendedores Freelance' : 'Tu Casa Soñada'}</div>
                          <div class="cotizacion-badge">Cotización N° ${cotizacion.numero}</div>
                      </div>
                      
                      <!-- INFO VENDEDOR FREELANCE -->
                      ${vendedor ? `
                      <div class="section">
                          <div class="vendedor-hero">
                              <h3>👋 ¡Hola ${datos.nombre.split(' ')[0]}!</h3>
                              <p><strong>Soy ${vendedor.nombre}</strong></p>
                              <p>Tu asesor personal en casas prefabricadas</p>
                              <p>📍 ${vendedor.region} - ${vendedor.ciudad || 'Región'}</p>
                              <div class="vendedor-badge">Código: ${vendedor.codigo}</div>
                          </div>
                          <div style="text-align: center; color: #666; font-size: 14px; margin-top: 15px;">
                              ✨ <strong>Atención personalizada garantizada</strong> - Te acompaño en todo el proceso
                          </div>
                      </div>
                      ` : ''}
                      
                      <!-- INFORMACIÓN DEL CLIENTE -->
                      <div class="section">
                          <h3 class="section-title">📋 Detalles de tu Cotización</h3>
                          <div class="cliente-info">
                              <div class="info-row">
                                  <span class="info-label">Cotización</span>
                                  <span class="info-value">${cotizacion.numero}</span>
                              </div>
                              <div class="info-row">
                                  <span class="info-label">Modelo Seleccionado</span>
                                  <span class="info-value">${datos.modelo}</span>
                              </div>
                              <div class="info-row">
                                  <span class="info-label">Habitaciones necesarias</span>
                                  <span class="info-value">${datos.habitaciones || 'No especificado'}</span>
                              </div>
                              <div class="info-row">
                                  <span class="info-label">Válida hasta</span>
                                  <span class="info-value">${cotizacion.vigencia}</span>
                              </div>
                              ${vendedor ? `
                              <div class="info-row">
                                  <span class="info-label">Tu asesor</span>
                                  <span class="info-value">${vendedor.nombre}</span>
                              </div>
                              ` : ''}
                          </div>
                          
                          <!-- IMAGEN DE LA CASA -->
                          <div class="casa-imagen">
                              <img src="https://premiumfreelance.netlify.app/${cotizacion.modelo_info?.imagen || 'modelos/default.jpg'}" 
                                   alt="Casa modelo ${datos.modelo}" 
                                   onerror="this.src='https://via.placeholder.com/500x300/8B5A3C/FFFFFF?text=Modelo+${datos.modelo}'"
                                   style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.15);">
                              <p style="margin-top: 10px; font-size: 13px; color: #666; text-align: center; font-style: italic;">
                                  Vista exterior del modelo ${datos.modelo}
                              </p>
                          </div>
                      </div>
                      
                      <!-- MODELO CON M2 TOTALES -->
                      <div class="section">
                          <div class="modelo-card">
                              <div class="modelo-name">${datos.modelo}</div>
                              <div class="modelo-description">${cotizacion.modelo_info?.descripcion || 'Casa diseñada con los más altos estándares de calidad'}</div>
                              
                              <div class="specs-grid">
                                  <div class="spec-item">
                                      <span class="spec-number">${cotizacion.modelo_info?.dormitorios || 'N/A'}</span>
                                      <span class="spec-label">Dormitorios</span>
                                  </div>
                                  <div class="spec-item">
                                      <span class="spec-number">${cotizacion.modelo_info?.baños || 'N/A'}</span>
                                      <span class="spec-label">Baños</span>
                                  </div>
                                  <div class="spec-item">
                                      <span class="spec-number">${cotizacion.modelo_info?.m2_total || 'N/A'}</span>
                                      <span class="spec-label">m² Totales</span>
                                  </div>
                                  <div class="spec-item">
                                      <span class="spec-number">${cotizacion.modelo_info?.m2_utiles || 'N/A'}</span>
                                      <span class="spec-label">m² Útiles</span>
                                  </div>
                              </div>
                          </div>
                          
                          <div style="text-align: center;">
                              <a href="${pdfUrl}" class="btn btn-primary" target="_blank">
                                  📄 Descargar Planta Técnica
                              </a>
                          </div>
                      </div>
                      
                      <!-- BROCHURE -->
                      <div class="section">
                          <div style="background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%); border: 2px solid #28a745; border-radius: 12px; padding: 25px; text-align: center;">
                              <h4 style="color: #155724; margin-bottom: 10px;">📋 Información Corporativa</h4>
                              <p style="color: #155724; margin-bottom: 20px;">Descarga nuestro brochure completo con plantas de producción, certificaciones y galería de proyectos.</p>
                              <a href="${brochureUrl}" class="btn btn-secondary" target="_blank">
                                  Ver Brochure Completo
                              </a>
                          </div>
                      </div>
                      
                      <!-- PREGUNTAS FRECUENTES -->
                      <div class="section">
                          <div class="faq-section">
                              <h3 class="faq-title">❓ Preguntas Frecuentes</h3>
                              ${(() => {
                                const categorias = {};
                                preguntasFrecuentes.forEach(faq => {
                                  if (!categorias[faq.categoria]) {
                                    categorias[faq.categoria] = [];
                                  }
                                  categorias[faq.categoria].push(faq);
                                });
                                
                                return Object.keys(categorias).map(categoria => `
                                  <div class="faq-categoria">${categoria}</div>
                                  ${categorias[categoria].map(faq => `
                                    <div class="faq-item">
                                        <div class="faq-question">Q: ${faq.pregunta}</div>
                                        <div class="faq-answer">R: ${faq.respuesta}</div>
                                    </div>
                                  `).join('')}
                                `).join('');
                              })()}
                          </div>
                      </div>
                      
                      <!-- PRECIOS -->
                      <div class="section">
                          <h3 class="section-title">💰 Opciones de Construcción</h3>
                          
                          ${preciosOrdenados.map(precio => {
                            const opcion = OPCIONES_EMAIL[precio.tipo];
                            if (!opcion) return '';
                            
                            return `
                              <div class="precio-card ${opcion.recomendada ? 'destacado' : ''}">
                                  <div class="precio-titulo">${opcion.icono} ${opcion.titulo}</div>
                                  <div class="precio-subtitulo">${opcion.subtitulo}</div>
                                  
                                  <div class="precio-valores">
                                      <div class="precio-principal">$${precio.clp.toLocaleString('es-CL')}</div>
                                      <div class="precio-uf">${precio.uf} UF</div>
                                      <div class="precio-iva">+ IVA</div>
                                  </div>
                                  
                                  <div class="incluye-section">
                                      <div class="incluye-titulo">✨ Esta Opción Incluye:</div>
                                      <ul class="incluye-lista">
                                          ${opcion.incluye.map(item => `<li>${item}</li>`).join('')}
                                      </ul>
                                  </div>
                              </div>
                            `;
                          }).join('')}
                          
                          <div class="info-importante">
                              <h4>⚠️ Información Importante</h4>
                              <p><strong>Estos precios son referenciales y están sujetos a evaluación final.</strong></p>
                              <p><strong>Deben ser aprobados ${vendedor ? `por ${vendedor.nombre}` : 'por un agente de ventas'}</strong> de Prefabricadas Premium.</p>
                              <p><em>Los precios finales pueden variar según especificaciones del terreno y proyecto.</em></p>
                          </div>
                      </div>
                      
                      <!-- UF Y VIGENCIA -->
                      <div class="section">
                          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                              <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; text-align: center;">
                                  <h5 style="color: #8B5A3C; font-size: 14px; margin-bottom: 5px;">Valor UF</h5>
                                  <div style="font-size: 18px; font-weight: 700; color: #2C1810;">$${cotizacion.uf.valor.toLocaleString('es-CL')}</div>
                                  <small>${cotizacion.uf.fecha}</small>
                              </div>
                              <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; text-align: center;">
                                  <h5 style="color: #8B5A3C; font-size: 14px; margin-bottom: 5px;">Vigencia</h5>
                                  <div style="font-size: 18px; font-weight: 700; color: #2C1810;">${cotizacion.vigencia}</div>
                                  <small>15 días corridos</small>
                              </div>
                          </div>
                      </div>
                      
                      <!-- CTA WHATSAPP VENDEDOR -->
                      <div class="section">
                          <h3 class="section-title">¿Listo para el siguiente paso?</h3>
                          <div style="text-align: center;">
                              <p style="margin-bottom: 20px; color: #666;">
                                  ${vendedor ? 
                                    `Conecta directamente con <strong>${vendedor.nombre}</strong>` :
                                    'Conecta con nuestro especialista'
                                  }
                              </p>
                              <a href="${whatsappUrl}" class="btn-whatsapp" target="_blank">
                                  💬 Chatear por WhatsApp
                              </a>
                              <p style="margin-top: 15px; font-size: 14px; color: #666;">
                                  📱 ${whatsappTelefono.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '+$1 $2 $3 $4')}
                              </p>
                              <p style="font-size: 13px; color: #999;">
                                  ${vendedor ? 
                                    `${vendedor.nombre} te responderá personalmente` :
                                    'Respuesta garantizada en menos de 2 horas hábiles'
                                  }
                              </p>
                          </div>
                      </div>
                      
                      <!-- FOOTER VENDEDOR -->
                      <div class="footer">
                          <h3>${vendedor ? `${vendedor.nombre} - Prefabricadas Premium` : 'Prefabricadas Premium'}</h3>
                          <p><strong>${vendedor ? 'Tu asesor personal en casas prefabricadas' : 'Construyendo sueños, creando hogares'}</strong></p>
                          ${vendedor ? `
                          <p>📍 ${vendedor.region} - ${vendedor.ciudad || 'Región'}</p>
                          <p>📱 ${whatsappTelefono.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '+$1 $2 $3 $4')}</p>
                          <p>👤 Código de vendedor: ${vendedor.codigo}</p>
                          ` : ''}
                          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #444; font-size: 12px; opacity: 0.7;">
                              <p>Cotización: ${cotizacion.fecha} | UF: $${cotizacion.uf.valor.toLocaleString('es-CL')}</p>
                              ${vendedor ? `<p>Atención personalizada por ${vendedor.nombre} - Red Freelance</p>` : ''}
                          </div>
                      </div>
                      
                  </div>
              </td>
          </tr>
      </table>
  </body>
  </html>
  `;
}