const map = L.map('map').setView([10.67, -101.35], 13); //Coordenadas iniciales

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data OpenStreetMap contributors'
}).addTo(map);

// marker management
let selectedMarker = null;
const markers = new Map();

map.on('click', function(e) {
    const { lat, lng } = e.latlng;
    document.getElementById('lat').value = lat;
    document.getElementById('lng').value = lng;

    if (selectedMarker) {
        map.removeLayer(selectedMarker);
    }

    selectedMarker = L.marker([lat, lng]).addTo(map)
        .bindPopup('Ubicación seleccionada').openPopup();
});

// Change log in localStorage
const CHANGELOG_KEY = 'changeLog';

function loadChangeLog() {
    const raw = localStorage.getItem(CHANGELOG_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch (err) {
        console.warn('changeLog: invalid JSON in localStorage, resetting.', err);
        localStorage.removeItem(CHANGELOG_KEY);
        return [];
    }
}

function saveChangeLog(list) {
    localStorage.setItem(CHANGELOG_KEY, JSON.stringify(list));
}

function appendChangeLog(action, id, details) {
    const log = loadChangeLog();
    log.unshift({
        ts: new Date().toISOString(),
        action,
        id,
        details
    });
    // keep max 100 entries
    if (log.length > 100) log.splice(100);
    saveChangeLog(log);
    renderChangeLog();
}

function renderChangeLog() {
    const tbody = document.querySelector('#change-log tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const log = loadChangeLog();
    if (!Array.isArray(log) || log.length === 0) {
        // show a friendly placeholder row when no entries exist
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" style="opacity:.7">No hay registros de cambios</td>`;
        tbody.appendChild(tr);
        return;
    }
    log.forEach(item => {
        try {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(item.ts).toLocaleString()}</td>
                <td>${item.action}</td>
                <td>${item.id}</td>
                <td>${item.details}</td>
            `;
            tbody.appendChild(tr);
        } catch (err) {
            console.warn('Failed to render changeLog item', item, err);
        }
    });
}

// Form handling: create or update
const form = document.getElementById('place-form');
const cancelBtn = document.getElementById('cancel-edit');

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const placeId = document.getElementById('place-id').value;
    const name = document.getElementById('name').value;
    const description = document.getElementById('description').value;
    const latVal = document.getElementById('lat').value;
    const lngVal = document.getElementById('lng').value;

    const latitude = latVal ? parseFloat(latVal) : undefined;
    const longitude = lngVal ? parseFloat(lngVal) : undefined;

    try {
        if (placeId) {
            // update
            const body = { name, description };
            if (latitude !== undefined && longitude !== undefined) {
                body.latitude = latitude;
                body.longitude = longitude;
            }
            const res = await fetch(`/api/places/${placeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const updated = await res.json();
            if (!res.ok) throw new Error(updated.error || 'Error al actualizar');
            appendChangeLog('UPDATE', updated._id, `${updated.name} - ${updated.descripcion}`);
            alert('Lugar actualizado');
        } else {
            // create
            const res = await fetch('/api/places', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, latitude, longitude })
            });
            const created = await res.json();
            if (!res.ok) throw new Error(created.error || 'Error al crear');
            appendChangeLog('CREATE', created._id, `${created.name} - ${created.descripcion}`);
            alert('Lugar registrado');
        }
        resetForm();
        await loadPlaces();
    } catch (err) {
        alert(err.message || 'Ocurrió un error');
    }
});

cancelBtn.addEventListener('click', function() {
    resetForm();
});

function resetForm() {
    document.getElementById('place-id').value = '';
    document.getElementById('name').value = '';
    document.getElementById('description').value = '';
    document.getElementById('lat').value = '';
    document.getElementById('lng').value = '';
    cancelBtn.style.display = 'none';
    if (selectedMarker) { map.removeLayer(selectedMarker); selectedMarker = null; }
}

// Load places -> add markers and fill table
async function loadPlaces() {
    const res = await fetch('/api/places');
    const places = await res.json();

    // clear existing markers
    markers.forEach(m => map.removeLayer(m));
    markers.clear();

    // fill table
    const tbody = document.querySelector('#places-table tbody');
    tbody.innerHTML = '';

    places.forEach(place => {
        const [lng, lat] = place.location.coordinates;
        const m = L.marker([lat, lng])
            .addTo(map)
            .bindPopup(`<strong>${place.name}</strong><br/>${place.descripcion}`);
        markers.set(place._id, m);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${place.name}</td>
            <td>${place.descripcion}</td>
            <td>${lat.toFixed(5)}, ${lng.toFixed(5)}</td>
            <td>
                <button class="edit-btn" data-id="${place._id}">Editar</button>
                <button class="delete-btn" data-id="${place._id}">Borrar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // attach handlers
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.dataset.id;
            try {
                const res = await fetch(`/api/places/${id}`);
                const place = await res.json();
                if (!res.ok) throw new Error(place.error || 'No se pudo cargar el lugar');
                document.getElementById('place-id').value = place._id;
                document.getElementById('name').value = place.name;
                document.getElementById('description').value = place.descripcion || '';
                const [lng, lat] = place.location.coordinates;
                document.getElementById('lat').value = lat;
                document.getElementById('lng').value = lng;
                cancelBtn.style.display = 'inline-block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (err) {
                alert(err.message || 'Error');
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.dataset.id;
            if (!confirm('¿Eliminar este lugar?')) return;
            try {
                const res = await fetch(`/api/places/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'No se pudo borrar');
                appendChangeLog('DELETE', data.id, `Deleted place ${data.id}`);
                await loadPlaces();
            } catch (err) {
                alert(err.message || 'Error');
            }
        });
    });

    renderChangeLog();
}

// initial load
loadPlaces();
renderChangeLog();