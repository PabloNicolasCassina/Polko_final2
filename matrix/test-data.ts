// test-data.ts
import * as path from 'path';

// Definir la raíz del proyecto de forma más robusta
// Ajusta según tu estructura. Si 'tests.spec.ts' está en 'C:\Polko\Polko_tests\tests\tests.spec.ts'
// y 'JSONS' está en 'C:\Polko\Polko_tests\JSONS'
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..'); // Sube dos niveles desde 'tests/test-data.ts'
export const JSON_DATA_DIR = path.resolve(PROJECT_ROOT, 'JSONS');
export const MOCKS_DIR = path.resolve(PROJECT_ROOT, 'mocks');
// La ruta al script de Python, si la quieres centralizar aquí también
export const PYTHON_SCRIPT_PATH = path.resolve(PROJECT_ROOT, 'activarCompania.py'); // Asumiendo que está en la raíz del proyecto
export const SCREENSHOTS_DIR = path.resolve(PROJECT_ROOT, 'Screenshots');


// Define el tipo para los objetos de la matriz de prueba para mayor claridad
export interface TestConfig {
    company: string;
    vehicleType: 'Auto' | 'Moto';
    modelDesc: string;
    jsonFile: string; // Ruta relativa dentro de JSON_DATA_DIR/auto o JSON_DATA_DIR/moto
    params: boolean;
    // No almacenamos la función aquí para evitar dependencias complejas
    // La lógica de cuál función llamar (emisionAuto/emisionMoto) estará en el spec.
}

export interface TestConfigHogar {
    tipo_vivienda: string;
    tamaño_vivienda: string;
    jsonFile: string;
    params: boolean;
    caso: string;
}

export interface TestConfigAP {
    vigencia: string;
    actividad: string;
    clasificacion: string;
    tarea: string;
    caso: string;
    jsonFile: string;
}

// Matriz de configuración de pruebas
export const testMatrix: TestConfig[] = [
    // Zurich - Auto
    { company: "zurich", vehicleType: "Auto", modelDesc: "Logan 2022", jsonFile: "auto/autoLogan2022.json", params: false },
    { company: "zurich", vehicleType: "Auto", modelDesc: "Logan 2022", jsonFile: "auto/autoLogan2022Param.json", params: true },
    { company: "zurich", vehicleType: "Auto", modelDesc: "Clio 2008", jsonFile: "auto/autoClio2008.json", params: false },
    { company: "zurich", vehicleType: "Auto", modelDesc: "Clio 2008", jsonFile: "auto/autoClio2008Param.json", params: true },
    { company: "zurich", vehicleType: "Auto", modelDesc: "Logan 2025", jsonFile: "auto/autoLogan2025.json", params: false },
    { company: "zurich", vehicleType: "Auto", modelDesc: "Logan 2025", jsonFile: "auto/autoLogan2025Param.json", params: true },
    { company: "zurich", vehicleType: "Auto", modelDesc: "Hilux 2025", jsonFile: "auto/autoHilux2025.json", params: false },
    { company: "zurich", vehicleType: "Auto", modelDesc: "Hilux 2025", jsonFile: "auto/autoHilux2025Param.json", params: true },

    // Sancor - Auto
    { company: "sancor", vehicleType: "Auto", modelDesc: "Logan 2022", jsonFile: "auto/autoLogan2022.json", params: false },
    { company: "sancor", vehicleType: "Auto", modelDesc: "Logan 2022", jsonFile: "auto/autoLogan2022Param.json", params: true },
    { company: "sancor", vehicleType: "Auto", modelDesc: "Clio 2008", jsonFile: "auto/autoClio2008.json", params: false },
    { company: "sancor", vehicleType: "Auto", modelDesc: "Clio 2008", jsonFile: "auto/autoClio2008Param.json", params: true },
    { company: "sancor", vehicleType: "Auto", modelDesc: "Logan 2025", jsonFile: "auto/autoLogan2025.json", params: false },
    { company: "sancor", vehicleType: "Auto", modelDesc: "Logan 2025", jsonFile: "auto/autoLogan2025Param.json", params: true },
    { company: "sancor", vehicleType: "Auto", modelDesc: "Hilux 2025", jsonFile: "auto/autoHilux2025.json", params: false }, // Asumo que es Hilux y no "Hilux sin Parametros" en modelDesc
    { company: "sancor", vehicleType: "Auto", modelDesc: "Hilux 2025", jsonFile: "auto/autoHilux2025Param.json", params: true },
    // Sancor - Moto
    { company: "sancor", vehicleType: "Moto", modelDesc: "Benelli 2022", jsonFile: "moto/motoBenelli2022.json", params: false },
    { company: "sancor", vehicleType: "Moto", modelDesc: "Benelli 2022", jsonFile: "moto/motoBenelli2022Param.json", params: true },
    { company: "sancor", vehicleType: "Moto", modelDesc: "Gilera 2008", jsonFile: "moto/motoGilera2008.json", params: false },
    { company: "sancor", vehicleType: "Moto", modelDesc: "Gilera 2008", jsonFile: "moto/motoGilera2008Param.json", params: true },
    { company: "sancor", vehicleType: "Moto", modelDesc: "Benelli 2025", jsonFile: "moto/motoBenelli2025.json", params: false },
    { company: "sancor", vehicleType: "Moto", modelDesc: "Benelli 2025", jsonFile: "moto/motoBenelli2025Param.json", params: true },

    // RUS - Auto
    { company: "rus", vehicleType: "Auto", modelDesc: "Logan 2022", jsonFile: "auto/autoLogan2022.json", params: false },
    { company: "rus", vehicleType: "Auto", modelDesc: "Logan 2022", jsonFile: "auto/autoLogan2022Param.json", params: true },
    { company: "rus", vehicleType: "Auto", modelDesc: "Clio 2008", jsonFile: "auto/autoClio2008.json", params: false },
    { company: "rus", vehicleType: "Auto", modelDesc: "Clio 2008", jsonFile: "auto/autoClio2008Param.json", params: true },
    { company: "rus", vehicleType: "Auto", modelDesc: "Logan 2025", jsonFile: "auto/autoLogan2025.json", params: false },
    { company: "rus", vehicleType: "Auto", modelDesc: "Logan 2025", jsonFile: "auto/autoLogan2025Param.json", params: true },
    { company: "rus", vehicleType: "Auto", modelDesc: "Hilux 2025", jsonFile: "auto/autoHilux2025.json", params: false },
    { company: "rus", vehicleType: "Auto", modelDesc: "Hilux 2025", jsonFile: "auto/autoHilux2025Param.json", params: true },
    // RUS - Moto
    { company: "rus", vehicleType: "Moto", modelDesc: "Benelli 2022", jsonFile: "moto/motoBenelli2022.json", params: false },
    { company: "rus", vehicleType: "Moto", modelDesc: "Benelli 2022", jsonFile: "moto/motoBenelli2022Param.json", params: true },
    { company: "rus", vehicleType: "Moto", modelDesc: "Gilera 2008", jsonFile: "moto/motoGilera2008.json", params: false },
    { company: "rus", vehicleType: "Moto", modelDesc: "Gilera 2008", jsonFile: "moto/motoGilera2008Param.json", params: true },
    { company: "rus", vehicleType: "Moto", modelDesc: "Benelli 2025", jsonFile: "moto/motoBenelli2025.json", params: false },
    { company: "rus", vehicleType: "Moto", modelDesc: "Benelli 2025", jsonFile: "moto/motoBenelli2025Param.json", params: true },

    // Federacion Patronal - Auto
    { company: "federacion_patronal", vehicleType: "Auto", modelDesc: "Logan 2022", jsonFile: "auto/autoLogan2022.json", params: false },
    { company: "federacion_patronal", vehicleType: "Auto", modelDesc: "Logan 2022", jsonFile: "auto/autoLogan2022Param.json", params: true },
    { company: "federacion_patronal", vehicleType: "Auto", modelDesc: "Clio 2008", jsonFile: "auto/autoClio2008.json", params: false },
    { company: "federacion_patronal", vehicleType: "Auto", modelDesc: "Clio 2008", jsonFile: "auto/autoClio2008Param.json", params: true },
    { company: "federacion_patronal", vehicleType: "Auto", modelDesc: "Logan 2025", jsonFile: "auto/autoLogan2025.json", params: false },
    { company: "federacion_patronal", vehicleType: "Auto", modelDesc: "Logan 2025", jsonFile: "auto/autoLogan2025Param.json", params: true },
    { company: "federacion_patronal", vehicleType: "Auto", modelDesc: "Hilux 2025", jsonFile: "auto/autoHilux2025.json", params: false },
    { company: "federacion_patronal", vehicleType: "Auto", modelDesc: "Hilux 2025", jsonFile: "auto/autoHilux2025Param.json", params: true },

    // Rivadavia - Auto
    { company: "rivadavia", vehicleType: "Auto", modelDesc: "Logan 2022", jsonFile: "auto/autoLogan2022.json", params: false },
    { company: "rivadavia", vehicleType: "Auto", modelDesc: "Logan 2022", jsonFile: "auto/autoLogan2022Param.json", params: true },
    { company: "rivadavia", vehicleType: "Auto", modelDesc: "Clio 2008", jsonFile: "auto/autoClio2008.json", params: false },
    { company: "rivadavia", vehicleType: "Auto", modelDesc: "Clio 2008", jsonFile: "auto/autoClio2008Param.json", params: true },
    { company: "rivadavia", vehicleType: "Auto", modelDesc: "Logan 2025", jsonFile: "auto/autoLogan2025.json", params: false },
    { company: "rivadavia", vehicleType: "Auto", modelDesc: "Logan 2025", jsonFile: "auto/autoLogan2025Param.json", params: true },
    { company: "rivadavia", vehicleType: "Auto", modelDesc: "Hilux 2025", jsonFile: "auto/autoHilux2025.json", params: false },
    { company: "rivadavia", vehicleType: "Auto", modelDesc: "Hilux 2025", jsonFile: "auto/autoHilux2025Param.json", params: true },
    // Rivadavia - Moto
    { company: "rivadavia", vehicleType: "Moto", modelDesc: "Benelli 2022", jsonFile: "moto/motoBenelli2022.json", params: false },
    { company: "rivadavia", vehicleType: "Moto", modelDesc: "Benelli 2022", jsonFile: "moto/motoBenelli2022Param.json", params: true },
    { company: "rivadavia", vehicleType: "Moto", modelDesc: "Gilera 2008", jsonFile: "moto/motoGilera2008.json", params: false },
    { company: "rivadavia", vehicleType: "Moto", modelDesc: "Gilera 2008", jsonFile: "moto/motoGilera2008Param.json", params: true },
    { company: "rivadavia", vehicleType: "Moto", modelDesc: "Benelli 2025", jsonFile: "moto/motoBenelli2025.json", params: false },
    { company: "rivadavia", vehicleType: "Moto", modelDesc: "Benelli 2025", jsonFile: "moto/motoBenelli2025Param.json", params: true },

    // ATM - Auto
    { company: "atm", vehicleType: "Auto", modelDesc: "Logan 2022", jsonFile: "auto/autoLogan2022.json", params: false },
    { company: "atm", vehicleType: "Auto", modelDesc: "Logan 2022", jsonFile: "auto/autoLogan2022Param.json", params: true },
    { company: "atm", vehicleType: "Auto", modelDesc: "Clio 2008", jsonFile: "auto/autoClio2008.json", params: false },
    { company: "atm", vehicleType: "Auto", modelDesc: "Clio 2008", jsonFile: "auto/autoClio2008Param.json", params: true },
    { company: "atm", vehicleType: "Auto", modelDesc: "Logan 2025", jsonFile: "auto/autoLogan2025.json", params: false },
    { company: "atm", vehicleType: "Auto", modelDesc: "Logan 2025", jsonFile: "auto/autoLogan2025Param.json", params: true },
    { company: "atm", vehicleType: "Auto", modelDesc: "Hilux 2025", jsonFile: "auto/autoHilux2025.json", params: false },
    { company: "atm", vehicleType: "Auto", modelDesc: "Hilux 2025", jsonFile: "auto/autoHilux2025Param.json", params: true },
    // ATM - Moto
    { company: "atm", vehicleType: "Moto", modelDesc: "Benelli 2022", jsonFile: "moto/motoBenelli2022.json", params: false },
    { company: "atm", vehicleType: "Moto", modelDesc: "Benelli 2022", jsonFile: "moto/motoBenelli2022Param.json", params: true },
    { company: "atm", vehicleType: "Moto", modelDesc: "Gilera 2008", jsonFile: "moto/motoGilera2008.json", params: false },
    { company: "atm", vehicleType: "Moto", modelDesc: "Gilera 2008", jsonFile: "moto/motoGilera2008Param.json", params: true },
    { company: "atm", vehicleType: "Moto", modelDesc: "Benelli 2025", jsonFile: "moto/motoBenelli2025.json", params: false },
    { company: "atm", vehicleType: "Moto", modelDesc: "Benelli 2025", jsonFile: "moto/motoBenelli2025Param.json", params: true },

    // Aquí puedes agregar los tests de "Experta" si los descomentas en el futuro
];

export const testMatrixHogar: TestConfigHogar[] = [
    { tipo_vivienda: "Casa", tamaño_vivienda: "Pequeña", jsonFile: "hogar/hogar.json", params: false, caso: "casa pequeña" },
    { tipo_vivienda: "Casa", tamaño_vivienda: "Pequeña", jsonFile: "hogar/hogarParam.json", params: true, caso: "casa pequeña PARAM" },
    { tipo_vivienda: "Casa", tamaño_vivienda: "Mediana", jsonFile: "hogar/hogar.json", params: false, caso: "casa mediana"},
    { tipo_vivienda: "Casa", tamaño_vivienda: "Mediana", jsonFile: "hogar/hogarParam.json", params: true, caso: "casa mediana PARAM"},
    { tipo_vivienda: "Casa", tamaño_vivienda: "Grande", jsonFile: "hogar/hogar.json", params: false, caso: "casa grande" },
    { tipo_vivienda: "Casa", tamaño_vivienda: "Grande", jsonFile: "hogar/hogarParam.json", params: true, caso: "casa grande PARAM" },
    { tipo_vivienda: "Departamento", tamaño_vivienda: "Pequeña", jsonFile: "hogar/hogar.json", params: false, caso: "departamento pequeño" },
    { tipo_vivienda: "Departamento", tamaño_vivienda: "Pequeña", jsonFile: "hogar/hogarParam.json", params: true, caso: "departamento pequeño PARAM" },
    { tipo_vivienda: "Departamento", tamaño_vivienda: "Mediana", jsonFile: "hogar/hogar.json", params: false, caso: "departamento mediano" },
    { tipo_vivienda: "Departamento", tamaño_vivienda: "Mediana", jsonFile: "hogar/hogarParam.json", params: true, caso: "departamento mediano PARAM" },
    { tipo_vivienda: "Departamento", tamaño_vivienda: "Grande", jsonFile: "hogar/hogar.json", params: false, caso: "departamento grande" },
    { tipo_vivienda: "Departamento", tamaño_vivienda: "Grande", jsonFile: "hogar/hogarParam.json", params: true, caso: "departamento grande PARAM" },
    { tipo_vivienda: "Vivienda en barrio cerrado", tamaño_vivienda: "Pequeña", jsonFile: "hogar/hogar.json", params: true, caso: "vivienda en barrio cerrado pequeña" },
    { tipo_vivienda: "Vivienda en barrio cerrado", tamaño_vivienda: "Pequeña", jsonFile: "hogar/hogarParam.json", params: true, caso: "vivienda en barrio cerrado pequeña PARAM" },
    { tipo_vivienda: "Vivienda en barrio cerrado", tamaño_vivienda: "Mediana", jsonFile: "hogar/hogar.json", params: false, caso: "vivienda en barrio cerrado mediana" },
    { tipo_vivienda: "Vivienda en barrio cerrado", tamaño_vivienda: "Mediana", jsonFile: "hogar/hogarParam.json", params: true , caso: "vivienda en barrio cerrado mediana PARAM"},
    { tipo_vivienda: "Vivienda en barrio cerrado", tamaño_vivienda: "Grande", jsonFile: "hogar/hogar.json", params: false, caso: "vivienda en barrio cerrado grande" },
    { tipo_vivienda: "Vivienda en barrio cerrado", tamaño_vivienda: "Grande", jsonFile: "hogar/hogarParam.json", params: true, caso: "vivienda en barrio cerrado grande PARAM" },
];

export const testMatrixAP: TestConfigAP[] = [
    { vigencia: "Por día", actividad: "Agropecuaria, Ganadería, Silvicultura", clasificacion: "Fumigación, aspersión y pulverización de agentes perjudiciales para los cultivos", tarea: "Terrestre con mochila", caso: "Terrestre con mochila por día", jsonFile: "AP/AP.json" },
    { vigencia: "Por día", actividad: "Industria Manufacturera", clasificacion: "Fabricación y embotellado de bebidas", tarea: "Operario con herramientas cortantes", caso: "Operario con herramientas cortantes por día", jsonFile: "AP/AP.json" },
    { vigencia: "Por día", actividad: "Electricidad, Gas y Agua", clasificacion: "Generación, distribución y transmisión de electricidad", tarea: "Más de 15 metros de altura, respetando las medidas de seguridad exigibles por ley para la actividad", caso: "Electricista por día", jsonFile: "AP/AP.json" },
    { vigencia: "Por día", actividad: "Construcción", clasificacion: "Construcción (albañiles, capataces)", tarea: "Hasta 15 metros de altura", caso: "Albañil por día", jsonFile: "AP/AP.json" },
    { vigencia: "Por día", actividad: "Comercios, Restaurantes y Hoteles", clasificacion: "Actividades Vinculadas a Restaurantes", tarea: "Mozo", caso: "Mozo por día", jsonFile: "AP/AP.json" },
    { vigencia: "Por día", actividad: "Transporte, Almacenamiento y Comunicaciones", clasificacion: "Transporte urbano, suburbano e interurbano de pasajeros (incluye subterráneos).", tarea: "Chofer sin mantenimiento de vehículos", caso: "Chofer por día", jsonFile: "AP/AP.json" },
    { vigencia: "Por día", actividad: "Establecimientos Financieros, Seguros y Servicios Tecnicos", clasificacion: "Servicios Financieros y Seguros", tarea: "Administrativo", caso: "Administrativo por día", jsonFile: "AP/AP.json" },
    { vigencia: "Por día", actividad: "Servicios Comunales, Sociales y Personales", clasificacion: "Servicios personal doméstico", tarea: "Mucama", caso: "Mucama por día", jsonFile: "AP/AP.json" },
    //-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    { vigencia: "+30 días", actividad: "Agropecuaria, Ganadería, Silvicultura", clasificacion: "Fumigación, aspersión y pulverización de agentes perjudiciales para los cultivos", tarea: "Terrestre con mochila", caso: "Terrestre con mochila 30 días", jsonFile: "AP/AP.json" },
    { vigencia: "+30 días", actividad: "Industria Manufacturera", clasificacion: "Fabricación y embotellado de bebidas", tarea: "Operario con herramientas cortantes", caso: "Operario con herramientas cortantes por día", jsonFile: "AP/AP.json" },
    { vigencia: "+30 días", actividad: "Electricidad, Gas y Agua", clasificacion: "Generación, distribución y transmisión de electricidad", tarea: "Más de 15 metros de altura, respetando las medidas de seguridad exigibles por ley para la actividad", caso: "Electricista 30 días", jsonFile: "AP/AP.json" },
    { vigencia: "+30 días", actividad: "Construcción", clasificacion: "Construcción (albañiles, capataces)", tarea: "Hasta 15 metros de altura", caso: "Albañil 30 días", jsonFile: "AP/AP.json" },
    { vigencia: "+30 días", actividad: "Comercios, Restaurantes y Hoteles", clasificacion: "Actividades Vinculadas a Restaurantes", tarea: "Mozo", caso: "Mozo 30 días", jsonFile: "AP/AP.json" },
    { vigencia: "+30 días", actividad: "Transporte, Almacenamiento y Comunicaciones", clasificacion: "Transporte urbano, suburbano e interurbano de pasajeros (incluye subterráneos).", tarea: "Chofer sin mantenimiento de vehículos", caso: "Chofer 30 días", jsonFile: "AP/AP.json" },
    { vigencia: "+30 días", actividad: "Establecimientos Financieros, Seguros y Servicios Tecnicos", clasificacion: "Servicios Financieros y Seguros", tarea: "Administrativo", caso: "Administrativo 30 días", jsonFile: "AP/AP.json" },
    { vigencia: "+30 días", actividad: "Servicios Comunales, Sociales y Personales", clasificacion: "Servicios personal doméstico", tarea: "Mucama", caso: "Mucama 30 días", jsonFile: "AP/AP.json" },

    //----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    { vigencia: "Por día", actividad: "Agropecuaria, Ganadería, Silvicultura", clasificacion: "Fumigación, aspersión y pulverización de agentes perjudiciales para los cultivos", tarea: "Terrestre con mochila", caso: "Terrestre con mochila por día PARAM", jsonFile: "AP/APParam.json" },
    { vigencia: "Por día", actividad: "Industria Manufacturera", clasificacion: "Fabricación y embotellado de bebidas", tarea: "Operario con herramientas cortantes", caso: "Operario con herramientas cortantes por día PARAM", jsonFile: "AP/APParam.json" },
    { vigencia: "Por día", actividad: "Electricidad, Gas y Agua", clasificacion: "Generación, distribución y transmisión de electricidad", tarea: "Más de 15 metros de altura, respetando las medidas de seguridad exigibles por ley para la actividad", caso: "Electricista por día PARAM", jsonFile: "AP/APParam.json" },
    { vigencia: "Por día", actividad: "Construcción", clasificacion: "Construcción (albañiles, capataces)", tarea: "Hasta 15 metros de altura", caso: "Albañil por día PARAM", jsonFile: "AP/APParam.json" },
    { vigencia: "Por día", actividad: "Comercios, Restaurantes y Hoteles", clasificacion: "Actividades Vinculadas a Restaurantes", tarea: "Mozo", caso: "Mozo por día PARAM", jsonFile: "AP/APParam.json" },
    { vigencia: "Por día", actividad: "Transporte, Almacenamiento y Comunicaciones", clasificacion: "Transporte urbano, suburbano e interurbano de pasajeros (incluye subterráneos).", tarea: "Chofer sin mantenimiento de vehículos", caso: "Chofer por día PARAM", jsonFile: "AP/APParam.json" },
    { vigencia: "Por día", actividad: "Establecimientos Financieros, Seguros y Servicios Tecnicos", clasificacion: "Servicios Financieros y Seguros", tarea: "Administrativo", caso: "Administrativo por día PARAM", jsonFile: "AP/APParam.json" },
    { vigencia: "Por día", actividad: "Servicios Comunales, Sociales y Personales", clasificacion: "Servicios personal doméstico", tarea: "Mucama", caso: "Mucama por día PARAM", jsonFile: "AP/APParam.json" },
    //-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    { vigencia: "+30 días", actividad: "Agropecuaria, Ganadería, Silvicultura", clasificacion: "Fumigación, aspersión y pulverización de agentes perjudiciales para los cultivos", tarea: "Terrestre con mochila", caso: "Terrestre con mochila 30 días PARAM", jsonFile: "AP/APParam.json" },
    { vigencia: "+30 días", actividad: "Industria Manufacturera", clasificacion: "Fabricación y embotellado de bebidas", tarea: "Operario con herramientas cortantes", caso: "Operario con herramientas cortantes por día PARAM", jsonFile: "AP/APParam.json" },
    { vigencia: "+30 días", actividad: "Electricidad, Gas y Agua", clasificacion: "Generación, distribución y transmisión de electricidad", tarea: "Más de 15 metros de altura, respetando las medidas de seguridad exigibles por ley para la actividad", caso: "Electricista 30 días PARAM", jsonFile: "AP/APParam.json" },
    { vigencia: "+30 días", actividad: "Construcción", clasificacion: "Construcción (albañiles, capataces)", tarea: "Hasta 15 metros de altura", caso: "Albañil 30 días PARAM", jsonFile: "AP/APParam.json" },
    { vigencia: "+30 días", actividad: "Comercios, Restaurantes y Hoteles", clasificacion: "Actividades Vinculadas a Restaurantes", tarea: "Mozo", caso: "Mozo 30 días PARAM", jsonFile: "AP/APParam.json" },
    { vigencia: "+30 días", actividad: "Transporte, Almacenamiento y Comunicaciones", clasificacion: "Transporte urbano, suburbano e interurbano de pasajeros (incluye subterráneos).", tarea: "Chofer sin mantenimiento de vehículos", caso: "Chofer 30 días PARAM", jsonFile: "AP/APParam.json" },
    { vigencia: "+30 días", actividad: "Establecimientos Financieros, Seguros y Servicios Tecnicos", clasificacion: "Servicios Financieros y Seguros", tarea: "Administrativo", caso: "Administrativo 30 días PARAM", jsonFile: "AP/APParam.json" },
    { vigencia: "+30 días", actividad: "Servicios Comunales, Sociales y Personales", clasificacion: "Servicios personal doméstico", tarea: "Mucama", caso: "Mucama 30 días PARAM", jsonFile: "AP/APParam.json" }
]