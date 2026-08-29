// Service loading and filtering
async function loadServices() {
  const servicesList = document.getElementById("services-list");

  if (!servicesList) return;

  servicesList.innerHTML = `
    <div class="loading-state">Loading services...</div>
  `;

  try {
    const API_URL = window.APP_CONFIG?.API_URL || "";
    const services = await fetchJson(`${API_URL}/api/services`);
    servicesList.innerHTML = "";

    if (!Array.isArray(services) || services.length === 0) {
      servicesList.innerHTML = `
        <div class="empty-state">
          <h3>No services found</h3>
          <p>Please try again later.</p>
        </div>
      `;
      return;
    }

    services.forEach(service => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "service-card";
      card.dataset.serviceId = service.id;
      card.dataset.name = service.name || "";
      card.dataset.category = service.category || "";
      card.dataset.search = `${service.name || ""} ${service.description || ""} ${service.category || ""}`.toLowerCase();

      card.innerHTML = `
        <div class="service-icon">${createIcon("landmark")}</div>
        <div class="service-info">
          <h3>${escapeHtml(service.name)}</h3>
          <p>${escapeHtml(service.description || "Find locations and services")}</p>
        </div>
        ${createIcon("chevron-right")}
      `;

      card.addEventListener("click", () => {
        loadLocations(service);
      });

      servicesList.appendChild(card);
    });

    servicesList.dataset.loaded = "true";
    applyServiceFilters();
    refreshIcons();
  } catch (error) {
    console.error("Unable to load services:", error);
    servicesList.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load services</h3>
        <p>Please check your connection and try again.</p>
      </div>
    `;
  }
}

function setServiceFilterByName(filterName) {
  const target = String(filterName || "").trim().toLowerCase();

  if (!target) return false;

  const filterChip = [...document.querySelectorAll(".filter-chip")].find(chip => {
    const value = (chip.dataset.filter || chip.textContent.trim()).toLowerCase();

    return value === target ||
      chip.textContent.toLowerCase().includes(target) ||
      (target === "health" && value.includes("health"));
  });

  if (!filterChip) return false;

  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.classList.toggle("active", chip === filterChip);
  });

  applyServiceFilters();
  return true;
}

function applyServiceFilters() {
  const serviceSearch = document.getElementById("service-search");
  const query = (serviceSearch?.value || "").toLowerCase().trim();

  const activeFilterChip = document.querySelector("#service-filter-chips .filter-chip.active");
  const selectedFilter = (activeFilterChip?.dataset.filter || "all").toLowerCase();

  document.querySelectorAll("#services-list .service-card").forEach(card => {
    const serviceName = (card.dataset.name || "").toLowerCase();
    const serviceCategory = (card.dataset.category || "").toLowerCase();
    const cardText = `${serviceName} ${serviceCategory} ${(card.dataset.search || "")}`.toLowerCase();

    const matchesFilter =
      selectedFilter === "all" ||
      serviceName === selectedFilter ||
      serviceCategory.includes(selectedFilter) ||
      serviceName.includes(selectedFilter);

    const matchesSearch = !query || cardText.includes(query);

    card.style.display = matchesFilter && matchesSearch ? "" : "none";
  });
}
