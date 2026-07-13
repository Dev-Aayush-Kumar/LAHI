const AI_BASE_URL =
  process.env.AI_SERVER_URL ??
  "http://127.0.0.1:8000";

export async function callAI(
  endpoint: string,
  formData: FormData
) {
  const response = await fetch(
    `${AI_BASE_URL}${endpoint}`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(
      `AI Server Error (${response.status})`
    );
  }

  return response.json();
}