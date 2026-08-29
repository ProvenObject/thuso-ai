const { GoogleGenAI } = require("@google/genai");
const { GEMINI_API_KEY } = require("../../config");

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

async function getAiIntent(rawMessage) {
  if (!ai) {
    return null;
  }

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `
You are the language understanding system for Thušo AI.

Thušo AI helps people find government services and accessible
service locations in Limpopo, South Africa.

Analyse ONLY the user's CURRENT message.

Identify:
1. Which service they need.
2. Whether they mention an accessibility need.
3. Whether they mention a city or town.

Available services:
- Home Affairs
- SASSA
- Department of Health
- Municipal Services
- Education

Available accessibility needs:
- wheelchairAccessible
- audioGuidance
- signLanguageSupport
- accessibleEntrance

Known cities:
- Polokwane
- Seshego
- Lebowakgomo
- Mokopane
- Tzaneen
- Giyani
- Thohoyandou
- Louis Trichardt
- Musina
- Burgersfort
- Jane Furse

Return ONLY valid JSON.

Use this exact format:

{
  "service": "Home Affairs or SASSA or Department of Health or Municipal Services or Education or null",
  "accessibilityNeed": "wheelchairAccessible or audioGuidance or signLanguageSupport or accessibleEntrance or null",
  "city": "city name or null"
}

User message:
"${rawMessage}"
      `,
    });

    const text = result.text || "";
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini understanding error:", error.message);
    return null;
  }
}

module.exports = {
  ai,
  getAiIntent,
};
