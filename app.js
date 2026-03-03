const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

const csvInput = document.getElementById('csvInput');
const pointList = document.getElementById('pointList');
const statusText = document.getElementById('status');
let markerGroup = L.layerGroup().addTo(map);

const aliases = {
  lat: ['lat', 'latitude', 'latitud', 'y'],
  lon: ['lng', 'lon', 'long', 'longitud', 'longitude', 'x'],
  name: ['name', 'nombre', 'title', 'titulo', 'label', 'etiqueta'],
};

function findColumn(headers, options) {
  return headers.find((header) => options.includes(header.toLowerCase().trim()));
}

function clearUI(message) {
  markerGroup.clearLayers();
  pointList.innerHTML = `<li class="empty">${message}</li>`;
}

function createListItem(point, marker) {
  const item = document.createElement('li');
  item.textContent = `${point.label} (${point.lat.toFixed(5)}, ${point.lon.toFixed(5)})`;
  item.addEventListener('click', () => {
    map.setView([point.lat, point.lon], Math.max(map.getZoom(), 13));
    marker.openPopup();
    document.querySelectorAll('#pointList li').forEach((li) => li.classList.remove('active'));
    item.classList.add('active');
  });
  pointList.appendChild(item);
}

csvInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: ({ data, meta, errors }) => {
      if (errors.length > 0) {
        statusText.textContent = 'No se pudo leer el CSV. Revisa el formato del archivo.';
        clearUI('Archivo inválido.');
        return;
      }

      const headers = meta.fields || [];
      const latKey = findColumn(headers, aliases.lat);
      const lonKey = findColumn(headers, aliases.lon);
      const nameKey = findColumn(headers, aliases.name);

      if (!latKey || !lonKey) {
        statusText.textContent = 'Tu CSV debe incluir columnas de latitud y longitud.';
        clearUI('No se encontraron columnas de coordenadas.');
        return;
      }

      markerGroup.clearLayers();
      pointList.innerHTML = '';

      const bounds = [];
      let validCount = 0;

      data.forEach((row, index) => {
        const lat = Number.parseFloat(row[latKey]);
        const lon = Number.parseFloat(row[lonKey]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          return;
        }

        validCount += 1;
        const label = row[nameKey] || `Punto ${index + 1}`;
        const marker = L.marker([lat, lon])
          .bindPopup(`<strong>${label}</strong><br/>Lat: ${lat}<br/>Lon: ${lon}`)
          .addTo(markerGroup);

        createListItem({ label, lat, lon }, marker);
        bounds.push([lat, lon]);
      });

      if (validCount === 0) {
        statusText.textContent = 'No se encontraron coordenadas válidas en el CSV.';
        clearUI('No hay puntos para mostrar.');
        return;
      }

      map.fitBounds(bounds, { padding: [25, 25] });
      statusText.textContent = `Se cargaron ${validCount} punto(s) correctamente.`;
    },
    error: () => {
      statusText.textContent = 'Ocurrió un error al abrir el archivo.';
      clearUI('Error de lectura.');
    },
  });
});

clearUI('Carga un CSV para empezar.');
