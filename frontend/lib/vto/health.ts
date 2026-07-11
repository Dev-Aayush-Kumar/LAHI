const AI_BASE_URL =
  process.env.AI_SERVER_URL ??
  "http://127.0.0.1:8000";

export async function checkAIHealth() {
  try {
    const response = await fetch(
      `${AI_BASE_URL}/pose/health`
    );

    if (!response.ok) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}