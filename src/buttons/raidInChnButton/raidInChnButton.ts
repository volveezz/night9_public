import {
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChannelType,
	ComponentType,
	EmbedBuilder,
	Guild,
	GuildMember,
	InteractionResponse,
} from "discord.js";
import Sequelize from "sequelize";
import { RaidButtons } from "../../configs/Buttons.js";
import UserErrors from "../../configs/UserErrors.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { client } from "../../index.js";
import { Button } from "../../structures/button.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import nameCleaner from "../../utils/general/nameClearer.js";
import { removeRaid } from "../../utils/general/raidFunctions.js";
import sendRaidPrivateMessage from "../../utils/general/raidFunctions/privateMessage/sendPrivateMessage.js";
import updateFireteamNotification from "../../utils/general/raidFunctions/raidFireteamChecker/fireteamNotificationUpdater.js";
import raidFireteamCheckerSystem, {
	stopFireteamCheckingSystem,
} from "../../utils/general/raidFunctions/raidFireteamChecker/raidFireteamChecker.js";
import { RaidEvent } from "../../utils/persistence/sequelizeModels/raidEvent.js";
import moveRaidVoiceMembers from "./moveRaidVoiceMembersButton.js";
import notifyInChannelButton from "./notifyInChannelButton.js";
import unlockRaidMessage from "./unlockRaidMessage.js";

const { Op } = Sequelize;

interface RaidDeletionParameters {
	raidEvent: RaidEvent;
	interaction: ButtonInteraction;
	deferredReply: Promise<InteractionResponse<boolean>>;
	requireMessageReply?: boolean;
}

export async function handleDeleteRaid({
	deferredReply,
	interaction,
	raidEvent,
	requireMessageReply,
}: RaidDeletionParameters): Promise<number> {
	return new Promise(async (resolve) => {
		const embed = new EmbedBuilder()
			.setColor(colors.warning)
			.setAuthor({ name: `Подтвердите удаление рейда ${raidEvent.id}-${raidEvent.raid}`, iconURL: icons.warning })
			.setDescription(
				`Если Вы хотите изменить рейд, то не удаляйте рейд, а измените его с помощью команды: \`/рейд изменить\` (</рейд изменить:1036145721696600134>)\n### Можно изменить следующие параметры рейда\n - Время: \`/рейд изменить новое-время:20 21/06\`\n - Описание: \`/рейд изменить новое-описание:Новое описание для сильных\`\n - Минимальное количество закрытий рейда для записи: \`/рейд изменить новое-требование-закрытий:5\`\n### В одной команде можно изменить сразу несколько параметров\n - \`/рейд изменить новый-рейд:Источник кошмаров новая-сложность:Мастер\``
			);
		const components = [
			new ButtonBuilder().setCustomId(RaidButtons.deleteConfirm).setLabel("Подтвердить").setStyle(ButtonStyle.Danger),
			new ButtonBuilder().setCustomId(RaidButtons.deleteCancel).setLabel("Отменить").setStyle(ButtonStyle.Secondary),
		];

		await deferredReply;
		const message = await interaction.editReply({
			embeds: [embed],
			components: addButtonsToMessage(components),
		});

		const collector = message.createMessageComponentCollector({
			time: 60 * 1000 * 2,
			max: 1,
			filter: (i) => i.user.id === interaction.user.id,
			componentType: ComponentType.Button,
		});
		collector.on("collect", async (col) => {
			if (col.customId === RaidButtons.deleteConfirm) {
				await removeRaid(raidEvent, col, requireMessageReply, interaction.channel?.isDMBased() ? interaction : undefined).catch((e) => {
					console.error("[Error code: 1676]", e);
				});
				resolve(1);
			} else if (col.customId === RaidButtons.deleteCancel) {
				const canceledEmbed = new EmbedBuilder().setColor(colors.invisible).setTitle("Удаление рейда отменено");
				await col.update({ components: [], embeds: [canceledEmbed] });
				resolve(2);
			}
		});
		collector.on("end", async (_, reason) => {
			if (reason === "time") {
				if (requireMessageReply) {
					embed.setAuthor({ name: "Время для удаления вышло. Повторите снова", iconURL: undefined }).setColor(colors.invisible);
					await interaction.editReply({ components: [], embeds: [embed] });
				}
				resolve(3);
			}
		});
	});
}

type RequireableParams = {
	interaction: ButtonInteraction;
	guild?: boolean;
	deferredReply?: boolean;
	deferredUpdate?: boolean;
	member?: boolean;
};
type WithGuild<T> = T extends { guild: true } ? { guild: Guild } : {};
type WithMember<T> = T extends { member: true } ? { member: GuildMember } : {};
type WithDeferringReply<T> = T extends { deferredReply: true }
	? { deferredReply: Promise<InteractionResponse<boolean>> }
	: T extends { deferredUpdate: true }
	? { deferredUpdate: Promise<InteractionResponse<boolean>> }
	: {};
// type WithDeferringUpdate<T> = T extends { deferredUpdate: true } ? { deferredUpdate: Promise<InteractionResponse<boolean>> } : {};

function requireParams<T extends RequireableParams>(params: T): WithGuild<T> & WithMember<T> & WithDeferringReply<T> {
	let returned_deferredReply;
	let returned_deferredUpdate;
	let returned_guild;
	let returned_member;

	const { interaction, guild, deferredUpdate, member, deferredReply } = params;

	if (deferredReply) {
		returned_deferredReply = interaction.deferReply({ ephemeral: true });
	}

	if (deferredUpdate) {
		returned_deferredUpdate = interaction.deferUpdate();
	}

	if (guild) {
		returned_guild = client.getCachedGuild();

		if (!returned_guild) {
			throw { name: "Ошибка. Сервер недоступен" };
		}
	}

	if (member) {
		returned_member = client.getCachedMembers().get(interaction.user.id);

		if (!returned_member) {
			throw {
				name: "Вы не участник сервера",
				description: "Пожалуйста, объясните администрации как вы получили эту ошибку",
			};
		}
	}

	return {
		guild: returned_guild,
		member: returned_member,
		deferredUpdate: returned_deferredUpdate,
		deferredReply: returned_deferredReply,
	} as any;
}

const ButtonCommand = new Button({
	name: "raidInChnButton",
	run: async ({ interaction }) => {
		const availableButtonCustomIds: string[] = [
			RaidButtons.notify,
			RaidButtons.transfer,
			RaidButtons.unlock,
			RaidButtons.delete,
			RaidButtons.resend,
			RaidButtons.fireteamTrackerCancel,
			RaidButtons.fireteamTrackerStart,
		];

		if (!availableButtonCustomIds.includes(interaction.customId)) return;

		const attributes =
			interaction.customId === RaidButtons.resend
				? ["id", "creator", "channelId", "inChannelMessageId", "joined", "hotJoined", "alt", "raid", "difficulty"]
				: ["id", "creator", "channelId", "joined", "messageId", "raid"];

		const raidEvent = await (interaction.channel?.isDMBased()
			? RaidEvent.findOne({
					where: {
						[Op.and]: [
							{ id: parseInt(interaction.message.embeds[0].data.footer?.text.split("RId: ").pop()!) },
							{ creator: interaction.user.id },
						],
					},
					attributes,
			  })
			: RaidEvent.findOne({
					where: { [Op.or]: { inChannelMessageId: interaction.message.id, channelId: interaction.channelId } },
					attributes,
			  }));

		if (!raidEvent) {
			// interaction.update Not tested, may produce errors
			if (interaction.channel?.isDMBased()) interaction.update({ components: [] });

			// await deferredUpdate;
			throw { errorType: UserErrors.RAID_NOT_FOUND };
		}
		if (raidEvent.creator !== interaction.user.id && !interaction.memberPermissions?.has("Administrator")) {
			// await deferredUpdate;
			const member = client.getCachedMembers().get(raidEvent.creator);
			const displayName = member && nameCleaner(member.displayName, true);

			throw { errorType: UserErrors.ACTIVITY_MISSING_PERMISSIONS, errorData: { displayName }, interaction };
		}

		switch (interaction.customId) {
			case RaidButtons.notify: {
				const { guild, member, deferredReply } = requireParams({ interaction, member: true, guild: true, deferredReply: true });
				await notifyInChannelButton({ interaction, guild, member, raidEvent, deferredUpdate: deferredReply });

				return;
			}
			case RaidButtons.transfer: {
				const { guild, deferredReply } = requireParams({ interaction, guild: true, deferredReply: true });
				await moveRaidVoiceMembers({ guild, interaction, raidEvent, deferredReply });

				return;
			}
			case RaidButtons.unlock: {
				unlockRaidMessage({ interaction, raidEvent });
				requireParams({ interaction, deferredUpdate: true });

				return;
			}
			case RaidButtons.delete: {
				const deferredReply = interaction.deferReply({ ephemeral: true });
				await handleDeleteRaid({ deferredReply, interaction, raidEvent });

				return;
			}
			case RaidButtons.resend: {
				requireParams({ interaction, deferredUpdate: true });
				await sendRaidPrivateMessage({
					raidEvent,
					channel: interaction.channel?.type === ChannelType.GuildText ? interaction.channel : undefined,
					oldMessage: interaction.message,
				});

				await interaction.message.delete();

				return;
			}
			case RaidButtons.fireteamTrackerCancel: {
				requireParams({ deferredUpdate: true, interaction });
				stopFireteamCheckingSystem(raidEvent.id);

				await updateFireteamNotification(raidEvent, true);

				// const embed = EmbedBuilder.from(interaction.message.embeds[0])
				// 	.setTitle("Система слежки за боевой группой отключена")
				// 	.setColor(colors.invisible);

				// await interaction.message.edit({ embeds: [embed], components: [] });

				return;
			}
			case RaidButtons.fireteamTrackerStart: {
				requireParams({ deferredUpdate: true, interaction });
				await raidFireteamCheckerSystem(raidEvent.id);

				// await updateFireteamCheckerNotify(raidEvent, false);
				// const embed = EmbedBuilder.from(interaction.message.embeds[0])
				// 	.setAuthor({ name: "Система слежки за боевой группой перезапущена", iconURL: icons.success })
				// 	.setColor(colors.success);
				// const disableButton = new ButtonBuilder()
				// 	.setCustomId(RaidButtons.fireteamCheckerCancel)
				// 	.setLabel("Отключить")
				// 	.setStyle(ButtonStyle.Danger);

				// await interaction.message.edit({ embeds: [embed], components: addButtonsToMessage([disableButton]) });

				return;
			}
		}
	},
});

export default ButtonCommand;
