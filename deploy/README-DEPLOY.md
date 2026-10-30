# Deploy — passport.truel1.com — NEW SITE ONLY
# Run these on your server as root, one block at a time, and check each output.
# This does NOT edit existing nginx sites, does NOT restart Besu/BlockScout,
# and does NOT touch /opt/truel1-blockscout/docker-compose.
#
# PRE-CHECK: DNS already points to this server (confirmed by George, Oct 30).
# No certificate yet — certbot will add it in Step 4.
#
# Step 1 — Create a NEW folder only, and copy the demo files there.
# (Replace /tmp/true-ip-dpp with wherever you put the files from GitHub / the zip.)
mkdir -p /var/www/passport.truel1.com
cp -r /tmp/true-ip-dpp/web/* /var/www/passport.truel1.com/
ls -lh /var/www/passport.truel1.com/ /var/www/passport.truel1.com/qr/ | head -40
#
# Step 2 — Install the NEW nginx site file only.
cp /tmp/true-ip-dpp/deploy/passport.truel1.com.conf /etc/nginx/sites-available/passport.truel1.com
ln -s /etc/nginx/sites-available/passport.truel1.com /etc/nginx/sites-enabled/passport.truel1.com
nginx -t
# STOP if nginx -t shows an error. Do NOT reload until it says "test is successful".
#
# Step 3 — Reload nginx only (this does not restart your other sites' apps or Besu).
systemctl reload nginx
curl -sI http://passport.truel1.com/ | head -5
curl -s http://passport.truel1.com/p/TRUE-SJ-001 | head -5
#
# Step 4 — Add the certificate with certbot (nginx plugin).
# This only touches the new passport.truel1.com site file.
# If certbot is not installed: apt update && apt install -y certbot python3-certbot-nginx
certbot --nginx -d passport.truel1.com --redirect --agree-tos -m webmaster@passport.truel1.com --non-interactive
nginx -t && systemctl reload nginx
curl -sI https://passport.truel1.com/ | head -5
#
# Step 5 — Test the 10 QR pages.
# Open in a browser / phone:
#   https://passport.truel1.com/
#   https://passport.truel1.com/p/TRUE-SJ-001  …  /p/TRUE-SJ-010
# On a passport page, click "Tamper demo" → should show MISMATCH, then "Restore original" → MATCH.
#
# Rollback (if anything looks wrong): remove ONLY the new site and reload.
#   rm /etc/nginx/sites-enabled/passport.truel1.com
#   nginx -t && systemctl reload nginx
# Your other sites and Besu/BlockScout are untouched by that rollback.
