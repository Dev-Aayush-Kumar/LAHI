function aiConfig() {
  const baseUrl = process.env.AI_SERVER_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("AI_SERVER_URL is not configured.");
  }
  return {
    baseUrl,
    token: process.env.AI_SERVER_TOKEN,
  };
}

function headers(init?: HeadersInit) {
  const { token } = aiConfig();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init,
  };
}

export async function callAI(endpoint: string, formData: FormData) {
  const { baseUrl } = aiConfig();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    body: formData,
    headers: headers(),
  });

  if (!response.ok) {
    throw new Error(`AI Server Error (${response.status})`);
  }

  return response.json();
}

export async function getAIJson(endpoint: string) {
  const { baseUrl } = aiConfig();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: headers(),
  });
  if (!response.ok) {
    throw new Error(`AI Server Error (${response.status})`);
  }
  return response.json();
}

export async function postAIJson(endpoint: string, body: unknown) {
  const { baseUrl } = aiConfig();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: headers({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`AI Server Error (${response.status})`);
  }
  return response.json();
}
