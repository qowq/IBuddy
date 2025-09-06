import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const apiKey = process.env.API_KEY;
const WEBHOOK_URL = 'https://hamzeh1128.app.n8n.cloud/webhook/IBuddy';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Ensure the API key is configured on the server
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API_KEY is not configured on the server." }),
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    const requestBody = JSON.parse(event.body || "{}");

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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
