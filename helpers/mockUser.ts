import * as fs from 'fs';


export let mockUserDataString: string; // Exportada para tests.spec.ts
try {
    // La ruta original del mock. Ajustar si es necesario dependiendo de la estructura final del proyecto.
    mockUserDataString = fs.readFileSync('C:\\Polko\\Polko_Final\\mocks\\mockUserDataATM.json', 'utf-8');
    console.log(`DEBUG (test-helpers): Mock leído (primeros 100 chars): ${mockUserDataString.substring(0, 100)}`);
    // Opcional: Validar si es JSON válido
    JSON.parse(mockUserDataString);
    console.log('DEBUG (test-helpers): El contenido del Mock es JSON válido.');
} catch (error) {
    console.error(`ERROR (test-helpers): No se pudo leer o parsear el archivo mock en 'C:\\Polko\\Polko_tests\\mocks\\mockUserDataATM.json'`, error);
    // Decide si fallar el test o continuar sin mock
    // Por ahora, asignamos un string vacío para evitar errores posteriores, pero el mock no funcionará.
    mockUserDataString = '{}';
    // O podrías lanzar el error para detener la ejecución:
    // throw new Error(`Failed to load mock data from ${mockFilePath}`);
}