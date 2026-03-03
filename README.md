# CSV a Mapa

Plataforma web para cargar un CSV, elegir separador, seleccionar columnas de coordenadas y ver puntos en un mapa.

## Cómo usar

1. Abre `index.html` en tu navegador (o levanta un servidor local).
2. Haz clic en **Subir CSV**.
3. Selecciona el **separador** correcto (coma, punto y coma, tab, pipe u otro).
4. Elige qué columnas corresponden a:
   - **Latitud**
   - **Longitud**
   - **Nombre** (opcional)
5. Haz clic en **Aplicar columnas** para mostrar los puntos.
6. Opcional:
   - Cambia el ícono de los marcadores.
   - Cambia el mapa base (calles, oscuro, satelital o blanco minimalista).
   - Exporta el mapa en PNG con título, leyenda y escala aproximada.

## Ejemplo de CSV

```csv
nombre,latitud,longitud
Punto A,19.4326,-99.1332
Punto B,40.4168,-3.7038
Punto C,-34.6037,-58.3816
```
