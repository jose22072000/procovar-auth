# 🔐 Auth Center Prompt (JWT + Redis Double Layer)

You are a senior backend and security architect.

I have a Next.js (App Router) project with Better Auth already configured.

I want to implement a centralized Auth Center with secure multi-domain SSO.

---

## 🎯 GOAL

Hide all callback parameters behind a single secure token:

Instead of:

/login?client_id=app1&callbackUrl=https://app1.com/callback&returnTo=https://app1.com/page

Use:

/login?callback=SECURE_TOKEN

---

## 🔐 SECURITY MODEL (DOUBLE LAYER)

The callback token must use:

1. JWT (signed, short-lived)
2. Redis (state validation + one-time use)

---

## 🧠 STEP 1 — Generate Callback Token (External App)

Create helper:

### encodeCallback(payload)

Payload:
- clientId
- callbackUrl
- returnTo

Process:

1. Generate UUID:
   const id = crypto.randomUUID();

2. Store in Redis:
   key: callback:{id}
   value:
   {
     clientId,
     callbackUrl,
     returnTo
   }
   TTL: 5 minutes

3. Create JWT:
   {
     id,
     type: "callback"
   }

   - Sign with CALLBACK_SECRET
   - Expire in 5 minutes

4. Return JWT

---

## 🔍 STEP 2 — Decode Callback Token (Auth Center)

Create helper:

### decodeCallback(token)

Process:

1. Verify JWT signature
2. Extract id
3. Load Redis:
   callback:{id}

4. If not found:
   - reject (expired or replay attack)

5. Validate:
   - clientId exists
   - callbackUrl is allowlisted
   - returnTo is valid

6. DELETE Redis key (one-time use)

7. Return payload

---

## 🔐 SECURITY RULES

- JWT expires in 5 minutes
- Redis expires in 5 minutes
- Redis key is single-use
- Reject reused tokens
- Validate domains strictly
- Never trust raw query params
- Never include tokens in URL

---

## 🧩 CLIENT APP MODEL (Prisma)

ClientApp {
  id
  name
  allowedCallbackUrls String[]
  allowedDomains String[]
}

---

## 🔁 LOGIN FLOW

1. External app:
   const token = encodeCallback(...)

2. Redirect:
   https://auth.company.com/login?callback=TOKEN

3. Auth Center:
   - decodeCallback(token)
   - store validated data temporarily

4. After login:
   - generate auth code (Redis)
   - redirect:

   https://app1.com/callback?code=XXXX

---

## 🔑 AUTH CODE STORAGE

Redis:

auth:code:{code}

Value:

{
  "userId": "",
  "sessionId": "",
  "clientId": "",
  "callbackUrl": "",
  "returnTo": ""
}

TTL: 60 seconds

---

## 🧠 REDIS KEY STRUCTURE

callback:{id}
auth:code:{code}
session:{sessionId}
session:revoked:{sessionId}

---

## 🚀 FILE STRUCTURE

/lib/callback-token.ts
/lib/redis.ts
/lib/jwt.ts
/lib/callback-validator.ts
