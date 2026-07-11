# Touch

https://touch.starmode.dev/

## Configure services

### Configure Neon

1. Go to https://console.neon.tech/
1. Click _New project_
1. Pick a name and click _Create_

### Configure Clerk

1. Go to https://dashboard.clerk.com/apps/new
1. After creating the Clerk application, find the correct environment variables here https://clerk.com/docs/quickstarts/tanstack-react-start#set-your-clerk-api-keys
1. Add the Clerk environment variables as [Cloudflare Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/): `bunx wrangler secret put <KEY>`

## Contributing

### Prerequisites

1. Install [Node.js](https://nodejs.org/) (v22.x)
1. Install [Bun](https://bun.sh/)
1. Clone the [git repo](https://github.com/starmode-base/touch)
1. Install dependencies: `bun install`

### Local development

1. Add development environment variables to `.dev.vars`
1. Install dependencies: `bun install`
1. Start the app in development mode: `bun dev`

## Devops

- [Clerk](https://dashboard.clerk.com/apps/)
- [GitHub](https://github.com/starmode-base/touch)
- [Neon](https://console.neon.tech/app/projects/calm-forest-40252170)
- [Cloudflare](https://dash.cloudflare.com/)

## Configured tools

- [Neon WebSocket driver](https://www.npmjs.com/package/@neondatabase/serverless)
- [Drizzle ORM](https://orm.drizzle.team/)

### Quality

- [Vitest](https://vitest.dev/)
- [Neon testing](https://www.npmjs.com/package/neon-testing)
- [Prettier](https://prettier.io/)
- [ESLint](https://eslint.org/)

## Platform

- [TanStack Start](https://tanstack.com/start)
- [TanStack Router](https://tanstack.com/router)
- [TanStack DB](https://tanstack.com/db)
