# PRIVAGENT — STEP 4: AWS EC2 DEPLOYMENT GUIDE

This guide provides the exact steps required to deploy the PRIVAGENT Staging Environment on an AWS EC2 instance.

## 1. Create Ubuntu EC2 instance
Launch an AWS EC2 instance running **Ubuntu 22.04 LTS** or **24.04 LTS**. Allocate an Elastic IP.

## 2. SSH into EC2
```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_IP
```

## 3. Install Docker
Run the following commands to install the official Docker engine:
```bash
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io -y
sudo usermod -aG docker ubuntu
newgrp docker
```

## 4. Install Docker Compose plugin
```bash
sudo apt-get install docker-buildx-plugin docker-compose-plugin -y
```

## 5. Clone repository
```bash
git clone <your-repository-url> privagent
cd privagent
```

## 6. Create .env.staging
Create the secure `.env.staging` file based on the example blueprint.
```bash
cp .env.staging.example .env.staging
nano .env.staging
```
Insert your real domain and API key:
```env
DOMAIN=YOUR_DOMAIN
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
WS_URL=wss://YOUR_DOMAIN/ws
DEMO_MODE=false
```

## 7. Configure Gemini API key
*(Done in Step 6 via nano. Ensure it is saved and the file is NOT committed).*

## 8. Configure domain DNS
Log into your DNS provider and create an **A Record** pointing `YOUR_DOMAIN` to `YOUR_EC2_IP`. Wait 1-2 minutes for propagation so Caddy can provision the Let's Encrypt certificate.

## 9. Start Docker Compose
```bash
docker compose --env-file .env.staging up -d --build
```

## 10. Check containers
Ensure `m1`, `m5`, and `caddy` are all running safely:
```bash
docker ps
```

## 11. Check M5 health
Test externally over HTTPS to verify Caddy proxy routing:
```bash
curl -i https://YOUR_DOMAIN/health
```

## 12. Check M1 health from inside Docker network
M1 is fully isolated. Test it via the M5 container:
```bash
docker exec privagent_m5 curl -s http://m1:3001/api/m1/health
```

## 13. Check Caddy
View logs to ensure Let's Encrypt TLS certificate provisioning succeeded:
```bash
docker compose logs caddy
```

## 14. Check HTTPS
Open `https://YOUR_DOMAIN/health` in a browser to confirm valid SSL lock.

## 15. Check WSS
Use `wscat` or a WebSocket client to verify WebSocket upgrades over TLS:
```bash
npx wscat -c wss://YOUR_DOMAIN/ws
```

## 16. Update/redeploy
```bash
git pull
docker compose --env-file .env.staging up -d --build
```

## 17. Restart/stop
```bash
# Restart
docker compose restart

# Stop fully
docker compose down
```

## 18. Troubleshooting
- **WSS drops immediately:** Check Caddy proxy logs (`docker compose logs caddy`).
- **Cannot connect over HTTPS:** Verify Port 443 is open in AWS Security Group.
- **M1 returning 500:** Verify `YOUR_GEMINI_API_KEY` is correct in `.env.staging`. Ensure M1 mock fallback is disabled (forced `false` in `docker-compose.yml`).
