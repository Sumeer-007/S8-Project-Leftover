# Debugging Firebase push (donation → volunteer)

## 1. After creating a donation — read the API response

`POST /donations` returns a `volunteerPush` object, for example:

| Field                                 | Meaning                                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `volunteersWithFcmToken`              | Approved volunteers who have an FCM token stored (after login). **0 = no one to notify.** |
| `devicesTargeted`                     | How many devices were sent this request.                                                  |
| `fcmDelivered`                        | `true` if FCM accepted at least one message.                                              |
| `fcmSuccessCount` / `fcmFailureCount` | Per-token results from FCM.                                                               |
| `fcmErrors`                           | Sample error strings (e.g. wrong/expired token).                                          |
| `skippedReason`                       | Why nothing was sent, if applicable.                                                      |
| `firebaseAdminOk`                     | Backend loaded the service account.                                                       |
| `credentialsFileExists`               | JSON path points to a real file.                                                          |
| `fcmDetail`                           | Full diagnostic blob.                                                                     |

Open **DevTools → Network → donations POST → Response** to see this JSON.

## 2. Debug endpoint (status of Firebase + volunteers)

**Option A — `DEBUG=true` in `server/.env`**, restart API:

```http
GET http://localhost:8000/debug/fcm
```

**Option B — secret (keep `DEBUG=false`)** in `.env`:

```env
FCM_DEBUG_SECRET=my-long-random-secret
```

Then:

```http
GET http://localhost:8000/debug/fcm?key=my-long-random-secret
```

You’ll see whether the credentials file exists, Firebase Admin initialized, and each volunteer with a token (username + token length only).

## 3. Test send to one token (same code path as donations)

1. In the browser (volunteer logged in), DevTools → Console — your app logs `FCM token: ...` or read `localStorage.fcmToken`.
2. Call (with the same `key` as above if using secret):

```http
POST http://localhost:8000/debug/fcm/test-send?key=my-long-random-secret
Content-Type: application/json

{"token": "PASTE_FULL_FCM_TOKEN_HERE"}
```

Response `ok: true` means backend → FCM works for that token.

## 4. Server logs

Run with verbose logging (use `python -m uvicorn` on Windows if `uvicorn` is not found):

```bash
cd server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level debug
```

Look for lines: `Firebase Admin OK`, `FCM batch`, `FCM failure for token`.

## 5. `send_multicast` 404 and `WebpushFCMOptions.link must be HTTPS`

- The Admin SDK’s **legacy batch API** (`send_multicast`) often returns **404**. This project uses **`send_each_for_multicast`** (FCM HTTP v1) instead. Use **firebase-admin >= 6.2**.
- **Web push click links** must be **HTTPS**. If `CLIENT_BASE_URL` is `http://localhost:5173`, set **`FCM_WEB_PUSH_LINK=https://your-project.web.app`** (or any HTTPS app URL) in `server/.env`. Notifications still deliver without it; only the optional webpush click URL needs HTTPS.

## 6. Common issues

- **`volunteersWithFcmToken: 0`** — Log in as a **VOLUNTEER** (not only donor), allow notifications, ensure client `.env` has `VITE_FIREBASE_VAPID_KEY`.
- **`credentialsFileExists: false`** — Fix `FIREBASE_CREDENTIALS_PATH` in `server/.env`.
- **`fcmErrors` contains `Requested entity was not found`** — The token stored on the server does not match this browser anymore. On **My Tasks**, tap **Save device token** (or log out and log in again with notifications allowed).
- **`mismatched-credential`** — Service account JSON is not from the same Firebase project as the web app.
