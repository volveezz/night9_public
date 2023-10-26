import { RaidEvent } from "../../../persistence/sequelizeModels/raidEvent.js";
import checkFireteamStatus from "./checkFireteamStatus.js";
import getOngoingRaids from "./getOngoingRaids.js";
import updateFireteamCheckerNotify from "./sendCheckerNotify.js";
const fireteamCheckingSystem = new Set();
const notifyInitializerTimeoutMap = new Map();
const notifyIntervalMap = new Map();
export function stopFireteamCheckingSystem(raidId) {
    if (raidId) {
        const notifyTimeout = notifyInitializerTimeoutMap.get(raidId);
        const notifyInterval = notifyIntervalMap.get(raidId);
        notifyInitializerTimeoutMap.delete(raidId) && clearTimeout(notifyTimeout);
        notifyIntervalMap.delete(raidId) && clearInterval(notifyInterval);
        fireteamCheckingSystem.delete(raidId) && updateFireteamCheckerNotify(raidId, true);
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
    console.debug("Initializing fireteam checker", raidId);
    stopFireteamCheckingSystem(raidId);
    const ongoingRaids = await getOngoingRaids(raidId);
    for (let i = 0; i < ongoingRaids.length; i++) {
        const raidEvent = ongoingRaids[i];
        raidFireteamChecker(raidEvent);
    }
}
async function raidFireteamChecker(raidParam) {
    const initialRaidEvent = typeof raidParam === "number" ? (await RaidEvent.findByPk(raidParam)) : raidParam;
    console.debug("Processing raid with ID", initialRaidEvent.id);
    const { id: raidId, time: initialRaidTime } = initialRaidEvent;
    if (fireteamCheckingSystem.has(raidId))
        return;
    fireteamCheckingSystem.add(raidId);
    const startTime = initialRaidTime * 1000;
    const raidStartTimePlus5 = new Date(startTime + 1000 * 60 * 5).getTime();
    console.debug(`Next step for raid ID: ${raidId} will be in ${(raidStartTimePlus5 - Date.now()) / 1000}s`);
    const timeout = setTimeout(async () => {
        console.debug("Processing with the next step for raid ID", raidId);
        try {
            console.debug("Trying to send a private channel notification for raid ID:", raidId);
            updateFireteamCheckerNotify(initialRaidEvent, false);
        }
        catch (error) {
            console.error("[Error code: 1753]", error);
        }
        finally {
            const interval = setInterval(async () => {
                const checkFireteam = await checkFireteamStatus(initialRaidEvent);
                if (checkFireteam === false || !fireteamCheckingSystem.has(raidId)) {
                    stopFireteamCheckingSystem(raidId);
                    console.debug(`Interval cleared for raid ID: ${raidId}`);
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