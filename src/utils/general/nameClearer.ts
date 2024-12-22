import { escapeString } from "./utilities.js";

export default function nameCleaner(displayName: string, escape: boolean = false) {
	const name = displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "").trim();
	return escape ? escapeString(name) : name;
}
