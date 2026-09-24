# AI Usage Report

**AI Tool:**
Google Gemini

**What I asked AI to do:**
Help design the ticket management architecture, Django models, REST APIs, React components, and build the MVP following a step-by-step plan.

**Useful prompt:**
"Design a student support ticket management system using React, Django REST Framework and PostgreSQL following this specific step-by-step feature requirement list."

**Code generated:**
- Initial Django models for Tickets, Comments, Activity, and Users.
- ViewSets for API routing, custom actions for status changes and assignments.
- React frontend layout, including Tailwind CSS integration, Axios setup, and routing.
- Dashboard with advanced filtering and Admin reporting panels.

**Code modified:**
I modified the generated code to use Supabase as the PostgreSQL database provider instead of a local SQLite/PostgreSQL instance. I also troubleshooted and modified the Tailwind configuration to correctly use the newer `@tailwindcss/postcss` module in Vite.

**Was AI output wrong?**
Yes.

**How did I identify it?**
When running `npm run dev` on Windows, the Vite server threw a PostCSS error related to Tailwind v4. The AI originally provided a deprecated `@tailwind base` configuration and attempted to use the old PostCSS plugin integration.

**How did I fix it?**
The AI and I investigated the Vite server error log. I instructed the AI to configure the `postcss.config.js` properly and update `index.css` to use the `@import "tailwindcss";` directive in order to be compatible with the newer tailwind module format.
