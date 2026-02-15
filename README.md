# LinkVault - Secure File & Text Sharing Platform

A full-stack web application that allows users to upload text or files and share them securely using unique, hard-to-guess URLs. Similar to Pastebin, but with file upload support.

## Features

- Upload plain text or files (one at a time)
- Generate unique, hard-to-guess shareable URLs
- Secure access - content only accessible via the exact link
- Automatic expiry and deletion (default: 10 minutes, customizable)
- Beautiful, modern UI built with React and Tailwind CSS
- File storage using Supabase Storage (with local fallback)
- Background job for automatic cleanup of expired content
- Copy-to-clipboard functionality
- View count tracking

## Tech Stack

### Frontend

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Multer** - File upload handling
- **Supabase** - File storage (with local fallback)
- **node-cron** - Background job scheduling
- **nanoid** - Unique ID generation

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Supabase account (optional, local storage fallback available)

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

4. Configure environment variables in `.env` or `.env.local`:

```env
PORT=5000
MONGODB_URI=mongodb
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_BUCKET=data
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRES=7d
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

5. Set up MongoDB:

   - **Local MongoDB**: Ensure MongoDB is running on your machine
   - **MongoDB Atlas**: Use your Atlas connection string in `MONGODB_URI`
6. Set up Supabase (Optional):

   - Create a Supabase project at [https://supabase.com](https://supabase.com)
   - Create a storage bucket named `linkvault-files` (or update `SUPABASE_BUCKET`)
   - Copy your project URL and anon key to `.env`
   - **Note**: If Supabase is not configured, files will be stored locally in the `uploads/` directory
7. Start the backend server:

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Overview

### Base URL

```
http://localhost:5000/api
```

### Auth (no token required for signup/login)

- **POST** `/api/auth/signup` – Body: `{ "email", "password" }`. Returns `{ token, user }`.
- **POST** `/api/auth/login` – Body: `{ "email", "password" }`. Returns `{ token, user }`.
- **GET** `/api/auth/me` – Headers: `Authorization: Bearer <token>`. Returns current user.

### Content

- **POST** `/api/upload` – Upload text or file (multipart/form-data).  
  Body fields: `text` or `file` (one required), `expiresInMinutes`, `expiresAt` (ISO date, optional), `password`, `oneTimeView`, `maxViews` (text), `oneTimeDownload`, `maxDownloads` (file).  
  Optional auth header to attach content to user. Returns `{ uniqueId, url, expiresAt, deleteToken, ... }`.

- **GET** `/api/content/:id` – Get content by unique ID. Query: `?password=...` if link is password-protected. Returns content metadata and text or file info (viewCount/maxViews for text, downloadCount/maxDownloads for file). Fails with 404, 410 (expired), or 403 (password required / max views or max downloads reached).

- **POST** `/api/content/:id/record-view` – Record one view (text only). Body/query: `password` if protected. Increments viewCount; returns `{ viewCount, remainingViews }`.

- **GET** `/api/files/:id` – Download file. Query: `?password=...` if protected. Checks expiry, password, and download count; increments downloadCount and serves file (or redirects to Supabase URL).

- **DELETE** `/api/content/:id` – Delete content. Body or query: `deleteToken`, or send `Authorization: Bearer <token>` and be the owner. Returns 403 if not authorized.

- **GET** `/api/content/mine/list` – List current user’s content. Requires `Authorization: Bearer <token>`. Returns array of content summaries.

### Other

- **GET** `/health` – Returns `{ "status": "OK", "message": "LinkVault API is running" }`.

## Design Decisions

### Security

1. **Unique ID**: `nanoid` (12 chars, URL-safe) for hard-to-guess links.
2. **No public listing**: Content only via the exact link; no browse or search.
3. **Expiry**: Content expires after a set duration (or at a set date/time); optional password and view/download limits.
4. **Auth**: Simple email/password signup and login with JWT; optional on upload (content can be tied to user or anonymous).
5. **Validation**: Input validated on frontend and backend; file size enforced (50MB).

### Storage

1. **Files**: Supabase Storage first; fallback to local `uploads/` if Supabase is not configured.
2. **Text**: Stored in MongoDB only.
3. **Metadata**: All content metadata (expiry, counts, password hash, etc.) in MongoDB (Content collection).


## Assumptions and Limitations

### Assumptions

1. MongoDB is available (local or Atlas); connection string in `.env` or `.env.local`.
2. Supabase is optional; files fall back to local `uploads/` if not configured.
3. Auth is optional: users can upload without an account; if logged in, content can be listed under “My Links”.
4. One of text or file per upload (not both in one request).
5. Frontend is served from the URL set in `FRONTEND_URL` (e.g. `http://localhost:3000`) for correct share links.

### Limitations

1. **File size**: Max 50MB per file.
2. **Auth**: Email/password only; no OAuth or password reset in this version.
3. **Rate limiting**: No application-level rate limiting; rely on deployment/network if needed.
4. **File types**: All types allowed; no allowlist or blocklist.
5. **Delete**: Manual delete requires the `deleteToken` (returned on upload) or being the logged-in owner.
6. **One-time**: One-time view (text) or one-time download (file) deletes content after first use; no undo.
