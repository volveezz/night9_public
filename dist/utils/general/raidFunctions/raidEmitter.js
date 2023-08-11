import { TypedEmitter } from "tiny-typed-emitter";
import readinessSystemInstance from "../../../structures/RaidReadinessSystem.js";
class RaidEmitter extends TypedEmitter {
    constructor() {
        super();
    }
}
export const raidEmitter = new RaidEmitter();
raidEmitter.on("join", (raidData, joinedUserId) => {
    if (!readinessSystemInstance.raidDetailsMap.has(raidData.id))
        return;
    const raidInfo = readinessSystemInstance.raidDetailsMap.get(raidData.id);
    if (!raidInfo)
        return;
    raidInfo.unmarkedMembers.add(joinedUserId);
    readinessSystemInstance.updateReadinessMessage(raidData.id);
});
raidEmitter.on("leave", (raidData, userId) => {
    if (!readinessSystemInstance.raidDetailsMap.has(raidData.id))
        return;
    const raidInfo = readinessSystemInstance.raidDetailsMap.get(raidData.id);
    if (!raidInfo)
        return;
    raidInfo.unmarkedMembers.delete(userId);
    raidInfo.readyMembers.delete(userId);
    raidInfo.notReadyMembers.delete(userId);
    raidInfo.lateMembers.delete(userId);
    readinessSystemInstance.updateReadinessMessage(raidData.id);
});
//# sourceMappingURL=raidEmitter.js.map