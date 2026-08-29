function createIcon(name) {
  return `<i data-lucide="${name}"></i>`;
}

function refreshIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

function scrollChatToBottom() {
  const chatMessages = document.getElementById("chat-messages");

  if (!chatMessages) return;

  requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
  const status = document.getElementById("hands-free-status");

  if (!status) return;

  status.textContent = message;
}

function getById(id) {
  return document.getElementById(id);
}

const $ = (selector) => document.querySelector(selector);

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
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
