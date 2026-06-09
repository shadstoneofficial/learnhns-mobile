import { createServer } from 'node:http';
import { getMockNameDetail, getMockWalletSummary, mockHelperClient } from '../src/helper-client/mockHelperClient';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';

const server = createServer(async (request, response) => {
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type');
  response.setHeader('content-type', 'application/json');

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host}`);

    if (request.method === 'GET' && url.pathname === '/status') {
      sendJson(response, await mockHelperClient.getStatus());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/wallet/summary') {
      await readJsonBody(request);
      sendJson(response, getMockWalletSummary());
      return;
    }

    if (request.method === 'GET' && url.pathname.startsWith('/name/')) {
      const name = decodeURIComponent(url.pathname.replace('/name/', ''));
      const detail = getMockNameDetail(name);

      if (!detail) {
        sendJson(response, { error: 'Name not found' }, 404);
        return;
      }

      sendJson(response, detail);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/tx/relay') {
      await readJsonBody(request);
      sendJson(response, { error: 'Mock helper does not relay transactions' }, 501);
      return;
    }

    sendJson(response, { error: 'Not found' }, 404);
  } catch (error) {
    sendJson(
      response,
      { error: error instanceof Error ? error.message : 'Mock helper error' },
      500
    );
  }
});

server.listen(port, host, () => {
  console.log(`LearnHNS mock helper listening on http://${host}:${port}`);
});

function sendJson(response: typeof import('node:http').ServerResponse.prototype, data: unknown, status = 200) {
  response.writeHead(status);
  response.end(JSON.stringify(data));
}

function readJsonBody(request: typeof import('node:http').IncomingMessage.prototype) {
  return new Promise<unknown>((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      if (!body) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });
}
