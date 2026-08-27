/* =========================================================
   THUŠO AI — APP LOGIC
   ========================================================= */


/* =========================================================
   CONFIG
========================================================= */

/*
    Leave this as an empty string when your frontend and backend
    are served from the same origin.

    Example:
    const API_URL = "http://localhost:3000";
*/

const API_URL = "";


/* =========================================================
   APP STATE
========================================================= */

let previousScreen = "home-screen";
let currentLocation = null;
let currentService = null;

let voiceOutputEnabled = true;
let readAloudEnabled = false;
let mobilityPreferenceEnabled = false;
let appLanguage = "en";
let currentUserPosition = null;
let recognition = null;
let handsFreeRecognition = null;
let isListening = false;
let isAssistantSpeaking = false;
let handsFreeModeActive = false;
let handsFreeListenTimer = null;
let cameraStream = null;
let isOcrProcessing = false;


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (selector) => document.querySelector(selector);

const getById = (id) => document.getElementById(id);


function createIcon(name) {
    return `<i data-lucide="${name}"></i>`;
}


function refreshIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}


function scrollChatToBottom() {
    const chatMessages = getById("chat-messages");

    if (!chatMessages) return;

    requestAnimationFrame(() => {
        chatMessages.scrollTop =
            chatMessages.scrollHeight;
    });
}


function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function normaliseVoiceCommand(value = "") {
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


function updateHandsFreeStatus(message) {
    const status = getById("hands-free-status");

    if (!status) return;

    status.textContent = message;
}


function setHighContrastMode(enabled) {
    const isEnabled = !!enabled;

    document.body.classList.toggle(
        "high-contrast-mode",
        isEnabled
    );

    // Keep the visible preference toggle aligned with voice commands.
    const contrastToggle = getById("high-contrast-toggle");
    contrastToggle?.classList.toggle("active", isEnabled);
    contrastToggle?.setAttribute("aria-pressed", String(isEnabled));

    const status = isEnabled
        ? "High contrast enabled."
        : "High contrast disabled.";

    updateHandsFreeStatus(status);
    speakText(status);
}


function setReadAloudMode(enabled) {
    readAloudEnabled = !!enabled;

    const readAloudToggle = getById("read-aloud-toggle");
    readAloudToggle?.classList.toggle("active", readAloudEnabled);
    readAloudToggle?.setAttribute("aria-pressed", String(readAloudEnabled));

    if (readAloudEnabled) {
        voiceOutputEnabled = true;
    }
}


function speakButtonLabel(button) {
    if (!readAloudEnabled || !button || button.id === "read-aloud-toggle") {
        return;
    }

    const label = button.getAttribute("aria-label") || button.innerText.trim();
    if (label) {
        speakText(label);
    }
}


function calculateDistanceInKilometres(from, to) {
    const earthRadius = 6371;
    const toRadians = degrees => degrees * Math.PI / 180;

    if (
        !Number.isFinite(from.latitude) ||
        !Number.isFinite(from.longitude) ||
        !Number.isFinite(to.latitude) ||
        !Number.isFinite(to.longitude)
    ) {
        return null;
    }

    const latitudeDifference = toRadians(to.latitude - from.latitude);
    const longitudeDifference = toRadians(to.longitude - from.longitude);
    const latitude = toRadians(from.latitude);
    const haversine = Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(latitude) * Math.cos(toRadians(to.latitude)) *
        Math.sin(longitudeDifference / 2) ** 2;

    const boundedHaversine = Math.min(1, Math.max(0, haversine));

    return earthRadius * 2 * Math.atan2(
        Math.sqrt(boundedHaversine),
        Math.sqrt(1 - boundedHaversine)
    );
}


function formatDistance(distanceInKilometres) {
    return distanceInKilometres < 1
        ? `${Math.round(distanceInKilometres * 1000)} m away`
        : `${distanceInKilometres.toFixed(1)} km away`;
}


function updateLocationCardDistances() {
    if (!currentUserPosition) return;

    document.querySelectorAll("#locations-list .location-card").forEach(card => {
        const latitude = Number(card.dataset.latitude);
        const longitude = Number(card.dataset.longitude);
        const distanceElement = card.querySelector(".location-distance");

        if (!distanceElement || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return;
        }

        const distance = calculateDistanceInKilometres(
            currentUserPosition,
            { latitude, longitude }
        );

        if (distance === null) return;

        distanceElement.textContent = formatDistance(distance);
        distanceElement.hidden = false;
    });
}


function requestCurrentLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
        position => {
            currentUserPosition = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            updateLocationCardDistances();
        },
        error => console.info("Current location is unavailable:", error.message),
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
    );
}


function changeTextSize(delta) {
    const textSizeInput = getById("text-size");
    const currentValue = Number(
        textSizeInput?.value || 16
    );
    const nextValue = Math.min(
        22,
        Math.max(14, currentValue + delta)
    );

    document.documentElement.style.fontSize = `${nextValue}px`;

    if (textSizeInput) {
        textSizeInput.value = String(nextValue);
    }

    const status = `Text size set to ${nextValue}px.`;
    updateHandsFreeStatus(status);
    speakText(status);
}


function stopHandsFreeMode() {
    handsFreeModeActive = false;

    if (handsFreeListenTimer) {
        clearTimeout(handsFreeListenTimer);
        handsFreeListenTimer = null;
    }

    if (handsFreeRecognition) {
        try {
            handsFreeRecognition.stop();
        } catch (error) {
            console.warn("Unable to stop hands free recognition:", error);
        }
    }

    const handsFreeButton = getById("hands-free-btn");

    if (handsFreeButton) {
        handsFreeButton.classList.remove("recording");
    }

    updateHandsFreeStatus("Hands free mode off.");
}


function resumeHandsFreeListening() {
    if (!handsFreeModeActive || !handsFreeRecognition || isAssistantSpeaking) {
        return;
    }

    try {
        handsFreeRecognition.start();
    } catch (error) {
        console.warn("Unable to resume hands free recognition:", error);
    }
}


function setServiceFilterByName(filterName) {
    const target = String(filterName || "")
        .trim()
        .toLowerCase();

    if (!target) return false;

    const filterChip = [...document.querySelectorAll(".filter-chip")]
        .find(chip => {
            const value = (
                chip.dataset.filter ||
                chip.textContent.trim()
            ).toLowerCase();

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
    const serviceSearch = getById("service-search");
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
    const locationSearch = getById("location-search");
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

    if (mobilityPreferenceEnabled && selectedFilter === "all") {
        const visibleCards = [...document.querySelectorAll("#locations-list .location-card")]
            .filter(card => card.style.display !== "none");
        visibleCards.sort((firstCard, secondCard) =>
            Number(secondCard.dataset.wheelchairAccessible === "true") -
            Number(firstCard.dataset.wheelchairAccessible === "true")
        );
        const locationsList = getById("locations-list");
        visibleCards.forEach(card => locationsList?.appendChild(card));
    }
}


function getCityFromVoiceCommand(command) {
    const cityMap = {
        polokwane: "Polokwane",
        seshego: "Seshego",
        lebowakgomo: "Lebowakgomo",
        mokopane: "Mokopane",
        tzaneen: "Tzaneen",
        giyani: "Giyani",
        thohoyandou: "Thohoyandou",
        "louis trichardt": "Louis Trichardt",
        musina: "Musina",
        burgersfort: "Burgersfort",
        "jane furse": "Jane Furse",
        "janefurse": "Jane Furse",
        "makhado": "Louis Trichardt",
        "sibasa": "Thohoyandou",
        "groot letaba": "Tzaneen"
    };

    const commandText = normaliseVoiceCommand(command);

    for (const [key, value] of Object.entries(cityMap)) {
        if (commandText.includes(key)) {
            return value;
        }
    }

    return null;
}


function getServiceFromVoiceCommand(command) {
    const serviceMap = {
        "home affairs": "home affairs",
        "home affairs office": "home affairs",
        "id office": "home affairs",
        "passport office": "home affairs",
        "birth certificate": "home affairs",
        "grant": "sassa",
        "sassa": "sassa",
        "social grant": "sassa",
        "health": "health",
        "clinic": "health",
        "hospital": "health",
        "doctor": "health",
        "medical": "health",
        "municipality": "municipal services",
        "municipal services": "municipal services",
        "rates": "municipal services",
        "water": "municipal services",
        "electricity": "municipal services",
        "education": "education",
        "school": "education",
        "bursary": "education",
        "university": "education"
    };

    const commandText = normaliseVoiceCommand(command);

    for (const [key, value] of Object.entries(serviceMap)) {
        if (commandText.includes(key)) {
            return value;
        }
    }

    return null;
}


function getAccessibilityFilterFromVoiceCommand(command) {
    const commandText = normaliseVoiceCommand(command);

    if (
        commandText.includes("wheelchair") ||
        commandText.includes("wheel chair") ||
        commandText.includes("mobility") ||
        commandText.includes("accessibility") && commandText.includes("wheelchair")
    ) {
        return "wheelchair";
    }

    if (
        commandText.includes("ramp") ||
        commandText.includes("step free") ||
        commandText.includes("level access")
    ) {
        return "ramp";
    }

    if (
        commandText.includes("elevator") ||
        commandText.includes("lift")
    ) {
        return "elevator";
    }

    if (
        commandText.includes("audio") ||
        commandText.includes("voice guidance") ||
        commandText.includes("audio guidance")
    ) {
        return "audio";
    }

    if (
        commandText.includes("sign language") ||
        commandText.includes("sign language support") ||
        commandText.includes("deaf") ||
        commandText.includes("hearing")
    ) {
        return "sign";
    }

    if (
        commandText.includes("accessible entrance") ||
        commandText.includes("easy entry") ||
        commandText.includes("step free entrance")
    ) {
        return "entrance";
    }

    return "all";
}


function executeHandsFreeCommand(rawCommand) {
    const command = normaliseVoiceCommand(rawCommand);

    if (!command) {
        return false;
    }

    const matchesAny = (terms) =>
        terms.some(term => command.includes(term));

    if (
        matchesAny([
            "increase text size",
            "make text bigger",
            "bigger text",
            "larger text",
            "text bigger"
        ]) || (
            command.includes("text size") &&
            /(up|increase|larger|bigger|more)/.test(command)
        )
    ) {
        changeTextSize(1);
        return true;
    }

    if (
        matchesAny([
            "decrease text size",
            "make text smaller",
            "smaller text",
            "reduce text size",
            "text smaller"
        ]) || (
            command.includes("text size") &&
            /(down|decrease|smaller|less|reduce)/.test(command)
        )
    ) {
        changeTextSize(-1);
        return true;
    }

    if (
        matchesAny([
            "turn on high contrast",
            "enable high contrast",
            "activate high contrast",
            "high contrast on",
            "turn on contrast",
            "enable contrast",
            "activate contrast",
            "contrast on"
        ]) || (
            command.includes("contrast") &&
            /(on|enable|activate|light|bright)/.test(command)
        )
    ) {
        setHighContrastMode(true);
        return true;
    }

    if (
        matchesAny([
            "turn off high contrast",
            "disable high contrast",
            "deactivate high contrast",
            "high contrast off",
            "turn off contrast",
            "disable contrast",
            "deactivate contrast",
            "contrast off",
            "normal contrast",
            "low contrast"
        ]) || (
            command.includes("contrast") &&
            /(off|disable|deactivate|normal|low)/.test(command)
        )
    ) {
        setHighContrastMode(false);
        return true;
    }

    if (
        matchesAny([
            "turn on voice responses",
            "enable voice responses",
            "activate voice responses",
            "turn on speech",
            "turn on voice output"
        ]) || (
            command.includes("voice") &&
            /on|enable|activate/.test(command)
        )
    ) {
        voiceOutputEnabled = true;
        const status = "Voice responses enabled.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "turn off voice responses",
            "disable voice responses",
            "deactivate voice responses",
            "turn off speech",
            "turn off voice output"
        ]) || (
            command.includes("voice") &&
            /off|disable|deactivate/.test(command)
        )
    ) {
        voiceOutputEnabled = false;
        const status = "Voice responses disabled.";
        updateHandsFreeStatus(status);
        return true;
    }

    if (
        matchesAny([
            "open home",
            "go home",
            "show home",
            "home screen",
            "return home",
            "back home"
        ])
    ) {
        showScreen("home-screen");
        const status = "Opening home.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "show home affairs",
            "open home affairs",
            "home affairs",
            "find home affairs",
            "home affairs office"
        ])
    ) {
        showScreen("services-screen");
        setServiceFilterByName("home affairs");
        const status = "Opening Home Affairs services.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "show sassa",
            "open sassa",
            "sassa",
            "find sassa",
            "social grant office"
        ])
    ) {
        showScreen("services-screen");
        setServiceFilterByName("sassa");
        const status = "Opening SASSA services.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "show health",
            "open health",
            "department of health",
            "health services",
            "find clinic",
            "find hospital",
            "medical help"
        ])
    ) {
        showScreen("services-screen");
        setServiceFilterByName("health");
        const status = "Opening health services.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "open services",
            "show services",
            "find service",
            "go to services",
            "service list",
            "government services"
        ])
    ) {
        showScreen("services-screen");
        const status = "Opening services.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "open locations",
            "show locations",
            "accessible facilities",
            "find places",
            "show accessible places",
            "open accessible facilities",
            "show nearby places"
        ])
    ) {
        showScreen("locations-screen");
        const status = "Opening accessible locations.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "show wheelchair",
            "wheelchair accessible",
            "show wheelchair accessible",
            "find wheelchair friendly place",
            "find wheelchair access",
            "look for wheelchair"
        ])
    ) {
        showScreen("locations-screen");
        setLocationFilterByName("wheelchairAccessible");
        const status = "Showing wheelchair accessible locations.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "show ramp access",
            "ramp accessible",
            "step free places",
            "level access",
            "show step free locations"
        ])
    ) {
        showScreen("locations-screen");
        setLocationFilterByName("accessibleEntrance");
        const status = "Showing step-free and ramp-accessible locations.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "show elevator",
            "lift access",
            "elevator access",
            "find lift places"
        ])
    ) {
        showScreen("locations-screen");
        setLocationFilterByName("accessibleEntrance");
        const status = "Showing elevator-accessible locations.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "show audio guidance",
            "audio guidance locations",
            "voice guided places",
            "audio assisted locations"
        ])
    ) {
        showScreen("locations-screen");
        setLocationFilterByName("audioGuidance");
        const status = "Showing locations with audio guidance.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "show sign language",
            "sign language support",
            "deaf accessible",
            "hearing friendly places"
        ])
    ) {
        showScreen("locations-screen");
        setLocationFilterByName("signLanguageSupport");
        const status = "Showing locations with sign language support.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    const city = getCityFromVoiceCommand(command);
    const service = getServiceFromVoiceCommand(command);
    const accessibility = getAccessibilityFilterFromVoiceCommand(command);

    if (service || city || accessibility !== "all") {
        showScreen("locations-screen");

        if (service) {
            setServiceFilterByName(service);
        }

        if (accessibility !== "all") {
            const mappedFilter = accessibility === "audio" ? "audio" : accessibility === "sign" ? "sign" : accessibility === "entrance" ? "all" : accessibility;
            if (mappedFilter !== "all") {
                setLocationFilterByName(mappedFilter);
            }
        }

        if (city) {
            const locationSearch = getById("location-search");
            if (locationSearch) {
                locationSearch.value = city;
            }
            applyLocationFilters();
        }

        const status = service
            ? `Showing ${service} locations${city ? ` in ${city}` : ""}.`
            : city
                ? `Showing locations in ${city}.`
                : "Showing accessible locations.";

        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "open ask",
            "open chat",
            "ask thušo",
            "talk to thušo",
            "start chat"
        ])
    ) {
        showScreen("ask-screen");
        const status = "Opening chat.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "open menu",
            "show menu",
            "open settings",
            "show settings",
            "go to menu",
            "main menu"
        ])
    ) {
        showScreen("menu-screen");
        const status = "Opening menu.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "open preferences",
            "show preferences",
            "my preferences",
            "go to preferences",
            "accessibility settings"
        ])
    ) {
        showScreen("preferences-screen");
        const status = "Opening preferences.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "open saved",
            "show saved",
            "saved places",
            "my saved places"
        ])
    ) {
        showScreen("saved-screen");
        const status = "Opening saved places.";
        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    if (
        matchesAny([
            "stop hands free",
            "exit hands free",
            "close hands free",
            "finish hands free",
            "deactivate hands free",
            "turn off hands free"
        ])
    ) {
        stopHandsFreeMode();
        return true;
    }

    if (
        matchesAny([
            "help",
            "what can you do",
            "what can i say",
            "voice help",
            "show commands"
        ])
    ) {
        const status =
            "Try open home, open services, open chat, find home affairs, show wheelchair accessible places, increase text size, decrease text size, or turn on high contrast.";

        updateHandsFreeStatus(status);
        speakText(status);
        return true;
    }

    return false;
}


function initialiseHandsFreeControls() {
    const handsFreeButton = getById("hands-free-btn");

    if (!handsFreeButton) return;

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        handsFreeButton.disabled = true;
        handsFreeButton.title = "Speech recognition is not supported in this browser.";
        handsFreeButton.innerHTML = `
            <i data-lucide="mic-off"></i>
            <span>Hands Free</span>
        `;
        refreshIcons();
        updateHandsFreeStatus("Hands free unavailable in this browser.");
        return;
    }

    handsFreeRecognition = new SpeechRecognition();
    handsFreeRecognition.lang = "en-ZA";
    handsFreeRecognition.continuous = false;
    handsFreeRecognition.interimResults = false;

    handsFreeRecognition.addEventListener(
        "start",
        () => {
            handsFreeModeActive = true;
            handsFreeButton.classList.add("recording");
            updateHandsFreeStatus("Listening for voice commands...");
        }
    );

    handsFreeRecognition.addEventListener(
        "result",
        event => {
            let transcript = "";

            for (let index = 0; index < event.results.length; index += 1) {
                transcript += event.results[index][0].transcript;
            }

            const command = transcript.trim();

            if (!command) {
                return;
            }

            updateHandsFreeStatus(
                `Heard: ${command}`
            );

            const handled = executeHandsFreeCommand(command);

            if (!handled) {
                const fallback =
                    "Command not recognised. Try open home, open services, increase text size, decrease text size, or turn on high contrast.";

                updateHandsFreeStatus(fallback);
                speakText(fallback);
            }
        }
    );

    handsFreeRecognition.addEventListener(
        "end",
        () => {
            handsFreeButton.classList.remove("recording");

            if (handsFreeModeActive) {
                if (handsFreeListenTimer) {
                    clearTimeout(handsFreeListenTimer);
                }

                handsFreeListenTimer = setTimeout(() => {
                    if (!handsFreeModeActive || isAssistantSpeaking) {
                        return;
                    }

                    resumeHandsFreeListening();
                }, 350);
            }
        }
    );

    handsFreeRecognition.addEventListener(
        "error",
        event => {
            if (
                event.error !== "no-speech" &&
                event.error !== "aborted"
            ) {
                console.warn(
                    "Hands free recognition error:",
                    event.error
                );
            }
        }
    );

    handsFreeButton.addEventListener(
        "click",
        () => {
            if (handsFreeModeActive) {
                stopHandsFreeMode();
                return;
            }

            handsFreeModeActive = true;
            updateHandsFreeStatus("Hands free mode started. Say a command.");
            speakText("Hands free mode started. Say a command.");
        }
    );

    updateHandsFreeStatus("Hands free ready.");
}


async function fetchJson(url, options = {}) {

    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(
            `Request failed: ${response.status}`
        );
    }

    return response.json();
}


/* =========================================================
   SCREEN NAVIGATION
========================================================= */

function updateOcrStatus(message) {
    const status = getById("ocr-status");

    if (status) {
        status.textContent = message;
    }
}


function stopCamera() {
    if (!cameraStream) return;

    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
}


async function readImageWithOcr(imageSource) {
    if (!window.Tesseract || isOcrProcessing) return;

    isOcrProcessing = true;
    updateOcrStatus("Reading text...");

    try {
        const result = await Tesseract.recognize(
            imageSource,
            "eng",
            {
                logger: progress => {
                    if (progress.status === "recognizing text") {
                        updateOcrStatus(
                            `Reading text... ${Math.round((progress.progress || 0) * 100)}%`
                        );
                    }
                }
            }
        );

        const text = result.data.text.trim();

        if (!text) {
            updateOcrStatus("No text found. Try again with better lighting.");
            speakText("I could not find any text. Please try again with better lighting.");
            return;
        }

        updateOcrStatus("Text read successfully.");
        speakText(text);
    } catch (error) {
        console.error("OCR failed:", error);
        updateOcrStatus("Could not read the image. Try again.");
        speakText("I could not read that image. Please try again.");
    } finally {
        isOcrProcessing = false;
    }
}


function captureCameraImage() {
    const video = getById("camera-video");
    const canvas = getById("camera-canvas");

    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        updateOcrStatus("Camera is not ready yet.");
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    readImageWithOcr(canvas);
}


async function initialiseCamera() {
    const video = getById("camera-video");

    if (!video || cameraStream) return;

    if (!navigator.mediaDevices?.getUserMedia) {
        updateOcrStatus("Camera is not supported in this browser.");
        return;
    }

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false
        });
        video.srcObject = cameraStream;
        updateOcrStatus("Camera ready. Focus on text and capture.");
    } catch (error) {
        console.error("Unable to open camera:", error);
        updateOcrStatus("Camera permission is needed to read text.");
    }
}


function initialiseCameraControls() {
    const captureButton = getById("capture-btn");
    const galleryButton = getById("gallery-btn");
    const galleryInput = getById("gallery-input");

    captureButton?.addEventListener("click", captureCameraImage);
    galleryButton?.addEventListener("click", () => galleryInput?.click());
    galleryInput?.addEventListener("change", event => {
        const file = event.target.files?.[0];
        if (file) readImageWithOcr(file);
        event.target.value = "";
    });
}

function showScreen(screenId) {

    const screens =
        document.querySelectorAll(".screen");

    const targetScreen =
        getById(screenId);

    if (!targetScreen) {
        console.warn(
            `Screen not found: ${screenId}`
        );
        return;
    }

    screens.forEach(screen => {
        screen.classList.remove("active-screen");
    });

    targetScreen.classList.add("active-screen");


    /* -----------------------------------------
       Bottom navigation active state
    ----------------------------------------- */

    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.remove("active");

            if (
                item.dataset.screen === screenId
            ) {
                item.classList.add("active");
            }

        });


    /* -----------------------------------------
       Hide bottom navigation on detail/camera
    ----------------------------------------- */

    const bottomNav =
        getById("bottom-nav");

    if (bottomNav) {

        const hideNavScreens = [
            "location-details-screen",
            "camera-screen"
        ];

        bottomNav.style.display =
            hideNavScreens.includes(screenId)
                ? "none"
                : "flex";
    }


    /* -----------------------------------------
       Screen-specific loading
    ----------------------------------------- */

    if (
        screenId === "services-screen" &&
        !getById("services-list").dataset.loaded
    ) {
        loadServices();
    }

    if (
        screenId === "locations-screen" &&
        !getById("locations-list").dataset.loaded
    ) {
        loadAllLocations();
    }

    if (screenId === "locations-screen") {
        requestCurrentLocation();
    }

    if (screenId === "camera-screen") {
        initialiseCamera();
    } else {
        stopCamera();
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/*
    Expose this globally because index.html
    uses onclick="showScreen(...)"
*/

window.showScreen = showScreen;


/* =========================================================
   SERVICES
========================================================= */

async function loadServices() {

    const servicesList =
        getById("services-list");

    if (!servicesList) return;

    servicesList.innerHTML = `
        <div class="loading-state">
            Loading services...
        </div>
    `;

    try {

        const services =
            await fetchJson(
                `${API_URL}/api/services`
            );

        servicesList.innerHTML = "";

        if (
            !Array.isArray(services) ||
            services.length === 0
        ) {
            servicesList.innerHTML = `
                <div class="empty-state">
                    <h3>No services found</h3>
                    <p>
                        Please try again later.
                    </p>
                </div>
            `;

            return;
        }


        services.forEach(service => {

            const card =
                document.createElement("button");

            card.type = "button";

            card.className =
                "service-card";

            card.dataset.serviceId =
                service.id;
            card.dataset.name =
                service.name || "";
            card.dataset.category =
                service.category || "";
            card.dataset.search =
                `${service.name || ""} ${
                    service.description || ""
                } ${service.category || ""}`.toLowerCase();

            card.innerHTML = `
                <div class="service-icon">
                    ${createIcon("landmark")}
                </div>

                <div class="service-info">
                    <h3>
                        ${escapeHtml(
                            service.name
                        )}
                    </h3>

                    <p>
                        ${escapeHtml(
                            service.description ||
                            "Find locations and services"
                        )}
                    </p>
                </div>

                ${createIcon("chevron-right")}
            `;

            card.addEventListener(
                "click",
                () => {
                    loadLocations(
                        service
                    );
                }
            );

            servicesList.appendChild(
                card
            );

        });


        servicesList.dataset.loaded =
            "true";

        applyServiceFilters();
        refreshIcons();

    } catch (error) {

        console.error(
            "Unable to load services:",
            error
        );

        servicesList.innerHTML = `
            <div class="empty-state">
                <h3>
                    Unable to load services
                </h3>

                <p>
                    Please check your connection
                    and try again.
                </p>
            </div>
        `;
    }
}


/* =========================================================
   LOAD LOCATIONS FOR A SERVICE
========================================================= */

async function attachAccessibilityData(locations) {
    const accessibilityRecords = await fetchJson(`${API_URL}/api/accessibility`);
    const recordsById = new Map(
        accessibilityRecords.map(record => [String(record.id), record])
    );

    // Location metadata and accessibility metadata are provided by separate APIs.
    return locations.map(location => ({
        ...location,
        accessibility: recordsById.get(String(location.id)) || {}
    }));
}

async function loadLocations(service) {

    if (!service || !service.id) {
        console.warn(
            "Invalid service supplied."
        );

        return;
    }

    currentService = service;

    previousScreen = "services-screen";

    const locationsList =
        getById("locations-list");

    if (!locationsList) return;


    showScreen(
        "locations-screen"
    );

    locationsList.dataset.loaded =
        "true";

    locationsList.innerHTML = `
        <div class="loading-state">
            Loading locations...
        </div>
    `;

    try {

        const locations = await attachAccessibilityData(
            await fetchJson(
                `${API_URL}/api/services/${service.id}/locations`
            )
        );

        renderLocations(
            locations,
            service.name
        );

    } catch (error) {

        console.error(
            "Unable to load locations:",
            error
        );

        locationsList.innerHTML = `
            <div class="empty-state">
                <h3>
                    Unable to load locations
                </h3>

                <p>
                    Please try again later.
                </p>
            </div>
        `;
    }
}


/* =========================================================
   LOAD ALL LOCATIONS
========================================================= */

async function loadAllLocations() {

    const locationsList =
        getById("locations-list");

    if (!locationsList) return;

    locationsList.innerHTML = `
        <div class="loading-state">
            Loading locations...
        </div>
    `;

    try {

        const locations = await attachAccessibilityData(
            await fetchJson(
                `${API_URL}/api/locations`
            )
        );

        renderLocations(locations);

        locationsList.dataset.loaded =
            "true";

    } catch (error) {

        /*
            Some backends may not have a general
            /api/locations endpoint.

            We handle that gracefully instead of
            crashing the application.
        */

        console.warn(
            "Unable to load all locations:",
            error
        );

        locationsList.innerHTML = `
            <div class="empty-state">
                <h3>
                    Find a service first
                </h3>

                <p>
                    Select a government service to
                    see its available locations.
                </p>

                <button
                    class="primary-btn"
                    type="button"
                    id="find-services-btn"
                >
                    Find Services
                </button>
            </div>
        `;

        const button =
            getById("find-services-btn");

        if (button) {
            button.addEventListener(
                "click",
                () => {
                    showScreen(
                        "services-screen"
                    );
                }
            );
        }
    }
}


/* =========================================================
   RENDER LOCATIONS
========================================================= */

function renderLocations(
    locations,
    serviceName = ""
) {

    const locationsList =
        getById("locations-list");

    if (!locationsList) return;

    locationsList.innerHTML = "";


    if (
        serviceName &&
        serviceName.trim()
    ) {

        const heading =
            document.createElement("div");

        heading.className =
            "locations-service-heading";

        heading.innerHTML = `
            <p>
                Showing locations for
            </p>

            <h3>
                ${escapeHtml(serviceName)}
            </h3>
        `;

        locationsList.appendChild(
            heading
        );
    }


    if (
        !Array.isArray(locations) ||
        locations.length === 0
    ) {

        locationsList.innerHTML += `
            <div class="empty-state">
                <h3>
                    No locations found
                </h3>

                <p>
                    Try another service.
                </p>
            </div>
        `;

        return;
    }


    locations.forEach(location => {

        const card =
            document.createElement("button");

        card.type = "button";

        card.className =
            "location-card";

        const accessibility = location.accessibility || {};

        // Keep card datasets aligned with the location and accessibility models.
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
            <div class="location-icon">
                ${createIcon("map-pin")}
            </div>

            <div class="location-info">
                <h3>
                    ${escapeHtml(
                        location.name
                    )}
                </h3>

                <p>
                    ${escapeHtml(
                        location.address ||
                        "Address unavailable"
                    )}
                </p>

                <p class="location-distance" hidden>
                    Distance unavailable
                </p>
            </div>

            ${createIcon("chevron-right")}
        `;

        card.addEventListener(
            "click",
            () => {

                loadLocationDetails(
                    location.id,
                    "locations-screen"
                );

            }
        );

        locationsList.appendChild(
            card
        );

    });


    refreshIcons();
    updateLocationCardDistances();
}


/* =========================================================
   LOCATION DETAILS
========================================================= */

async function loadLocationDetails(
    locationId,
    fromScreen = "locations-screen"
) {

    previousScreen = fromScreen;

    const details =
        getById("location-details");

    if (!details) return;


    showScreen(
        "location-details-screen"
    );


    details.innerHTML = `
        <div class="loading-state">
            Loading location details...
        </div>
    `;


    try {

        const location =
            await fetchJson(
                `${API_URL}/api/locations/${locationId}`
            );

        currentLocation = location;


        let accessibility = {};

        try {

            accessibility =
                await fetchJson(
                    `${API_URL}/api/locations/${locationId}/accessibility`
                );

        } catch (accessibilityError) {

            console.warn(
                "Accessibility information unavailable:",
                accessibilityError
            );
        }


        renderLocationDetails(
            location,
            accessibility
        );

    } catch (error) {

        console.error(
            "Unable to load location:",
            error
        );

        details.innerHTML = `
            <div class="empty-state">
                <h3>
                    Unable to load this location
                </h3>

                <p>
                    Please try again.
                </p>

                <button
                    class="primary-btn"
                    type="button"
                    id="retry-location-btn"
                >
                    Try Again
                </button>
            </div>
        `;

        const retryButton =
            getById(
                "retry-location-btn"
            );

        if (retryButton) {

            retryButton.addEventListener(
                "click",
                () => {

                    loadLocationDetails(
                        locationId,
                        fromScreen
                    );

                }
            );
        }
    }
}


function getAccessibilityStatus(value) {

    if (value === true) {
        return {
            label: "Available",
            state: "available",
            icon: "circle-check"
        };
    }

    if (value === false) {
        return {
            label: "Not available",
            state: "unavailable",
            icon: "circle-x"
        };
    }

    return {
        label: "Not verified",
        state: "unknown",
        icon: "circle-help"
    };
}


function renderAccessibilityFeature(
    title,
    value,
    icon
) {

    const status =
        getAccessibilityStatus(value);

    return `
        <div class="accessibility-feature">
            ${createIcon(icon)}

            <h4>
                ${escapeHtml(title)}
            </h4>

            <p class="feature-status ${status.state}">
                ${status.label}
            </p>
        </div>
    `;
}


function renderLocationDetails(
    location,
    accessibility
) {

    const details =
        getById("location-details");

    if (!details) return;


    const image =
        location.image ||
        location.imageUrl ||
        "";


    details.innerHTML = `

        ${
            image
                ? `
                    <img
                        class="location-image"
                        src="${escapeHtml(image)}"
                        alt="${escapeHtml(location.name)}"
                    >
                `
                : `
                    <div class="location-image-placeholder">
                        ${createIcon("building-2")}
                    </div>
                `
        }


        <div class="details-content">

            <div class="location-title-row">

                <div>

                    <h1>
                        ${escapeHtml(
                            location.name
                        )}
                    </h1>

                    <p class="location-address">
                        ${createIcon("map-pin")}
                        ${escapeHtml(
                            location.address ||
                            "Address unavailable"
                        )}
                    </p>

                </div>

            </div>


            ${
                location.description
                    ? `
                        <p class="location-description">
                            ${escapeHtml(
                                location.description
                            )}
                        </p>
                    `
                    : ""
            }


            <section class="accessibility-section">

                <div class="section-heading">

                    <h2>
                        Accessibility
                    </h2>

                    <p>
                        Information about available features
                    </p>

                </div>


                <div class="accessibility-features">

                    ${renderAccessibilityFeature(
                        "Wheelchair Access",
                        accessibility.wheelchairAccessible,
                        "accessibility"
                    )}

                    ${renderAccessibilityFeature(
                        "Accessible Entrance",
                        accessibility.accessibleEntrance,
                        "door-open"
                    )}

                    ${renderAccessibilityFeature(
                        "Audio Guidance",
                        accessibility.audioGuidance,
                        "volume-2"
                    )}

                    ${renderAccessibilityFeature(
                        "Sign Language Support",
                        accessibility.signLanguageSupport,
                        "hand"
                    )}

                </div>

            </section>


            <button
                id="directions-btn"
                class="primary-btn directions-btn"
                type="button"
            >

                ${createIcon("navigation")}

                Get Directions

            </button>

        </div>
    `;


    const directionsButton =
        getById("directions-btn");

    if (directionsButton) {

        directionsButton.addEventListener(
            "click",
            openDirections
        );
    }


    refreshIcons();
}


/* =========================================================
   DIRECTIONS
========================================================= */

function openDirections() {

    if (
        !currentLocation ||
        !currentLocation.address
    ) {
        return;
    }

    const destination =
        encodeURIComponent(
            currentLocation.address
        );

    const mapsUrl =
        `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

    window.open(
        mapsUrl,
        "_blank",
        "noopener,noreferrer"
    );
}


/* =========================================================
   CHAT
========================================================= */

function addChatMessage(
    text,
    type = "assistant"
) {

    const chatMessages =
        getById("chat-messages");

    if (!chatMessages) return;

    const message =
        document.createElement("div");

    message.className =
        `message ${type}-message`;

    message.textContent = text;

    chatMessages.appendChild(message);

    scrollChatToBottom();

    return message;
}


function addTypingIndicator() {

    const chatMessages =
        getById("chat-messages");

    if (!chatMessages) return null;

    const typing =
        document.createElement("div");

    typing.className =
        "message assistant-message typing-message";

    typing.id = "typing-indicator";

    typing.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;

    chatMessages.appendChild(
        typing
    );

    scrollChatToBottom();

    return typing;
}


function removeTypingIndicator() {

    const typing =
        getById("typing-indicator");

    if (typing) {
        typing.remove();
    }
}


async function sendChatMessage(message) {

    if (!message) return;


    addChatMessage(
        message,
        "user"
    );


    const typing =
        addTypingIndicator();


    try {

        const data =
            await fetchJson(
                `${API_URL}/api/ask`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            message
                        })
                }
            );


        typing?.remove();


        const responseText =
            data.response ||
            data.message ||
            "Sorry, I could not find an answer.";


        addChatMessage(
            responseText,
            "assistant"
        );


        if (
            data.locations &&
            Array.isArray(
                data.locations
            )
        ) {

            data.locations.forEach(
                location => {

                    addChatLocation(
                        location
                    );

                }
            );
        }


        if (
            data.service &&
            data.service.id
        ) {

            addChatServiceAction(
                data.service
            );
        }


        speakText(
            responseText
        );

    } catch (error) {

        console.error(
            "Chat request failed:",
            error
        );

        typing?.remove();

        addChatMessage(
            "Sorry, I'm having trouble connecting right now.",
            "assistant"
        );

    } finally {

        removeTypingIndicator();

        scrollChatToBottom();
    }
}


function addChatLocation(location) {

    const chatMessages =
        getById("chat-messages");

    if (!chatMessages) return;

    const locationCard =
        document.createElement("button");

    locationCard.type = "button";

    locationCard.className =
        "chat-location-card";

    if (
        location.accessibilityMatch
    ) {
        locationCard.classList.add(
            "recommended-location"
        );
    }


    locationCard.innerHTML = `

        ${
            location.accessibilityMatch
                ? `
                    <span class="recommendation-label">
                        ✓ Recommended for you
                    </span>
                `
                : ""
        }

        <h3>
            ${escapeHtml(location.name)}
        </h3>

        <p>
            ${escapeHtml(
                location.address ||
                "Address unavailable"
            )}
        </p>
    `;


    locationCard.addEventListener(
        "click",
        () => {

            loadLocationDetails(
                location.id,
                "ask-screen"
            );

        }
    );


    chatMessages.appendChild(
        locationCard
    );

    scrollChatToBottom();
}


function addChatServiceAction(
    service
) {

    const chatMessages =
        getById("chat-messages");

    if (!chatMessages) return;

    const button =
        document.createElement("button");

    button.type = "button";

    button.className =
        "chat-service-btn";

    button.textContent =
        `View ${service.name} locations →`;


    button.addEventListener(
        "click",
        () => {

            loadLocations(
                service
            );

        }
    );


    chatMessages.appendChild(
        button
    );

    scrollChatToBottom();
}


/* =========================================================
   SPEECH RECOGNITION
========================================================= */

function initialiseSpeechRecognition() {

    const voiceButton =
        getById("voice-btn");

    if (!voiceButton) return;


    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        voiceButton.style.display =
            "none";

        console.warn(
            "Speech recognition is not supported in this browser."
        );

        return;
    }


    recognition =
        new SpeechRecognition();


    recognition.continuous =
        false;

    recognition.interimResults =
        false;

    recognition.lang =
        "en-ZA";


    recognition.addEventListener(
        "start",
        () => {

            isListening = true;

            voiceButton.disabled =
                true;

            voiceButton.classList.add(
                "recording"
            );

            refreshIcons();

        }
    );


    /*
        IMPORTANT FIX:

        The old version attempted to access
        event.results inside the "start" event.

        There is no transcript available there.

        Speech results belong here.
    */

    recognition.addEventListener(
        "result",
        event => {

            const transcript =
                event.results[
                    event.resultIndex
                ][0].transcript;


            const normalised =
                transcript
                    .toLowerCase()
                    .trim();


            const stopCommands = [
                "stop",
                "stop listening",
                "exit conversation",
                "end conversation",
                "goodbye",
                "good bye"
            ];


            if (
                stopCommands.some(
                    command =>
                        normalised.includes(
                            command
                        )
                )
            ) {

                recognition.stop();

                addChatMessage(
                    "Voice input stopped.",
                    "assistant"
                );

                return;
            }


            const chatInput =
                getById("chat-input");


            if (chatInput) {

                chatInput.value =
                    transcript;

                const form =
                    getById("chat-form");

                form?.requestSubmit();
            }

        }
    );


    recognition.addEventListener(
        "end",
        () => {

            isListening = false;

            voiceButton.disabled =
                false;

            voiceButton.classList.remove(
                "recording"
            );

        }
    );


    recognition.addEventListener(
        "error",
        event => {

            isListening = false;

            voiceButton.disabled =
                false;

            voiceButton.classList.remove(
                "recording"
            );


            /*
                "no-speech" is normal and doesn't
                need a scary error for the user.
            */

            if (
                event.error !== "no-speech" &&
                event.error !== "aborted"
            ) {

                console.error(
                    "Speech recognition error:",
                    event.error
                );
            }

        }
    );


    voiceButton.addEventListener(
        "click",
        () => {

            if (!recognition) return;


            if (isListening) {

                recognition.stop();

                return;
            }


            try {

                recognition.start();

            } catch (error) {

                /*
                    Prevent InvalidStateError
                    if recognition is already running.
                */

                console.warn(
                    "Unable to start recognition:",
                    error
                );
            }

        }
    );
}


/* =========================================================
   TEXT TO SPEECH
========================================================= */

function speakText(text) {

    if (!voiceOutputEnabled) {
        return;
    }

    if (
        !(
            "speechSynthesis" in window
        )
    ) {

        console.warn(
            "Text-to-speech is not supported."
        );

        return;
    }

    if (handsFreeModeActive && handsFreeRecognition) {
        try {
            handsFreeRecognition.stop();
        } catch (error) {
            console.warn("Unable to pause hands free recognition:", error);
        }
    }

    window.speechSynthesis.cancel();

    const speech =
        new SpeechSynthesisUtterance(
            text
        );

    speech.lang =
        "en-ZA";

    speech.rate =
        1;

    speech.pitch =
        1;

    speech.addEventListener(
        "start",
        () => {
            isAssistantSpeaking = true;
            updateHandsFreeStatus("Assistant speaking...");
        }
    );

    speech.addEventListener(
        "end",
        () => {
            isAssistantSpeaking = false;

            if (handsFreeModeActive && !voiceOutputEnabled) {
                return;
            }

            if (handsFreeModeActive) {
                setTimeout(() => {
                    resumeHandsFreeListening();
                }, 300);
            }
        }
    );

    speech.addEventListener(
        "error",
        () => {
            isAssistantSpeaking = false;

            if (handsFreeModeActive) {
                setTimeout(() => {
                    resumeHandsFreeListening();
                }, 300);
            }
        }
    );

    window.speechSynthesis.speak(
        speech
    );
}


/* =========================================================
   SEARCH
========================================================= */

function initialiseSearch() {

    const serviceSearch =
        getById("service-search");

    const locationSearch =
        getById("location-search");


    if (serviceSearch) {

        serviceSearch.addEventListener(
            "input",
            event => {
                applyServiceFilters();
            }
        );
    }


    if (locationSearch) {

        locationSearch.addEventListener(
            "input",
            event => {

                const query =
                    event.target.value
                        .toLowerCase()
                        .trim();


                document
                    .querySelectorAll(
                        "#locations-list .location-card"
                    )
                    .forEach(card => {

                        const matches =
                            card.dataset.search
                                .includes(query);

                        card.style.display =
                            matches
                                ? ""
                                : "none";

                    });

            }
        );
    }
}


/* =========================================================
   FILTER CHIPS
========================================================= */

function initialiseFilterChips() {

    document
        .querySelectorAll(
            "#service-filter-chips .filter-chip"
        )
        .forEach(chip => {

            chip.addEventListener(
                "click",
                () => {

                    const container =
                        chip.parentElement;

                    container
                        ?.querySelectorAll(
                            ".filter-chip"
                        )
                        .forEach(item => {
                            item.classList.remove("active");
                        });

                    chip.classList.add("active");
                    applyServiceFilters();
                }
            );

        });

    document
        .querySelectorAll(
            "#location-filter-chips .filter-chip"
        )
        .forEach(chip => {

            chip.addEventListener(
                "click",
                () => {

                    const container =
                        chip.parentElement;

                    container
                        ?.querySelectorAll(
                            ".filter-chip"
                        )
                        .forEach(item => {
                            item.classList.remove("active");
                        });

                    chip.classList.add("active");
                    applyLocationFilters();
                }
            );

        });

    applyServiceFilters();
    applyLocationFilters();
}


/* =========================================================
   PREFERENCE CONTROLS
========================================================= */

function applyLanguagePreference(languageCode = appLanguage) {
    const language = String(languageCode || "en").toLowerCase();
    appLanguage = language;

    document.documentElement.lang = language;

    if (handsFreeRecognition) {
        handsFreeRecognition.lang =
            language === "af" ? "af-ZA" :
            language === "zu" ? "zu-ZA" :
            language === "xh" ? "xh-ZA" :
            language === "nso" ? "n-ZA" :
            language === "tn" ? "en-ZA" :
            "en-ZA";
    }

    const speechLanguage =
        language === "af" ? "af-ZA" :
        language === "zu" ? "zu-ZA" :
        language === "xh" ? "xh-ZA" :
        language === "nso" ? "n-ZA" :
        language === "tn" ? "en-ZA" :
        "en-ZA";

    const status = `Language set to ${language.toUpperCase()}.`;
    updateHandsFreeStatus(status);

    if (voiceOutputEnabled) {
        speakText(status);
    }
}


function applyAccessibilityPreference(chip) {
    if (!chip) return;

    const chipText = chip.textContent.toLowerCase();

    if (chipText.includes("low vision")) {
        setHighContrastMode(true);
        changeTextSize(2);
        return;
    }

    if (chipText.includes("blind")) {
        setHighContrastMode(true);
        voiceOutputEnabled = true;
        const toggle = document.querySelector(".toggle.active");
        if (toggle) {
            toggle.classList.add("active");
        }
        speakText("Blind mode enabled.");
        return;
    }

    if (chipText.includes("deaf")) {
        voiceOutputEnabled = false;
        const status = "Voice responses turned off for deaf mode.";
        updateHandsFreeStatus(status);
        return;
    }

    if (chipText.includes("mobility")) {
        mobilityPreferenceEnabled = true;
        showScreen("locations-screen");
        setLocationFilterByName("all");
        applyLocationFilters();
        const status = "Mobility mode opened with wheelchair-friendly locations.";
        updateHandsFreeStatus(status);
        speakText(status);
    }
}


function initialisePreferences() {

    /*
        Preference chips
    */

    document
        .querySelectorAll(
            ".preference-chip"
        )
        .forEach(chip => {

            chip.addEventListener(
                "click",
                () => {

                    chip.classList.toggle(
                        "selected"
                    );

                    if (chip.classList.contains("selected")) {
                        applyAccessibilityPreference(chip);
                    } else if (chip.textContent.toLowerCase().includes("mobility")) {
                        mobilityPreferenceEnabled = false;
                        applyLocationFilters();
                    }
                }
            );

        });


    /*
        Custom toggle buttons
    */

    const contrastToggle = getById("high-contrast-toggle");

    const readAloudToggle = getById("read-aloud-toggle");

    if (readAloudToggle) {
        readAloudToggle.addEventListener("click", () => {
            setReadAloudMode(!readAloudEnabled);
            if (readAloudEnabled) {
                speakText("Read aloud enabled.");
            }
        });
    }

    if (contrastToggle) {
        const contrastEnabled = document.body.classList.contains("high-contrast-mode");
        contrastToggle.classList.toggle("active", contrastEnabled);
        contrastToggle.setAttribute("aria-pressed", String(contrastEnabled));

        contrastToggle.addEventListener("click", () => {
            setHighContrastMode(
                !document.body.classList.contains("high-contrast-mode")
            );
        });
    }

    document
        .querySelectorAll(
            ".toggle:not(#high-contrast-toggle):not(#read-aloud-toggle)"
        )
        .forEach(toggle => {

            toggle.addEventListener(
                "click",
                () => {

                    toggle.classList.toggle(
                        "active"
                    );

                    const settingText =
                        toggle
                            .closest(
                                ".setting-row"
                            )
                            ?.innerText
                            ?.toLowerCase();

                    if (
                        settingText?.includes(
                            "voice responses"
                        )
                    ) {
                        voiceOutputEnabled = toggle.classList.contains("active");
                        if (!voiceOutputEnabled) {
                            setReadAloudMode(false);
                        }
                        const status = voiceOutputEnabled
                            ? "Voice responses enabled."
                            : "Voice responses disabled.";
                        updateHandsFreeStatus(status);

                        if (voiceOutputEnabled) {
                            speakText(status);
                        }
                    }
                }
            );

        });


    /*
        Language select
    */

    const languageSelect = getById("language-select");

    if (languageSelect) {
        languageSelect.addEventListener("change", event => {
            const selectedLanguage = event.target.value || "en";
            applyLanguagePreference(selectedLanguage);
        });
    }


    /*
        Text size
    */

    const textSize =
        getById("text-size");


    if (textSize) {

        textSize.addEventListener(
            "input",
            event => {

                document.documentElement.style.fontSize =
                    `${event.target.value}px`;

            }
        );
    }
}


/* =========================================================
   CHAT SUGGESTION BUTTONS
========================================================= */

function initialiseChatSuggestions() {

    document
        .querySelectorAll(
            ".suggestion-chip"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const chatInput =
                        getById(
                            "chat-input"
                        );

                    if (!chatInput) return;

                    chatInput.value =
                        button.textContent
                            .trim();

                    getById(
                        "chat-form"
                    )?.requestSubmit();

                }
            );

        });
}


/* =========================================================
   CHAT FORM
========================================================= */

function initialiseChat() {

    const chatForm =
        getById("chat-form");

    const chatInput =
        getById("chat-input");


    if (
        !chatForm ||
        !chatInput
    ) {
        return;
    }


    chatForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const message =
                chatInput.value.trim();


            if (!message) {
                return;
            }


            chatInput.value = "";


            sendChatMessage(
                message
            );

        }
    );
}


/* =========================================================
   LOCATION DETAILS BACK BUTTON
========================================================= */

function initialiseLocationBackButton() {

    const detailsScreen =
        getById(
            "location-details-screen"
        );

    if (!detailsScreen) return;


    const backButton =
        detailsScreen.querySelector(
            ".back-btn"
        );


    if (!backButton) return;


    /*
        Override the inline onclick behaviour
        if necessary.
    */

    backButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            showScreen(
                previousScreen ||
                "locations-screen"
            );

        }
    );
}


function initialiseEmergencyHelp() {
    const emergencyButton = getById("emergency-help-btn");

    if (!emergencyButton) return;

    emergencyButton.addEventListener("click", () => {
        const message = "South African emergency numbers: 112 from a mobile phone, 10111 for police, and 10177 for ambulance services.";
        updateHandsFreeStatus(message);

        if (voiceOutputEnabled) {
            speakText(message);
        }

        if (window.confirm(`${message}\n\nCall 112 now?`)) {
            window.location.href = "tel:112";
        }
    });
}


/* =========================================================
   APP INITIALISATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initialiseChat();

        initialiseSpeechRecognition();

        initialiseHandsFreeControls();

        initialiseSearch();

        initialiseFilterChips();

        initialisePreferences();

        initialiseChatSuggestions();

        initialiseLocationBackButton();

        initialiseEmergencyHelp();

        initialiseCameraControls();

        document.addEventListener("click", event => {
            speakButtonLabel(event.target.closest("button"));
        }, true);

        refreshIcons();

    }
);