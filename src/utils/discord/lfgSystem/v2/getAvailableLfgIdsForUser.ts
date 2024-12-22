import { APIInteractionGuildMember, GuildMember } from "discord.js";
import UserErrors from "../../../../configs/UserErrors.js";
import { LFGController } from "../../../../structures/LFGController.js";

export async function validateAvailableOrInputedLfgId(
	userIdOrMember: string | GuildMember | APIInteractionGuildMember,
	inputLFGId?: number | null
) {
	let lfgId =
		inputLFGId ||
		LFGController.getInstance().findAvailableLfgIdsForUser(typeof userIdOrMember !== "string" ? userIdOrMember.user.id : userIdOrMember);

	if (Array.isArray(lfgId)) {
		if (lfgId.length > 1) {
			throw { errorType: UserErrors.LFG_SPECIFY_LFG, errorData: lfgId };
		} else {
			lfgId = lfgId[0];
		}
	}

	await LFGController.getInstance().checkUserPermissions(userIdOrMember, lfgId);

	if (!lfgId) {
		throw { errorType: UserErrors.LFG_NOT_AVAILABLE_LFGS_TO_EDIT };
	}

	return lfgId;
}
