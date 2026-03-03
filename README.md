# CSV a Mapa

Plataforma web para cargar un CSV, elegir separador, seleccionar columnas de coordenadas y visualizar puntos en el mapa.

## Cómo usar

1. Abre `index.html` en tu navegador (o levanta un servidor local).
2. Haz clic en **Subir CSV**.
3. Selecciona el **separador** correcto (coma, punto y coma, tab, pipe u otro).
4. Selecciona el **sistema de coordenadas**:
   - **Lat/Lon (WGS84)** para latitud/longitud clásicas.
   - **UTM (X/Y)** si tu archivo tiene coordenadas proyectadas.
5. Si usas UTM, indica **zona UTM** y **hemisferio**.
6. Elige qué columnas corresponden a:
   - **Y / Latitud**
   - **X / Longitud**
   - **Nombre** (opcional)
7. Haz clic en **Aplicar columnas** para mostrar los puntos.
8. Opcional:
   - Cambia el ícono de los marcadores.
   - Cambia el mapa base (calles, oscuro, satelital o blanco minimalista).
   - Exporta el mapa en PNG con título, leyenda y escala aproximada.

## Nota importante

Si cargas valores como `5159333` y `714952`, eso suele ser UTM (no lat/lon). En ese caso, usa modo **UTM** para convertirlos automáticamente y mostrarlos correctamente.
