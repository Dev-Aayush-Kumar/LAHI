"use client";

import { useState } from "react";

export default function UploadModelPage() {
  const [video, setVideo] = useState<File | null>(null);

  const [modelName, setModelName] =
    useState("Me");

  const [relation, setRelation] =
    useState("Self");

  const [loading, setLoading] =
    useState(false);

  const [response, setResponse] =
    useState<any>(null);

  async function handleUpload() {
    if (!video) {
      alert("Please choose a video.");

      return;
    }

    setLoading(true);

    const formData = new FormData();

    formData.append("video", video);

    formData.append("modelName", modelName);

    formData.append("relation", relation);

    const res = await fetch(
      "/api/vto/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const json = await res.json();

    setResponse(json);

    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-2xl p-10">

      <h1 className="mb-8 text-4xl font-bold">
        Upload User Model
      </h1>

      <div className="space-y-6">

        <input
          className="w-full rounded border p-3"
          value={modelName}
          onChange={(e) =>
            setModelName(e.target.value)
          }
          placeholder="Model Name"
        />

        <input
          className="w-full rounded border p-3"
          value={relation}
          onChange={(e) =>
            setRelation(e.target.value)
          }
          placeholder="Relation"
        />

        <input
          type="file"
          accept="video/*"
          onChange={(e) =>
            setVideo(
              e.target.files?.[0] ?? null
            )
          }
        />

        <button
          disabled={loading}
          onClick={handleUpload}
          className="rounded bg-black px-6 py-3 text-white"
        >
          {loading
            ? "Uploading..."
            : "Upload"}
        </button>

        {response && (
          <pre className="rounded bg-gray-100 p-4 overflow-auto">
            {JSON.stringify(
              response,
              null,
              2
            )}
          </pre>
        )}

      </div>

    </main>
  );
}