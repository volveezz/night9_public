import { EmbedBuilder, RESTJSONErrorCodes, TextChannel } from "discord.js";
import { Sequelize } from "sequelize";
import colors from "../../../configs/colors.js";
import icons from "../../../configs/icons.js";
import { client } from "../../../index.js";
import { addButtonsToMessage } from "../../general/addButtonsToMessage.js";
import nameCleaner from "../../general/nameClearer.js";
import { checkRaidTimeConflicts, updateRaidMessage } from "../../general/raidFunctions.js";
import updatePrivateRaidMessage from "../../general/raidFunctions/privateMessage/updatePrivateMessage.js";
import { raidEmitter } from "../../general/raidFunctions/raidEmitter.js";
import { updateNotifications } from "../../general/raidFunctions/raidNotifications.js";
import { RaidEvent } from "../../persistence/sequelizeModels/raidEvent.js";

async function moveUserFromHotJoinedIntoJoined(raidData: RaidEvent) {
	if (raidData.joined.length === 6) return;

	const movableMemberId = raidData.hotJoined.shift();

	if (!movableMemberId) return;

	const member = client.getCachedMembers().get(movableMemberId);

	if (!member) return console.error("[Error code: 1647]", raidData);

	const [_, [updatedRaidData]] = await RaidEvent.update(
		{
			joined: Sequelize.fn("array_append", Sequelize.col("joined"), `${movableMemberId}`),
			hotJoined: Sequelize.fn("array_remove", Sequelize.col("hotJoined"), `${movableMemberId}`),
			alt: Sequelize.fn("array_remove", Sequelize.col("alt"), `${movableMemberId}`),
		},
		{
			where: { id: raidData.id },
			returning: ["id", "messageId", "channelId", "inChannelMessageId", "joined", "hotJoined", "alt", "raid", "difficulty"],
		}
	);

	if (!updatedRaidData) {
		console.error("[Error code: 2014]", updatedRaidData);
		return;
	}

	const embed = new EmbedBuilder()
		.setColor(colors.success)
		.setAuthor({
			name: `${nameCleaner(member.displayName)}: [Запас] → [Участник]`,
			iconURL: member.displayAvatarURL(),
		})
		.setFooter({
			text: "Пользователь перезаписан системой",
		});

	let raidChannel: TextChannel | null = null;
	try {
		raidChannel = client.getCachedTextChannel(updatedRaidData.channelId);
		raidChannel.send({ embeds: [embed] });
	} catch (error) {
		console.error("[Error code: 2013] Failed to send notify message", error);
	}

	const { embeds, components } = (await updateRaidMessage({ raidEvent: updatedRaidData, returnComponents: true }))!;
	await (await client.getAsyncMessage(process.env.RAID_CHANNEL_ID!, updatedRaidData.messageId))!.edit({
		embeds,
		components: addButtonsToMessage(components),
	});

	embeds[0]
		.setColor(colors.serious)
		.setAuthor({ name: `Вы были автоматически записаны на рейд ${raidData.id}-${raidData.raid}`, iconURL: icons.notify });

	try {
		member.send({ embeds: [embeds[0]] });
	} catch (error: any) {
		if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser && raidChannel) {
			raidChannel.send({ content: `<@${member.id}>`, embeds: [embeds[0]] });
		} else {
			console.error("[Error code: 1961] Received unexpected error", error);
		}
	}

	if (!updatedRaidData) return console.error("[Error code: 1637]", updatedRaidData);

	await updatePrivateRaidMessage(updatedRaidData);
	checkRaidTimeConflicts(member.id, raidData);
	updateNotifications(member.id, true);
	raidEmitter.emit("join", updatedRaidData, member.id);
}

export default moveUserFromHotJoinedIntoJoined;
