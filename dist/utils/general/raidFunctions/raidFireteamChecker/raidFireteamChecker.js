import { RaidEvent } from "../../../persistence/sequelizeModels/raidEvent.js";
import checkFireteamStatus from "./checkFireteamStatus.js";
import updateFireteamNotification from "./fireteamNotificationUpdater.js";
import fetchOngoingRaids from "./ongoingRaidsFetcher.js";
const fireteamCheckingSystem = new Set();
const notifyInitializerTimeoutMap = new Map();
const notifyIntervalMap = new Map();
export function stopFireteamCheckingSystem(raidId) {
    if (raidId) {
        const notifyTimeout = notifyInitializerTimeoutMap.get(raidId);
        const notifyInterval = notifyIntervalMap.get(raidId);
        const isCheckerTimeoutExisted = notifyInitializerTimeoutMap.delete(raidId);
        if (isCheckerTimeoutExisted) {
            clearTimeout(notifyTimeout);
        }
        if (fireteamCheckingSystem.delete(raidId) && !isCheckerTimeoutExisted) {
            updateFireteamNotification(raidId, true);
        }
        notifyIntervalMap.delete(raidId) && clearInterval(notifyInterval);
    }
    else {
        notifyInitializerTimeoutMap.forEach((timeout) => clearTimeout(timeout));
        notifyIntervalMap.forEach((interval) => clearInterval(interval));
        notifyInitializerTimeoutMap.clear();
        notifyIntervalMap.clear();
        fireteamCheckingSystem.clear();
    }
}
async function raidFireteamCheckerSystem(raidId) {
    stopFireteamCheckingSystem(raidId);
    const ongoingRaids = await fetchOngoingRaids(raidId);
    for (let i = 0; i < ongoingRaids.length; i++) {
        const raidEvent = ongoingRaids[i];
        raidFireteamChecker(raidEvent);
    }
}
async function raidFireteamChecker(raidParam) {
    const initialRaidEvent = typeof raidParam === "number" ? (await RaidEvent.findByPk(raidParam)) : raidParam;
    const { id: raidId, time: initialRaidTime } = initialRaidEvent;
    if (fireteamCheckingSystem.has(raidId))
        return;
    fireteamCheckingSystem.add(raidId);
    const startTime = initialRaidTime * 1000;
    const raidStartTimePlus5 = new Date(startTime + 1000 * 60 * 5).getTime();
    const timeout = setTimeout(async () => {
        notifyInitializerTimeoutMap.delete(raidId);
        try {
            updateFireteamNotification(initialRaidEvent, false);
        }
        catch (error) {
            console.error("[Error code: 1753]", error);
        }
        finally {
            const interval = setInterval(async () => {
                const checkFireteam = await checkFireteamStatus(initialRaidEvent);
                if (checkFireteam === false || !fireteamCheckingSystem.has(raidId)) {
                    stopFireteamCheckingSystem(raidId);
                }
            }, 1000 * 60 * 5);
            clearInterval(notifyIntervalMap.get(raidId));
            notifyIntervalMap.set(raidId, interval);
        }
    }, raidStartTimePlus5 - Date.now());
    clearTimeout(notifyInitializerTimeoutMap.get(raidId));
    notifyInitializerTimeoutMap.set(raidId, timeout);
}
export default raidFireteamCheckerSystem;
//# sourceMappingURL=raidFireteamChecker.js.map