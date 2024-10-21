import { Hono } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import { Redis } from 'ioredis';
import { existsSync } from 'node:fs';
import upload from './upload.ts';
import { getConnInfo } from 'hono/deno';
import RedisStore from './RedisStore.ts';
import { extname } from 'https://deno.land/std@0.224.0/url/extname.ts';
import { Buffer } from 'node:buffer';
import config from './config.ts';

const app = new Hono();
export const redis = new Redis(Deno.env.get('REDIS_URL') ?? 'redis://127.0.0.1:6379');

app.use(rateLimiter({
	windowMs: 60000,
	store: new RedisStore(),
	limit: config.maxRequestsPerMinute,
	keyGenerator: (c) => getConnInfo(c).remote.address ?? 'global',
	message: { error: 'You are sending to many requests, please try again later. Ratelimit: 10 requests per minute.' },
}));

const lines = [
	`To retrieve a file, set a GET request to ${config.appUrl}/:dir/:file. If you want to upload a file, send a `,
	`POST request to ${config.appUrl}/upload/:dir with the following header: "Authorization: Bearer <api-key-here>".`
];

app.get('/', (context) => context.json({ error: `Welcome to the FS CDN! ${lines.join('')}` }, 200));
app.notFound((context) => context.json({ error: `The specified path was not found! ${lines.join('')}` }, 404));

app.get('/:dir/:file', async (context) => {
	const { dir, file } = context.req.param();

	const extension = extname(`${config.appUrl}/${file}`).replace('.', '');
	const contentType = config.supportedImageFormats.includes(extension) ? 'image/png' : `video/${extension}`;

	const cachedMedia = await redis.getBuffer(`fscdn_file:${dir}/${file}`);
	if (cachedMedia) return context.body(cachedMedia, 200, { 'Content-Type': contentType });

	const mediaPath = `${import.meta.dirname}/../media/${dir}/${file}`;
	if (!existsSync(mediaPath)) {
		return context.json({
			error: `The provided file path "${dir}/${file}" was not found.`,
		}, 404);
	}

	const media = Buffer.from(Deno.readFileSync(mediaPath));
	await redis.set(`fscdn_file:${dir}/${file}`, media, 'EX', 3600);
	return context.body(media, 200, { 'Content-Type': contentType });
});

app.post('/upload/:dir', upload);
Deno.serve({ port: config.bindPort, hostname: config.bindHost }, app.fetch);
