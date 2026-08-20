import assert from "node:assert/strict";
import test from "node:test";

import { AppError, ErrorCodes } from "../lib/errors";
import {
  assetIdFromInternalUrl,
  browserFacingResultFromRemote,
  browserFacingResultUrl,
  isInternalAiAssetUrl,
  serveTryOnMediaForUser,
} from "../lib/vto/media";
import { getAIBinary } from "../lib/vto/aiClient";

const PNG_BYTES = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test("browser-facing result URLs stay on the Next.js origin", () => {
  const url = browserFacingResultFromRemote("job_123", {
    generated_image_url: "/v1/assets/asset_abc/content",
    output_asset_id: "asset_abc",
    output_asset_ids: ["asset_abc"],
  });
  assert.equal(url, "/api/vto/media/job_123");
  assert.equal(browserFacingResultUrl("job_123"), "/api/vto/media/job_123");
  assert.equal(isInternalAiAssetUrl(url ?? ""), false);
  assert.equal(isInternalAiAssetUrl("/v1/assets/asset_abc/content"), true);
  assert.equal(assetIdFromInternalUrl("/v1/assets/asset_abc/content"), "asset_abc");
});

test("mock generated result is retrieved through the browser-facing Next.js path", async () => {
  const media = await serveTryOnMediaForUser({
    userId: "user_1",
    job: {
      id: "job_123",
      userId: "user_1",
      status: "COMPLETED",
      outputAssetIds: ["asset_abc"],
    },
    fetchAsset: async (assetId) => {
      assert.equal(assetId, "asset_abc");
      return { bytes: PNG_BYTES, contentType: "image/png" };
    },
  });

  assert.equal(media.contentType, "image/png");
  assert.deepEqual(media.bytes, PNG_BYTES);
  assert.equal(
    browserFacingResultUrl("job_123"),
    "/api/vto/media/job_123"
  );
});

test("browser media proxy authenticates to the AI service server-to-server", async () => {
  process.env.AI_SERVER_URL = "http://ai.test";
  process.env.AI_SERVER_TOKEN = "service-token";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), "http://ai.test/v1/assets/asset_abc/content");
    assert.equal(
      new Headers(init?.headers).get("authorization"),
      "Bearer service-token"
    );
    return new Response(PNG_BYTES, {
      status: 200,
      headers: { "content-type": "image/png" },
    });
  }) as typeof fetch;

  try {
    const media = await getAIBinary("/v1/assets/asset_abc/content");
    assert.equal(media.contentType, "image/png");
    assert.deepEqual(media.bytes, PNG_BYTES);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("media route rejects jobs that do not belong to the caller", async () => {
  await assert.rejects(
    () =>
      serveTryOnMediaForUser({
        userId: "user_1",
        job: {
          id: "job_123",
          userId: "user_2",
          status: "COMPLETED",
          outputAssetIds: ["asset_abc"],
        },
      }),
    (error: unknown) =>
      error instanceof AppError && error.code === ErrorCodes.NOT_FOUND
  );
});
