export async function checkAIHealth() {
  try {
    const baseUrl = process.env.AI_SERVER_URL?.replace(/\/$/, "");
    if (!baseUrl) return false;
    const response = await fetch(
      `${baseUrl}/v1/health`
    );

    if (!response.ok) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}