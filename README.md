# Bitespeed Identity Reconciliation

This project is a solution for Bitespeed’s Identity Reconciliation task. The application exposes an `/identify` endpoint that deduplicates user identities based on email and phone number inputs.

---

## Live Demo

https://bitespeed-identity-reconciliation-fdig.onrender.com/

---

## Endpoint

### `POST /identify`

This endpoint accepts a user's email and/or phone number and returns a unified identity response.

#### Request Body (JSON)

```json
{
  "email": "george@hillvalley.edu",
  "phoneNumber": "717171"
}
