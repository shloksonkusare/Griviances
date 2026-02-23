# Grievance Portal - Quick Deployment Guide (5 Steps)

## 🚀 Deploy to Render.com FREE in 5 Steps

### Step 1: MongoDB Atlas (3 minutes)
```
1. Go to mongodb.com/cloud/atlas
2. Sign up (free)
3. Create free cluster (default settings OK)
4. Create database user: Database Access → Add User
5. Whitelist IP: Network Access → 0.0.0.0/0
6. Copy connection string: Connect → Drivers
```
**Save this**: `mongodb+srv://user:pass@cluster...`

---

### Step 2: Prepare GitHub (1 minute)
```
1. Ensure all code is pushed to main branch
2. Repository must be on GitHub
3. No changes left uncommitted
```

---

### Step 3: Render.com Account (2 minutes)
```
1. Go to render.com
2. Sign up with GitHub
3. Authorize access to your repo
```

---

### Step 4: Deploy Services (10 minutes)
```
1. Create new project
2. Select your Grievance-Portal repository
3. Render automatically detects render.yaml
4. Starts deploying 3 services:
   - Backend API (Node.js)
   - AI Model (Python)
   - Frontend (React)
5. Wait for all to say "Live" ✅
```

---

### Step 5: Add Environment Variables (3 minutes)
1. **Click** `grievance-portal-api` service
2. **Go to** Environment
3. **Add these variables**:

```
MONGODB_URI = mongodb+srv://user:pass@cluster...
WHATSAPP_PHONE_NUMBER_ID = your-id (optional)
WHATSAPP_ACCESS_TOKEN = your-token (optional)
WHATSAPP_BUSINESS_ACCOUNT_ID = your-id (optional)
```

4. **Click Deploy** on the service

---

## ✅ Done! Your app is live at:

```
Frontend:    https://grievance-portal-client.onrender.com
Backend API: https://grievance-portal-api.onrender.com
AI Docs:     https://grievance-portal-ai.onrender.com/docs
```

---

## Test It Works

```bash
# Test backend
curl https://grievance-portal-api.onrender.com/health

# Should return:
{"status":"ok"}
```

---

## 🔐 Important Notes

⚠️ **Free Tier Gotchas**:
- Service sleeps after 15 mins (normal, wakes on request)
- ~30 sec startup time after sleep
- 512MB RAM limit (enough for MVP)

✅ **Included**:
- Free MongoDB 512MB database
- Free HTTPS certificate
- Auto-deploys on GitHub push
- Automatic backups

---

## Next Steps (Optional)

1. **Add Custom Domain** (Render Dashboard → Settings)
2. **Use Environment** (Dev/Staging/Production)
3. **Monitor** (Render Dashboard → Logs)
4. **Scale Up** (Upgrade to Starter when needed)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Service won't start | Check logs, verify environment variables |
| Frontend can't connect | Check VITE_API_URL is correct, clear cache |
| MongoDB timeout | Verify connection string, IP whitelist |
| Python errors | Check requirements.txt, view logs |

---

## Quick Links

- 📚 [Full Deployment Guide](./DEPLOYMENT.md)
- ✓ [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- 🔗 [Render Docs](https://render.com/docs)
- 🗄️ [MongoDB Docs](https://docs.mongodb.com)

---

**Total Time**: ~20 minutes
**Cost**: FREE ✅
**Status**: Ready to deploy! 🚀
