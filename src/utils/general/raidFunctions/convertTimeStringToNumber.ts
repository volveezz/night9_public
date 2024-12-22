function convertTimeStringToNumber(timeString: string, timezoneOffset: number = 3): number {
	if (!timeString || timeString.length === 0) return 0;
	if (!isNaN(+timeString) && timeString.length === 10) return +timeString;

	const cleanedString = timeString.replace(/\s+/g, " "); // Replacing all multiple spaces with single ones
	const parts = cleanedString.split(/,\s*|\s+/); // Splitting by commas or spaces

	const date = new Date();

	// Determine if this is a long format by looking for a month name
	const hasLongFormat = parts.some((part) => parseMonth(part) !== -1);
	if (hasLongFormat) {
		return processLongFormat(parts, timezoneOffset);
	} else {
		return processShortFormat(parts, date, timezoneOffset);
	}
}

function processLongFormat(parts: string[], timezoneOffset: number): number {
	const monthIndex = parts.findIndex((part) => parseMonth(part) !== -1);
	if (monthIndex === -1 || monthIndex < 1) return 0;

	const day = parseInt(parts[monthIndex - 1]);
	const month = parseMonth(parts[monthIndex]);
	const year = parseInt(parts[monthIndex + 1]);

	const timePart = parts.find((part) => part.match(/\d+:\d*/));
	const [hours, minutes] = timePart ? timePart.split(":").map(Number) : [0, 0];

	if (isNaN(day) || month === -1 || isNaN(year) || isNaN(hours) || isNaN(minutes)) {
		return 0;
	}

	const date = new Date(year, month, day, hours, minutes, 0, 0);

	// Adjust the time for the timezone offset
	date.setTime(date.getTime() - timezoneOffset * 60 * 60 * 1000);

	return Math.floor(date.getTime() / 1000);
}

function parseMonth(monthString: string): number {
	const months: { [key: string]: number } = {
		"янв.": 0,
		января: 0,
		январь: 0,
		"февр.": 1,
		февраль: 1,
		"мар.": 2,
		март: 2,
		"апр.": 3,
		апрель: 3,
		мая: 4,
		май: 4,
		"июн.": 5,
		июнь: 5,
		июня: 5,
		"июл.": 6,
		июля: 6,
		июль: 6,
		"авг.": 7,
		август: 7,
		августа: 7,
		"сент.": 8,
		сентября: 8,
		"окт.": 9,
		октября: 9,
		"нояб.": 10,
		ноября: 10,
		"дек.": 11,
		декабря: 11,
	};
	return months[monthString] ?? -1;
}

function processShortFormat(parts: string[], date: Date, timezoneOffset: number): number {
	let hasValidTimePart = false;

	for (let part of parts) {
		const datePart = part.match(/\d+[\.\/]\d*/);
		const timePart = part.match(/\d+:\d*/);
		const hourPart = part.match(/^\d+$/);

		if (datePart) {
			const [day, month] = datePart[0].split(/[\.\/]/).map((s) => parseInt(s.slice(0, 2)));
			if (!isNaN(month)) {
				date.setMonth(month - 1, day);
			} else if (!isNaN(day)) {
				date.setDate(day);
			}
		} else if (timePart) {
			hasValidTimePart = true;
			const [hours, minutes] = timePart[0].split(":").map((s) => parseInt(s.slice(0, 2)));
			date.setHours(hours, minutes ? minutes : 0, 0, 0);
		} else if (hourPart) {
			hasValidTimePart = true;
			date.setHours(parseInt(part.slice(0, 2)), 0, 0, 0);
		}
	}

	// Return a null value if the time part is not present
	if (!hasValidTimePart) return 0;

	// If the time has already passed today, assume it is for the next day
	if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);

	// Adjust for the timezone offset
	date.setTime(date.getTime() - timezoneOffset * 60 * 60 * 1000);

	// Adjust for the timezone offset again if the time has already passed today
	if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);

	return Math.floor(date.getTime() / 1000);
}

export default convertTimeStringToNumber;
