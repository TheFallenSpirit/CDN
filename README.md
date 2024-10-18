# FS CDN
A lightweight content delivery network focused on images and videos. Built on Hono and Redis for Deno.

## Installing
1. Create a "media" directory in the current directory, and create all of your categories as directories inside of the media directory.

2. Edit the `config.toml` file to change basic settings of the app and set an app url.

3. Rename the `.env.example` file to `.env` and set your `REDIS_URL` and `APP_API_KEYS` accordingly.

4. Start the server by running `deno run src/app.ts`, and grant all the requested permissions.


## Development
To start the server in dev mode and bypass the permission checks, run `deno run dev`.
