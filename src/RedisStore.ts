import type { ConfigType, Store } from 'hono-rate-limiter';
import { redis } from './app.ts';

export default class RedisStore implements Store {
	public prefix = 'fscdn_rl:';
	private windowMs: number = 60000;

	public init = (opts: ConfigType) => {
		this.windowMs = opts.windowMs;
	};

	public resetKey = async (key: string) => {
		await redis.del(`${this.prefix}${key}`);
	};

	public decrement = async (key: string) => {
		const exists = await redis.exists(`${this.prefix}${key}`);
		if (exists) await redis.decr(`${this.prefix}${key}`);
	};

	public get = async (key: string) => {
		const hits = await redis.get(`${this.prefix}${key}`);
		if (!hits) return undefined;

		const ttl = await redis.ttl(`${this.prefix}${key}`);
		const date = new Date();
		date.setUTCSeconds(date.getUTCSeconds() + ttl);

		return { totalHits: parseInt(hits), resetTime: date };
	};

	public increment = async (key: string) => {
		const exists = await redis.exists(`${this.prefix}${key}`);
		const date = new Date();

		if (exists) {
			const ttl = await redis.ttl(`${this.prefix}${key}`);
			date.setUTCSeconds(date.getUTCSeconds() + ttl);
			return { resetTime: date, totalHits: await redis.incr(`${this.prefix}${key}`) };
		}

		date.setUTCMilliseconds(date.getUTCMilliseconds() + this.windowMs);
		await redis.set(`${this.prefix}${key}`, 1, 'EX', this.windowMs / 1000);
		return { totalHits: 1, resetTime: date };
	};
}
