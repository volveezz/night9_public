import fetch from "node-fetch";

export function isSnowflake(value: string): boolean {
	const discordSnowflakeRegex = /^[0-9]{17,19}$/;
	return value.match(discordSnowflakeRegex) !== null;
}
export function isBungieId(value: string): boolean {
	return /^4611686018\d{9,11}$/.test(value);
}
export function isMembershipId(value: string): boolean {
	return /^\d{7,8}$/.test(value);
}

// Blank - ·
// Solid - •
export function descriptionFormatter(text: string): string {
	return text
		.replace(/(\\n)|(\\\*)|(\\!)/g, (_match, firstGroup, secondGroup, thirdGroup) => {
			if (firstGroup) return "\n";
			if (secondGroup) return "\n — ";
			if (thirdGroup) return "\n      • ";
			return _match;
		})
		.trim();
}

export async function pause(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

let gif: string | null;

export async function getRandomGIF(prompt: string, offset?: number): Promise<string | null> {
	try {
		const savedGif = await updateSavedGif();
		if (savedGif) return savedGif;

		const response: any = await (
			await fetch(
				`https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API!}&q=${prompt.replaceAll(" ", "+")}&limit=1&offset=${
					offset ?? Math.floor(Math.random() * 100)
				}&rating=r&lang=ru`
			)
		).json();
		const regex = /^(.*?\.gif)/;
		const url = response.data[0]?.images.original.url;
		const match = url.match(regex);

		if (!match) throw { name: "Url not found" };

		await updateSavedGif(match ? match[1] : response.data[0]?.images.original.url);

		return match ? match[1] : response.data[0]?.images.original.url;
	} catch (error) {
		console.error("[Error code: 1600] Giphy error", error);
		return null;
	}
}

let fetchGifPromise: Promise<string | null> | null = null;

export async function getRandomRaidGIF(): Promise<string> {
	if (fetchGifPromise) {
		// If a fetch is in progress, wait for it to complete
		return (await fetchGifPromise) || "https://media.giphy.com/media/cKJZAROeOx7MfU6Kws/giphy.gif";
	}

	// Begin a new fetch
	fetchGifPromise = (async () => {
		try {
			const savedGif = await updateSavedGif();
			if (savedGif) {
				// console.debug(`Returning saved gif`, savedGif);
				return savedGif;
			}

			const prompts = ["military guns", "raid time", "raiding destiny2", "military+action", "breaking+bad"];
			const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
			const response: any = await (
				await fetch(
					`https://api.giphy.com/v1/gifs/search?api_key=${process.env
						.GIPHY_API!}&q=${randomPrompt}&limit=250&offset=0&rating=r&lang=ru`
				)
			).json();
			const regex = /^(.*?\.gif)/;

			const randomGifIndex = Math.floor(Math.random() * response.data.length);

			const url = response.data[randomGifIndex]?.images.original.url;
			const match = url.match(regex);

			if (!match) {
				console.error("[Error code: 1800] Giphy error", response);
				return await getRandomGIF(randomPrompt);
			}

			if (match && url) {
				await updateSavedGif(match[1] || url);

				return match[1] || url;
			}

			const limit = response.pagination.total_count as number; // Set a limit of 50 or the total number of available results, whichever is lower
			const offset = Math.floor(Math.random() * limit);
			return await getRandomGIF(randomPrompt, offset);
		} catch (error) {
			console.error("[Error code: 1659] Giphy error", error);
			return "https://media.giphy.com/media/cKJZAROeOx7MfU6Kws/giphy.gif";
		} finally {
			// Clear fetch promise after completion to allow subsequent fetches
			fetchGifPromise = null;
		}
	})();

	return (await fetchGifPromise) || "https://media.giphy.com/media/cKJZAROeOx7MfU6Kws/giphy.gif";
}

async function updateSavedGif(gifUrl?: string) {
	if (gifUrl) {
		gif = gifUrl;
		// console.debug(`Saving gif`, gif);
		setTimeout(() => {
			gif = null;
		}, 60 * 1000 * 2);
	}

	return gif;
}

export function escapeString(str: string): string {
	const specialChars = /[`*~_]/g;
	return str.replace(specialChars, "\\$&");
}

export function parseIdentifierString(valueString: string) {
	const parts = valueString.split("/");

	const platform = parts[0] || null;
	const bungieId = parts[1] || null;
	const discordId = parts.length > 2 ? parts[2] : null;

	return {
		platform,
		bungieId,
		discordId,
	};
}
