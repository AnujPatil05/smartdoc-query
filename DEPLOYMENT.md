# Deployment Guide

Complete setup for deploying SmartDoc Query Engine to production.

## Quick Overview

| Component | Service | Free Tier |
|-----------|---------|-----------|
| Frontend | Vercel | ✅ Yes |
| Backend | Railway | ✅ $5 credit/month |
| Database | Railway PostgreSQL | ✅ $5 credit/month |
| Redis | Upstash | ✅ 10k commands/day |

---

## Step 1: PostgreSQL on Railway

1. Go to [Railway](https://railway.app) and sign in with GitHub
2. Click **New Project** → **Provision PostgreSQL**
3. Once created, click on the PostgreSQL service
4. Go to **Variables** tab and copy `DATABASE_URL`
5. Enable pgvector extension:
   - Go to **Data** tab, then open pgAdmin or use Railway CLI
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`

6. The backend runs an idempotent schema initializer at startup. If you need to run it manually, execute `python setup_db.py` from the `backend` directory with `DATABASE_URL` configured.

---

## Step 2: Upstash Redis

1. Go to [Upstash Console](https://console.upstash.com)
2. Click **Create Database**
3. Select a region close to your Railway region
4. Copy the **REST URL** (format: `redis://default:xxx@xxx.upstash.io:6379`)

---

## Step 3: Backend on Railway

1. In Railway, click **New** → **GitHub Repo**
2. Select your `smartdoc-query` repo
3. Railway will detect the `backend` folder OR configure:
   - **Root Directory**: `backend`
   
4. Add environment variables in **Variables** tab:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (from Step 1) |
| `REDIS_URL` | (from Step 2) |
| `GOOGLE_API_KEY` | Your Gemini API key |
| `CORS_ORIGINS` | `https://your-app.vercel.app` |
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |

5. Railway will auto-deploy. Copy the generated URL (e.g., `https://smartdoc-api-production.up.railway.app`)

---

## Step 4: Frontend on Vercel

1. Go to [Vercel](https://vercel.com) and sign in with GitHub
2. Click **Add New** → **Project**
3. Import your `smartdoc-query` repo
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   
5. Add environment variable:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://your-railway-url.up.railway.app/api/v1` |

6. Click **Deploy**

---

## Step 5: Update CORS

After Vercel deploys, update Railway's `CORS_ORIGINS`:

```
CORS_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
```

---

## Environment Variables Summary

### Backend (Railway)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
GOOGLE_API_KEY=your_key
CORS_ORIGINS=https://your-frontend.vercel.app
ENVIRONMENT=production
DEBUG=false
```

### Frontend (Vercel)
```
VITE_API_BASE_URL=https://your-backend.up.railway.app/api/v1
```

---

## Verify Deployment

1. **Health Check**: Visit `https://your-railway-url/health`
2. **API Docs**: Visit `https://your-railway-url/docs`
3. **Frontend**: Visit your Vercel URL

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Check `CORS_ORIGINS` includes your Vercel URL |
| Database connection | Verify `DATABASE_URL` format and pgvector extension |
| Upload fails | Check Railway logs for error details |
| Embeddings fail | Verify `GOOGLE_API_KEY` is set correctly |

---

## Estimated Costs

| Service | Free Tier Limit | Overage |
|---------|-----------------|---------|
| Vercel | 100GB bandwidth | $0.15/GB |
| Railway | $5/month credit | Pay as you go |
| Upstash | 10k commands/day | $0.2 per 100k |

For a personal portfolio project, you should stay within free tiers.
