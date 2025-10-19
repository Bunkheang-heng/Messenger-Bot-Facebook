import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, type Response } from 'express';
import crypto from 'crypto';
import { sendTextMessage, extractImageAttachments, type MessengerMessage } from './social/facebook';
import { generateAiReply } from './ai';
import { searchByImage, formatSearchResults } from './search/semantic';
import helmet from 'helmet';
import compression from 'compression';

const app = express();

// Security and performance middleware
app.use(helmet());
app.use(compression());

// Capture raw body for signature verification with bounded size
app.use(express.json({
  limit: '200kb',
  verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
    req.rawBody = Buffer.from(buf);
  }
}));

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const APP_SECRET = process.env.APP_SECRET;
const PORT = Number(process.env.PORT || 3000);
const MAX_MESSAGE_CHARS = 800;
const RATE_LIMIT_WINDOW_MS = 30_000; // 30s
const RATE_LIMIT_MAX_EVENTS = 4; // per window per user

type RateBucket = { count: number; resetAt: number };
const userRateBuckets: Map<string, RateBucket> = new Map();

function allowEventForUser(userId: string): boolean {
  const now = Date.now();
  const bucket = userRateBuckets.get(userId);
  if (!bucket || bucket.resetAt <= now) {
    userRateBuckets.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count < RATE_LIMIT_MAX_EVENTS) {
    bucket.count += 1;
    return true;
  }
  return false;
}

if (!PAGE_ACCESS_TOKEN || !VERIFY_TOKEN || !APP_SECRET) {
  // Fail fast so misconfiguration is caught immediately
  throw new Error('Missing required env vars: PAGE_ACCESS_TOKEN, VERIFY_TOKEN, APP_SECRET');
}

function verifyRequestSignature(req: Request & { rawBody?: Buffer }) {
  const signatureHeader = req.header('x-hub-signature-256');
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET!)
    .update(req.rawBody ?? Buffer.from(''))
    .digest('hex');
  const received = signatureHeader;
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(received);
  return expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// Webhook verification endpoint (required by Meta)
app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(String(challenge ?? ''));
  } else {
    res.sendStatus(403);
  }
});

// Event receiver
app.post('/webhook', (req: Request & { rawBody?: Buffer }, res: Response) => {
  if (!verifyRequestSignature(req)) {
    return res.sendStatus(401);
  }

  const body = req.body as any;
  if (body.object !== 'page') {
    return res.sendStatus(404);
  }

  // Deduplicate by message mid
  const seenMids = new Set<string>();

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id;
      const message: MessengerMessage | undefined = event.message;
      const mid: string | undefined = message?.mid;
      
      if (mid) {
        if (seenMids.has(mid)) {
          continue;
        }
        seenMids.add(mid);
      }
      
      if (!senderId || !message) {
        continue;
      }
      
      if (!allowEventForUser(senderId)) {
        continue;
      }
      
      // Check for image attachments first
      const imageAttachments = extractImageAttachments(message);
      
      if (imageAttachments.length > 0) {
        // Handle image upload - perform semantic search
        const firstImage = imageAttachments[0];
        if (!firstImage) {
          continue;
        }
        const imageUrl = firstImage.url; // Process first image
        
        searchByImage(imageUrl, 5, 0.5)
          .then((results) => {
            const reply = formatSearchResults(results);
            return sendTextMessage(PAGE_ACCESS_TOKEN!, senderId, reply);
          })
          .catch((err) => {
            console.error('Failed to perform image search', err?.response?.data ?? err);
            sendTextMessage(
              PAGE_ACCESS_TOKEN!,
              senderId,
              "Sorry, I couldn't process your image. Please try again or send a text message."
            ).catch(console.error);
          });
      } else if (typeof message.text === 'string' && message.text.trim().length > 0) {
        // Handle text message with AI
        const clipped = message.text.trim().slice(0, MAX_MESSAGE_CHARS);
        generateAiReply(clipped)
          .then((reply) => {
            return sendTextMessage(PAGE_ACCESS_TOKEN!, senderId, reply);
          })
          .catch((err) => {
            console.error('Failed to generate/send AI reply', err?.response?.data ?? err);
          });
      }
    }
  }

  res.sendStatus(200);
});

app.get('/', (_req, res) => {
  res.status(200).send('Messenger bot is running');
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


