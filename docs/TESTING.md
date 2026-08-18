# Testing

Do not use Google Colab for unit, contract, or mock integration tests.

## Frontend (no GPU)

From `frontend/`:

```bash
npm run db:validate
npm test
npm run test:db   # requires DATABASE_URL and applied migrations
npm run db:smoke  # requires DATABASE_URL and seed data
```

`npm test` covers money/tax/shipping, mock payments, local storage, and public error mapping.

## AI service (no GPU)

From `ai/`:

```bash
pytest
```

The critical local test is `tests/test_mock_pipeline.py`:

upload person + garment assets → create try-on job → queue → garment analysis → segmentation → try-on provider → synthetic result → job completed.

Synthetic images are labeled mock fixtures, not customer try-on photos.

## Not executed here

- Real Florence-2, SAM2, pose, or IDM-VTON GPU inference
- Live Razorpay/Stripe charges
- Production object storage
- Production deployment
