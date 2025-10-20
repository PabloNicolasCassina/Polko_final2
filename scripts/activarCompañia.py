import json
import argparse
import sys
import os

def actualizar_aseguradora_y_fecha(file_path, compania_a_activar):
    """
    Lee un archivo JSON, actualiza los datos de seguro para establecer
    una compañía específica en True y todas las demás en False.
    Además, ajusta la clave 'fechaVenc' según la compañía activada.

    Args:
        file_path (str): La ruta al archivo JSON.
        compania_a_activar (str): El nombre de la compañía de seguros a establecer en True.

    Returns:
        dict: El diccionario de Python modificado.
              Devuelve None si el archivo no existe, el JSON es inválido,
              la compañía no es válida o alguna clave necesaria no existe.
    """
    # Verificar si el archivo existe y es un archivo
    if not os.path.exists(file_path):
        print(f"Error: El archivo '{file_path}' no existe.", file=sys.stderr)
        return None
    if not os.path.isfile(file_path):
        print(f"Error: La ruta '{file_path}' no es un archivo válido.", file=sys.stderr)
        return None

    data = None # Inicializar data a None
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


    # Lista de claves de compañías de seguros
    companias = ["zurich", "sancor", "federacion_patronal", "rivadavia", "rus", "experta", "atm"]

    # Validar si la compañía a activar está en la lista
    if compania_a_activar not in companias:
        print(f"Error: El nombre de la compañía '{compania_a_activar}' no es válido. Las opciones son: {', '.join(companias)}", file=sys.stderr)
        return None

    # Variable para verificar si la compañía a activar existe en el JSON
    compania_encontrada_en_json = False

    # Verificar si todas las claves de compañía y 'fechaVenc' existen en el JSON
    claves_requeridas = companias + ["fechaVenc"] + ["gnc"]
    for clave in claves_requeridas:
        if clave not in data:
            print(f"Error: La clave requerida '{clave}' no se encontró en el archivo JSON '{file_path}'. No se puede continuar.", file=sys.stderr)
            return None # Detener si falta una clave esencial

    # Establecer todas las compañías en False primero
    for compania in companias:
        data[compania] = False # Asumimos que la clave existe por la verificación anterior
        if compania == compania_a_activar:
            compania_encontrada_en_json = True # Aunque ya sabemos que existe, mantenemos la lógica

    # Establecer la compañía especificada en True
    # No necesitamos la condición 'if compania_encontrada_en_json:' porque ya verificamos que existe al inicio
    data[compania_a_activar] = True

    # --- Nueva lógica para 'fechaVenc' ---
    # Establecer 'fechaVenc' basado en la compañía activada
    if compania_a_activar in ["sancor", "atm", "federacion_patronal"]:
        data["fechaVenc"] = True
    else:
        data["fechaVenc"] = False
    # ------------------------------------

    return data

def main():
    """
    Función principal para parsear argumentos, ejecutar la actualización y guardar los cambios.
    """
    parser = argparse.ArgumentParser(description="Lee y modifica un archivo JSON para actualizar una compañía de seguros y la clave 'fechaVenc'.")

    # Argumento para el archivo JSON (obligatorio)
    parser.add_argument("--file", required=True, help="Ruta al archivo JSON a modificar.")

    # Argumento para la compañía a activar (obligatorio)
    parser.add_argument("--compania", required=True, help="Nombre de la compañía a establecer en True (ej: sancor, rivadavia).")

    args = parser.parse_args()

    # Llamar a la función para obtener los datos actualizados
    datos_actualizados = actualizar_aseguradora_y_fecha(args.file, args.compania) # Llamada a la función renombrada

    # Si la actualización fue exitosa (datos_actualizados no es None)
    if datos_actualizados:
        try:
            # Convertir el diccionario de nuevo a una cadena JSON formateada (con indentación para legibilidad)
            json_actualizado_string = json.dumps(datos_actualizados, indent=4, ensure_ascii=False) # ensure_ascii=False por si hay caracteres especiales

            # Sobrescribir el archivo original con los datos actualizados
            with open(args.file, 'w', encoding='utf-8') as f:
                f.write(json_actualizado_string)

            # Imprimir mensaje de éxito a stderr (para no interferir si se redirige stdout)
            print(f"Archivo '{args.file}' actualizado correctamente. '{args.compania}' establecida a True y 'fechaVenc' ajustada.", file=sys.stderr) # Mensaje actualizado

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
