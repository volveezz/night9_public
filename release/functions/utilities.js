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
export default function convertSeconds(seconds, language = "ru") {
    const secondsInDay = 86400;
    const secondsInHour = 3600;
    const secondsInMinute = 60;
    let remainingSeconds = Math.trunc(seconds);
    if (isNaN(remainingSeconds)) {
        return language === "en" ? "incorrect time" : "некорректное время";
    }
    let days = Math.floor(remainingSeconds / secondsInDay);
    remainingSeconds %= secondsInDay;
    let hours = Math.floor(remainingSeconds / secondsInHour);
    remainingSeconds %= secondsInHour;
    let minutes = Math.floor(remainingSeconds / secondsInMinute);
    remainingSeconds %= secondsInMinute;
    let result = "";
    if (days > 0) {
        result += `${days}${language === "en" ? "d " : "д "}`;
    }
    if (hours > 0) {
        result += `${hours}${language === "en" ? "h " : "ч "}`;
    }
    if (minutes > 0) {
        result += `${minutes}${language === "en" ? "m " : "м "}`;
    }
    if (remainingSeconds > 0 || result === "") {
        result += `${remainingSeconds}${language === "en" ? "s" : "с"}`;
    }
    if (result === "") {
        return language === "en" ? "less than a second" : "менее секунды";
    }
    return result;
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
