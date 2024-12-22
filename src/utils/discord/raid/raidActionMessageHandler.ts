import { ButtonInteraction, EmbedBuilder, GuildMember } from "discord.js";
import { RaidButtons } from "../../../configs/Buttons.js";
import UserErrors from "../../../configs/UserErrors.js";
import colors from "../../../configs/colors.js";
import { client } from "../../../index.js";
import nameCleaner from "../../general/nameClearer.js";
import { RaidEvent } from "../../persistence/sequelizeModels/raidEvent.js";

type RaidActions = {
	memberOrIdOrInteraction: GuildMember | ButtonInteraction | string;
	raidEvent: RaidEvent;
	targetState: string;
	lastState?: "hotJoined" | "joined" | "alt" | "leave" | "";
};

async function raidActionMessageHandler({ memberOrIdOrInteraction, raidEvent, targetState, lastState }: RaidActions) {
	const embed = new EmbedBuilder();
	const userId = typeof memberOrIdOrInteraction === "string" ? memberOrIdOrInteraction : memberOrIdOrInteraction.user.id;
	const member = memberOrIdOrInteraction instanceof GuildMember ? memberOrIdOrInteraction : client.getCachedMembers().get(userId);

	if (!member) {
		throw { errorType: UserErrors.MEMBER_NOT_FOUND };
	}

	const displayName = nameCleaner(member.displayName);

	const lastUserStateString =
		lastState === "hotJoined"
			? "[Запас] → "
			: lastState === "joined"
			? "[Участник] → "
			: lastState === "alt"
			? "[Возможный участник] → "
			: lastState === "leave"
			? ""
			: "❌ → ";

	if (raidEvent.hotJoined.includes(userId)) {
		embed.setColor(colors.serious).setAuthor({
			name: `${displayName}: ${lastUserStateString}[Запас]`,
			iconURL: member.displayAvatarURL(),
		});
	} else {
		switch (targetState) {
			case RaidButtons.join:
				embed.setColor(colors.success).setAuthor({
					name: `${displayName}: ${lastUserStateString}[Участник]`,
					iconURL: member.displayAvatarURL(),
				});
				break;
			case RaidButtons.alt:
				embed.setColor(colors.warning).setAuthor({
					name: `${displayName}: ${lastUserStateString}[Возможный участник]`,
					iconURL: member.displayAvatarURL(),
				});
				break;
			case RaidButtons.leave:
				embed.setColor(colors.error).setAuthor({
					name: `${displayName}: ${lastUserStateString}❌`,
					iconURL: member.displayAvatarURL(),
				});
				break;
			default:
				console.error("[Error code: 2015] Member somehow joined a raid", memberOrIdOrInteraction, member, displayName, raidEvent);
				embed.setColor("NotQuiteBlack").setAuthor({
					name: `${displayName}: проник на рейд`,
					iconURL: member.displayAvatarURL(),
				});
		}
	}

	client.getCachedTextChannel(raidEvent.channelId).send({ embeds: [embed] });
}

export default raidActionMessageHandler;
