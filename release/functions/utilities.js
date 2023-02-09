export function isSnowflake(value) {
    const discordSnowflakeRegex = /^[0-9]{17,19}$/;
    return value.match(discordSnowflakeRegex) !== null;
}
export function descriptionFormatter(text) {
    return text.replace(/(\\n)|(\*)/g, (_match, firstGroup, secondGroup) => (firstGroup ? "\n" : secondGroup ? "\n — " : _match)).trim();
}
export async function timer(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export default function convertSeconds(seconds) {
    let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    let remainingSeconds = seconds % 60;
    let result = "";
    if (hours > 0) {
        result += hours + "ч ";
    }
    if (minutes > 0) {
        result += minutes + "м ";
    }
    if (remainingSeconds > 0) {
        result += remainingSeconds + "с";
    }
    if (result === "")
        return "менее секунды";
    return result;
}
