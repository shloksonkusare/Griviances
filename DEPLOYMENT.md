# Grievance Portal - Render.com Deployment Guide

## Overview
This guide will help you deploy the Grievance Portal on Render.com's free tier. The application consists of:
- **Frontend**: React + Vite (Static)
- **Backend**: Node.js + Express API
- **AI Model**: Python + FastAPI (ML predictions)
- **Database**: MongoDB Atlas (Free tier)

## Prerequisites
1. GitHub account with your code pushed
2. Render.com account (free signup at render.com)
3. MongoDB Atlas account (free signup at mongodb.com/cloud/atlas)

---

## Step 1: Set Up MongoDB Atlas (FREE)

### 1.1 Create Free Cluster
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in
3. Create a **Free Shared Cluster**
4. Choose region (same as Render - Oregon recommended)
5. Wait for cluster to initialize (~5 mins)

### 1.2 Get Connection String
1. Click "Connect" → "Drivers"
2. Copy connection string, replace `<username>` and `<password>` with your credentials
3. Example: `mongodb+srv://user:password@cluster.mongodb.net/grievance_portal?retryWrites=true&w=majority`

### 1.3 Create Database User
1. Go to Database Access
2. Create a database user (save username & password)
3. Add IP address 0.0.0.0/0 (allows all IPs - needed for Render)

---

## Step 2: Deploy on Render.com

### 2.1 Connect GitHub
1. Go to [render.com](https://render.com)
2. Sign up → Connect GitHub
3. Authorize Render to access your repositories
4. Select `Grievance-Portal` repository

### 2.2 Deploy Services
Render.com will automatically detect `render.yaml` and deploy all 3 services:

```
✅ grievance-portal-api (Node.js Backend)
✅ grievance-portal-ai (Python AI Model)
✅ grievance-portal-client (React Frontend)
```

**Deployment time**: ~5-10 minutes per service

### 2.3 Monitor Deployment
1. Go to Render Dashboard
2. Watch each service build and deploy
3. Check logs for any errors

---

## Step 3: Configure Environment Variables

### 3.1 Backend API Variables
Click on `grievance-portal-api` service → Environment:

```
NODE_ENV = production
PORT = 5000
MONGODB_URI = [MongoDB connection string from Step 1]
JWT_SECRET = [Keep auto-generated or provide custom]
WHATSAPP_PHONE_NUMBER_ID = [Your WhatsApp Phone ID]
WHATSAPP_ACCESS_TOKEN = [Your WhatsApp Access Token]
WHATSAPP_BUSINESS_ACCOUNT_ID = [Your Business Account ID]
GOOGLE_MAPS_API_KEY = [Optional - Your Google Maps API Key]
SMTP_HOST = [Email server - optional]
SMTP_PORT = [Email port - optional]
SMTP_USER = [Email user - optional]
SMTP_PASS = [Email password - optional]
```

### 3.2 Frontend Variables
Click on `grievance-portal-client` service:
- `VITE_API_URL` - Auto-configured to backend API URL ✅

### 3.3 AI Model Variables
Click on `grievance-portal-ai` service:
- `PYTHONUNBUFFERED = 1` - Already set ✅

---

## Step 4: Update Frontend API URL

### 4.1 Client Configuration
The frontend automatically uses the API URL from `render.yaml`:
```javascript
// Auto-set via environment variable
const API_URL = import.meta.env.VITE_API_URL
```

If manual update needed, edit [client/.env.production](client/.env.production):
```
VITE_API_URL=https://grievance-portal-api.onrender.com
```

---

## Step 5: Verify Deployment

### 5.1 Check Services Status
- **API Health**: `https://grievance-portal-api.onrender.com/health`
- **AI Docs**: `https://grievance-portal-ai.onrender.com/docs`
- **Frontend**: `https://grievance-portal-client.onrender.com`

### 5.2 Test API Connection
```bash
curl https://grievance-portal-api.onrender.com/health
```

Expected response: `{"status":"ok"}`

### 5.3 Test Frontend
Visit: `https://grievance-portal-client.onrender.com`

---

## Common Issues & Solutions

### Issue 1: "Service fails to start"
**Solution**:
- Check service logs in Render Dashboard
- Verify all environment variables are set
- Check for typos in MongoDB URI
- Ensure dependencies are installed (npm, pip)

### Issue 2: "Frontend can't connect to API"
**Solution**:
- Verify `VITE_API_URL` is set correctly
- Check backend service is running
- Clear browser cache
- Check CORS settings in [server/server.js](server/server.js)

### Issue 3: "MongoDB connection timeout"
**Solution**:
- Verify MongoDB URI in environment variables
- Check IP whitelist in MongoDB Atlas (should be 0.0.0.0/0)
- Ensure database user credentials are correct
- Test connection string locally first

### Issue 4: "Python service won't start"
**Solution**:
- Check [ai_model/requirements.txt](ai_model/requirements.txt) is valid
- Verify Python version compatibility (3.9+)
- Check for missing dependencies
- View service logs for specific errors

### Issue 5: "Static site deploys empty"
**Solution**:
- Ensure `npm run build` succeeds locally
- Check [client/vite.config.js](client/vite.config.js) configuration
- Verify `dist/` folder is created
- Clear Render cache and redeploy

---

## Monitoring & Logs

### View Service Logs
1. Click service name in Render Dashboard
2. Go to "Logs" tab
3. Stream live logs or view history

### Monitor Performance
- Render Dashboard shows CPU, Memory, Request metrics
- Free tier: 15-minute idle timeout (services sleep after 15 mins)
- Services auto-wake on request

---

## Important Notes for Free Tier

⚠️ **Free Tier Limitations**:
- Services sleep after 15 minutes of inactivity
- Limited to 100GB/month bandwidth combined
- 512MB RAM per service
- 0.5 CPU per service
- Perfect for MVP, development, and testing

✅ **Suitable For**:
- Proof of concepts
- MVPs
- Development/staging
- Low-traffic production (< 100 requests/day)

---

## Scaling to Production

When ready for production, upgrade to:
- **Starter Plan**: $7/month per service
- **Standard Plan**: $12/month per service
- No idle timeout, more resources

Simply click "Update" on each service in Render Dashboard.

---

## Database Backups

MongoDB Atlas free tier includes:
- Automatic daily backups (free)
- 7-day backup retention
- Manual backup snapshots

Restore from MongoDB Atlas Dashboard if needed.

---

## Next Steps

1. ✅ Get WhatsApp API credentials (if not already)
2. ✅ Configure SMTP for email notifications (optional)
3. ✅ Add custom domain (optional)
4. ✅ Set up monitoring alerts
5. ✅ Create database indexes for performance

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **MongoDB Docs**: https://docs.mongodb.com
- **Express Docs**: https://expressjs.com
- **FastAPI Docs**: https://fastapi.tiangolo.com

---

**Deployment Date**: February 2026
**Status**: Ready for FREE deployment ✅
