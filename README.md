# CSV a Mapa

Plataforma web simple para cargar un archivo CSV y visualizar puntos en un mapa, con estilo oscuro, selector de íconos, selector de mapa base y exportación.

## Cómo usar

1. Abre `index.html` en tu navegador (o levanta un servidor local).
2. Haz clic en **Subir CSV**.
3. Tu CSV debe incluir columnas de latitud y longitud, por ejemplo:
   - `latitud` y `longitud`
   - `lat` y `lng`
4. Verás los puntos en el mapa y una lista lateral derecha con cada registro.
5. Puedes cambiar el ícono de los marcadores desde el selector **Ícono**.
6. Selecciona un **mapa base**: calles, oscuro, satelital o blanco minimalista.
7. Para exportar:
   - Escribe un **título** y una **mini leyenda** (opcional).
   - Haz clic en **Exportar mapa** para descargar una imagen PNG con título, leyenda y escala aproximada.

## Ejemplo de CSV

```csv
nombre,latitud,longitud
Punto A,19.4326,-99.1332
Punto B,40.4168,-3.7038
Punto C,-34.6037,-58.3816
```
