import { RaidEvent } from "../../../persistence/sequelize.js";
import checkFireteamStatus from "./checkFireteamStatus.js";
import getOngoingRaids from "./getOngoingRaids.js";
import sendPrivateChannelNotify from "./sendCheckerNotify.js";
const MINUTES_AFTER_RAID = 5;
const fireteamCheckingSystem = new Set();
const notifyIntervalMap = new Map();
export async function stopFireteamCheckingSystem(raidId) {
    if (notifyIntervalMap.has(raidId)) {
        clearInterval(notifyIntervalMap.get(raidId));
        notifyIntervalMap.delete(raidId);
    }
}
async function raidFireteamCheckerSystem(id) {
    if (process.env.NODE_ENV === "development")
        return;
    if (id) {
        fireteamCheckingSystem.delete(id);
    }
    else {
        notifyIntervalMap.forEach((interval) => clearInterval(interval));
        notifyIntervalMap.clear();
    }
    const ongoingRaids = await getOngoingRaids(id);
    ongoingRaids.forEach((initialRaidEvent) => {
        raidFireteamChecker(initialRaidEvent);
    });
}
async function raidFireteamChecker(raidParam) {
    const initialRaidEvent = typeof raidParam === "number" ? (await RaidEvent.findByPk(raidParam)) : raidParam;
    const { id: raidId, time: initialRaidTime } = initialRaidEvent;
    if (fireteamCheckingSystem.has(raidId))
        return;
    fireteamCheckingSystem.add(raidId);
    const startTime = initialRaidTime * 1000;
    const raidStartTimePlus5 = new Date(startTime + MINUTES_AFTER_RAID * 60 * 1000).getTime();
    setTimeout(async () => {
        try {
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
                    clearInterval(interval);
                    fireteamCheckingSystem.delete(raidId);
                    notifyIntervalMap.delete(raidId);
                }
            }, 1000 * 60 * 5);
            notifyIntervalMap.set(raidId, interval);
        }
    }, raidStartTimePlus5 - Date.now());
}
export default raidFireteamCheckerSystem;
//# sourceMappingURL=raidFireteamChecker.js.map