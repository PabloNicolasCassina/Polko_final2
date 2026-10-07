/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';

export type UserType = 'master' | 'organic' | 'polkista' | 'masterPromo' | 'promo';

const mockFiles: Record<UserType, string> = {
    'master': 'mockUserDataATM.json',
    'organic': 'mockUserOrganic.json',
    'polkista': 'mockUserPolkista.json',
    'masterPromo': 'mockUserMasterPromo.json',
    'promo': 'mockUserDataPromo.json'
};

export let mockUserDataString: string; // Exportada para tests.spec.ts (default: master)
try {
    // La ruta original del mock. Ajustar si es necesario dependiendo de la estructura final del proyecto.
    const mockFilePath = path.join(__dirname, '..', 'mocks', 'mockUserDataATM.json');
    mockUserDataString = fs.readFileSync(mockFilePath, 'utf-8');
    console.log(`DEBUG (test-helpers): Mock leído (primeros 100 chars): ${mockUserDataString.substring(0, 100)}`);
    // Opcional: Validar si es JSON válido
    JSON.parse(mockUserDataString);
    console.log('DEBUG (test-helpers): El contenido del Mock es JSON válido.');
} catch (error) {
    const mockFilePath = path.join(__dirname, '..', 'mocks', 'mockUserDataATM.json');
    console.error(`ERROR (test-helpers): No se pudo leer o parsear el archivo mock en '${mockFilePath}'`, error);
    // Decide si fallar el test o continuar sin mock
    // Por ahora, asignamos un string vacío para evitar errores posteriores, pero el mock no funcionará.
    mockUserDataString = '{}';
    // O podrías lanzar el error para detener la ejecución:
    // throw new Error(`Failed to load mock data from ${mockFilePath}`);
}

/**
 * Obtiene el mock de datos de usuario según el tipo especificado
 * @param userType - Tipo de usuario: 'master', 'organic', 'polkista', 'masterPromo' o 'promo'
 * @returns String JSON con los datos del usuario mock
 */
export function getMockUserData(userType: UserType = 'master'): string {
    try {
        const fileName = mockFiles[userType];
        if (!fileName) {
            console.warn(`Tipo de usuario desconocido: ${userType}. Usando mock por defecto (master).`);
            return mockUserDataString;
        }
        
        const mockFilePath = path.join(__dirname, '..', 'mocks', fileName);
        const mockData = fs.readFileSync(mockFilePath, 'utf-8');
        
        // Validar que es JSON válido
        JSON.parse(mockData);
        console.log(`DEBUG (test-helpers): Mock cargado para tipo '${userType}' desde ${fileName}`);
        
        return mockData;
    } catch (error) {
        console.error(`ERROR (test-helpers): No se pudo leer el mock para tipo '${userType}':`, error);
        // Fallback al mock por defecto
        return mockUserDataString;
    }
}

/**
 * Promo mock + códigos de aseguradoras del master (ATM).
 * `mockUserDataPromo.json` solo trae TerraWind; FedPat necesita códigos del ATM mock.
 */
export function getFedPatPromoMockUserData(): string {
    const atm = JSON.parse(getMockUserData('master'));
    const promo = JSON.parse(getMockUserData('promo'));
    return JSON.stringify({
        ...promo,
        aseguradoras: { ...atm.aseguradoras, ...promo.aseguradoras },
        aseguradoras_promocionables: promo.aseguradoras_promocionables ?? [],
    });
}
