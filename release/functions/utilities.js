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
export default function convertSeconds(time, language = "ru") {
    const seconds = Math.trunc(time);
    let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    let remainingSeconds = seconds % 60;
    let result = "";
    if (hours > 0) {
        result += hours + `${language === "en" ? "h" : "ч"} `;
    }
    if (minutes > 0) {
        result += minutes + `${language === "en" ? "m" : "м"} `;
    }
    if (remainingSeconds > 0) {
        result += remainingSeconds + `${language === "en" ? "s" : "с"}`;
    }
    if (result === "")
        return language === "en" ? "less than a second" : "менее секунды";
    return result;
}
export async function getRandomGIF(prompt) {
    try {
        const response = await (await fetch(`https://api.giphy.com/v1/gifs/random?api_key=${process.env.GIPHY_API}&tag=${prompt}&rating=G`)).json();
        return response.data.images.original.url;
    }
    catch (error) {
        console.error(`[Error code: 1600] Giphy error`, error);
    }
}
