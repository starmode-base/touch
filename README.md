# Touch

https://touch.starmode.dev/

## Configure services

### Configure Vercel Serverless

1. Go to https://vercel.com/
1. Click _Add New..._ → _Project_
1. Pick `touch` from the list → _Import_
1. Click _Deploy_

### Configure Vercel Analytics

1. Enable [Web Analytics](https://vercel.com/starmode/touch/analytics)

### Configure Neon

Make sure you have installed the [Vercel integration](https://vercel.com/marketplace/neon). Select the _Link Existing Neon Account_, not the _Create New Neon Account_.

IMPORTANT: Use the [Neon-Managed Integration](https://neon.com/docs/guides/neon-managed-vercel-integration), not the [Vercel-Managed Integration](https://neon.com/docs/guides/vercel-managed-integration).

1. Go to https://console.neon.tech/
1. Click _New project_
1. Pick a name and click _Create_
1. Go to _Integrations_ → _Vercel_
1. Select _Vercel project_

### Configure Clerk

1. Go to https://dashboard.clerk.com/apps/new
1. After creating the Clerk application, find the correct environment variables here https://clerk.com/docs/quickstarts/tanstack-react-start#set-your-clerk-api-keys
1. Copy the Clerk environment variables to [Vercel Environment Variables](https://vercel.com/starmode/touch/settings/environment-variables)

## Contributing

### Prerequisites

1. Install [Node.js](https://nodejs.org/) (v22.x)
1. Install [Bun](https://bun.sh/)
1. Clone the [git repo](https://github.com/starmode-base/touch)
1. Install dependencies: `bun install`
1. Link the Vercel project, to be able to pull development environment variables from Vercel: `bunx vercel link`
   - Set up “~/starmode-base/touch”? yes
   - Which scope should contain your project? STAR MODE
   - Found project “starmode/touch”. Link to it? yes
   - ✅ Linked to starmode/touch (created .vercel)

### Local development

1. Pull development environment variables from Vercel: `bun env:pull`
1. Start the app in development mode: `bun dev`

To install dependencies:

```sh
bun install
```

## Devops

- [Clerk](https://dashboard.clerk.com/apps/)
- [GitHub](https://github.com/starmode-base/touch)
- [Neon](https://console.neon.tech/app/projects/calm-forest-40252170)
- [Vercel](https://vercel.com/starmode/touch)
- [Vercel Analytics](https://vercel.com/starmode/touch/analytics)
- [Vercel Environment Variables](https://vercel.com/starmode/touch/settings/environment-variables)

## Configured tools

- [Neon WebSocket driver](https://www.npmjs.com/package/@neondatabase/serverless)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Analytics](https://vercel.com/docs/analytics)

### Quality

- [Vitest](https://vitest.dev/)
- [Neon testing](https://www.npmjs.com/package/neon-testing)
- [Prettier](https://prettier.io/)
- [ESLint](https://eslint.org/)
