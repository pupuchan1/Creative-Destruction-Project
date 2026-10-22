import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { unavailableResponse } from '@haas/contracts';

type Bindings = { ASSETS: { fetch: (request: Request) => Promise<Response> } };

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  '*',
  secureHeaders({
    referrerPolicy: 'no-referrer',
    xFrameOptions: 'DENY',
    permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'none'"],
    },
  }),
);

// Fail closed until authentication and tenant authorization are implemented.
app.all('/api', (c) => {
  c.header('Cache-Control', 'no-store');
  return c.json(unavailableResponse, 503);
});
app.all('/api/*', (c) => {
  c.header('Cache-Control', 'no-store');
  return c.json(unavailableResponse, 503);
});
app.all('*', async (c) => {
  const response = await c.env.ASSETS.fetch(c.req.raw);
  // Asset responses have immutable headers; clone before applying middleware headers.
  return new Response(response.body, response);
});

export default app;
