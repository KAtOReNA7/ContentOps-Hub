# Single OpenAI Rating Lock And Preflight

This note documents the PR #2 review-finding fix for single-work OpenAI rating.

## Request Boundary

- The three single-work rating entry points share the same request boundary:
  - `POST /api/works/[id]/rating/run`
  - `POST /api/works/[id]/rating/rerun`
  - compatible `POST /api/works/[id]/rating`
- Real OpenAI rating calls require `costConfirmed: true` every time.
- `rerun` does not inherit a previous confirmation.

## In-Process Lock

- A process-local active `workId` set protects single-work rating requests.
- The lock is acquired after cost confirmation and before the database `running` check.
- The lock covers the database check, OpenAI config preflight, `WorkRatingRun` creation, provider execution, and error handling.
- The lock is released in `finally`, including success, config failure, provider exception, invalid response, and early `running` return.
- A second same-work request returns HTTP 409 with `RATING_ALREADY_RUNNING`.
- The second request does not call the provider and does not create a run record.

This lock only protects the current local Node.js process. Multi-instance deployments or multiple Node.js processes sharing one database are outside the current MVP support boundary.

## OpenAI Rating Config Preflight

Before creating `WorkRatingRun` or calling OpenAI, the service checks:

- `OPENAI_API_KEY` is present.
- `OPENAI_RATING_MODEL` or `OPENAI_TEXT_MODEL` is present.
- `OPENAI_BASE_URL`, when set, is a valid `http` or `https` URL.
- `OPENAI_BASE_URL`, when set, is an API root URL and not an endpoint path such as `/chat/completions`, `/responses`, `/images/generations`, or `/images/edits`.

An empty `OPENAI_BASE_URL` is valid and lets the OpenAI SDK use its default official endpoint.

Invalid config returns HTTP 503 with `OPENAI_NOT_CONFIGURED`. It does not create a run record, call the provider, or start a network request.

## Safe GET Failure

If reading rating history fails, the API returns a stable user-readable failure message. It does not return database errors, Windows absolute paths, connection strings, full Base URLs, stack traces, `DATABASE_URL`, `sk-...`, or `Bearer ...` values.

## Focused Tests

- `npm run test:single-rating-cost`
- `npm run test:single-rating-concurrency`
- `npm run test:single-rating-config`

The concurrency test uses a controlled runner barrier to verify that two nearly simultaneous same-work requests only execute one runner. It also verifies that locks are released after both success and thrown errors.

The config test verifies API key missing, model missing, invalid Base URL, endpoint-path Base URL, complete config, official-default Base URL, and safe GET-history error output.

