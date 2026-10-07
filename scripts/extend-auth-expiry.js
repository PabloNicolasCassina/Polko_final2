#!/usr/bin/env node
/**
 * Script para extender las fechas de expiración de las cookies en el archivo de autenticación
 * Esto hace que la autenticación dure de forma permanente (o al menos por muchos años)
 * 
 * Uso:
 *   node scripts/extend-auth-expiry.js
 *   o
 *   npm run auth:extend
 */

const fs = require('fs');
const path = require('path');

const authFile = path.join(__dirname, '..', '.auth', 'userPre.json');

if (!fs.existsSync(authFile)) {
  console.error('❌ Error: .auth/userPre.json no existe.');
  console.error('   Ejecuta primero: npm run auth');
  console.error('   Y completa el proceso de login manual.');
  process.exit(1);
}

try {
  // Leer el archivo de autenticación
  const content = fs.readFileSync(authFile, 'utf8');
  const authData = JSON.parse(content);

  // Calcular una fecha de expiración muy lejana (10 años desde ahora)
  const tenYearsFromNow = Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60);

  let cookiesUpdated = 0;

  // Actualizar todas las cookies con fechas de expiración
  if (authData.cookies && Array.isArray(authData.cookies)) {
    authData.cookies.forEach(cookie => {
      // Solo actualizar cookies que tienen una fecha de expiración válida
      // y que no están configuradas como session cookies (expires: -1)
      if (cookie.expires && cookie.expires !== -1) {
        cookie.expires = tenYearsFromNow;
        cookiesUpdated++;
      }
    });
  }

  // Guardar el archivo actualizado
  fs.writeFileSync(authFile, JSON.stringify(authData, null, 2), 'utf8');

  console.log(`\n✅ Archivo de autenticación actualizado exitosamente!`);
  console.log(`   ${cookiesUpdated} cookies actualizadas con expiración extendida (10 años)`);
  console.log(`   El archivo ahora debería durar hasta aproximadamente ${new Date(tenYearsFromNow * 1000).toLocaleDateString('es-ES')}\n`);
} catch (error) {
  console.error('❌ Error al procesar el archivo de autenticación:', error.message);
  process.exit(1);
}


