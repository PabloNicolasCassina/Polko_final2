import json
import argparse
import sys
import os

# Definimos las opciones válidas para tipo y tamaño a nivel global
# para que estén disponibles tanto para argparse como para la función de actualización.
TIPOS_DE_HOGAR_VALIDOS = ["Casa", "Departamento", "Vivienda barrio cerrado"]
TAMANIOS_DE_HOGAR_VALIDOS = ["Pequeña", "Mediana", "Grande"]

def actualizar_datos_hogar(file_path, nuevo_tipo, nuevo_tamanio):
    """
    Lee un archivo JSON, y actualiza los campos 'tipo' y 'tamanio' del hogar.

    Args:
        file_path (str): La ruta al archivo JSON.
        nuevo_tipo (str): El nuevo valor para el campo 'tipo'. Debe ser una de las opciones válidas.
        nuevo_tamanio (str): El nuevo valor para el campo 'tamanio'. Debe ser una de las opciones válidas.

    Returns:
        dict: El diccionario de Python modificado.
              Devuelve None si el archivo no existe, el JSON es inválido,
              o los valores de tipo/tamanio no son válidos o las claves no existen.
    """
    # Verificar si el archivo existe y es un archivo
    if not os.path.exists(file_path):
        print(f"Error: El archivo '{file_path}' no existe.", file=sys.stderr)
        return None
    if not os.path.isfile(file_path):
        print(f"Error: La ruta '{file_path}' no es un archivo válido.", file=sys.stderr)
        return None

    data = None
    try:
        # Leer el contenido del archivo JSON
        with open(file_path, 'r', encoding='utf-8') as f:
            json_string_data = f.read()
            # Intentar cargar solo después de leer
            if not json_string_data.strip(): # Manejar archivo vacío
                print(f"Error: El archivo '{file_path}' está vacío.", file=sys.stderr)
                return None
            data = json.loads(json_string_data)
    except FileNotFoundError:
        print(f"Error: No se pudo encontrar el archivo '{file_path}'.", file=sys.stderr)
        return None
    except IOError as e:
        print(f"Error al leer el archivo '{file_path}': {e}", file=sys.stderr)
        return None
    except json.JSONDecodeError:
        print(f"Error: El contenido del archivo '{file_path}' no es JSON válido.", file=sys.stderr)
        return None
    
    # Si data sigue siendo None aquí, hubo un problema no capturado explícitamente antes
    if data is None:
        print(f"Error inesperado al procesar el archivo '{file_path}'.", file=sys.stderr)
        return None

    # Validar si el nuevo_tipo es una opción permitida.
    # Aunque argparse ya hace esta validación si se usa 'choices',
    # mantenerla aquí hace la función más robusta si se llama desde otro contexto.
    if nuevo_tipo not in TIPOS_DE_HOGAR_VALIDOS:
        print(f"Error: El tipo de hogar '{nuevo_tipo}' no es válido. Las opciones son: {', '.join(TIPOS_DE_HOGAR_VALIDOS)}", file=sys.stderr)
        return None
    
    # Validar si el nuevo_tamanio es una opción permitida.
    if nuevo_tamanio not in TAMANIOS_DE_HOGAR_VALIDOS:
        print(f"Error: El tamaño de hogar '{nuevo_tamanio}' no es válido. Las opciones son: {', '.join(TAMANIOS_DE_HOGAR_VALIDOS)}", file=sys.stderr)
        return None

    # Verificar si las claves 'tipo' y 'tamanio' existen en el JSON antes de intentar actualizarlas.
    if 'tipo' not in data:
        print(f"Error: La clave 'tipo' no se encontró en el archivo JSON '{file_path}'. No se puede continuar.", file=sys.stderr)
        return None
    if 'tamanio' not in data:
        print(f"Error: La clave 'tamanio' no se encontró en el archivo JSON '{file_path}'. No se puede continuar.", file=sys.stderr)
        return None

    # Actualizar los campos 'tipo' y 'tamanio' en el diccionario
    data['tipo'] = nuevo_tipo
    data['tamanio'] = nuevo_tamanio
    
    return data

def main():
    """
    Función principal para parsear argumentos, ejecutar la actualización y guardar los cambios.
    """
    parser = argparse.ArgumentParser(description="Lee y modifica un archivo JSON para actualizar los campos 'tipo' y 'tamanio' de un hogar.")

    # Argumento para el archivo JSON (obligatorio)
    parser.add_argument("--file", required=True, help="Ruta al archivo JSON a modificar.")

    # Argumento para el tipo de hogar (obligatorio y con opciones predefinidas)
    parser.add_argument("--tipo", 
                        required=True, 
                        choices=TIPOS_DE_HOGAR_VALIDOS,
                        help=f"Nuevo tipo de hogar. Opciones válidas: {', '.join(TIPOS_DE_HOGAR_VALIDOS)}")

    # Argumento para el tamaño del hogar (obligatorio y con opciones predefinidas)
    parser.add_argument("--tamanio", 
                        required=True, 
                        choices=TAMANIOS_DE_HOGAR_VALIDOS,
                        help=f"Nuevo tamaño del hogar. Opciones válidas: {', '.join(TAMANIOS_DE_HOGAR_VALIDOS)}")

    args = parser.parse_args()

    # Llamar a la función para obtener los datos actualizados
    datos_actualizados = actualizar_datos_hogar(args.file, args.tipo, args.tamanio)

    # Si la actualización fue exitosa (datos_actualizados no es None)
    if datos_actualizados:
        try:
            # Convertir el diccionario de nuevo a una cadena JSON formateada (con indentación para legibilidad)
            json_actualizado_string = json.dumps(datos_actualizados, indent=4, ensure_ascii=False) # ensure_ascii=False por si hay caracteres especiales

            # Sobrescribir el archivo original con los datos actualizados
            with open(args.file, 'w', encoding='utf-8') as f:
                f.write(json_actualizado_string)

            # Imprimir mensaje de éxito a stderr
            print(f"Archivo '{args.file}' actualizado correctamente. 'tipo' establecido a '{args.tipo}' y 'tamanio' a '{args.tamanio}'.", file=sys.stderr)

        except IOError as e:
            # Error al escribir de vuelta en el archivo
            print(f"Error al escribir en el archivo '{args.file}': {e}", file=sys.stderr)
            sys.exit(1) # Salir con código de error
        except Exception as e:
            # Capturar cualquier otro error inesperado durante la escritura/dump
            print(f"Error inesperado al guardar los cambios en '{args.file}': {e}", file=sys.stderr)
            sys.exit(1)
    else:
        # Si hubo un error en la función de actualización, salir con código de error
        # Los mensajes de error ya se imprimieron a stderr en la función
        print(f"No se realizaron cambios en el archivo '{args.file}'.", file=sys.stderr)
        sys.exit(1)

# Punto de entrada del script cuando se ejecuta desde la terminal
if __name__ == "__main__":
    main()
