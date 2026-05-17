# AlignX AI Goal Portal

Enterprise-grade goal setting and tracking portal built with Next.js App Router, Tailwind CSS, shadcn-style UI components, and Supabase-ready modules.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Supabase Configuration

Set these environment variables to enable persistence:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Without these, the app runs in local demo mode.

## Features

- Employee goal creation
- Validation rules (100 total weightage, min 10, max 8 goals)
- Manager approval workflow
- Quarterly check-ins
- Shared goals
- Admin unlock functionality
- Progress and analytics dashboard

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
