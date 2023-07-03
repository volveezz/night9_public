import { escapeString } from "./utilities.js";
export default function nameCleaner(displayName, escape = false) {
    const name = displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "").trim();
    return escape ? escapeString(name) : name;
}
//# sourceMappingURL=nameClearer.js.map