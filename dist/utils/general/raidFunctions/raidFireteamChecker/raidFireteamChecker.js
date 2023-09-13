import { RaidEvent } from "../../../persistence/sequelize.js";
import checkFireteamStatus from "./checkFireteamStatus.js";
import getOngoingRaids from "./getOngoingRaids.js";
import sendPrivateChannelNotify from "./sendCheckerNotify.js";
const MINUTES_AFTER_RAID = 5;
const fireteamCheckingSystem = new Set();
const notifyInitializerTimeoutMap = new Map();
const notifyIntervalMap = new Map();
export function stopFireteamCheckingSystem(raidId) {
    if (raidId) {
        const notifyTimeout = notifyInitializerTimeoutMap.get(raidId);
        const notifyInterval = notifyIntervalMap.get(raidId);
        notifyInitializerTimeoutMap.delete(raidId) && clearTimeout(notifyTimeout);
        notifyIntervalMap.delete(raidId) && clearInterval(notifyInterval);
        fireteamCheckingSystem.delete(raidId);
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
    console.debug("Initializing fireteam checker");
    stopFireteamCheckingSystem(raidId);
    const ongoingRaids = await getOngoingRaids(raidId);
    for (let i = 0; i < ongoingRaids.length; i++) {
        const raidEvent = ongoingRaids[i];
        raidFireteamChecker(raidEvent);
    }
}
async function raidFireteamChecker(raidParam) {
    const initialRaidEvent = typeof raidParam === "number" ? (await RaidEvent.findByPk(raidParam)) : raidParam;
    console.debug("Processing with", initialRaidEvent.id, "raid");
    const { id: raidId, time: initialRaidTime } = initialRaidEvent;
    if (fireteamCheckingSystem.has(raidId))
        return;
    fireteamCheckingSystem.add(raidId);
    const startTime = initialRaidTime * 1000;
    const raidStartTimePlus5 = new Date(startTime + MINUTES_AFTER_RAID * 60 * 1000).getTime();
    console.debug("Next step will be in", (raidStartTimePlus5 - Date.now()) / 1000, "s");
    const timeout = setTimeout(async () => {
        notifyInitializerTimeoutMap.set(raidId, timeout);
        console.debug("Processing with the next step");
        try {
            console.debug("Trying to send a private channel notification");
            sendPrivateChannelNotify(initialRaidEvent);
        }
        catch (error) {
            console.error("[Error code: 1753]", error);
        }
        finally {
            const interval = setInterval(async () => {
                const checkFireteam = await checkFireteamStatus(initialRaidEvent);
                if (checkFireteam === false || !fireteamCheckingSystem.has(raidId)) {
                    console.debug(`Interval cleared for raid ID: ${raidId}`);
                    stopFireteamCheckingSystem(raidId);
                }
            }, 1000 * 60 * 5);
            notifyIntervalMap.set(raidId, interval);
        }
    }, raidStartTimePlus5 - Date.now());
}
export default raidFireteamCheckerSystem;
//# sourceMappingURL=raidFireteamChecker.js.map