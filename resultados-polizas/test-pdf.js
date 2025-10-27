const fs = require('fs');
const pdfParser = require('pdf-parse'); // Renombramos la variable para evitar confusión

// --- ¡NUEVAS LÍNEAS DE DEBUG! ---
console.log('--- DEBUG pdf-parse ---');
console.log('Tipo de pdfParser:', typeof pdfParser); // ¿Es 'function' u 'object'?
console.log('Contenido de pdfParser:', pdfParser); // ¿Qué tiene adentro?
console.log('-----------------------');
// --- FIN DEBUG ---

async function testParse() {
  try {
    // Asegúrate que 'test.pdf' sea la ruta correcta a tu PDF descargado
    const dataBuffer = fs.readFileSync('póliza.pdf'); 
    
    // --- Intentamos llamar a la variable ---
    // Si el log dice que es una función, esta línea debería funcionar.
    // Si dice que es un objeto, esta línea fallará de nuevo.
    const data = await pdfParser(dataBuffer); 
    // --- Fin del intento ---
    
    console.log('¡Parseo exitoso!');
    
    // El resto de tu código para buscar el Total
    const regex = /Total\s*\$\s*([\d.,]+)/im; 
    const match = data.text.match(regex);
    if (match && match[1]) {
        console.log('Total encontrado:', match[1].trim());
    } else {
        console.log('Total NO encontrado con el Regex.');
        console.log(`TEXTO (primeras 500 líneas): ${data.text.substring(0, 500)}`);
    }
  } catch (error) {
    console.error('Error parseando manualmente:', error);
  }
}

testParse();