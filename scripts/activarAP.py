import json
import argparse
import sys
import os
# No se necesita datetime o timedelta aquí si las fechas vienen como argumentos

# Campos que se pueden actualizar en el JSON.
CAMPOS_A_ACTUALIZAR = ["vigencia", "inicio", "fin", "actividad", "clasificacion", "tarea"]

def actualizar_datos_cotizacion(file_path, nueva_vigencia, nuevo_inicio, nuevo_fin, nueva_actividad, nueva_clasificacion, nueva_tarea):
    """
    Lee un archivo JSON y actualiza los campos especificados, incluyendo inicio y fin.

    Args:
        file_path (str): La ruta al archivo JSON.
        nueva_vigencia (str): El nuevo valor para el campo 'vigencia'.
        nuevo_inicio (str): El nuevo valor para el campo 'inicio'.
        nuevo_fin (str): El nuevo valor para el campo 'fin'.
        nueva_actividad (str): El nuevo valor para el campo 'actividad'.
        nueva_clasificacion (str): El nuevo valor para el campo 'clasificacion'.
        nueva_tarea (str): El nuevo valor para el campo 'tarea'.

    Returns:
        dict: El diccionario de Python modificado.
              Devuelve None si el archivo no existe, el JSON es inválido,
              o alguna de las claves especificadas no existe en el JSON.
    """
    if not os.path.exists(file_path):
        print(f"Error: El archivo '{file_path}' no existe.", file=sys.stderr)
        return None
    if not os.path.isfile(file_path):
        print(f"Error: La ruta '{file_path}' no es un archivo válido.", file=sys.stderr)
        return None

    data = None
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            json_string_data = f.read()
            if not json_string_data.strip():
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
    
    if data is None:
        print(f"Error inesperado al procesar el archivo '{file_path}'.", file=sys.stderr)
        return None

    # Verificar si todas las claves a actualizar existen en el JSON.
    # Si 'inicio' o 'fin' no existen, se crearán.
    for campo in CAMPOS_A_ACTUALIZAR:
        if campo not in data:
            # Permitir que 'inicio' y 'fin' se creen si no existen
            if campo not in ['inicio', 'fin']:
                 print(f"Error: La clave obligatoria '{campo}' no se encontró en el archivo JSON '{file_path}'. Se creará si es 'inicio' o 'fin', de lo contrario no se puede continuar.", file=sys.stderr)
                 if campo not in ['inicio', 'fin']: # Redundante, pero para claridad
                    return None


    # Actualizar los campos en el diccionario con los valores pasados como argumentos
    data['vigencia'] = nueva_vigencia
    data['inicio'] = nuevo_inicio
    data['fin'] = nuevo_fin
    data['actividad'] = nueva_actividad
    data['clasificacion'] = nueva_clasificacion
    data['tarea'] = nueva_tarea
    
    return data

def main():
    """
    Función principal para parsear argumentos, ejecutar la actualización y guardar los cambios.
    """
    parser = argparse.ArgumentParser(description="Lee y modifica un archivo JSON para actualizar campos de una cotización.")

    parser.add_argument("--file", required=True, help="Ruta al archivo JSON a modificar.")
    parser.add_argument("--vigencia", required=True, help="Nuevo valor para 'vigencia'.")
    parser.add_argument("--inicio", required=True, help="Nuevo valor para 'inicio' (ej. '28 mayo').") # <--- Acepta --inicio
    parser.add_argument("--fin", required=True, help="Nuevo valor para 'fin' (ej. '30 mayo').")       # <--- Acepta --fin
    parser.add_argument("--actividad", required=True, help="Nuevo valor para 'actividad'.")
    parser.add_argument("--clasificacion", required=True, help="Nuevo valor para 'clasificacion'.")
    parser.add_argument("--tarea", required=True, help="Nuevo valor para 'tarea'.")

    args = parser.parse_args()

    datos_actualizados = actualizar_datos_cotizacion(
        args.file, 
        args.vigencia,
        args.inicio,  # <--- Pasa args.inicio
        args.fin,     # <--- Pasa args.fin
        args.actividad, 
        args.clasificacion, 
        args.tarea
    )

    if datos_actualizados:
        try:
            json_actualizado_string = json.dumps(datos_actualizados, indent=4, ensure_ascii=False)
            with open(args.file, 'w', encoding='utf-8') as f:
                f.write(json_actualizado_string)

            print(f"Archivo '{args.file}' actualizado correctamente.", file=sys.stderr)
            print(f"  Nuevos valores:", file=sys.stderr)
            print(f"    vigencia: '{datos_actualizados['vigencia']}'", file=sys.stderr)
            print(f"    inicio: '{datos_actualizados['inicio']}'", file=sys.stderr) # No dice "(generado automáticamente)"
            print(f"    fin: '{datos_actualizados['fin']}'", file=sys.stderr)       # No dice "(generado automáticamente)"
            print(f"    actividad: '{datos_actualizados['actividad']}'", file=sys.stderr)
            print(f"    clasificacion: '{datos_actualizados['clasificacion']}'", file=sys.stderr)
            print(f"    tarea: '{datos_actualizados['tarea']}'", file=sys.stderr)

        except IOError as e:
            print(f"Error al escribir en el archivo '{args.file}': {e}", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(f"Error inesperado al guardar los cambios en '{args.file}': {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"No se realizaron cambios en el archivo '{args.file}'.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
