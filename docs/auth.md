# Authentication

WATCHD uses Supabase Auth for email/password authentication and FastAPI for
authenticated application endpoints.

## Login flow

1. The Expo app calls `supabase.auth.signInWithPassword()` or
   `supabase.auth.signUp()`.
2. Supabase returns a signed access token for a confirmed user.
3. `AuthContext` listens for Supabase auth-state changes, stores the access
   token with Expo SecureStore, and exposes it to the app.
4. `RootNavigator` shows the auth stack when the token is absent and the app
   tabs when it is present.
5. Authenticated FastAPI calls include `Authorization: Bearer <access-token>`.

The mobile token is stored under the SecureStore key `access_token`. Signing
out clears both the Supabase session and this key.

## Backend configuration

Add these values to the ignored `backend/.env` file:

```dotenv
SUPABASE_JWKS_URL=https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_ISSUER=https://<project-ref>.supabase.co/auth/v1
SUPABASE_AUDIENCE=authenticated
```

Supabase's current JWKS discovery path is
`/auth/v1/.well-known/jwks.json`. The JWKS contains public verification keys;
it does not contain private signing keys.

Install the backend dependencies:

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

## Token verification

`app/core/auth.py`:

- reads a Bearer token with FastAPI's `HTTPBearer` dependency;
- selects the public key matching the JWT `kid` from Supabase JWKS;
- permits only the asymmetric `ES256` and `RS256` algorithms;
- validates the signature, expiration, issuer, audience, and subject;
- uses the verified `sub` claim to find or create the internal `User` row;
- updates the internal email when the verified Supabase email changes.

Missing, invalid, incorrectly issued, or expired tokens receive `401
Unauthorized`. Authentication failures do not expose JWT parsing details.

## `GET /me`

Start the backend:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

Call the protected endpoint with a Supabase access token:

```bash
curl http://127.0.0.1:8000/me \
  -H "Authorization: Bearer <access-token>"
```

Successful response:

```json
{
  "id": 1,
  "email": "person@example.com",
  "supabase_sub": "00000000-0000-0000-0000-000000000000"
}
```

The temporary Home screen calls `/me` using
`EXPO_PUBLIC_API_BASE_URL` and displays `Logged in as: <email>` when the
backend accepts the token.
