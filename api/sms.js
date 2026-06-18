const { sendJson, readBody, fetchJsonWithTimeout } = require("../lib/shared");

// Twilio SMS fallback — lets a farmer receive the advisory as plain text on a
// feature phone. Uses Twilio's REST API directly via fetch (no SDK dependency).
//
// Configure in Vercel → Settings → Environment Variables:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_FROM_NUMBER            (e.g. +14155238886)   OR
//   TWILIO_MESSAGING_SERVICE_SID  (e.g. MGxxxxxxxx...)
//
// When unset, the endpoint stays graceful: it returns 200 with sent:false and a
// clear reason, so the UI can tell the user SMS is not set up yet.

// Normalize to E.164. Bare 10-digit numbers are assumed Indian (+91).
function toE164(raw) {
  const cleaned = String(raw || "").replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("+")) return /^\+\d{8,15}$/.test(cleaned) ? cleaned : null;
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.length >= 11 && cleaned.length <= 15) return `+${cleaned}`;
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST /api/sms" });

  const payload = await readBody(req);
  const phone = toE164(payload.phone || payload.to);
  const message = String(payload.message || payload.body || "").trim().slice(0, 1500);

  if (!phone) return sendJson(res, 400, { error: "Enter a valid phone number with country code, e.g. +9198XXXXXXXX" });
  if (!message) return sendJson(res, 400, { error: "message is required" });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
    return sendJson(res, 200, {
      sent: false,
      configured: false,
      reason: "SMS not set up. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER (or TWILIO_MESSAGING_SERVICE_SID) in Vercel.",
      preview: { to: phone, body: message }
    });
  }

  try {
    const params = new URLSearchParams();
    params.set("To", phone);
    if (messagingServiceSid) params.set("MessagingServiceSid", messagingServiceSid);
    else params.set("From", fromNumber);
    params.set("Body", message);

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const { response, data } = await fetchJsonWithTimeout(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      },
      15_000
    );

    if (!response.ok) {
      return sendJson(res, 200, {
        sent: false,
        configured: true,
        reason: data.message || `Twilio HTTP ${response.status}`,
        code: data.code || null
      });
    }

    return sendJson(res, 200, {
      sent: true,
      configured: true,
      sid: data.sid,
      to: phone,
      status: data.status
    });
  } catch (error) {
    return sendJson(res, 200, { sent: false, configured: true, reason: error.message });
  }
};
