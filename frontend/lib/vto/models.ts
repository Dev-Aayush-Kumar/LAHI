export async function fetchModels() {
  const response = await fetch(
    "/api/vto/models"
  );

  return response.json();
}