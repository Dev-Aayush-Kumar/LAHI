# Final real GPU end-to-end test

Do not repeat this session for unit work. Run it once the software architecture is stable.

## What Colab is

A temporary GPU worker. The AI service must keep serving the same `/v1` contract. Set environment variables on the worker; do not hardcode notebook URLs into the commerce app.

## One-session checklist

1. Start the AI service on the GPU host with `AI_EXECUTION_MODE=gpu` and a service token.
2. Confirm `/v1/health`, `/v1/readiness`, and `/v1/capabilities`.
3. Point `frontend` `AI_SERVER_URL` and `AI_SERVER_TOKEN` at that host.
4. Use a real person asset and a real garment asset.
5. Execute the full chain in one job:
   - preprocess / canonical views if needed
   - Florence garment understanding → `GarmentSchema`
   - SAM2 segmentation consuming that schema
   - pose / body processing
   - IDM-VTON
   - post-process / quality check
   - store result asset
   - job completed
   - LAHI frontend displays the result
6. Record request IDs from browser → Next.js → AI job → worker.

Unload models between stages if VRAM on the Tesla T4 is insufficient to keep Florence, SAM2, and IDM-VTON resident together.

Real inference is not complete until this session has actually run.
