# Messenger Bot (TypeScript/Node.js)

Minimal Facebook Messenger webhook with signature verification and echo reply.

## Prerequisites
- Node.js 18+
- A Facebook Page and a Meta App with Messenger product

## Setup
1. Copy env template and fill values:
   ```bash
   cp .env.example .env
   # Fill PAGE_ACCESS_TOKEN, VERIFY_TOKEN, APP_SECRET
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run locally:
   ```bash
   npm run dev
   ```
4. Expose webhook (choose one):
   - Using ngrok:
     ```bash
     ngrok http 3000
     ```
     This will give you a public URL to use as your webhook endpoint.
   - Or deploy to Vercel/Cloud Run/Lambda
5. Configure webhook in Meta App (Messenger > Settings):
   - Callback URL: `https://<your-ngrok-subdomain>/webhook`
   - Verify Token: the same as `VERIFY_TOKEN`
   - Subscribe to events: messages, messaging_postbacks

## Scripts
- `npm run dev` - ts-node + nodemon
- `npm run build` - compile to `dist`
- `npm start` - run compiled server

## Files
- `src/server.ts` - Express server, verification, event handling
- `src/social/facebook.ts` - Graph API client for sending messages
