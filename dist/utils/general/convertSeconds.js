const secondsInDay = 86400;
const secondsInHour = 3600;
const secondsInMinute = 60;
function convertSeconds(seconds, language = "ru") {
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
    return result.trim();
}
export { convertSeconds };
