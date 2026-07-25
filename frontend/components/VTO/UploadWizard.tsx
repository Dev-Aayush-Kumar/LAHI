"use client";

import { useState } from "react";

export default function UploadWizard() {
  const [video, setVideo] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(false);

  async function processVideo() {
    if (!video) return;

    setLoading(true);

    const formData = new FormData();

    formData.append("video", video);

    const response = await fetch(
      "/api/vto/process",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    console.log(data);

    setLoading(false);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
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
        onClick={processVideo}
        disabled={!video || loading}
      >
        {loading
          ? "Processing..."
          : "Upload Video"}
      </button>
    </div>
  );
}