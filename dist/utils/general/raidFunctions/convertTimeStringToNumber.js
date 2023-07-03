import UserErrors from "../../../configs/UserErrors.js";
function convertTimeStringToNumber(timeString, timezoneOffset = 3) {
    if (!timeString || timeString.length === 0)
        return 0;
    if (!isNaN(+timeString) && timeString.length === 10)
        return +timeString;
    const date = new Date();
    const currentMonth = date.getMonth();
    const currentDate = date.getDate();
    const parts = timeString.replace(/\s+/g, " ").split(/[ ,г.]/);
    if (parts.length > 4) {
        return processLongFormat(parts, currentMonth, currentDate, timezoneOffset);
    }
    else {
        return processShortFormat(parts, date, currentMonth, currentDate, timezoneOffset);
    }
}
function processLongFormat(parts, currentMonth, currentDate, timezoneOffset) {
    if (parts.length <= 1)
        throw { errorType: UserErrors.RAID_TIME_ERROR };
    const day = parseInt(parts[2]);
    const month = parts[1] ? parseInt(parts[1]) - 1 : day < currentDate ? currentMonth + 1 : currentMonth;
    const time = parts.pop().split(":");
    const hours = parseInt(time[0]);
    const minutes = parseInt(time[1]) ?? 0;
    const date = new Date();
    date.setMonth(month, day);
    date.setHours(hours, minutes, 0, 0);
    date.setTime(date.getTime() - timezoneOffset * 60 * 60 * 1000);
    if (date.getTime() <= Date.now())
        date.setDate(date.getDate() + 1);
    return Math.round(date.getTime() / 1000);
}
function processShortFormat(parts, date, currentMonth, currentDate, timezoneOffset) {
    for (let part of parts) {
        const datePart = part.match(/\d+[\.\/]\d+/);
        const timePart = part.match(/\d+:\d+/);
        if (datePart) {
            const [day, month] = datePart[0].split(/[\.\/]/);
            date.setMonth(month ? parseInt(month) - 1 : parseInt(day) < currentDate ? currentMonth + 1 : currentMonth, parseInt(day) ?? new Date().getDate());
        }
        else if (timePart) {
            const [hours, minutes] = timePart[0].split(":");
            date.setHours(parseInt(hours), parseInt(minutes) ?? 0, 0, 0);
        }
        else {
            const hour = parseInt(part);
            if (hour) {
                date.setHours(hour, 0, 0, 0);
            }
        }
    }
    date.setSeconds(0, 0);
    date.setTime(date.getTime() - timezoneOffset * 60 * 60 * 1000);
    if (date.getTime() <= Date.now())
        date.setDate(date.getDate() + 1);
    return Math.round(date.getTime() / 1000);
}
export default convertTimeStringToNumber;
//# sourceMappingURL=convertTimeStringToNumber.js.map