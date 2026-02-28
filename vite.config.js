import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      host: true,
      port: 5174
    },
    build: {
      target: 'es2020'
    },
    plugins: [
      {
        name: 'anthropic-api-proxy',
        configureServer(server) {
          server.middlewares.use('/api/chat', async (req, res) => {
            // CORS headers
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              res.end();
              return;
            }

            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            // Read request body
            let body = '';
            for await (const chunk of req) {
              body += chunk;
            }

            try {
              const { npcId, systemPrompt, messages } = JSON.parse(body);

              if (!systemPrompt || !messages) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing systemPrompt or messages' }));
                return;
              }

              const apiKey = env.ANTHROPIC_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }));
                return;
              }

              const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                  model: 'claude-haiku-4-5-20251001',
                  max_tokens: 150,
                  system: systemPrompt,
                  messages: messages
                })
              });

              if (!apiRes.ok) {
                const errText = await apiRes.text();
                res.statusCode = apiRes.status;
                res.end(JSON.stringify({ error: 'API error', details: errText }));
                return;
              }

              const data = await apiRes.json();
              const reply = data.content?.[0]?.text || '';

              res.statusCode = 200;
              res.end(JSON.stringify({ reply }));

            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        }
      }
    ]
  };
});
