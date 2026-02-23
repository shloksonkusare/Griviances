# Render.com Deployment Checklist

## Before Deployment ✅

### Code Preparation
- [ ] All code committed and pushed to GitHub (branch: main)
- [ ] No sensitive credentials in code (use .env files)
- [ ] Package.json files configured in all directories
- [ ] render.yaml file exists in root directory

### Dependencies
- [ ] Node.js packages: `npm install` works locally
- [ ] Python packages: `pip install -r requirements.txt` works
- [ ] No compatibility issues with dependencies

### Environment Variables
- [ ] MongoDB Atlas cluster created and accessible
- [ ] Database user created with correct password
- [ ] MongoDB connection string tested locally
- [ ] WhatsApp API credentials ready (if needed)
- [ ] SMTP credentials ready (if needed)
- [ ] JWT_SECRET will be auto-generated ✅

### Frontend Build
- [ ] `npm run build` succeeds locally
- [ ] dist/ folder is created
- [ ] No build errors or warnings (critical)

### Backend Health
- [ ] Server starts without errors: `npm start`
- [ ] Health check endpoint works: GET /health
- [ ] Database connection works

### AI Model
- [ ] Python dependencies install without errors
- [ ] FastAPI app starts: `uvicorn main:app --reload`
- [ ] FastAPI docs available: /docs endpoint

---

## Deployment Steps 🚀

### 1. GitHub Setup
- [ ] Repository is public or accessible to Render
- [ ] All code is pushed to main branch
- [ ] No merge conflicts

### 2. Render.com Dashboard
- [ ] Account created at render.com
- [ ] GitHub connected to Render
- [ ] Repository selected for deployment

### 3. Configure MongoDB
- [ ] MongoDB Atlas free cluster created
- [ ] Database user created
- [ ] IP whitelist: 0.0.0.0/0 (allow all IPs)
- [ ] Connection string copied

### 4. Environment Variables in Render
```
Backend (grievance-portal-api):
□ MONGODB_URI = [connection string]
□ NODE_ENV = production
□ CLIENT_URL = auto-set ✅
□ WHATSAPP_PHONE_NUMBER_ID = [your ID]
□ WHATSAPP_ACCESS_TOKEN = [your token]
□ WHATSAPP_BUSINESS_ACCOUNT_ID = [your ID]

AI Model (grievance-portal-ai):
□ PYTHONUNBUFFERED = 1 (auto-set ✅)

Frontend (grievance-portal-client):
□ VITE_API_URL = auto-set ✅
```

### 5. Deploy
- [ ] Click Deploy in Render Dashboard
- [ ] Wait for all 3 services to build (~10-15 mins)
- [ ] Monitor logs for errors

### 6. Post-Deployment
- [ ] Check health endpoints:
  - [ ] Backend: https://grievance-portal-api.onrender.com/health
  - [ ] AI: https://grievance-portal-ai.onrender.com/docs
  - [ ] Frontend: https://grievance-portal-client.onrender.com

- [ ] Test frontend loads correctly
- [ ] Test API connectivity from frontend
- [ ] Check console for errors

---

## Production Verification ✓

### Services Running
- [ ] Backend API: Status = "Live"
- [ ] AI Model: Status = "Live"
- [ ] Frontend: Status = "Live"

### Functionality
- [ ] Frontend loads without errors
- [ ] Can navigate to different pages
- [ ] API calls work (check Network tab)
- [ ] Database reads/writes work
- [ ] WhatsApp integration works (if configured)

### Monitoring
- [ ] Enable email notifications in Render
- [ ] Check logs periodically for errors
- [ ] Monitor resource usage

---

## Rollback Plan 🔄

If deployment fails:
1. Check error logs in Render Dashboard
2. Fix issues locally
3. Push fixes to GitHub
4. Render auto-redeploys on push
5. Or click "Manual Deploy" in Dashboard

---

## Important Reminders ⚠️

### Free Tier Notes
⏰ Services sleep after 15 mins of inactivity
- First request: ~30 sec to wake up (normal)
- Fix: Use Cron job to ping service if needed

📊 Limited resources: 512MB RAM, 0.5 CPU
- Suitable for < 100 requests/day
- Upgrade to Starter for production

🔐 Security
- Never commit .env files
- Regenerate JWT_SECRET in production
- Use strong MongoDB passwords

📱 WhatsApp Integration
- Verify phone number and business account
- Test webhook in development first
- Monitor failed deliveries

---

## Useful Commands

```bash
# Test from local machine
curl https://grievance-portal-api.onrender.com/health

# View MongoDB Atlas metrics
# Dashboard → Clusters → Metrics

# Update MongoDB IP whitelist
# Dashboard → Network Access → IP Whitelist

# View Render logs
# Dashboard → Service → Logs
```

---

## Support Contacts

- **MongoDB Support**: https://support.mongodb.com
- **Render Support**: support@render.com
- **GitHub Issues**: Your repo Issues tab

---

**Status**: Ready for Deployment ✅
**Date**: February 23, 2026
