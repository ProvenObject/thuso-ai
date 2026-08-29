// Screen navigation logic
function showScreen(screenId) {
  const screens = document.querySelectorAll(".screen");
  const targetScreen = document.getElementById(screenId);

  if (!targetScreen) {
    console.warn(`Screen not found: ${screenId}`);
    return;
  }

  screens.forEach(screen => {
    screen.classList.remove("active-screen");
  });

  targetScreen.classList.add("active-screen");

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");

    if (item.dataset.screen === screenId) {
      item.classList.add("active");
    }
  });

  const bottomNav = document.getElementById("bottom-nav");

  if (bottomNav) {
    const hideNavScreens = ["location-details-screen", "camera-screen"];
    bottomNav.style.display = hideNavScreens.includes(screenId) ? "none" : "flex";
  }

  if (screenId === "services-screen" && !document.getElementById("services-list").dataset.loaded) {
    loadServices();
  }

  if (screenId === "locations-screen" && !document.getElementById("locations-list").dataset.loaded) {
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

  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.showScreen = showScreen;

function initialiseLocationBackButton() {
  const detailsScreen = document.getElementById("location-details-screen");
  if (!detailsScreen) return;

  const backButton = detailsScreen.querySelector(".back-btn");
  if (!backButton) return;

  backButton.addEventListener("click", event => {
    event.preventDefault();
    showScreen(APP_STATE.previousScreen || "locations-screen");
  });
}
