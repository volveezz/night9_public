import UserErrors from "../../../configs/UserErrors.js";
function convertTimeStringToNumber(timeString, timezoneOffset = 3) {
    if (!timeString || timeString.length === 0)
        return 0;
    if (!isNaN(+timeString) && timeString.length === 10)
        return +timeString;
    const cleanedString = timeString.replace(/\s+/g, " ");
    const parts = cleanedString.split(/,\s*|\s+/);
    const date = new Date();
    const hasLongFormat = parts.some((part) => parseMonth(part) !== -1);
    if (hasLongFormat) {
        return processLongFormat(parts, timezoneOffset);
    }
    else {
        return processShortFormat(parts, date, timezoneOffset);
    }
}
function processLongFormat(parts, timezoneOffset) {
    const monthIndex = parts.findIndex((part) => parseMonth(part) !== -1);
    if (monthIndex === -1 || monthIndex < 1)
        throw { errorType: UserErrors.RAID_TIME_ERROR };
    const day = parseInt(parts[monthIndex - 1]);
    const month = parseMonth(parts[monthIndex]);
    const year = parseInt(parts[monthIndex + 1]);
    const timePart = parts.find((part) => part.match(/\d+:\d*/));
    const [hours, minutes] = timePart ? timePart.split(":").map(Number) : [0, 0];
    if (isNaN(day) || month === -1 || isNaN(year) || isNaN(hours) || isNaN(minutes)) {
        throw { errorType: UserErrors.RAID_TIME_ERROR };
    }
    const date = new Date(year, month, day, hours, minutes, 0, 0);
    date.setTime(date.getTime() - timezoneOffset * 60 * 60 * 1000);
    return Math.floor(date.getTime() / 1000);
}
function parseMonth(monthString) {
    const months = {
        "янв.": 0,
        "февр.": 1,
        "мар.": 2,
        "апр.": 3,
        мая: 4,
        "июн.": 5,
        "июл.": 6,
        "авг.": 7,
        "сент.": 8,
        "окт.": 9,
        "нояб.": 10,
        "дек.": 11,
    };
    return months[monthString] ?? -1;
}
function processShortFormat(parts, date, timezoneOffset) {
    let hasValidTimePart = false;
    for (let part of parts) {
        const datePart = part.match(/\d+[\.\/]\d*/);
        const timePart = part.match(/\d+:\d*/);
        const hourPart = part.match(/^\d+$/);
        if (datePart) {
            const [day, month] = datePart[0].split(/[\.\/]/).map((s) => parseInt(s.slice(0, 2)));
            if (!isNaN(month)) {
                date.setMonth(month - 1, day);
            }
            else if (!isNaN(day)) {
                date.setDate(day);
            }
        }
        else if (timePart) {
            hasValidTimePart = true;
            const [hours, minutes] = timePart[0].split(":").map((s) => parseInt(s.slice(0, 2)));
            date.setHours(hours, minutes ? minutes : 0, 0, 0);
        }
        else if (hourPart) {
            hasValidTimePart = true;
            date.setHours(parseInt(part.slice(0, 2)), 0, 0, 0);
        }
    }
    date.setTime(date.getTime() - timezoneOffset * 60 * 60 * 1000);
    if (date.getTime() <= Date.now())
        date.setDate(date.getDate() + 1);
    if (!hasValidTimePart)
        throw { errorType: UserErrors.RAID_TIME_ERROR };
    return Math.floor(date.getTime() / 1000);
}
export default convertTimeStringToNumber;
//# sourceMappingURL=convertTimeStringToNumber.js.map