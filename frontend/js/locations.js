// Location loading, filtering, and details
async function attachAccessibilityData(locations) {
  const API_URL = window.APP_CONFIG?.API_URL || "";
  const accessibilityRecords = await fetchJson(`${API_URL}/api/accessibility`);
  const recordsById = new Map(accessibilityRecords.map(record => [String(record.id), record]));

  return locations.map(location => ({
    ...location,
    accessibility: recordsById.get(String(location.id)) || {}
  }));
}

async function loadLocations(service) {
  if (!service || !service.id) {
    console.warn("Invalid service supplied.");
    return;
  }

  APP_STATE.currentService = service;
  APP_STATE.previousScreen = "services-screen";

  const locationsList = document.getElementById("locations-list");
  if (!locationsList) return;

  showScreen("locations-screen");
  locationsList.dataset.loaded = "true";
  locationsList.innerHTML = `
    <div class="loading-state">Loading locations...</div>
  `;

  try {
    const API_URL = window.APP_CONFIG?.API_URL || "";
    const locations = await attachAccessibilityData(
      await fetchJson(`${API_URL}/api/services/${service.id}/locations`)
    );

    renderLocations(locations, service.name);
  } catch (error) {
    console.error("Unable to load locations:", error);
    locationsList.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load locations</h3>
        <p>Please try again later.</p>
      </div>
    `;
  }
}

async function loadAllLocations() {
  const locationsList = document.getElementById("locations-list");
  if (!locationsList) return;

  locationsList.innerHTML = `
    <div class="loading-state">Loading locations...</div>
  `;

  try {
    const API_URL = window.APP_CONFIG?.API_URL || "";
    const locations = await attachAccessibilityData(await fetchJson(`${API_URL}/api/locations`));
    renderLocations(locations);
    locationsList.dataset.loaded = "true";
  } catch (error) {
    console.warn("Unable to load all locations:", error);
    locationsList.innerHTML = `
      <div class="empty-state">
        <h3>Find a service first</h3>
        <p>Select a government service to see its available locations.</p>
        <button class="primary-btn" type="button" id="find-services-btn">Find Services</button>
      </div>
    `;

    const button = document.getElementById("find-services-btn");
    if (button) {
      button.addEventListener("click", () => {
        showScreen("services-screen");
      });
    }
  }
}

function renderLocations(locations, serviceName = "") {
  const locationsList = document.getElementById("locations-list");
  if (!locationsList) return;

  locationsList.innerHTML = "";

  if (serviceName && serviceName.trim()) {
    const heading = document.createElement("div");
    heading.className = "locations-service-heading";
    heading.innerHTML = `
      <p>Showing locations for</p>
      <h3>${escapeHtml(serviceName)}</h3>
    `;
    locationsList.appendChild(heading);
  }

  if (!Array.isArray(locations) || locations.length === 0) {
    locationsList.innerHTML += `
      <div class="empty-state">
        <h3>No locations found</h3>
        <p>Try another service.</p>
      </div>
    `;
    return;
  }

  locations.forEach(location => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "location-card";

    const accessibility = location.accessibility || {};

    card.dataset.name = location.name || "";
    card.dataset.address = location.address || "";
    card.dataset.city = location.city || "";
    card.dataset.latitude = location.latitude ?? "";
    card.dataset.longitude = location.longitude ?? "";
    card.dataset.wheelchairAccessible = String(accessibility.wheelchairAccessible === true);
    card.dataset.accessibleEntrance = String(accessibility.accessibleEntrance === true);
    card.dataset.audioGuidance = String(accessibility.audioGuidance === true);
    card.dataset.signLanguageSupport = String(accessibility.signLanguageSupport === true);
    card.dataset.search = `${location.name || ""} ${location.address || ""} ${location.city || ""}`.toLowerCase();

    card.innerHTML = `
      <div class="location-icon">${createIcon("map-pin")}</div>
      <div class="location-info">
        <h3>${escapeHtml(location.name)}</h3>
        <p>${escapeHtml(location.address || "Address unavailable")}</p>
        <p class="location-distance" hidden>Distance unavailable</p>
        <p class="location-recommendation" hidden>Recommended for your mobility preference</p>
      </div>
      ${createIcon("chevron-right")}
    `;

    card.addEventListener("click", () => {
      loadLocationDetails(location.id, "locations-screen");
    });

    locationsList.appendChild(card);
  });

  refreshIcons();
  syncLocationRecommendations();
  updateLocationCardDistances();
}

function syncLocationRecommendations() {
  document.querySelectorAll("#locations-list .location-card").forEach(card => {
    const recommended = APP_STATE.mobilityPreferenceEnabled && card.dataset.wheelchairAccessible === "true";
    card.classList.toggle("recommended-location", recommended);
    const label = card.querySelector(".location-recommendation");
    if (label) {
      label.hidden = !recommended;
    }
  });
}

async function loadLocationDetails(locationId, fromScreen = "locations-screen") {
  APP_STATE.previousScreen = fromScreen;

  const details = document.getElementById("location-details");
  if (!details) return;

  showScreen("location-details-screen");

  details.innerHTML = `
    <div class="loading-state">Loading location details...</div>
  `;

  try {
    const API_URL = window.APP_CONFIG?.API_URL || "";
    const location = await fetchJson(`${API_URL}/api/locations/${locationId}`);
    APP_STATE.currentLocation = location;

    let accessibility = {};

    try {
      accessibility = await fetchJson(`${API_URL}/api/locations/${locationId}/accessibility`);
    } catch (accessibilityError) {
      console.warn("Accessibility information unavailable:", accessibilityError);
    }

    renderLocationDetails(location, accessibility);
  } catch (error) {
    console.error("Unable to load location:", error);
    details.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load this location</h3>
        <p>Please try again.</p>
        <button class="primary-btn" type="button" id="retry-location-btn">Try Again</button>
      </div>
    `;

    const retryButton = document.getElementById("retry-location-btn");
    if (retryButton) {
      retryButton.addEventListener("click", () => {
        loadLocationDetails(locationId, fromScreen);
      });
    }
  }
}

function getAccessibilityStatus(value) {
  if (value === true) {
    return { label: "Available", state: "available", icon: "circle-check" };
  }

  if (value === false) {
    return { label: "Not available", state: "unavailable", icon: "circle-x" };
  }

  return { label: "Not verified", state: "unknown", icon: "circle-help" };
}

function renderAccessibilityFeature(title, value, icon) {
  const status = getAccessibilityStatus(value);

  return `
    <div class="accessibility-feature">
      ${createIcon(icon)}
      <h4>${escapeHtml(title)}</h4>
      <p class="feature-status ${status.state}">${status.label}</p>
    </div>
  `;
}

function renderLocationDetails(location, accessibility) {
  const details = document.getElementById("location-details");
  if (!details) return;

  const image = location.image || location.imageUrl || "";
  const hasCoordinates = Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude));

  details.innerHTML = `
    ${image ? `
      <img class="location-image" src="${escapeHtml(image)}" alt="${escapeHtml(location.name)}">
    ` : `
      <div class="location-image-placeholder">${createIcon("building-2")}</div>
    `}

    <div class="details-content">
      <div class="location-title-row">
        <div>
          <h1>${escapeHtml(location.name)}</h1>
          <p class="location-address">
            ${createIcon("map-pin")}
            ${escapeHtml(location.address || "Address unavailable")}
          </p>
        </div>
      </div>

      ${location.description ? `
        <p class="location-description">${escapeHtml(location.description)}</p>
      ` : ""}

      ${hasCoordinates ? `
        <section class="map-section">
          <div id="location-map" class="map-container"></div>
        </section>
      ` : ""}

      <section class="accessibility-section">
        <div class="section-heading">
          <h2>Accessibility</h2>
          <p>Information about available features</p>
        </div>

        <div class="accessibility-features">
          ${renderAccessibilityFeature("Wheelchair Access", accessibility.wheelchairAccessible, "accessibility")}
          ${renderAccessibilityFeature("Accessible Entrance", accessibility.accessibleEntrance, "door-open")}
          ${renderAccessibilityFeature("Audio Guidance", accessibility.audioGuidance, "volume-2")}
          ${renderAccessibilityFeature("Sign Language Support", accessibility.signLanguageSupport, "hand")}
        </div>
      </section>

      <button id="directions-btn" class="primary-btn directions-btn" type="button">
        ${createIcon("navigation")}
        Start
      </button>
    </div>
  `;

  const directionsButton = document.getElementById("directions-btn");
  if (directionsButton) {
    directionsButton.addEventListener("click", openDirections);
  }

  if (hasCoordinates) {
    initialiseLeafletMap(location);
  }

  refreshIcons();
}

function initialiseLeafletMap(location) {
  if (!window.L || !location || !Number.isFinite(Number(location.latitude)) || !Number.isFinite(Number(location.longitude))) {
    return;
  }

  const mapElement = document.getElementById("location-map");
  if (!mapElement) {
    return;
  }

  if (mapElement._leaflet_id) {
    return;
  }

  const lat = Number(location.latitude);
  const lng = Number(location.longitude);

  const map = L.map("location-map", {
    zoomControl: true,
    scrollWheelZoom: true,
    attributionControl: true,
  }).setView([lat, lng], 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  const marker = L.marker([lat, lng]).addTo(map);
  marker.bindPopup(`<strong>${escapeHtml(location.name || "Location")}</strong><br>${escapeHtml(location.address || "Address unavailable")}`);
  marker.openPopup();

  setTimeout(() => {
    map.invalidateSize();
  }, 100);
}

function openDirections() {
  if (!APP_STATE.currentLocation || !APP_STATE.currentLocation.address) {
    return;
  }

  const destination = encodeURIComponent(APP_STATE.currentLocation.address);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

  window.open(mapsUrl, "_blank", "noopener,noreferrer");
}

function setLocationFilterByName(filterName) {
  const target = String(filterName || "").trim().toLowerCase();

  if (!target) return false;

  const filterChip = [...document.querySelectorAll("#location-filter-chips .filter-chip")].find(chip => {
    const value = (chip.dataset.filter || chip.textContent.trim()).toLowerCase();
    return value === target || chip.textContent.toLowerCase().includes(target);
  });

  if (!filterChip) return false;

  document.querySelectorAll("#location-filter-chips .filter-chip").forEach(chip => {
    chip.classList.toggle("active", chip === filterChip);
  });

  applyLocationFilters();
  return true;
}

function applyLocationFilters() {
  const locationSearch = document.getElementById("location-search");
  const query = (locationSearch?.value || "").toLowerCase().trim();
  const activeFilterChip = document.querySelector("#location-filter-chips .filter-chip.active");
  const selectedFilter = activeFilterChip?.dataset.filter || "all";

  document.querySelectorAll("#locations-list .location-card").forEach(card => {
    const name = (card.dataset.name || "").toLowerCase();
    const address = (card.dataset.address || "").toLowerCase();
    const city = (card.dataset.city || "").toLowerCase();
    const cardText = `${name} ${address} ${city}`.toLowerCase();

    const matchesFilter =
      selectedFilter === "all" ||
      card.dataset[selectedFilter] === "true";

    const matchesSearch = !query || cardText.includes(query);

    card.style.display = matchesFilter && matchesSearch ? "" : "none";
  });

  if (APP_STATE.mobilityPreferenceEnabled && selectedFilter === "all") {
    const visibleCards = [...document.querySelectorAll("#locations-list .location-card")]
      .filter(card => card.style.display !== "none");
    visibleCards.sort((firstCard, secondCard) =>
      Number(secondCard.dataset.wheelchairAccessible === "true") -
      Number(firstCard.dataset.wheelchairAccessible === "true")
    );
    const locationsList = document.getElementById("locations-list");
    visibleCards.forEach(card => locationsList?.appendChild(card));
  }
}
