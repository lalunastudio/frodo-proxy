# Frodo Proxy Service

Tiny bun script to add host header to an endpoint. I use it for adding a Host header to a local environment setup when working with Next.js 14 App Router, because the version of fetch that Next.js uses strips the Host header. 

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```
or

```bash
npm start
```


### Known issues

It only supports GET and POST as of now.