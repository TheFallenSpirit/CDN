import { parse } from 'jsr:@std/toml';

interface AppConfig {
	appUrl: string;
	bindHost: string;
	bindPort: number;
	maxRequestsPerMinute: number;
	supportedVideoFormats: string[];
	supportedImageFormats: string[];
}

export default parse(Deno.readTextFileSync(`${import.meta.dirname}/../config.toml`)) as unknown as AppConfig;
