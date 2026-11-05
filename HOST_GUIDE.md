# Hosting guide — putting SchemeSaathi online

Step-by-step guide to move SchemeSaathi from your laptop to one Linux server with HTTPS.
Do the steps in order and tick them off. Commands marked **(laptop)** run on your Mac
in the project folder; commands marked **(server)** run on the server over SSH.

> **Status of this release:** beta. Not yet tested with live users; sized for about
> **50 people searching at the same time**. The home page and `/terms` say so.

```
Browser ──HTTPS──▶ Caddy (server, ports 80/443, automatic certificates)
                     └──▶ 127.0.0.1:8080  web  (nginx: React app, proxies /api)
                                            └──▶ api :4000 (Node) ──▶ db (Postgres)
```

Everything except Caddy runs in Docker using the project's existing `docker-compose.yml`,
plus `docker-compose.prod.yml` for production secrets.

---

## 0. What you need

| Item | Recommendation |
|---|---|
| A server (VPS) | Ubuntu 24.04, **2 vCPU / 4 GB RAM / 40 GB disk**. Pick a **Mumbai or Bangalore** region so it's fast for Indian users (e.g. DigitalOcean BLR, AWS Lightsail Mumbai, Oracle Cloud Mumbai). |
| A domain name | e.g. `schemesaathi.in`. Any registrar works. |
| SSH access | You can run `ssh root@SERVER_IP` from your Mac. |

Below, replace `SERVER_IP` with your server's IP and `example.in` with your domain.

**No budget?** Read [Free plan (₹0)](#free-plan-0) first; it says which steps change.

---

## Free plan (₹0)

Two ways to run the beta for free. Free tiers change often; check each site's current
limits when you sign up. (Checked November 2026; the database is about 40 MB.)

| | **A. Oracle Cloud Always Free + DuckDNS** (recommended) | **B. Render + Neon + Netlify** |
|---|---|---|
| What you get | A real Linux server (ARM, up to 2 CPUs / 12 GB RAM) in Mumbai or Hyderabad | Three managed services, no server to look after |
| Fits this guide | Yes: same Docker setup, steps 2–12 almost unchanged | No: separate steps below |
| Speed for 50 users | Good | Slow: the free API has 0.1 CPU and sleeps after 15 min idle (first visit then waits ~1 min) |
| Backups | Your own (step 10) | Neon keeps only a few hours of history |
| Catch | Signup needs a card (verification only), and free ARM servers are sometimes "out of capacity". Oracle may reclaim idle free servers | Rate limiting can't see real visitor IPs (see B6) |
| Web address | `yourname.duckdns.org` (free) or your own domain | `yourname.netlify.app` (free) or your own domain |

### Option A — Oracle Cloud Always Free + DuckDNS

This replaces **steps 0, 1 and 3** of the main guide. Then continue from step 4.

**A1. Create the Oracle account**
1. Sign up at <https://www.oracle.com/cloud/free/>.
2. Pick **India West (Mumbai)** or **India South (Hyderabad)** as your *home region*.
   You can't change it later, and free ARM servers only run in the home region.
3. A card is needed for identity verification. Free-tier resources are not charged.

**A2. Create the server**
In the console, go to **Compute → Instances → Create instance**:
- **Image:** Canonical Ubuntu 24.04.
- **Shape:** *Ampere* → `VM.Standard.A1.Flex`, **2 OCPU, 12 GB memory**. This is the
  free limit; going above it is not free.
- **Networking:** keep the default new VCN and *Assign a public IPv4 address*.
- **SSH keys:** *Upload public key*. On your Mac, run `cat ~/.ssh/id_ed25519.pub`, or create
  a key first with `ssh-keygen -t ed25519`.
- **Boot volume:** the default (about 47 GB) is free.

If you get **"Out of capacity"**, try another *availability domain* or try again later.
This is common for free ARM servers.

Note the **Public IP**. That is your `SERVER_IP`. The login user is `ubuntu`, not `root`.

**A3. Open ports 80 and 443 (two places)**
1. **Oracle firewall:** go to *Instance → Subnet → Default Security List → Add Ingress Rules*.
   Source `0.0.0.0/0`, TCP, destination port `80`. Add a second rule the same way for `443`.
2. **Server firewall:** Oracle's Ubuntu image has its own `iptables` rules, so do **not**
   use `ufw` here (skip the `ufw` lines in step 3). Run **(server)**:
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```

**A4. Free web address with DuckDNS**
1. Go to <https://www.duckdns.org> and sign in with Google or GitHub.
2. Add a subdomain, e.g. `schemesaathi`, and set its **current ip** to `SERVER_IP`.
3. Your site will be `https://schemesaathi.duckdns.org`. In the rest of this guide, use
   `schemesaathi.duckdns.org` wherever it says `example.in` (`DOMAIN=` in step 5, the
   Caddyfile in step 8). Leave out the `www.` line in the Caddyfile.

If you buy a domain later, change the DNS (step 1), `DOMAIN` in `.env` and the Caddyfile,
then run `dc up -d` and `systemctl reload caddy`.

**A5. Follow the main guide, with these changes**
- Log in with `ssh ubuntu@SERVER_IP`, then run `sudo -i` so the **(server)** commands work as written.
- **Step 3:** do the `apt` lines, Docker and Caddy; skip `ufw` (done in A3).
- **Step 4:** before `rsync`, run once **(server, as ubuntu)**:
  `sudo mkdir -p /opt/schemesaathi && sudo chown ubuntu /opt/schemesaathi`.
  Then use `ubuntu@SERVER_IP:/opt/schemesaathi/` as the `rsync` target.
- Steps 5–12 are unchanged. Every image used (Node, Postgres, nginx) runs on ARM.

**A6. Keep the free server from being reclaimed**
Oracle may stop or reclaim *Always Free* servers that stay almost idle for a week.
A low-traffic beta can look idle. To avoid this:
- Upgrade the account to **Pay As You Go** (*Billing → Upgrade*). Resources within the free
  limits stay ₹0, and idle reclamation does not apply to paid accounts. Set a **budget alert**
  of ₹1 (*Billing → Budgets*) so you're told at once if anything starts costing money.
- Keep the backups from step 10, and copy one to your laptop every week.

### Option B — Render (API) + Neon (database) + Netlify (website)

Use this only if you can't get an Oracle server. It needs the project on GitHub
(you push it yourself).

**B1. Database on Neon** (<https://neon.tech>, no card needed)
1. Create a project, **Postgres 16** (it matches the backup tools used here), region **AWS Asia Pacific (Singapore)**. It's the closest to India.
2. Copy the **connection string**, e.g. `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
3. **(laptop)** Do step 2 of this guide (`schemesaathi.dump`), then load the dump into Neon:
   ```bash
   docker run --rm -i postgres:16-alpine pg_restore --no-owner --no-acl \
     -d "PASTE_NEON_CONNECTION_STRING" < schemesaathi.dump
   ```

**B2. API on Render** (<https://render.com>, no card needed for the free plan)
1. **New → Web Service**, connect your GitHub repo.
2. **Root directory:** `server`. **Runtime:** Docker. **Region:** Singapore. **Plan:** Free.
3. **Environment variables:**

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | the Neon connection string |
   | `JWT_SECRET` | output of `openssl rand -hex 48` |
   | `ADMIN_EMAIL` | your email |
   | `ADMIN_PASSWORD` | a strong password (save it in a password manager) |
   | `CORS_ORIGIN` | `https://yourname.netlify.app` (fill in after B3) |
   | `COOKIE_SECURE` | `true` |
   | `API_RATE_LIMIT` | `3000` (see B6) |

4. Deploy, then open `https://YOUR-API.onrender.com/api/health`. It should show `{"status":"ok","db":"up"}`.

**B3. Website on Netlify** (<https://www.netlify.com>, free)
1. **(laptop)** Create `client/public/_redirects` with your Render URL:
   ```
   /api/*  https://YOUR-API.onrender.com/api/:splat  200
   /*      /index.html                               200
   ```
   The browser then sees one website, which the admin login cookie needs.
   Commit and push it.
2. Netlify: **Add new site → Import from GitHub**. **Base directory:** `client`.
   **Build command:** `npm run build`. **Publish directory:** `client/dist`.
3. Optionally rename the site (*Site configuration → Change site name*). Then put the final
   `https://….netlify.app` address into `CORS_ORIGIN` on Render.

**B4. Keep the API awake**
The free API sleeps after 15 minutes without visitors, and the next visitor waits about a minute.
Create a free monitor at <https://uptimerobot.com> that opens
`https://YOUR-API.onrender.com/api/health` every 5 minutes. One free Render service gets
750 hours a month, which is enough to stay awake all month.

**B5. Check:** do the checks in step 9, except the load test. Render's free plan is not sized for 50
people at once; if the beta grows, move to Option A or a paid plan.

**B6. Known limits of Option B**
- Requests reach the API through Netlify, so the API sees Netlify's servers instead of each
  visitor. The per-IP rate limit is then shared by many visitors, which is why `API_RATE_LIMIT`
  is set higher above.
- Every restart re-runs migrations and the seed, so cold starts are slow.
- Backups: Neon keeps only a short restore window on the free plan. Every week, **(laptop)**:
  ```bash
  docker run --rm postgres:16-alpine pg_dump -Fc "PASTE_NEON_CONNECTION_STRING" > ~/Desktop/schemesaathi-$(date +%F).dump
  ```

---

## 1. Point the domain at the server

At your domain registrar, add a DNS record:

| Type | Name | Value |
|---|---|---|
| A | `@` | `SERVER_IP` |

Optionally add a second A record with name `www` and the same IP.
DNS can take 5–60 minutes. Check with **(laptop)**: `dig +short example.in` → should print `SERVER_IP`.

---

## 2. Prepare the data on your laptop

The server will get a copy of your local database (all 4,624 schemes with Hindi), **without**
your local admin account or local analytics.

**(laptop)** Make sure the local database is running and up to date:

```bash
cd ~/Desktop/Scheme
docker compose up -d db
cd server && npm run db:import && cd ..        # loads data/processed/catalogue.json incl. Hindi
```

**(laptop)** Run the tests once more:

```bash
cd server && npm test && cd ..
cd client && npm test && cd ..
```

**(laptop)** Export the database:

```bash
docker compose exec -T db pg_dump -U saathi -Fc \
  --exclude-table-data=admin_users --exclude-table-data=analytics_events \
  schemesaathi > schemesaathi.dump
ls -lh schemesaathi.dump      # should be a few MB
```

---

## 3. Set up the server

**(laptop)** Log in: `ssh root@SERVER_IP`

**(server)** Update the system and turn on the firewall (only SSH, HTTP and HTTPS are allowed in):

```bash
apt update && apt upgrade -y
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

**(server)** Install Docker:

```bash
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

**(server)** Install Caddy (handles HTTPS certificates automatically):

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

---

## 4. Copy the project to the server

**(laptop)** From the project folder:

```bash
rsync -av --delete \
  --exclude node_modules --exclude dist --exclude coverage \
  --exclude data/raw --exclude data/translations/work --exclude 'data/translations/*.zip' \
  --exclude data/translations/done --exclude .env --exclude server/.env \
  --exclude e2e/test-results --exclude e2e/playwright-report --exclude .DS_Store \
  ./ root@SERVER_IP:/opt/schemesaathi/
```

The dump file `schemesaathi.dump` from step 2 is in the project folder, so it is copied too.

---

## 5. Create the production secrets

**(server)**

```bash
cd /opt/schemesaathi
echo "DOMAIN=example.in"                                   >  .env
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"           >> .env
echo "JWT_SECRET=$(openssl rand -hex 48)"                  >> .env
echo "ADMIN_EMAIL=you@yourmail.com"                        >> .env
echo "ADMIN_PASSWORD=$(openssl rand -base64 18)"           >> .env
chmod 600 .env
cat .env        # write down ADMIN_EMAIL and ADMIN_PASSWORD in a password manager
```

- Use your real email for `ADMIN_EMAIL` (not `admin@schemesaathi.local`).
- Keep `.env` only on the server. Never copy it into the project on your laptop or share it.
- `docker-compose.prod.yml` refuses to start if any of these values is missing, so the
  development defaults can't be used by mistake.

From now on, every compose command on the server uses both files. To save typing:

```bash
echo "alias dc='docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile full'" >> ~/.bashrc
source ~/.bashrc
```

---

## 6. Start the database and load the data

**(server)** Start only Postgres first:

```bash
cd /opt/schemesaathi
dc up -d db
dc ps                         # wait until db shows "(healthy)"
```

**(server)** Load the export from step 2:

```bash
dc exec -T db pg_restore -U saathi -d schemesaathi --no-owner < schemesaathi.dump
dc exec -T db psql -U saathi -d schemesaathi -c "select count(*) from schemes"   # expect 4624
rm schemesaathi.dump
```

---

## 7. Start the API and web app

**(server)**

```bash
dc up -d --build              # first build takes a few minutes
dc ps                         # db, api and web should all be "Up"
dc logs api | tail -20        # should end with the API listening on port 4000
curl -s http://127.0.0.1:8080/api/health    # {"status":"ok","db":"up"}
```

On startup the API applies migrations (none needed), adds anything missing from the 45
curated schemes, and **creates the admin user from `.env`**.

---

## 8. Turn on HTTPS

**(server)** Replace the Caddy config (use your domain):

```bash
cat > /etc/caddy/Caddyfile <<'EOF'
example.in, www.example.in {
	encode gzip
	reverse_proxy 127.0.0.1:8080
}
EOF
systemctl reload caddy
```

Remove `www.example.in` if you didn't add the `www` DNS record. Caddy gets and renews the
certificate on its own. If it fails, check `journalctl -u caddy -n 50` (usually DNS
has not updated yet; wait and reload again).

---

## 9. Check that it works

From your phone or laptop:

- [ ] `https://example.in` opens, shows the padlock, and shows the **Beta service** notice.
- [ ] `https://example.in/terms` shows the terms. Switch to हिन्दी and check them again.
- [ ] Run the eligibility check once and download the PDF checklist.
- [ ] Browse schemes in Hindi; imported schemes should show Hindi names.
- [ ] `https://example.in/admin`: log in with the email and password from `.env`.
- [ ] `http://example.in` redirects to `https://`.

### Load check (about 50 people at once)

The API allows **300 requests per minute from one IP address**, so a load test from your own
laptop gets blocked. Raise the limit temporarily **(server)**:

```bash
echo "API_RATE_LIMIT=5000" >> .env && dc up -d api
```

**(laptop)**:

```bash
cd server && npm run perf -- 1000 50 https://example.in
```

Aim for **p95 under 1 s**. Then remove the temporary limit **(server)**:

```bash
sed -i '/^API_RATE_LIMIT=/d' .env && dc up -d api
```

> If many users share one IP address (e.g. a CSC centre or office Wi-Fi), they share those
> 300 requests a minute. If they report "Too many requests", set `API_RATE_LIMIT=1000` in `.env`.

---

## 10. Daily backups

**(server)** Create the backup script:

```bash
mkdir -p /opt/backups
cat > /opt/backups/backup.sh <<'EOF'
#!/bin/sh
# Daily Postgres dump, keep 14 days
cd /opt/schemesaathi
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db \
  pg_dump -U saathi -Fc schemesaathi > /opt/backups/schemesaathi-$(date +%F).dump
find /opt/backups -name '*.dump' -mtime +14 -delete
EOF
chmod +x /opt/backups/backup.sh
/opt/backups/backup.sh && ls -lh /opt/backups      # test it once
```

**(server)** Run it every night at 02:30:

```bash
(crontab -l 2>/dev/null; echo "30 2 * * * /opt/backups/backup.sh") | crontab -
```

**(laptop)** About once a week, copy a backup off the server:

```bash
scp "root@SERVER_IP:/opt/backups/$(ssh root@SERVER_IP ls -t /opt/backups | head -1)" ~/Desktop/
```

To restore a backup: `dc exec -T db pg_restore -U saathi -d schemesaathi --clean --if-exists --no-owner < FILE.dump`

---

## 11. Updating the site later

**(laptop)** Make and test your changes, then run the `rsync` command from step 4 again.

**(server)**

```bash
cd /opt/schemesaathi
/opt/backups/backup.sh        # backup first
dc up -d --build
```

- **Do not restore your laptop's database over the server after launch.** Admin edits and
  reviews made on the live site would be lost. For a new catalogue, copy
  `data/processed/catalogue.json` to the server and run the import inside the API container,
  or ask a developer. Reviewed schemes are protected from re-imports.
- To see what's happening: `dc logs -f api` (Ctrl+C to stop following).
- Server security updates: run `apt update && apt upgrade -y` about once a month.

---

## 12. Before inviting real users (beta checklist)

- [ ] Steps 1–10 done; padlock, admin login and backups checked.
- [ ] Review the imported schemes for your users' states (Admin → Schemes → *Needs review*).
- [ ] A native Hindi speaker spot-checks the most-viewed schemes and the `/terms` page.
- [ ] Ask 5–10 testers (volunteers or CSC operators) to try it and report wrong results.
- [ ] Re-run the load check after any big change.
- [ ] Before a wider public launch: have the privacy notice and terms checked by someone
      who knows Indian law (DPDP Act 2023), and update the 50-user note once tested at scale.

## Troubleshooting

| Problem | Check |
|---|---|
| `required variable ... is missing` | A value is missing in `/opt/schemesaathi/.env` (step 5). |
| Site shows "502 Bad Gateway" | `dc ps`: is `web`/`api` up? `dc logs api` for the error. |
| API logs `ECONNREFUSED` / can't reach the database | `dc ps db` must be healthy; `dc up -d db`. |
| `password authentication failed` | `POSTGRES_PASSWORD` was changed after the database was first created. Put the original value back. |
| Can't log in to admin | Admin is created only if that email doesn't exist yet. Check `ADMIN_EMAIL` in `.env` and `dc logs api` for "Created admin user". |
| No HTTPS certificate | DNS not pointing at the server yet, or ports 80/443 closed: `ufw status`. |
