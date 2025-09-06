import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// This assumes the same webhook URL can handle a feedback payload.
// The webhook must be configured to recognize a body like { "feedback": "thumbs_up" }.
const WEBHOOK_URL = 'https://hamzeh1128.app.n8n.cloud/webhook/IBuddy';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      body: "Method Not Allowed" 
    };
  }

  try {
    const requestBody = JSON.parse(event.body || "{}");

    // The API key logic has been removed as it's not needed for your webhook.
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Feedback webhook request failed: ${errorText}`);
      return { 
        statusCode: response.status, 
        body: JSON.stringify({ error: "Feedback webhook request failed." }) 
      };
    }

    // A simple success response is sufficient for the frontend.
    return { 
      statusCode: 200, 
      body: JSON.stringify({ success: true }) 
    };

  } catch (error) {
    console.error("Error in feedback function:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "An internal server error occurred." }) 
    };
  }
};

export { handler };