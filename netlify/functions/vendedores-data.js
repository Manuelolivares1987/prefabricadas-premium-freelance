// netlify/functions/vendedores-data.js
// Función para manejar vendedores freelance

// Base de datos de vendedores freelance
const vendedores = [
  {
    id: 1,
    nombre: "Veronica Carmona",
    telefono: "56993134696", // Formato: 56 + número sin espacios
    email: "veroc.aldunate@gmail.com",
    codigo: "VERO2025",
    activo: true,
    region: "Coquimbo",
    ciudad: "La Serena",
    fecha_registro: "2025-07-30"
  },

  // Agregar más vendedores según necesidad
];

exports.handler = async (event, context) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { httpMethod, queryStringParameters } = event;
    
    if (httpMethod === 'GET') {
      // Si se pide un vendedor específico por código
      if (queryStringParameters && queryStringParameters.codigo) {
        const codigo = queryStringParameters.codigo.toUpperCase().trim();
        
        console.log(`🔍 Buscando vendedor con código: ${codigo}`);
        
        // Buscar vendedor por código
        const vendedor = vendedores.find(v => 
          v.codigo.toUpperCase() === codigo && v.activo
        );
        
        if (vendedor) {
          console.log(`✅ Vendedor encontrado: ${vendedor.nombre}`);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              vendedor: {
                nombre: vendedor.nombre,
                telefono: vendedor.telefono,
                codigo: vendedor.codigo,
                region: vendedor.region,
                ciudad: vendedor.ciudad
              }
            })
          };
        } else {
          console.log(`❌ Vendedor no encontrado: ${codigo}`);
          
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Vendedor no encontrado o inactivo',
              codigo: codigo
            })
          };
        }
      } 
      
      // Si se piden todos los vendedores activos (para el panel)
      else {
        const vendedoresActivos = vendedores
          .filter(v => v.activo)
          .map(v => ({
            nombre: v.nombre,
            codigo: v.codigo,
            region: v.region,
            ciudad: v.ciudad
          }));
          
        console.log(`📋 Devolviendo ${vendedoresActivos.length} vendedores activos`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            vendedores: vendedoresActivos,
            total: vendedoresActivos.length
          })
        };
      }
    }
    
    // Método no permitido
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Método no permitido' 
      })
    };
    
  } catch (error) {
    console.error('❌ Error en vendedores-data:', error);
    
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