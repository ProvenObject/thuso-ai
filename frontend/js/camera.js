// Camera and OCR functionality
function updateOcrStatus(message) {
  const status = document.getElementById("ocr-status");

  if (status) {
    status.textContent = message;
  }
}

function stopCamera() {
  if (!APP_STATE.cameraStream) return;

  APP_STATE.cameraStream.getTracks().forEach(track => track.stop());
  APP_STATE.cameraStream = null;
}

async function readImageWithOcr(imageSource) {
  if (!window.Tesseract || APP_STATE.isOcrProcessing) return;

  APP_STATE.isOcrProcessing = true;
  updateOcrStatus("Reading text...");

  try {
    const result = await Tesseract.recognize(imageSource, "eng", {
      logger: progress => {
        if (progress.status === "recognizing text") {
          updateOcrStatus(`Reading text... ${Math.round((progress.progress || 0) * 100)}%`);
        }
      }
    });

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
    APP_STATE.isOcrProcessing = false;
  }
}

function captureCameraImage() {
  const video = document.getElementById("camera-video");
  const canvas = document.getElementById("camera-canvas");

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
  const video = document.getElementById("camera-video");

  if (!video || APP_STATE.cameraStream) return;

  if (!navigator.mediaDevices?.getUserMedia) {
    updateOcrStatus("Camera is not supported in this browser.");
    return;
  }

  try {
    APP_STATE.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    video.srcObject = APP_STATE.cameraStream;
    updateOcrStatus("Camera ready. Focus on text and capture.");
  } catch (error) {
    console.error("Unable to open camera:", error);
    updateOcrStatus("Camera permission is needed to read text.");
  }
}

function initialiseCameraControls() {
  const captureButton = document.getElementById("capture-btn");
  const galleryButton = document.getElementById("gallery-btn");
  const galleryInput = document.getElementById("gallery-input");

  captureButton?.addEventListener("click", captureCameraImage);
  galleryButton?.addEventListener("click", () => galleryInput?.click());
  galleryInput?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (file) readImageWithOcr(file);
    event.target.value = "";
  });
}
