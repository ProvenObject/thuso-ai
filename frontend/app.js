const API_URL = "";

let currentLocation = null;

// Screen elements
const screens = document.querySelectorAll(".screen");

let previousScreen = null;

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

// Ask Thušo button
document
    .getElementById("ask-thuso-btn")
    .addEventListener("click", () => {
        showScreen("ask-screen");
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
                loadLocationDetails(
                    location.id,
                    "locations-screen"
                );
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
async function loadLocationDetails(
    locationId,
    fromScreen = "locations-screen"
) {

    previousScreen = fromScreen;

    showScreen("location-screen");

    try {
        const locationResponse = await fetch(
            `${API_URL}/api/locations/${locationId}`
        );

        const location = await locationResponse.json();

        currentLocation = location;

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

        function getAccessibilityStatus(value, availableText, unavailableText) {
    if (value === true) {
        return availableText;
    }

    if (value === false) {
        return unavailableText;
    }

    return "Not verified";
}

        accessibilityInfo.innerHTML = `
            <div class="accessibility-item">
                <strong>Wheelchair Accessible</strong>
                ${getAccessibilityStatus(
                    accessibility.wheelchairAccessible,
                    "Yes",
                    "No"
                )}
            </div>

            <div class="accessibility-item">
                <strong>Accessible Entrance</strong>
                ${getAccessibilityStatus(
                    accessibility.accessibleEntrance,
                    "Yes",
                    "No"
                )}
            </div>

            <div class="accessibility-item">
                <strong>Audio Guidance</strong>
                ${getAccessibilityStatus(
                    accessibility.audioGuidance,
                    "Available",
                    "Not available"
                )}
            </div>

            <div class="accessibility-item">
                <strong>Sign Language Support</strong>
                ${getAccessibilityStatus(
                    accessibility.signLanguageSupport,
                    "Available",
                    "Not available"
                )}
            </div>
        `;

    } catch (error) {
        console.error(error);
    }
}

// Chat functionality
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");

const voiceOutputToggle =
    document.getElementById("voice-output-toggle");

let voiceOutputEnabled = true;

voiceOutputToggle.addEventListener("change", () => {
    voiceOutputEnabled =
        voiceOutputToggle.checked;
});

const voiceInputBtn =
    document.getElementById("voice-input-btn");

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;

if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.lang = "en-ZA";

    voiceInputBtn.addEventListener("click", () => {

        recognition.start();

    });

    recognition.addEventListener("start", () => {

        voiceInputBtn.textContent = "Listening...";

        voiceInputBtn.disabled = true;

    });

    recognition.addEventListener("result", (event) => {

        const transcript =
            event.results[0][0].transcript;

        chatInput.value = transcript;

        // Automatically send the spoken message
        chatForm.requestSubmit();

    });
    
    recognition.addEventListener("end", () => {

        voiceInputBtn.textContent = "🎤";

        voiceInputBtn.disabled = false;

    });

    recognition.addEventListener("error", (event) => {

        console.error(
            "Speech recognition error:",
            event.error
        );

        voiceInputBtn.textContent = "🎤";

        voiceInputBtn.disabled = false;

    });

} else {

    voiceInputBtn.style.display = "none";

    console.warn(
        "Speech recognition is not supported in this browser."
    );
}

function speakText(text) {

    if (!voiceOutputEnabled) {
        return;
    }

    if (!("speechSynthesis" in window)) {
        console.warn(
            "Text-to-speech is not supported in this browser."
        );
        return;
    }

    // Stop any previous speech
        window.speechSynthesis.cancel();

        const speech =
            new SpeechSynthesisUtterance(text);

        speech.lang = "en-ZA";
        speech.rate = 1;
        speech.pitch = 1;

        window.speechSynthesis.speak(speech);
    }

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = chatInput.value.trim();

    if (!message) {
        return;
    }

    // Create user message
    const userMessage = document.createElement("div");

    userMessage.classList.add("message", "user-message");

    userMessage.textContent = message;

    chatMessages.appendChild(userMessage);

    // Clear input
    chatInput.value = "";

    try {
    const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: message
        })
    });

    const data = await response.json();

const assistantMessage = document.createElement("div");

assistantMessage.classList.add(
    "message",
    "assistant-message"
);

assistantMessage.textContent = data.response;

chatMessages.appendChild(assistantMessage);

speakText(data.response);

// Show recommended locations

    if (data.locations && data.locations.length > 0) {

    data.locations.forEach(location => {

        const locationCard =
            document.createElement("button");

        locationCard.classList.add("chat-location-card");

        if (location.accessibilityMatch) {
            locationCard.classList.add("recommended-location");
        }

        locationCard.innerHTML = `
            ${location.accessibilityMatch
                ? `<span class="recommendation-label">
                    ✓ Recommended for you
                   </span>`
                : ""
            }

            <h3>${location.name}</h3>

            <p>${location.address}</p>
        `;

        locationCard.addEventListener("click", () => {
            loadLocationDetails(
                location.id,
                "ask-screen"
            );
        });
        chatMessages.appendChild(locationCard);
    });
}

    // Show service action if a matching service was found
if (data.service) {
    const serviceButton = document.createElement("button");

    serviceButton.classList.add("chat-service-btn");

    serviceButton.textContent =
        `View ${data.service.name} locations →`;

    serviceButton.addEventListener("click", () => {
        loadLocations(data.service);
    });

    chatMessages.appendChild(serviceButton);
}

} catch (error) {
    console.error(error);

    const assistantMessage = document.createElement("div");

    assistantMessage.classList.add(
        "message",
        "assistant-message"
    );

    assistantMessage.textContent =
        "Sorry, I'm having trouble connecting right now.";

    chatMessages.appendChild(assistantMessage);
}
    // Scroll to newest message
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Get directions using Google Maps
document
    .getElementById("directions-btn")
    .addEventListener("click", () => {

        if (!currentLocation) {
            return;
        }

        const destination = encodeURIComponent(
            currentLocation.address
        );

        const mapsUrl =
            `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

        window.open(mapsUrl, "_blank");
    });

// Back buttons
document.querySelectorAll(".back-btn").forEach(button => {

    button.addEventListener("click", () => {

        const currentScreen = document.querySelector(
            ".screen.active"
        );

        if (
            currentScreen.id === "location-screen" &&
            previousScreen
        ) {
            showScreen(previousScreen);
            return;
        }

        showScreen(button.dataset.back);
    });

});