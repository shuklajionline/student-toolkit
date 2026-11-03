# AI proxy

Keeps the Groq API key off the website. The resume checker, resume generator and Check My College call this Worker.

## Deploy

1. Create a new key at https://console.groq.com and revoke every old one.
2. From this folder, sign in and deploy:

   ```
   npx wrangler login
   npx wrangler deploy
   ```

3. Store the new key as a secret. Paste it when prompted:

   ```
   npx wrangler secret put GROQ_API_KEY
   ```

4. Copy the `https://student-toolkit-ai.<your-subdomain>.workers.dev` URL that deploy printed into `ST_AI_ENDPOINT` in `/ai-config.js`.
