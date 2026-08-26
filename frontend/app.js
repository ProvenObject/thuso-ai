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
let recognition = null;
let isListening = false;
let isAssistantSpeaking = false;


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

            card.dataset.search =
                `${service.name || ""} ${
                    service.description || ""
                }`.toLowerCase();

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

        const locations =
            await fetchJson(
                `${API_URL}/api/services/${service.id}/locations`
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

        const locations =
            await fetchJson(
                `${API_URL}/api/locations`
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

        card.dataset.search =
            `${location.name || ""} ${
                location.address || ""
            }`.toLowerCase();

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

            isAssistantSpeaking =
                true;

        }
    );


    speech.addEventListener(
        "end",
        () => {

            isAssistantSpeaking =
                false;

        }
    );


    speech.addEventListener(
        "error",
        () => {

            isAssistantSpeaking =
                false;

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

                const query =
                    event.target.value
                        .toLowerCase()
                        .trim();


                document
                    .querySelectorAll(
                        "#services-list .service-card"
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
            ".filter-chip"
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

                            item.classList.remove(
                                "active"
                            );

                        });


                    chip.classList.add(
                        "active"
                    );

                }
            );

        });
}


/* =========================================================
   PREFERENCE CONTROLS
========================================================= */

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

                }
            );

        });


    /*
        Custom toggle buttons
    */

    document
        .querySelectorAll(
            ".toggle"
        )
        .forEach(toggle => {

            toggle.addEventListener(
                "click",
                () => {

                    toggle.classList.toggle(
                        "active"
                    );


                    /*
                        First communication toggle
                        controls voice output.
                    */

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

                        voiceOutputEnabled =
                            toggle.classList.contains(
                                "active"
                            );
                    }

                }
            );

        });


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


/* =========================================================
   APP INITIALISATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initialiseChat();

        initialiseSpeechRecognition();

        initialiseSearch();

        initialiseFilterChips();

        initialisePreferences();

        initialiseChatSuggestions();

        initialiseLocationBackButton();

        refreshIcons();

    }
);