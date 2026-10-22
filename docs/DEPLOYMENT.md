# Deployment

## Local

```bash
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # production build
```

Node.js 20.9 or later.

## Vercel (free Hobby plan)

1. Push the repository to GitHub.
2. Import it in Vercel. Defaults work: framework Next.js, build command `npm run build` (runs content validation first).
3. Set `NEXT_PUBLIC_SITE_URL` for Production, for example `https://system-design-atlas.vercel.app`. Previews fall back to `VERCEL_URL`.
4. Deploy. Rollback: promote the previous deployment in Vercel, or revert the commit.

No database, auth provider, analytics or external API is needed or configured. No deployment has been made from this repository yet.
