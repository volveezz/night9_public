import fetch from "node-fetch";
export function isSnowflake(value) {
    const discordSnowflakeRegex = /^[0-9]{17,19}$/;
    return value.match(discordSnowflakeRegex) !== null;
}
export function descriptionFormatter(text) {
    return text.replace(/(\\n)|(\\\*)/g, (_match, firstGroup, secondGroup) => (firstGroup ? "\n" : secondGroup ? "\n — " : _match)).trim();
}
export async function timer(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function getRandomGIF(prompt) {
    try {
        const response = await (await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API}&q=${prompt.replaceAll(" ", "+")}&limit=1&offset=${Math.floor(Math.random() * 50)}&rating=g&lang=en`)).json();
        return response.data[0]?.images.original.url;
    }
    catch (error) {
        console.error(`[Error code: 1600] Giphy error`, error);
    }
}
export function escapeString(str) {
    const specialChars = /[`*~_]/g;
    return str.replace(specialChars, "\\$&");
}
