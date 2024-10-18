import type { Context } from 'hono';
import { extname } from 'https://deno.land/std@0.224.0/url/extname.ts';
import { existsSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';
import { redis } from './app.ts';
import config from './config.ts';

const randomString = (length: number) => [...Array(length)].map(() => Math.random().toString(36)[2]).join('');

export default async (context: Context) => {
	const auth = context.req.header('Authorization');
	if (!auth || !(Deno.env.get('APP_API_KEYS')!.split(';').includes(auth.replace('Bearer ', '')))) {
		return context.json({ error: 'An invalid API key was provided via the "Authorization" header.' }, 401);
	}

	const { dir } = context.req.param();
	if (!existsSync(`${import.meta.dirname}/../media/${dir}`)) {
		return context.json({ error: `The provided destination folder "${dir}" was not found.` }, 400);
	}

	const urls: string[] = [];
	const body = await context.req.parseBody();
	const files: { data: File; extension: string; type: 'image' | 'video' }[] = [];

	for (const key of Object.keys(body)) {
		if (!(body[key] instanceof File)) {
			return context.json({
				error: 'One or more of the provided fields is not a valid media file.',
			}, 400);
		}

		const extension = extname(`${Deno.env.get('APP_URL')}/${body[key].name}`);

		if (config.supportedImageFormats.includes(extension.replace('.', ''))) {
			files.push({ data: body[key], extension, type: 'image' });
			continue;
		}

		if (config.supportedVideoFormats.includes(extension.replace('.', ''))) {
			files.push({ data: body[key], extension, type: 'video' });
			continue;
		}

		const lines = [
			`The provided file '${body[key].name}' is not a valid media file type. Supported media `,
			`types: ${config.supportedImageFormats.join(', ')}, ${config.supportedVideoFormats.join(', ')}.`,
		];

		return context.json({ error: lines.join('') }, 400);
	}

	for await (const file of files) {
		let name = file.type === 'image' ? file.data.name.replace(file.extension, '.png') : file.data.name;

		let media = null;
		switch (file.type) {
			case 'video':
				media = Buffer.from(await file.data.arrayBuffer());
				break;
			case 'image':
				media = await sharp(await file.data.arrayBuffer()).png().toBuffer();
				break;
		}

		const path = `${import.meta.dirname}/../media/${dir}/${name}`;
		if (existsSync(path)) name = name.replace(file.extension, '') + `-${randomString(8)}${file.extension}`;

		Deno.writeFileSync(`${import.meta.dirname}/../media/${dir}/${name}`, media);
		await redis.set(`fscdn_file:${dir}/${name}`, media, 'EX', 3600);
		urls.push(`${Deno.env.get('APP_URL')}/${dir}/${name}`);
	}

	return context.json({ urls }, 201);
};
