const map = L.map('map').setView([20, 0], 2);

const baseLayers = {
  streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
    crossOrigin: true,
  }),
  dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    crossOrigin: true,
  }),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: 'Tiles &copy; Esri',
    crossOrigin: true,
  }),
  light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    crossOrigin: true,
  }),
};

let activeBaseLayer = baseLayers.streets;
activeBaseLayer.addTo(map);

L.control.scale({ metric: true, imperial: false }).addTo(map);

const csvInput = document.getElementById('csvInput');
const pointList = document.getElementById('pointList');
const statusText = document.getElementById('status');
const iconSelector = document.getElementById('iconSelector');
const basemapSelector = document.getElementById('basemapSelector');
const exportBtn = document.getElementById('exportBtn');
const exportTitle = document.getElementById('exportTitle');
const legendText = document.getElementById('legendText');

let markerGroup = L.layerGroup().addTo(map);
let currentPoints = [];

const aliases = {
  lat: ['lat', 'latitude', 'latitud', 'y'],
  lon: ['lng', 'lon', 'long', 'longitud', 'longitude', 'x'],
  name: ['name', 'nombre', 'title', 'titulo', 'label', 'etiqueta'],
};

const iconPresets = {
  pin: '📍',
  dot: '🔴',
  star: '⭐',
  place: '📌',
};

function findColumn(headers, options) {
  return headers.find((header) => options.includes(header.toLowerCase().trim()));
}

function clearUI(message) {
  markerGroup.clearLayers();
  pointList.innerHTML = `<li class="empty">${message}</li>`;
}

function getLeafletIcon() {
  const iconSymbol = iconPresets[iconSelector.value] || '📍';
  return L.divIcon({
    className: 'custom-marker',
    html: `<span>${iconSymbol}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 24],
    popupAnchor: [0, -20],
  });
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

function renderPoints(points, fitBounds = false) {
  markerGroup.clearLayers();
  pointList.innerHTML = '';

  if (points.length === 0) {
    clearUI('No hay puntos para mostrar.');
    return;
  }

  const bounds = [];
  const icon = getLeafletIcon();

  points.forEach((point) => {
    const marker = L.marker([point.lat, point.lon], { icon })
      .bindPopup(`<strong>${point.label}</strong><br/>Lat: ${point.lat}<br/>Lon: ${point.lon}`)
      .addTo(markerGroup);

    createListItem(point, marker);
    bounds.push([point.lat, point.lon]);
  });

  if (fitBounds && bounds.length > 0) {
    map.fitBounds(bounds, { padding: [25, 25] });
  }
}

function getScaleLabel() {
  const pointA = map.containerPointToLatLng([40, 40]);
  const pointB = map.containerPointToLatLng([140, 40]);
  const meters = map.distance(pointA, pointB);

  if (meters >= 1000) {
    return `Escala aprox: ${(meters / 1000).toFixed(1)} km`;
  }

  return `Escala aprox: ${Math.round(meters)} m`;
}

async function exportMapImage() {
  if (currentPoints.length === 0) {
    statusText.textContent = 'Primero carga un CSV para poder exportar.';
    return;
  }

  const mapContainer = document.getElementById('map');
  const overlay = document.createElement('div');
  overlay.className = 'export-overlay';

  const title = exportTitle.value.trim() || 'Mapa exportado';
  const legend = legendText.value.trim() || 'Puntos cargados desde CSV';
  const scale = getScaleLabel();
  const iconSymbol = iconPresets[iconSelector.value] || '📍';

  overlay.innerHTML = `
    <h3>${title}</h3>
    <p>${iconSymbol} ${legend}</p>
    <span>${scale}</span>
  `;

  mapContainer.appendChild(overlay);

  try {
    const canvas = await html2canvas(mapContainer, {
      useCORS: true,
      backgroundColor: '#111111',
      scale: 2,
    });

    const link = document.createElement('a');
    link.download = `${title.toLowerCase().replace(/\s+/g, '-') || 'mapa'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    statusText.textContent = 'Mapa exportado correctamente con título, leyenda y escala.';
  } catch {
    statusText.textContent = 'No se pudo exportar el mapa en este navegador.';
  } finally {
    overlay.remove();
  }
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
        currentPoints = [];
        return;
      }

      const headers = meta.fields || [];
      const latKey = findColumn(headers, aliases.lat);
      const lonKey = findColumn(headers, aliases.lon);
      const nameKey = findColumn(headers, aliases.name);

      if (!latKey || !lonKey) {
        statusText.textContent = 'Tu CSV debe incluir columnas de latitud y longitud.';
        clearUI('No se encontraron columnas de coordenadas.');
        currentPoints = [];
        return;
      }

      const parsedPoints = [];

      data.forEach((row, index) => {
        const lat = Number.parseFloat(row[latKey]);
        const lon = Number.parseFloat(row[lonKey]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          return;
        }

        const label = row[nameKey] || `Punto ${index + 1}`;
        parsedPoints.push({ label, lat, lon });
      });

      if (parsedPoints.length === 0) {
        statusText.textContent = 'No se encontraron coordenadas válidas en el CSV.';
        clearUI('No hay puntos para mostrar.');
        currentPoints = [];
        return;
      }

      currentPoints = parsedPoints;
      renderPoints(currentPoints, true);
      statusText.textContent = `Se cargaron ${currentPoints.length} punto(s) correctamente.`;
    },
    error: () => {
      statusText.textContent = 'Ocurrió un error al abrir el archivo.';
      clearUI('Error de lectura.');
      currentPoints = [];
    },
  });
});

iconSelector.addEventListener('change', () => {
  if (currentPoints.length > 0) {
    renderPoints(currentPoints);
    statusText.textContent = 'Ícono actualizado para todos los puntos.';
  }
});

basemapSelector.addEventListener('change', (event) => {
  const selectedLayer = baseLayers[event.target.value] || baseLayers.streets;
  map.removeLayer(activeBaseLayer);
  selectedLayer.addTo(map);
  activeBaseLayer = selectedLayer;
  statusText.textContent = 'Mapa base actualizado.';
});

exportBtn.addEventListener('click', exportMapImage);

clearUI('Carga un CSV para empezar.');
