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
