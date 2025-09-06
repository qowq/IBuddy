import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const WEBHOOK_URL = 'https://hamzeh1128.app.n8n.cloud/webhook/IBuddy';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
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
      console.error(`Webhook request failed with status ${response.status}: ${errorText}`);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Webhook request failed: ${errorText}` }),
      };
    }

    const responseText = await response.text();
    
    // Return the successful response from the webhook to the frontend
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
      body: responseText,
    };

  } catch (error) {
    console.error("Error in serverless function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred." }),
    };
  }
};

export { handler };