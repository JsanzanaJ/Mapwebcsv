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
const delimiterSelector = document.getElementById('delimiterSelector');
const customDelimiter = document.getElementById('customDelimiter');
const coordSystem = document.getElementById('coordSystem');
const utmZone = document.getElementById('utmZone');
const utmHemisphere = document.getElementById('utmHemisphere');
const latColumn = document.getElementById('latColumn');
const lonColumn = document.getElementById('lonColumn');
const nameColumn = document.getElementById('nameColumn');
const applyColumnsBtn = document.getElementById('applyColumnsBtn');

let markerGroup = L.layerGroup().addTo(map);
let currentPoints = [];
let parsedRows = [];
let parsedHeaders = [];

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

function isValidLatLon(lat, lon) {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function utmToLatLon(easting, northing, zoneNumber, hemisphere = 'N') {
  const a = 6378137;
  const eccSquared = 0.00669438;
  const k0 = 0.9996;

  const x = easting - 500000;
  let y = northing;

  if (hemisphere === 'S') {
    y -= 10000000;
  }

  const longOrigin = (zoneNumber - 1) * 6 - 180 + 3;
  const eccPrimeSquared = eccSquared / (1 - eccSquared);
  const M = y / k0;
  const mu = M / (a * (1 - eccSquared / 4 - (3 * eccSquared ** 2) / 64 - (5 * eccSquared ** 3) / 256));

  const e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));

  const J1 = (3 * e1) / 2 - (27 * e1 ** 3) / 32;
  const J2 = (21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32;
  const J3 = (151 * e1 ** 3) / 96;
  const J4 = (1097 * e1 ** 4) / 512;

  const fp = mu + J1 * Math.sin(2 * mu) + J2 * Math.sin(4 * mu) + J3 * Math.sin(6 * mu) + J4 * Math.sin(8 * mu);

  const sinFp = Math.sin(fp);
  const cosFp = Math.cos(fp);
  const tanFp = Math.tan(fp);

  const C1 = eccPrimeSquared * cosFp ** 2;
  const T1 = tanFp ** 2;
  const N1 = a / Math.sqrt(1 - eccSquared * sinFp ** 2);
  const R1 = (a * (1 - eccSquared)) / (1 - eccSquared * sinFp ** 2) ** 1.5;
  const D = x / (N1 * k0);

  const lat = fp - ((N1 * tanFp) / R1) * (
    D ** 2 / 2 -
    (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * eccPrimeSquared) * D ** 4 / 24 +
    (61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * eccPrimeSquared - 3 * C1 ** 2) * D ** 6 / 720
  );

  const lon = (
    D -
    (1 + 2 * T1 + C1) * D ** 3 / 6 +
    (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * eccPrimeSquared + 24 * T1 ** 2) * D ** 5 / 120
  ) / cosFp;

  return {
    lat: (lat * 180) / Math.PI,
    lon: longOrigin + (lon * 180) / Math.PI,
  };
}

function updateCoordSystemUI() {
  const isUtm = coordSystem.value === 'utm';
  utmZone.disabled = !isUtm;
  utmHemisphere.disabled = !isUtm;
}

function getDelimiter() {
  if (delimiterSelector.value === 'custom') {
    return customDelimiter.value || ',';
  }

  return delimiterSelector.value;
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

function fillColumnSelectors(headers) {
  const options = headers.map((header) => `<option value="${header}">${header}</option>`).join('');
  latColumn.innerHTML = options;
  lonColumn.innerHTML = options;
  nameColumn.innerHTML = `<option value="">(Sin nombre)</option>${options}`;

  const autoLat = findColumn(headers, aliases.lat);
  const autoLon = findColumn(headers, aliases.lon);
  const autoName = findColumn(headers, aliases.name);

  if (autoLat) latColumn.value = autoLat;
  if (autoLon) lonColumn.value = autoLon;
  if (autoName) nameColumn.value = autoName;
}

function parseCurrentFile() {
  const file = csvInput.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    delimiter: getDelimiter(),
    complete: ({ data, meta, errors }) => {
      if (errors.length > 0) {
        statusText.textContent = 'No se pudo leer el CSV. Revisa separador y formato.';
        parsedRows = [];
        parsedHeaders = [];
        currentPoints = [];
        clearUI('Archivo inválido.');
        return;
      }

      parsedRows = data;
      parsedHeaders = meta.fields || [];

      if (parsedHeaders.length < 2) {
        statusText.textContent = 'No se detectaron columnas suficientes. Revisa el separador.';
        clearUI('No se pudieron detectar columnas.');
        return;
      }

      fillColumnSelectors(parsedHeaders);
      statusText.textContent = 'CSV cargado. Selecciona columnas y sistema de coordenadas, luego pulsa "Aplicar columnas".';
      clearUI('CSV leído. Falta aplicar columnas de coordenadas.');
    },
    error: () => {
      statusText.textContent = 'Ocurrió un error al abrir el archivo.';
      parsedRows = [];
      parsedHeaders = [];
      currentPoints = [];
      clearUI('Error de lectura.');
    },
  });
}

function applySelectedColumns() {
  if (parsedRows.length === 0 || parsedHeaders.length === 0) {
    statusText.textContent = 'Primero sube y procesa un CSV.';
    return;
  }

  const latKey = latColumn.value;
  const lonKey = lonColumn.value;
  const nameKey = nameColumn.value;

  if (!latKey || !lonKey) {
    statusText.textContent = 'Debes seleccionar columnas de coordenadas.';
    return;
  }

  const mode = coordSystem.value;
  let zone = Number.parseInt(utmZone.value, 10);
  const hemisphere = utmHemisphere.value;

  if (mode === 'utm' && (!Number.isInteger(zone) || zone < 1 || zone > 60)) {
    statusText.textContent = 'Para UTM debes indicar una zona válida (1 a 60).';
    return;
  }

  const points = [];
  let invalidCount = 0;

  parsedRows.forEach((row, index) => {
    const rawY = Number.parseFloat(row[latKey]);
    const rawX = Number.parseFloat(row[lonKey]);

    if (!Number.isFinite(rawY) || !Number.isFinite(rawX)) {
      invalidCount += 1;
      return;
    }

    let lat = rawY;
    let lon = rawX;

    if (mode === 'utm') {
      const converted = utmToLatLon(rawX, rawY, zone, hemisphere);
      lat = converted.lat;
      lon = converted.lon;
    }

    if (!isValidLatLon(lat, lon)) {
      invalidCount += 1;
      return;
    }

    const label = nameKey ? row[nameKey] || `Punto ${index + 1}` : `Punto ${index + 1}`;
    points.push({ label, lat, lon });
  });

  if (points.length === 0) {
    currentPoints = [];
    if (mode === 'latlon') {
      statusText.textContent = 'No hay coordenadas válidas. Parece que elegiste columnas UTM en modo Lat/Lon.';
    } else {
      statusText.textContent = 'No hay coordenadas válidas con las columnas o zona UTM seleccionadas.';
    }
    clearUI('No hay puntos válidos para mostrar.');
    return;
  }

  currentPoints = points;
  renderPoints(currentPoints, true);

  const warning = invalidCount > 0 ? ` (${invalidCount} fila(s) omitidas por coordenadas inválidas)` : '';
  statusText.textContent = `Se cargaron ${currentPoints.length} punto(s) correctamente.${warning}`;
}

function getScaleLabel() {
  const pointA = map.containerPointToLatLng([40, 40]);
  const pointB = map.containerPointToLatLng([140, 40]);
  const meters = map.distance(pointA, pointB);
  return meters >= 1000 ? `Escala aprox: ${(meters / 1000).toFixed(1)} km` : `Escala aprox: ${Math.round(meters)} m`;
}

async function exportMapImage() {
  if (currentPoints.length === 0) {
    statusText.textContent = 'Primero carga un CSV y aplica columnas para exportar.';
    return;
  }

  const mapContainer = document.getElementById('map');
  const overlay = document.createElement('div');
  overlay.className = 'export-overlay';

  const title = exportTitle.value.trim() || 'Mapa exportado';
  const legend = legendText.value.trim() || 'Puntos cargados desde CSV';
  const scale = getScaleLabel();
  const iconSymbol = iconPresets[iconSelector.value] || '📍';

  overlay.innerHTML = `<h3>${title}</h3><p>${iconSymbol} ${legend}</p><span>${scale}</span>`;
  mapContainer.appendChild(overlay);

  try {
    const canvas = await html2canvas(mapContainer, { useCORS: true, backgroundColor: '#111111', scale: 2 });
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

csvInput.addEventListener('change', parseCurrentFile);
applyColumnsBtn.addEventListener('click', applySelectedColumns);

delimiterSelector.addEventListener('change', () => {
  customDelimiter.disabled = delimiterSelector.value !== 'custom';
  if (delimiterSelector.value !== 'custom') customDelimiter.value = '';
  parseCurrentFile();
});

customDelimiter.addEventListener('input', () => {
  if (delimiterSelector.value === 'custom' && customDelimiter.value.length === 1) parseCurrentFile();
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

coordSystem.addEventListener('change', updateCoordSystemUI);
exportBtn.addEventListener('click', exportMapImage);
updateCoordSystemUI();
clearUI('Carga un CSV para empezar.');
