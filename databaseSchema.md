# Database Schema / Model Definitions

LinkVault uses **MongoDB** with **Mongoose** (Node.js ODM). This document describes the collections and their field definitions.

---

## 1. User Collection

**Model:** `User`  
**Purpose:** Stores authenticated users (email/password signup and login).

| Field      | Type     | Required | Default | Description                                      |
|-----------|----------|----------|---------|--------------------------------------------------|
| `email`   | String   | Yes      | —       | User email. Unique, lowercase, trimmed.          |
| `password`| String   | Yes      | —       | Hashed with bcrypt (12 rounds). Not returned in queries by default (`select: false`). |
| `createdAt` | Date   | —        | Date.now | Set by `timestamps: true`.                       |
| `updatedAt` | Date   | —        | Date.now | Set by `timestamps: true`.                       |

**Indexes:**  
- `email`: unique.

**Notes:**  
- Password is hashed in a `pre('save')` hook.  
- `comparePassword(candidate)` instance method is used for login.

---

## 2. Content Collection

**Model:** `Content`  
**Purpose:** Stores each shared item (text or file metadata). Files are stored in Supabase or on disk; this collection holds metadata and access rules.

| Field           | Type     | Required | Default  | Description                                      |
|----------------|----------|----------|----------|--------------------------------------------------|
| `uniqueId`     | String   | Yes      | —        | Short, URL-safe unique ID (e.g. nanoid). Unique, indexed. |
| `contentType`  | String   | Yes      | —        | `"text"` or `"file"`.                            |
| `textContent`  | String   | No       | null     | Raw text when `contentType === "text"`.           |
| `fileName`     | String   | No       | null     | Original file name when `contentType === "file"`. |
| `fileUrl`      | String   | No       | null     | URL to file (Supabase public URL or `/api/files/:id`). |
| `fileSize`     | Number   | No       | null     | File size in bytes.                              |
| `mimeType`     | String   | No       | null     | MIME type of the file.                           |
| `expiresAt`    | Date     | Yes      | —        | When the content is considered expired. Indexed. |
| `createdAt`    | Date     | No       | Date.now | Creation time.                                   |
| `viewCount`    | Number   | No       | 0        | **Text only:** number of times the text was viewed. |
| `maxViews`     | Number   | No       | null     | **Text only:** max allowed views; null = unlimited. |
| `downloadCount`| Number   | No       | 0        | **File only:** number of times the file was downloaded. |
| `maxDownloads` | Number   | No       | null     | **File only:** max allowed downloads; null = unlimited. |
| `passwordHash` | String   | No       | null     | bcrypt hash if link is password-protected.       |
| `oneTimeView`  | Boolean  | No       | false    | **Text only:** if true, content is deleted after first view. |
| `oneTimeDownload` | Boolean | No     | false    | **File only:** if true, file is deleted after first download. |
| `used`         | Boolean  | No       | false    | **Text only:** set when one-time view has been consumed. |
| `deleteToken`  | String   | No       | null     | Secret token for manual delete (returned on upload). |
| `userId`       | ObjectId | No       | null     | Reference to `User` if upload was done while logged in. |
| `createdAt`    | Date     | —        | —        | From `timestamps: true`.                         |
| `updatedAt`    | Date     | —        | —        | From `timestamps: true`.                         |

**Indexes:**  
- `uniqueId`: unique, index.  
- `expiresAt`: index (for cleanup job).  
- `userId`: index (for “My Links” queries).

**Usage by content type:**

- **Text:** `textContent`, `viewCount`, `maxViews`, `oneTimeView`, `used`.  
- **File:** `fileName`, `fileUrl`, `fileSize`, `mimeType`, `downloadCount`, `maxDownloads`, `oneTimeDownload`.

---


- A **User** can have many **Content** entries (`Content.userId`).  
- **Content** can exist without a user (anonymous uploads; `userId === null`).

---

## 4. File Storage (Out of MongoDB)

- **Supabase Storage:** file bytes stored in a bucket; `Content.fileUrl` holds the public URL.  
- **Local fallback:** files in `backend/uploads/`; `Content.fileUrl` is `/api/files/:uniqueId`.  
- No file binary is stored in the database; only metadata and rules live in the **Content** collection.

