const API_URL = "http://localhost:3000";

// Screen elements
const screens = document.querySelectorAll(".screen");

function showScreen(screenId) {
    screens.forEach(screen => {
        screen.classList.remove("active");
    });

    document
        .getElementById(screenId)
        .classList.add("active");
}


// Find Service button
document
    .getElementById("find-service-btn")
    .addEventListener("click", () => {
        loadServices();
        showScreen("services-screen");
    });


// Load government services
async function loadServices() {
    const servicesList = document.getElementById("services-list");

    servicesList.innerHTML = "<p>Loading services...</p>";

    try {
        const response = await fetch(
            `${API_URL}/api/services`
        );

        const services = await response.json();

        servicesList.innerHTML = "";

        services.forEach(service => {
            const card = document.createElement("button");

            card.classList.add("card");

            card.innerHTML = `
                <h3>${service.name}</h3>
                <p>${service.description}</p>
            `;

            card.addEventListener("click", () => {
                loadLocations(service);
            });

            servicesList.appendChild(card);
        });

    } catch (error) {
        console.error(error);

        servicesList.innerHTML =
            "<p>Unable to load services. Please try again.</p>";
    }
}


// Load locations for a selected service
async function loadLocations(service) {
    const locationsList =
        document.getElementById("locations-list");

    document.getElementById(
        "selected-service-name"
    ).textContent = service.name;

    locationsList.innerHTML =
        "<p>Loading locations...</p>";

    showScreen("locations-screen");

    try {
        const response = await fetch(
            `${API_URL}/api/services/${service.id}/locations`
        );

        const locations = await response.json();

        locationsList.innerHTML = "";

        locations.forEach(location => {
            const card = document.createElement("button");

            card.classList.add("card");

            card.innerHTML = `
                <h3>${location.name}</h3>
                <p>${location.address}</p>
            `;

            card.addEventListener("click", () => {
                loadLocationDetails(location.id);
            });

            locationsList.appendChild(card);
        });

    } catch (error) {
        console.error(error);

        locationsList.innerHTML =
            "<p>Unable to load locations.</p>";
    }
}


// Load location details and accessibility information
async function loadLocationDetails(locationId) {

    showScreen("location-screen");

    try {
        const locationResponse = await fetch(
            `${API_URL}/api/locations/${locationId}`
        );

        const location = await locationResponse.json();

        document.getElementById(
            "location-name"
        ).textContent = location.name;

        document.getElementById(
            "location-address"
        ).textContent = location.address;


        const accessibilityResponse = await fetch(
            `${API_URL}/api/locations/${locationId}/accessibility`
        );

        const accessibility =
            await accessibilityResponse.json();

        const accessibilityInfo =
            document.getElementById("accessibility-info");

        accessibilityInfo.innerHTML = `
            <div class="accessibility-item">
                <strong>Wheelchair Accessible</strong>
                ${accessibility.wheelchairAccessible ? "Yes" : "No"}
            </div>

            <div class="accessibility-item">
                <strong>Accessible Entrance</strong>
                ${accessibility.accessibleEntrance ? "Yes" : "No"}
            </div>

            <div class="accessibility-item">
                <strong>Audio Guidance</strong>
                ${accessibility.audioGuidance ? "Available" : "Not available"}
            </div>

            <div class="accessibility-item">
                <strong>Sign Language Support</strong>
                ${accessibility.signLanguageSupport ? "Available" : "Not available"}
            </div>
        `;

    } catch (error) {
        console.error(error);
    }
}


// Back buttons
document.querySelectorAll(".back-btn").forEach(button => {

    button.addEventListener("click", () => {
        showScreen(button.dataset.back);
    });

});