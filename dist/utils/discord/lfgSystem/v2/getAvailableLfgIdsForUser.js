import { LFGController } from "../../../../structures/LFGController.js";
export async function validateAvailableOrInputedLfgId(userIdOrMember, inputLFGId) {
    let lfgId = inputLFGId ||
        LFGController.getInstance().findAvailableLfgIdsForUser(typeof userIdOrMember !== "string" ? userIdOrMember.user.id : userIdOrMember);
    if (Array.isArray(lfgId)) {
        if (lfgId.length > 1) {
            throw { errorType: "LFG_SPECIFY_LFG", errorData: lfgId };
        }
        else {
            lfgId = lfgId[0];
        }
    }
    await LFGController.getInstance().checkUserPermissions(userIdOrMember, lfgId);
    if (!lfgId) {
        throw { errorType: "LFG_NOT_AVAILABLE_LFGS_TO_EDIT" };
    }
    return lfgId;
}
//# sourceMappingURL=getAvailableLfgIdsForUser.js.map