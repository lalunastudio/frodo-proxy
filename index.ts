import { Elysia } from 'elysia';
import { mkdir } from 'node:fs/promises';
import { json } from 'node:stream/consumers';

const baseUrl = process.env.BASE_URL;
const locale = 'pt';
const port = process.env.PORT || 4000;

// Add cache utility functions
async function generateCacheKey(
  path: string,
  query: Record<string, any>,
  method: string,
  body?: object,
): Promise<string> {
  const cacheKeyForBody = await Bun.password.hash(body ? JSON.stringify(body) : 'nope', {
    algorithm: 'bcrypt',
  });

  const normalizedPath = path.replace(/\//g, '_').replace('_api_v1_', '');
  const queryString = Object.keys(query)
    .sort()
    .map((key) => `${key}-${query[key]}`)
    .join('_');
  const key = `${method}_${locale}_${normalizedPath}_${queryString}${body ? `_${cacheKeyForBody}` : ''}`.replace(
    /[^a-zA-Z0-9_-]/g,
    '_',
  );

  if (key.startsWith('GET_pt_content_products_productIds-')) {
    return 'GET_pt_content_products_productIds-catch-all';
  }

  return key;
}

async function getCache(cacheKey: string) {
  try {
    const file = Bun.file(`.tmp/cache/${cacheKey}.json`);
    if (await file.exists()) {
      const cache = await file.json();
      // Check if cache is still valid (you might want to add expiration logic here)
      return cache;
    }
  } catch (error) {
    console.log('Cache read error:', error);
  }
  return null;
}

async function setCache(cacheKey: string, response: any, headers: Headers) {
  try {
    if (headers.get('Content-Type')?.includes('application/json')) {
      response = JSON.stringify(response);
    }

    // Ensure cache directory exists
    await mkdir('.tmp/cache', { recursive: true });

    const cacheData = {
      headers: Object.fromEntries(headers.entries()),
      body: response,
      cachedAt: new Date().toISOString(),
    };

    await Bun.write(`.tmp/cache/${cacheKey}.json`, JSON.stringify(cacheData, null, 2));
  } catch (error) {
    console.log('Cache write error:', error);
  }
}

new Elysia()
  .get('*', async ({ path, query, body, set }) => {
    const cacheKey = await generateCacheKey(path, query, 'GET');
    const cachedResponse = await getCache(cacheKey);

    if (cachedResponse) {
      console.log('🎯 Cache hit:', cacheKey);
      set.headers['x-cache'] = 'HIT';
      Object.entries(cachedResponse.headers).forEach(([key, value]) => {
        set.headers[key] = value as string;
      });
      return cachedResponse.body;
    }

    const paramString = Object.keys(query)
      .map((key) => {
        return `${key}=${query[key]}`;
      })
      .join('&');

    const fullPath = `${baseUrl}${path}?${paramString}`;
    const res = await fetch(fullPath, {
      headers: {
        'Content-Type': 'application/json',
        // Host: hostHeader || '',
      },
    });

    console.log('🔥 GET', fullPath, ' => ', res.status);

    const contentType = res.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    const resBody = isJson ? await res.json() : await res.text();

    set.status = res.status;

    if (res.status >= 200 && res.status < 300) {
      await setCache(cacheKey, resBody, res.headers as Headers);
    } else {
      console.log('🔴 Cache miss', { path, query, body, cacheKey, headers: res.headers, resBody });
    }

    set.headers['x-cache'] = 'MISS';
    Object.entries(res.headers).forEach(([key, value]) => {
      set.headers[key] = value as string;
    });

    return resBody;
  })
  .post('*', async ({ path, query, body, set }) => {
    const cacheKey = await generateCacheKey(path, query, 'POST', body as object);
    const cachedResponse = await getCache(cacheKey);
    if (cachedResponse) {
      console.log('🎯 Cache hit:', cacheKey);
      set.headers['x-cache'] = 'HIT';
      Object.entries(cachedResponse.headers).forEach(([key, value]) => {
        set.headers[key] = value as string;
      });
      return cachedResponse.body;
    }
    const paramString = Object.keys(query)
      .map((key) => {
        return `${key}=${query[key]}`;
      })
      .join('&');

    const fullPath = `${baseUrl}${path}?${paramString}`;
    const res = await fetch(fullPath, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body || {}),
    });

    console.log('🔥 POST', fullPath, ' => ', res.status);

    const contentType = res.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    const resBody = isJson ? await res.json() : await res.text();

    set.status = res.status;

    if (res.status >= 200 && res.status < 300) {
      await setCache(cacheKey, resBody, res.headers as Headers);
    } else {
      console.log('🔴 Cache miss', { path, query, body, cacheKey, headers: res.headers, resBody });
    }

    set.headers['x-cache'] = 'MISS';
    Object.entries(res.headers).forEach(([key, value]) => {
      set.headers[key] = value as string;
    });

    return json;
  })
  .listen(port);

// console.log('contacts', contacts);

console.log(`Listening on localhost:4000`);
