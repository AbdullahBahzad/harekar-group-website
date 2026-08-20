# Harekar Group

Company website for Harekar Group, built with Next.js (App Router), TypeScript, Tailwind CSS, and Framer Motion. Content is managed via Sanity CMS; contact form submissions are stored in PostgreSQL via Prisma.

## Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS, Framer Motion
- **CMS:** Sanity
- **Backend:** Next.js Route Handlers / Server Actions
- **Database:** PostgreSQL via Prisma

## Getting Started

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (PostgreSQL) and your Sanity project details.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Push the Prisma schema to your database:

   ```bash
   npx prisma db push
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `src/app` — pages (Home, About, Services, Contact) and the contact form's server action (`src/app/contact/actions.ts`)
- `src/components` — shared UI (Navbar, Footer, FadeIn animation wrapper)
- `src/lib/prisma.ts` — Prisma client singleton
- `src/sanity` — Sanity client and image URL helper
- `prisma/schema.prisma` — database schema (`ContactSubmission` model)
