#!/usr/bin/env node
/**
 * Script para generar el base64 del estado de autenticación
 * Útil para configurar la variable AUTH_STATE_BASE64 en GitLab CI/CD
 * 
 * Uso:
 *   node scripts/generate-auth-base64.js
 *   o
 *   npm run auth:encode
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
  const content = fs.readFileSync(authFile);
  const base64 = Buffer.from(content).toString('base64');
  
  console.log('\n✅ Estado de autenticación codificado en base64:\n');
  console.log(base64);
  console.log('\n📋 Instrucciones:');
  console.log('1. Copia el texto de arriba (todo el base64)');
  console.log('2. Ve a GitLab: Settings > CI/CD > Variables');
  console.log('3. Crea una nueva variable:');
  console.log('   - Key: AUTH_STATE_BASE64');
  console.log('   - Value: (pega el base64 copiado)');
  console.log('   - Type: Variable');
  console.log('   - Protected: ✅ (recomendado)');
  console.log('   - Masked: ❌ (no puede estar enmascarado)\n');
} catch (error) {
  console.error('❌ Error al leer el archivo de autenticación:', error.message);
  process.exit(1);
}


