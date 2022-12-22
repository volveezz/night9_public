export default function nameCleaner(displayName) {
    return displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "").trim();
}
