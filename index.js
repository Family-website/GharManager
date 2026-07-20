// ============================================================
// GharManager Pro — Cloud Functions
// Phase 1 security fix: the OpenRouter API key lives ONLY here,
// in the server environment config. It never ships to the
// browser. The client (script.js -> _orCallAPI) calls this
// function instead of calling OpenRouter directly.
// ============================================================

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Set this once from your terminal (never commit the real key):
//   firebase functions:config:set openrouter.key="sk-or-v1-...."
// Then redeploy: firebase deploy --only functions
const OPENROUTER_API_KEY = functions.config().openrouter && functions.config().openrouter.key;
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "deepseek/deepseek-chat-v3-0324:free"; // same free model script.js already used

// Safety cap so a stolen session / bug can't run up usage unnoticed.
// Adjust to taste — this only limits calls per signed-in user per day.
const DAILY_LIMIT = 60;

exports.askAI = functions.https.onCall(async (data, context) => {
  // ---- 1. Must be a signed-in GharManager user ----
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Login required to use AI features."
    );
  }
  const uid = context.auth.uid;

  // ---- 2. Basic input validation ----
  const messages = data && data.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "messages array is required."
    );
  }
  if (!OPENROUTER_API_KEY) {
    console.error("openrouter.key is not configured — see functions:config:set instructions above.");
    throw new functions.https.HttpsError(
      "internal",
      "AI is not configured on the server yet."
    );
  }

  // ---- 3. Per-user daily rate limit ----
  // One counter doc per user per day: aiUsage/{uid}_{YYYY-MM-DD}
  // Firestore rules (see firestore.rules) block clients from writing
  // this collection directly — only this Cloud Function (Admin SDK)
  // can increment it, so the cap can't be bypassed from the browser.
  const today = new Date().toISOString().slice(0, 10);
  const usageRef = admin.firestore().collection("aiUsage").doc(`${uid}_${today}`);
  const usageSnap = await usageRef.get();
  const currentCount = usageSnap.exists ? usageSnap.data().count || 0 : 0;

  if (currentCount >= DAILY_LIMIT) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Aaj ki AI limit khatam ho gayi. Kal try karein."
    );
  }

  // ---- 4. Call OpenRouter with the server-side key ----
  let response;
  try {
    const fetchFn = (await import("node-fetch")).default;
    response = await fetchFn(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        max_tokens: 700,
        temperature: 0.72,
        messages: messages,
      }),
    });
  } catch (networkErr) {
    console.error("OpenRouter network error:", networkErr);
    throw new functions.https.HttpsError("unavailable", "AI server unreachable, try again.");
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const message = (errBody && errBody.error && errBody.error.message) || `HTTP ${response.status}`;
    console.error("OpenRouter error:", response.status, message);
    if (response.status >= 500) {
      throw new functions.https.HttpsError("unavailable", message);
    }
    throw new functions.https.HttpsError("internal", message);
  }

  const json = await response.json();
  const reply = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;

  // ---- 5. Record usage (fire-and-forget style, but awaited for correctness) ----
  await usageRef.set(
    { count: currentCount + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );

  return { reply: reply || "" };
});
