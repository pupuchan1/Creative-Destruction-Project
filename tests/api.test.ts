import assert from 'node:assert/strict';
import { test } from 'node:test';
import app from '../apps/api/src/index.ts';
import { unavailableResponseSchema } from '@haas/contracts';

test('all unimplemented API paths fail closed, without leaking request data', async () => {
  for (const path of ['/api', '/api/', '/api/auth/login', '/api/interviews', '/api/voice/start']) {
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      const response = await app.request(path, { method });
      assert.equal(response.status, 503, `${method} ${path}`);
      const result = unavailableResponseSchema.parse(await response.json());
      assert.equal(result.error.code, 'SERVICE_UNAVAILABLE');
      assert.match(result.error.message, /現在利用できません/);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('access-control-allow-origin'), null);
    }
  }
});

test('API and static assets both receive security headers', async () => {
  const assets = {
    fetch: async () =>
      new Response('<html>sample</html>', { headers: { 'content-type': 'text/html' } }),
  };
  for (const path of ['/api/interviews', '/candidate/demo/check']) {
    const response = await app.request(path, {}, { ASSETS: assets });
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.match(response.headers.get('permissions-policy') ?? '', /microphone=\(\)/);
    assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
    assert.match(response.headers.get('content-security-policy') ?? '', /script-src 'self'/);
  }
});

test('immutable asset responses can receive security headers without a 500', async () => {
  const assets = {
    fetch: async () => {
      const response = await fetch('data:text/html,<html>sample</html>');
      assert.throws(() => response.headers.set('x-test', 'immutable'));
      return response;
    },
  };
  const response = await app.request('/interviews/sample-a/report', {}, { ASSETS: assets });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '<html>sample</html>');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
});
