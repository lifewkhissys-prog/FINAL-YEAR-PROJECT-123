# DevLab Frontend Guide — Authentication

**Stack:** React.js + TailwindCSS  
**Feature scope:** Register, Login, JWT session handling, role-based routing

---

## Overview

Authentication is the entry point for all users. There are two roles: `student` and `lecturer`. After a successful login the backend returns a JWT. The frontend stores it, attaches it to every subsequent request, and uses the decoded role to decide which dashboard to render.

There is no admin UI in scope. Role assignment happens at registration.

---

## Pages

### `/register`

**Fields:**
- Full name
- Email
- Password
- Role selector — `student` or `lecturer` (dropdown or toggle, not free text)

**Behaviour:**
- On submit, POST to `/auth/register`
- On success, redirect to `/login` with a success toast
- Show inline field-level validation errors returned by the API

### `/login`

**Fields:**
- Email
- Password

**Behaviour:**
- On submit, POST to `/auth/login`
- On success, store the returned JWT (see Token Storage below) and redirect:
  - `lecturer` → `/lecturer/dashboard`
  - `student` → `/student/dashboard`
- On 401, show "Invalid email or password" — do not distinguish which field is wrong

### `/logout`

Not a page. A button in the nav/header that clears the stored token and redirects to `/login`.

---

## Token Storage

Store the JWT in `localStorage` under the key `devlab_token`.

On every page load, check for the token. If missing or expired, redirect to `/login`.

---

## Decoding the Token

Decode the JWT client-side (without verifying the signature — verification happens server-side) to read the `role` and `user_id` claims. Use these to:
- Gate routes (see Route Guards below)
- Display the correct dashboard
- Pass `user_id` in requests where needed

Example payload shape:
```json
{
  "sub": "42",
  "role": "lecturer",
  "name": "Ankomah Kelvin",
  "exp": 1720000000
}
```

---

## Route Guards

Wrap protected routes in a `<PrivateRoute>` component that:
1. Checks for a valid, non-expired token
2. Checks the decoded role matches the expected role for that route
3. Redirects to `/login` if either check fails

```
/lecturer/*  →  requires role === "lecturer"
/student/*   →  requires role === "student"
```

A student who navigates to `/lecturer/dashboard` should be redirected to their own dashboard, not to `/login`.

---

## API Contract

| Method | Endpoint | Request body | Success response |
|--------|----------|--------------|-----------------|
| POST | `/auth/register` | `{ name, email, password, role }` | `201` — `{ message }` |
| POST | `/auth/login` | `{ email, password }` | `200` — `{ access_token, token_type }` |

All subsequent authenticated requests attach the token as:
```
Authorization: Bearer <token>
```

---

## Error States

| Scenario | UI response |
|----------|-------------|
| Network failure | Toast: "Could not reach the server. Try again." |
| 400 validation error | Inline error under the relevant field |
| 401 on login | Inline error: "Invalid email or password" |
| 403 on a guarded route | Redirect to own dashboard |
| Token expired mid-session | Redirect to `/login` with toast: "Your session has expired." |

---

## Out of Scope

- Password reset / forgot password
- Email verification
- OAuth / social login
- Remember me / persistent sessions beyond token expiry
