#!/usr/bin/env node

// setup.js - Script de configuración rápida para Prefabricadas Premium Freelance
// Ejecutar con: node setup.js

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
🏠 ================================
   PREFABRICADAS PREMIUM FREELANCE
   Configuración Rápida
================================

Este script te ayudará a configurar tu plataforma de vendedores freelance.
`);

async function pregunta(texto) {
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      resolve(respuesta.trim());
    });
  });
}

async function configurarVendedores() {
  console.log('\n👥 CONFIGURACIÓN DE VENDEDORES FREELANCE\n');
  
  const vendedores = [];
  let agregarMas = true;
  let id = 1;
  
  while (agregarMas) {
    console.log(`\n--- Vendedor #${id} ---`);
    
    const nombre = await pregunta('Nombre completo del vendedor: ');
    const telefono = await pregunta('Teléfono (formato: 56912345678): ');
    const email = await pregunta('Email: ');
    const codigo = await pregunta('Código único (ej: JUAN2024): ');
    const region = await pregunta('Región: ');
    const ciudad = await pregunta('Ciudad: ');
    
    vendedores.push({
      id: id,
      nombre: nombre,
      telefono: telefono,
      email: email,
      codigo: codigo.toUpperCase(),
      activo: true,
      region: region,
      ciudad: ciudad,
      fecha_registro: new Date().toISOString().split('T')[0]
    });
    
    const continuar = await pregunta('\n¿Agregar otro vendedor? (s/n): ');
    agregarMas = continuar.toLowerCase() === 's' || continuar.toLowerCase() === 'si';
    id++;
  }
  
  return vendedores;
}

async function generarArchivoVendedores(vendedores) {
  const contenido = `// netlify/functions/vendedores-data.js
// Base de datos de vendedores freelance - Generado automáticamente

// Base de datos de vendedores freelance
const vendedores = ${JSON.stringify(vendedores, null, 2)};

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
        
        console.log(\`🔍 Buscando vendedor con código: \${codigo}\`);
        
        // Buscar vendedor por código
        const vendedor = vendedores.find(v => 
          v.codigo.toUpperCase() === codigo && v.activo
        );
        
        if (vendedor) {
          console.log(\`✅ Vendedor encontrado: \${vendedor.nombre}\`);
          
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
          console.log(\`❌ Vendedor no encontrado: \${codigo}\`);
          
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
          
        console.log(\`📋 Devolviendo \${vendedoresActivos.length} vendedores activos\`);
        
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
};`;

  // Crear directorio si no existe
  const dir = path.join(process.cwd(), 'netlify', 'functions');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Escribir archivo
  const archivo = path.join(dir, 'vendedores-data.js');
  fs.writeFileSync(archivo, contenido);
  
  console.log(`\n✅ Archivo generado: ${archivo}`);
}

async function mostrarResumen(vendedores) {
  console.log('\n🎉 CONFIGURACIÓN COMPLETADA\n');
  console.log('📋 VENDEDORES CONFIGURADOS:');
  console.log('================================');
  
  vendedores.forEach((v, index) => {
    console.log(`${index + 1}. ${v.nombre}`);
    console.log(`   Código: ${v.codigo}`);
    console.log(`   Teléfono: ${v.telefono}`);
    console.log(`   Región: ${v.region} - ${v.ciudad}`);
    console.log('   ---');
  });
  
  console.log('\n🔗 ENLACES DE EJEMPLO:');
  console.log('================================');
  vendedores.forEach(v => {
    console.log(`${v.nombre}: https://tudominio.com?ref=${v.codigo}`);
  });
  
  console.log('\n📋 PRÓXIMOS PASOS:');
  console.log('================================');
  console.log('1. ✅ Archivo vendedores-data.js generado');
  console.log('2. 📁 Copia los assets del proyecto original (imágenes, PDFs, etc.)');
  console.log('3. 🌐 Despliega en Netlify');
  console.log('4. 🔑 Configura SENDGRID_API_KEY en variables de entorno');
  console.log('5. 🚀 ¡Tu plataforma freelance estará lista!');
  
  console.log('\n💡 PARA AGREGAR MÁS VENDEDORES:');
  console.log('Edita: netlify/functions/vendedores-data.js');
  
  console.log('\n📖 DOCUMENTACIÓN COMPLETA:');
  console.log('Ver README.md para instrucciones detalladas');
}

async function main() {
  try {
    const vendedores = await configurarVendedores();
    
    if (vendedores.length === 0) {
      console.log('\n⚠️ No se configuraron vendedores. Saliendo...');
      return;
    }
    
    await generarArchivoVendedores(vendedores);
    await mostrarResumen(vendedores);
    
  } catch (error) {
    console.error('\n❌ Error durante la configuración:', error.message);
  } finally {
    rl.close();
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { configurarVendedores, generarArchivoVendedores };