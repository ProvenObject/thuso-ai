const { GoogleGenAI } = require("@google/genai");
const { GEMINI_API_KEY } = require("../../config");

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
let aiServiceAvailable = Boolean(ai);

// context carries the previous conversation state so Gemini can resolve references
// like "which one is closest" without us re-explaining the whole history.
async function getAiIntent(rawMessage, context = {}) {
  if (!ai) {
    aiServiceAvailable = false;
    return null;
  }

  const conversationContext = {
    service: context.service || null,
    city: context.city || null,
    accessibilityNeed: context.accessibilityNeed || null,
    userGoal: context.userGoal || null,
    selectedLocation: context.selectedLocation || null,
    pendingQuestion: context.pendingQuestion || null,
  };

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `
You are the language understanding system for Thušo AI.

Thušo AI helps people find government services and accessible
service locations in Limpopo, South Africa.

Analyse the user's CURRENT message. Use the conversation context below ONLY to resolve
references the current message makes to earlier turns (for example "which one is
closest" or "what documents do I need"). Never invent a fact that is not present in the
message or in this context.

Conversation context (fields may be null if unknown):
${JSON.stringify(conversationContext)}

Identify:
1. service - which service they need.
2. userGoal - their underlying goal as a short snake_case label, e.g. "identity_document".
3. accessibilityNeed - an accessibility need, if mentioned.
4. city - a city or town, if mentioned.
5. locationReference - a short phrase describing a reference to a previously shown
   facility, e.g. "closest" or "that one", or null if none.
6. intent - the single best matching intent from the allowed list below.
7. needsClarification - true only if the message is too ambiguous to act on confidently.
8. clarificationQuestion - a short question to ask the user when needsClarification is
   true, otherwise null.

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

The message may come from speech-to-text and contain a known local transcription
variant. Canonicalise only these explicit variants: Lebowakomo, Leboakgomo, and
Lebowa Kgomo mean Lebowakgomo; Thoyandou and Thohoyando mean Thohoyandou; Mokopani
means Mokopane; Sesego means Seshego; Jane First means Jane Furse; Louis Richardt
means Louis Trichardt. Return the exact known-city spelling. Do not use fuzzy
matching or invent a city not in the known list.

Map common service terms carefully: ID, identification, identity document, passport,
birth certificate and marriage certificate refer to Home Affairs; grant, social grant
and SASSA grant refer to SASSA; doctor, hospital, clinic and healthcare refer to
Department of Health; school, education and bursary refer to Education.

Allowed intent values:
- find_service
- find_facility
- facility_details
- accessibility_question
- directions
- nearby_facilities
- service_information
- follow_up_question
- general_help
- ui_command

You only classify what the user is asking for. You never execute UI actions yourself,
even for "ui_command" - that intent is only a label handled elsewhere in the system.

Return ONLY valid JSON, using this exact format:

{
  "service": "Home Affairs or SASSA or Department of Health or Municipal Services or Education or null",
  "userGoal": "short snake_case goal or null",
  "accessibilityNeed": "wheelchairAccessible or audioGuidance or signLanguageSupport or accessibleEntrance or null",
  "city": "city name or null",
  "locationReference": "short phrase or null",
  "intent": "one of the allowed intent values",
  "needsClarification": true or false,
  "clarificationQuestion": "a short question or null"
}

User message:
"${rawMessage}"
      `,
    });

    const text = result.text || "";
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedText);

    aiServiceAvailable = true;

    return {
      service: parsed.service || null,
      userGoal: parsed.userGoal || null,
      accessibilityNeed: parsed.accessibilityNeed || null,
      city: parsed.city || null,
      locationReference: parsed.locationReference || null,
      intent: parsed.intent || null,
      needsClarification: Boolean(parsed.needsClarification),
      clarificationQuestion: parsed.clarificationQuestion || null,
    };
  } catch (error) {
    aiServiceAvailable = false;
    console.error("Gemini understanding error:", error.message);
    return null;
  }
}

module.exports = {
  ai,
  getAiIntent,
  isAiServiceAvailable: () => aiServiceAvailable,
};
