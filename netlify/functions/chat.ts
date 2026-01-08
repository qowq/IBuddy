import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const WEBHOOK_URL = 'https://hamzeh1128.app.n8n.cloud/webhook/IBuddy';
const ALERT_WEBHOOK_URL = process.env.NOTIFICATION_WEBHOOK; 

/**
 * Notifies the developer via Slack webhook if the n8n automation fails.
 * Slack requires a JSON body with a "text" field.
 */
async function alertDeveloper(errorMessage: string) {
  if (!ALERT_WEBHOOK_URL) {
    console.warn("Alerting skipped: NOTIFICATION_WEBHOOK not set.");
    return;
  }

  try {
    const payload = {
      text: `🚨 *IBStress System Alert*\n> *Error*: ${errorMessage}\n> *Status*: n8n Webhook Unresponsive\n_Please check your n8n.cloud dashboard immediately._`
    };

    await fetch(ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log("Developer alert sent to Slack successfully.");
  } catch (alertError) {
    console.error("Critical: Failed to notify developer via Slack", alertError);
  }
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    const requestBody = JSON.parse(event.body || "{}");

    // Add a timeout to detect if n8n is hanging (e.g., workflow disabled)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); 

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      const statusMessage = `n8n Webhook Error (${response.status}): ${errorText || 'No response body'}`;
      
      console.error(statusMessage);
      await alertDeveloper(statusMessage); 
      
      return {
        statusCode: 503,
        body: JSON.stringify({ error: "The assistant is temporarily offline. We have been notified!" }),
      };
    }

    const responseText = await response.text();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
      body: responseText,
    };

  } catch (error: any) {
    console.error("Error in serverless function:", error);
    
    const isTimeout = error.name === 'AbortError';
    const msg = isTimeout ? "n8n Webhook Timed Out (8s timeout exceeded)" : error.message;
    
    await alertDeveloper(msg); 
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Communication lost. We are investigating!" }),
    };
  }
};

export { handler };
