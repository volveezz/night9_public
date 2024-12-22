import { stringVariablesMap } from "../../persistence/dataStore.js";

const emojiMap: { [key: string]: string } = {
	"[пробивание щитов]": "<:barrier:1090473007471935519>",
	"[дестабилизация]": "<:overload:1090473013398491236>",
	"[оглушение]": "<:unstoppable:1090473011175489687>",
	"[молния]": "<:arc:1157898044109500487>",
	"[солнце]": "<:solar:1157898084701978714>",
	"[пустота]": "<:void:1157897056451575808>",
	"[нить]": "<:strand:1157895450985234493>",
	"[стазис]": "<:stasis:1157895444987387924>",
};

export function convertModifiersPlaceholders(description: string): string {
	return description
		.replace(/\[([^\]]+)\]/gi, function (match) {
			return emojiMap[match.toLowerCase()] || match;
		})
		.replace(/{var:(\d+)}/g, function (_, p1) {
			const hash = parseInt(p1, 10); // convert the matched digits to a number
			return stringVariablesMap[hash] ? stringVariablesMap[hash].toString() : "[*предопределённое значение*]";
		})
		.replace(/(?:\.)?\n+/g, ". ")
		.replace(/ +/g, " ");
}
