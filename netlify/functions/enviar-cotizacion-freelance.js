// netlify/functions/enviar-cotizacion-freelance.js
// Versión modificada para vendedores freelance

// Importar funciones de envío de email (copiadas de la función original)
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Configuración (IGUAL A LA ORIGINAL)
let valorUF = 37500; // Valor de respaldo

// Datos de modelos (EXACTO IGUAL AL ORIGINAL)
const modelos = {
  'Milán': {
    m2_utiles: 230,
    m2_terraza: 81,
    entrepiso: 84,
    logia: 0,
    dormitorios: 5,
    baños: 4,
    pdf: 'pdfs/milan.pdf',
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
    descripcion: 'Diseño moderno y luminoso de 2 dormitorios y 1 baño, ideal para quienes buscan estilo y funcionalidad en espacios compactos',
    precio_fijo: {
    modalidad: 'SIP_VOLCANBOARD',
    precio_clp: 11790000,
    precio_uf: 314.4
    }
  }
};

// Tarifas (IGUAL AL ORIGINAL)
const tarifas = {
  'MADERA_OSB': { util: 3.6, terraza: 2, entrepiso: 0.72, logia: 2.7 },
  'SIP_VOLCANBOARD': { util: 4.8, terraza: 2, entrepiso: 0.72, logia: 3 },
  'METALCON_VOLCANBOARD': { util: 4.6, terraza: 2, entrepiso: 1.72, logia: 3 }
};

// Funciones auxiliares (COPIADAS DEL ORIGINAL)
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
  
  return `PP${año}${mes}${dia}-FL${timestamp}`; // FL = FreeLance
}

// NUEVA: Función para generar URL de WhatsApp con vendedor freelance
function generarWhatsAppURL(datos, cotizacion, vendedor) {
  // Si hay vendedor freelance, usar su teléfono
  const telefono = vendedor ? vendedor.telefono : '56955278508'; // Teléfono de respaldo
  
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
    const m2Total = modeloInfo.m2_utiles + modeloInfo.m2_terraza + modeloInfo.logia;
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
  
  // NUEVO: Información del vendedor freelance
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

    // Validar datos requeridos
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

    // Obtener valor UF actualizado
    const ufInfo = await obtenerValorUF();
    
    // Generar número de cotización
    const numeroCotizacion = generarNumeroCotizacion();
    
    // Calcular precios para todas las modalidades
    const precios = {};
    
    // Solo calcular precios disponibles para el modelo
    const modelo = modelos[datos.modelo];
    if (modelo && modelo.precio_fijo) {
      // Solo modalidad fija disponible
      const precio = calcularPrecio(datos.modelo, modelo.precio_fijo.modalidad, ufInfo.valor);
      if (precio) {
        if (modelo.precio_fijo.modalidad === 'SIP_VOLCANBOARD') {
          precios.premium = precio;
        }
      }
    } else {
      // Todas las modalidades disponibles
      const economica = calcularPrecio(datos.modelo, 'MADERA_OSB', ufInfo.valor);
      const premium = calcularPrecio(datos.modelo, 'SIP_VOLCANBOARD', ufInfo.valor);
      const estructural = calcularPrecio(datos.modelo, 'METALCON_VOLCANBOARD', ufInfo.valor);
      
      if (economica) precios.economica = economica;
      if (premium) precios.premium = premium;
      if (estructural) precios.estructural = estructural;
    }

    // Calcular vigencia (15 días)
    const vigencia = new Date();
    vigencia.setDate(vigencia.getDate() + 15);
    
    // Crear objeto cotización
    const cotizacion = {
      numero: numeroCotizacion,
      modelo: datos.modelo,
      modelo_info: modelo,
      precios: precios,
      uf: ufInfo,
      vigencia: vigencia.toLocaleDateString('es-CL'),
      fecha: new Date().toLocaleDateString('es-CL'),
      vendedor: datos.vendedor || null // NUEVO: Incluir vendedor
    };

    // NUEVO: Generar URL de WhatsApp con vendedor freelance
    const whatsappURL = generarWhatsAppURL(datos, cotizacion, datos.vendedor);

    // Enviar email de cotización (igual que original pero con info del vendedor)
    try {
      const emailHTML = generarEmailCotizacion(datos, cotizacion);
      
      const msg = {
        to: datos.correo,
        from: 'cotizaciones@prefabricadaspremium.cl',
        subject: `Cotización #${numeroCotizacion} - ${datos.modelo} - Prefabricadas Premium`,
        html: emailHTML
      };

      await sgMail.send(msg);
      console.log('✅ Email enviado correctamente');
      
    } catch (emailError) {
      console.error('⚠️ Error al enviar email:', emailError);
      // No fallar la operación si falla el email
    }

    // NUEVO: Registrar lead con información del vendedor
    const leadInfo = {
      numero_cotizacion: numeroCotizacion,
      cliente: {
        nombre: datos.nombre,
        email: datos.correo,
        telefono: datos.telefono
      },
      modelo: datos.modelo,
      vendedor_freelance: datos.vendedor ? {
        nombre: datos.vendedor.nombre,
        codigo: datos.vendedor.codigo,
        telefono: datos.vendedor.telefono
      } : null,
      fecha: new Date().toISOString(),
      tipo: 'freelance'
    };
    
    console.log('📊 Lead registrado:', leadInfo);

    // Respuesta exitosa
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

// Función para generar email HTML (copiada y adaptada del original)
function generarEmailCotizacion(datos, cotizacion) {
  const modelo = modelos[datos.modelo];
  const m2Total = modelo ? modelo.m2_utiles + modelo.m2_terraza + modelo.logia : 'N/A';
  
  let preciosHTML = '';
  
  if (cotizacion.precios.economica) {
    preciosHTML += `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #ddd;">
          <strong>🏠 Panel Madera (OSB)</strong><br>
          <small>Opción económica, excelente calidad-precio</small>
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #ddd; text-align: right;">
          <strong>$${cotizacion.precios.economica.clp.toLocaleString('es-CL')} + IVA</strong><br>
          <small>${cotizacion.precios.economica.uf} UF</small>
        </td>
      </tr>
    `;
  }
  
  if (cotizacion.precios.premium) {
    preciosHTML += `
      <tr style="background-color: #e8f5e8;">
        <td style="padding: 15px; border-bottom: 1px solid #ddd;">
          <strong>⭐ Panel Premium SIP (Volcanboard)</strong><br>
          <small>Máxima eficiencia energética con aislación incluida</small>
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #ddd; text-align: right;">
          <strong>$${cotizacion.precios.premium.clp.toLocaleString('es-CL')} + IVA</strong><br>
          <small>${cotizacion.precios.premium.uf} UF</small>
        </td>
      </tr>
    `;
  }
  
  if (cotizacion.precios.estructural) {
    preciosHTML += `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #ddd;">
          <strong>🔩 Panel Metalcon (Volcanboard)</strong><br>
          <small>Máxima resistencia sísmica con respaldo CINTAC</small>
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #ddd; text-align: right;">
          <strong>$${cotizacion.precios.estructural.clp.toLocaleString('es-CL')} + IVA</strong><br>
          <small>${cotizacion.precios.estructural.uf} UF</small>
        </td>
      </tr>
    `;
  }

  // NUEVO: Información del vendedor en el email
  let vendedorHTML = '';
  if (cotizacion.vendedor) {
    vendedorHTML = `
      <div style="background: linear-gradient(135deg, #e7f3ff 0%, #cce7ff 100%); padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #007bff;">
        <h3 style="color: #007bff; margin-bottom: 10px;">🤝 Tu Asesor Personal</h3>
        <p style="margin: 5px 0;"><strong>Nombre:</strong> ${cotizacion.vendedor.nombre}</p>
        <p style="margin: 5px 0;"><strong>Región:</strong> ${cotizacion.vendedor.region}</p>
        <p style="margin: 5px 0; color: #666;">
          ${cotizacion.vendedor.nombre} será tu contacto directo para todas las consultas sobre esta cotización.
        </p>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cotización Prefabricadas Premium</title>
    </head>
    <body style="font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="text-align: center; background: linear-gradient(135deg, #8B5A3C 0%, #A67C52 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 24px;">¡Tu Cotización Está Lista!</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Cotización #${cotizacion.numero}</p>
      </div>

      ${vendedorHTML}

      <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="color: #8B5A3C; margin-top: 0;">📋 Resumen de tu Solicitud</h3>
        <p><strong>Modelo:</strong> ${datos.modelo}</p>
        <p><strong>Superficie total:</strong> ${m2Total}m²</p>
        ${modelo ? `<p><strong>Dormitorios:</strong> ${modelo.dormitorios} | <strong>Baños:</strong> ${modelo.baños}</p>` : ''}
        <p><strong>Habitaciones necesarias:</strong> ${datos.habitaciones}</p>
        <p><strong>Sucursal cercana:</strong> ${datos.sucursal}</p>
      </div>

      <h3 style="color: #8B5A3C;">💰 Opciones de Precio</h3>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        ${preciosHTML}
      </table>

      <div style="background: #fff3cd; padding: 20px; border-radius: 10px; border-left: 4px solid #ffc107; margin: 20px 0;">
        <h4 style="color: #856404; margin-top: 0;">⚠️ Información Importante</h4>
        <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
          <li>Precios referenciales sujetos a aprobación final</li>
          <li>Vigencia: ${cotizacion.vigencia}</li>
          <li>Valor UF utilizado: $${cotizacion.uf.valor.toLocaleString('es-CL')} (${cotizacion.uf.fecha})</li>
          <li>Múltiples variantes disponibles para cada modelo</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${modelo ? `https://catalogo2025premium.netlify.app/${modelo.pdf}` : '#'}" 
           style="background: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; margin: 5px;">
          📄 Ver Planta PDF
        </a>
      </div>

      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 25px; border-radius: 10px; text-align: center; margin: 30px 0;">
        <h3 style="margin-top: 0;">🎉 ¡Siguiente Paso!</h3>
        <p style="margin: 10px 0;">
          ${cotizacion.vendedor ? 
            `Tu asesor ${cotizacion.vendedor.nombre} se contactará contigo para validar esta cotización y responder todas tus consultas.` :
            'Nuestro equipo se contactará contigo para validar esta cotización.'
          }
        </p>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; color: #666; font-size: 14px;">
        <p><strong>Prefabricadas Premium</strong></p>
        <p>Tu casa soñada, construida con la más alta calidad y eficiencia energética</p>
        <p>Email generado automáticamente • No responder a este correo</p>
      </div>

    </body>
    </html>
  `;
}