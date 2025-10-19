# Messenger Bot with Image Semantic Search (TypeScript/Node.js)

An intelligent Facebook Messenger bot that:
- 💬 Responds to text messages using OpenAI GPT-4o-mini
- 🖼️ **Performs semantic search on uploaded images using Vertex AI multimodal embeddings**
- 🔍 Finds similar items in your database using pgvector
- ⚡ Built with TypeScript, Express, and modern best practices

## Features

### Text Messages
Send any text message and get intelligent AI responses powered by OpenAI.

### Image Search
Upload an image and the bot will:
1. Download and encode the image
2. Generate a 1408-dimensional embedding using Vertex AI's `multimodalembedding@001` model
3. Search your Supabase database for similar items using cosine similarity
4. Return the top matching products with similarity scores

## Prerequisites
- Node.js 18+
- A Facebook Page and a Meta App with Messenger product
- Google Cloud account with Vertex AI API enabled
- Supabase account (or self-hosted Supabase with pgvector)
- OpenAI API key

## Quick Setup

### 1. Environment Setup
```bash
# Copy the environment template
cp env.template .env

# Edit .env and fill in all required values
nano .env
```

Required environment variables:
- `PAGE_ACCESS_TOKEN` - From Facebook Developer Console
- `VERIFY_TOKEN` - Any random string (you choose this)
- `APP_SECRET` - From Facebook App settings
- `OPENAI_API_KEY` - From OpenAI platform
- `SUPABASE_URL` - From Supabase project settings
- `SUPABASE_SERVICE_KEY` - Service role key from Supabase
- `VERTEX_AI_PROJECT_ID` - Your Google Cloud project ID
- `VERTEX_AI_LOCATION` - GCP region (default: us-central1)
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to your GCP service account key

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database
1. Go to your Supabase SQL Editor
2. Run `database/schema.sql` to create tables and functions
3. (Optional) Run `database/seed_example.sql` for test data
4. Generate embeddings: `ts-node scripts/seed-embeddings.ts`

### 4. Run Locally
```bash
npm run dev
```

### 5. Expose Webhook
Using ngrok:
```bash
ngrok http 3000
```

### 6. Configure Facebook Webhook
In Meta App (Messenger > Settings):
- Callback URL: `https://<your-ngrok-subdomain>/webhook`
- Verify Token: same as `VERIFY_TOKEN` in .env
- Subscribe to: `messages`, `messaging_postbacks`

## Detailed Setup

For detailed setup instructions including:
- Facebook Messenger configuration
- Google Cloud / Vertex AI setup
- Supabase database configuration
- Production deployment
- Troubleshooting

See **[SETUP.md](./SETUP.md)** for the complete guide.

## Project Structure

```
├── src/
│   ├── server.ts              # Main Express server & webhook handler
│   ├── ai.ts                  # OpenAI integration for text responses
│   ├── database/
│   │   └── supabase.ts        # Supabase client & database operations
│   ├── embedding/
│   │   └── vertexai.ts        # Vertex AI multimodal embedding generation
│   ├── search/
│   │   └── semantic.ts        # Image-based semantic search logic
│   └── social/
│       └── facebook.ts        # Facebook Messenger API client
├── database/
│   ├── schema.sql             # PostgreSQL schema with pgvector
│   └── seed_example.sql       # Example data for testing
├── scripts/
│   └── seed-embeddings.ts     # Script to generate embeddings for items
└── env.template               # Environment variables template
```

## How It Works

### Text Message Flow
```
User → Messenger → Webhook → OpenAI → Response → User
```

### Image Upload Flow
```
User uploads image → Messenger
    ↓
Webhook receives image URL
    ↓
Download & convert to base64
    ↓
Vertex AI generates embedding (1408-dim vector)
    ↓
Supabase pgvector cosine similarity search
    ↓
Format results & send back to user
```

## Scripts
- `npm run dev` - Development with hot reload
- `npm run build` - Compile TypeScript to `dist/`
- `npm start` - Run compiled server
- `npm run typecheck` - Type checking without build

## API Endpoints

### GET /webhook
Facebook webhook verification endpoint

### POST /webhook
Receives Messenger events (messages, attachments)

### GET /
Health check endpoint

## Adding Items to Database

### Via SQL
```sql
INSERT INTO items (name, description, image_url, metadata) 
VALUES ('Product Name', 'Description', 'https://...', '{"price": 99.99}');
```

Then run the embedding script:
```bash
ts-node scripts/seed-embeddings.ts
```

### Programmatically
```typescript
import { upsertItemWithEmbedding } from './src/database/supabase';
import { generateImageEmbedding } from './src/embedding/vertexai';

const embedding = await generateImageEmbedding('https://image-url.jpg');
await upsertItemWithEmbedding(
  'Product Name',
  'Description',
  embedding,
  'https://image-url.jpg',
  { price: 99.99, category: 'electronics' }
);
```

## Security Features

✅ Webhook signature verification  
✅ Rate limiting per user  
✅ Message deduplication  
✅ Input validation and sanitization  
✅ Secure environment variable handling  
✅ App secret proof for Graph API calls  

## Technologies

- **Backend**: Node.js, Express, TypeScript
- **AI/ML**: OpenAI GPT-4o-mini, Google Vertex AI
- **Database**: Supabase (PostgreSQL + pgvector)
- **Messenger**: Facebook Graph API v18.0
- **Security**: Helmet, crypto signature verification

## Cost Estimates (per 1000 operations)

- Vertex AI embeddings: ~$0.025
- OpenAI GPT-4o-mini: ~$0.015
- Supabase: Free tier (500MB DB, unlimited API)
- Facebook Messenger: Free

## Troubleshooting

See [SETUP.md](./SETUP.md) for common issues and solutions.

## License

MIT
