import { Elysia } from 'elysia';

const baseUrl = process.env.BASE_URL;
const port = process.env.PORT || 4000;
const hostHeader = process.env.HOST_HEADER;

new Elysia()
  .get('*', async ({ path, query, body }) => {
    const paramString = Object.keys(query)
      .map((key) => {
        return `${key}=${query[key]}`;
      })
      .join('&');

    const fullPath = `${baseUrl}${path}?${paramString}`;
    const res = await fetch(fullPath, {
      headers: {
        'Content-Type': 'application/json',
        Host: hostHeader || '',
      },
    });

    console.log('🔥 GET', fullPath, ' => ', res.status);

    if (res.status > 200) {
      console.log('🔴 Error Status', { path, query, body });
      console.log('res', res);
    }

    const json = await res.json();
    return json;
  })
  .post('*', async ({ path, query, body }) => {
    const paramString = Object.keys(query)
      .map((key) => {
        return `${key}=${query[key]}`;
      })
      .join('&');

    const fullPath = `${baseUrl}${path}?${paramString}`;
    const res = await fetch(fullPath, {
      headers: {
        Host: 'dk-webshop-monorepo-master.dev.webshop.jysk.ninja',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body || {}),
    });

    console.log('🔥 POST', fullPath, ' => ', res.status);

    if (res.status > 200) {
      console.log('🔴 Error Status', { path, query, body });
      console.log('res', res);
    }

    const json = await res.json();
    return json;
  })
  .listen(port);

// console.log('contacts', contacts);

console.log(`Listening on localhost:4000`);
