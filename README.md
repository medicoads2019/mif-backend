# MyIndianFestivals Backend

This backend is now deployed and run as a single Node.js package from the root `backEnd` folder.

## Run

```bash
npm install
npm start
```

For development:

```bash
npm run dev
```

The server entrypoint is `server.js` and mounts all service routes from the feature folders.

## Environment

Primary runtime configuration lives in `backEnd/.env`.

Important variables:

- `PORT`
- `BACKEND_BASE_URL`
- `ALLOWED_ORIGINS`
- `FRONTEND_URL`
- `MONGO_URI`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `DISABLE_FILE_LOGS`
- `LOG_DIR`

The root server also loads optional overrides from:

- `client/.env`
- `employee/.env`

Keep those files only if you need service-specific auth or mail overrides.

## Routes

The consolidated backend serves these main route groups:

- `/festivals`
- `/festivalimages`
- `/banners`
- `/demoFrames`
- `/categorys`
- `/categoryimages`
- `/businesss`
- `/businessimages`
- `/business-frames`
- `/business-frame-images`
- `/client-frames`
- `/client-frame-images`
- `/clients`
- `/employees`

## Deployment Notes

- Do not run `npm install` inside service subfolders.
- Do not start service-specific servers from feature folders.
- Install and start only from the root `backEnd` directory.

## Vercel Deployment (GitHub)

1. In Vercel, import your GitHub repository.
2. Set **Root Directory** to `backEnd`.
3. Framework preset: `Other`.
4. Build command: leave empty.
5. Output directory: leave empty.
6. Install command: `npm install`.

This project uses `vercel.json` and routes all requests to `server.js`.

### Required Vercel Environment Variables

- `NODE_ENV=production`
- `MONGO_URI`
- `BACKEND_BASE_URL` (recommended as your production API URL)
- `ALLOWED_ORIGINS` (comma-separated frontend origins)
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `DISABLE_FILE_LOGS=true` (recommended on Vercel)

### Health Check

- `GET /health` returns service and uptime status.
