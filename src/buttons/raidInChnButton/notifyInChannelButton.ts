import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChannelType,
	Collection,
	ComponentType,
	EmbedBuilder,
	Guild,
	GuildMember,
	InteractionCollector,
	InteractionResponse,
	Invite,
	Message,
	ModalBuilder,
	RESTError,
	RESTJSONErrorCodes,
	TextInputBuilder,
	TextInputStyle,
	VoiceChannel,
} from "discord.js";
import { RaidAdditionalFunctional, RaidButtons } from "../../configs/Buttons.js";
import { RaidNotifyEdit } from "../../configs/Modals.js";
import UserErrors from "../../configs/UserErrors.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { client } from "../../index.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import nameCleaner from "../../utils/general/nameClearer.js";
import { findVoiceChannelWithMostActivityMembers } from "../../utils/general/raidFunctions/findVoiceChannelWithMostMembers.js";
import { descriptionFormatter, getRandomRaidGIF } from "../../utils/general/utilities.js";
import { RaidEvent } from "../../utils/persistence/sequelizeModels/raidEvent.js";

type NotifyInChannelButtonParams = {
	deferredUpdate: Promise<InteractionResponse<boolean>>;
	interaction: ButtonInteraction;
	raidEvent: RaidEvent;
	guild: Guild;
	member: GuildMember;
};

async function createInvite(channel: VoiceChannel, reason: string): Promise<Invite | null> {
	try {
		return await channel.createInvite({ reason, maxAge: 60 * 120 });
	} catch (err) {
		console.error(`Failed to create invite for channel ${channel.name}:`, err);
		return null;
	}
}

async function notifyInChannelButton({ deferredUpdate, interaction, raidEvent, guild, member }: NotifyInChannelButtonParams) {
	const { id: interactionId, user } = interaction;

	const [_, userDM, gifImage] = await Promise.all([deferredUpdate, user.createDM(), getRandomRaidGIF()]);

	interaction.editReply({
		content: `Перейдите в [личные сообщения](https://discord.com/channels/@me/${userDM.id}) для настройки и отправки оповещения`,
	});

	// const gifImage = (await getRandomRaidGIF()) || "https://media.giphy.com/media/cKJZAROeOx7MfU6Kws/giphy.gif";
	let modalTitle = `Рейдовое оповещение ${raidEvent.id}-${raidEvent.raid}`;
	let modalDescription = `Рейдер, тебя оповестил ${
		raidEvent.creator === user.id ? "создатель рейда" : "администратор"
	} об скором старте.\n\nЗаходи в голосовой канал как можно скорее!`;
	let modalImage = gifImage;
	let interactionResponded = false;

	async function sendNotificationToMembers(
		raidEvent: RaidEvent,
		linkComponent: ButtonBuilder[],
		interaction: ButtonInteraction,
		message: Message
	) {
		// const channel = await client.getTextChannel(interaction.channel || interaction.channelId);

		const notificationEmbed = new EmbedBuilder().setColor(colors.serious);
		if (modalTitle?.length > 0) {
			try {
				notificationEmbed.setAuthor({ name: modalTitle, iconURL: icons.notify });
			} catch (e) {
				console.error("[Error code: 2068] Failed to set author", e);
			}
		}
		if (modalDescription?.length > 0) {
			try {
				notificationEmbed.setDescription(modalDescription || null);
			} catch (e) {
				console.error("[Error code: 2067] Failed to set description", e);
			}
		}
		if (modalImage?.length > 0) {
			try {
				notificationEmbed.setImage(modalImage || null);
			} catch (e) {
				console.error("[Error code: 2066] Failed to set image", e);
			}
		}

		collector.stop("completed");
		const sendedTo: string[] = [];
		const raidMembersLength = user.id === raidEvent.creator ? raidEvent.joined.length - 1 : raidEvent.joined.length;

		const linkButton = addButtonsToMessage(linkComponent);

		const cachedMembers = client.getCachedMembers();

		const voiceChannels = guild.channels.cache.filter((ch) => ch.type === ChannelType.GuildVoice) as Collection<string, VoiceChannel>;
		const creatorVoiceChannel =
			voiceChannels.find((m) => m.members.has(raidEvent.creator)) || voiceChannels.find((m) => m.members.has(user.id));

		await Promise.all(
			raidEvent.joined.map(async (id) => {
				const member = cachedMembers.get(id);

				if (!member) return console.error("[Error code: 1211]", id, member);
				if (
					(member.id === raidEvent.creator && user.id === raidEvent.creator) ||
					(creatorVoiceChannel && creatorVoiceChannel.members.has(member.id))
				)
					return;

				await member
					.send({
						embeds: [notificationEmbed],
						components: linkButton,
					})
					.then((_) => sendedTo.push(`**${nameCleaner(member.displayName, true)}** получил оповещение`))
					.catch(async (e) => {
						if (e.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
							const channel = client.getCachedTextChannel(raidEvent.channelId);

							await channel
								.send({ content: `<@${member.id}>`, embeds: [notificationEmbed] })
								.then((_) => sendedTo.push(`**${nameCleaner(member.displayName, true)}** получил текстовое оповещение`));
						} else {
							console.error("[Error code: 1212]", e.requestBody.json.components);
						}
					});
			})
		);

		const finishEmbed = new EmbedBuilder()
			.setColor(colors.success)
			.setTitle(`Оповещение доставлено ${sendedTo.length} участникам из ${raidMembersLength} записавшихся`);
		sendedTo.length === 0 ? [] : finishEmbed.setDescription(sendedTo.join("\n") || "nothing");
		message.edit({ components: [], embeds: [finishEmbed] }).catch((e) => console.error("[Error code: 1660]", e));
		return;
	}

	async function handleEditAction(collectorInteraction: ButtonInteraction) {
		const RaidModal = new ModalBuilder().setTitle("Измените текст оповещения").setCustomId(RaidAdditionalFunctional.modalEdit);

		const RaidModal_title = new TextInputBuilder()
			.setLabel("Заголовок")
			.setStyle(TextInputStyle.Short)
			.setCustomId(RaidNotifyEdit.title)
			.setPlaceholder(modalTitle.slice(0, 100) || "Укажите заголовок оповещения")
			.setValue(modalTitle || "")
			.setRequired(false)
			.setMaxLength(128);
		const RaidModal_description = new TextInputBuilder()
			.setLabel("Описание")
			.setStyle(TextInputStyle.Paragraph)
			.setCustomId(RaidNotifyEdit.description)
			.setPlaceholder(modalDescription.slice(0, 100) || "Укажите описание набора")
			.setValue(modalDescription || "")
			.setRequired(false)
			.setMaxLength(1024);
		const RaidModal_image = new TextInputBuilder()
			.setLabel("Изображение")
			.setStyle(TextInputStyle.Short)
			.setCustomId(RaidNotifyEdit.imageURL || null)
			.setPlaceholder(modalImage.slice(0, 100) || "Укажите ссылку на изображение набора")
			.setValue(modalImage || "")
			.setRequired(false);

		RaidModal.setComponents([
			new ActionRowBuilder<TextInputBuilder>().addComponents(RaidModal_title),
			new ActionRowBuilder<TextInputBuilder>().addComponents(RaidModal_description),
			new ActionRowBuilder<TextInputBuilder>().addComponents(RaidModal_image),
		]);

		interactionResponded = false;

		await collectorInteraction.showModal(RaidModal);
		const interactionSubmit = await collectorInteraction.awaitModalSubmit({
			time: 60 * 1000 * 10,
		});

		// @ts-ignore
		if (interactionResponded === true) return;

		try {
			interactionResponded = true;
			const replyEmbed = new EmbedBuilder()
				.setColor(colors.serious)
				.setAuthor({ name: "Оповещение изменено", iconURL: icons.notify })
				.setDescription("Нажмите на кнопку ` Отправить ` для отправки оповещения участникам рейда");
			interactionSubmit.reply({ embeds: [replyEmbed], ephemeral: true });
		} catch (error) {
			console.error("[Error code: 1661] Edit button was deferred multiple times");
			return;
		}

		const raidEditedTitle = interactionSubmit.fields.getTextInputValue(RaidNotifyEdit.title).trim();
		const raidEditedDescription = interactionSubmit.fields.getTextInputValue(RaidNotifyEdit.description).trim();
		const raidEditedImage = interactionSubmit.fields.getTextInputValue(RaidNotifyEdit.imageURL).trim();

		if (!raidEditedTitle && !raidEditedDescription && !raidEditedImage) {
			const errorEmbed = new EmbedBuilder()
				.setColor(colors.error)
				.setAuthor({ name: "Ошибка. Нельзя не указать все поля", iconURL: icons.close });
			return await collectorInteraction.followUp({ embeds: [errorEmbed], ephemeral: true });
		}

		const editableEmbed = EmbedBuilder.from(collectorInteraction.message.embeds[0]);
		try {
			if (raidEditedTitle.length > 0) {
				editableEmbed.setAuthor({ name: raidEditedTitle, iconURL: icons.notify });
			} else {
				editableEmbed.setAuthor(null);
			}
			modalTitle = raidEditedTitle;
		} catch (error) {
			collectorInteraction.followUp({ content: "Не удалось изменить заголовок набора", ephemeral: true });
		}
		try {
			editableEmbed.setDescription(descriptionFormatter(raidEditedDescription) || null);
			modalDescription = raidEditedDescription;
		} catch (error) {
			collectorInteraction.followUp({ content: "Не удалось изменить описание набора", ephemeral: true });
		}
		try {
			editableEmbed.setImage(raidEditedImage || null);
			modalImage = raidEditedImage;
		} catch (error) {
			collectorInteraction.followUp({ content: "Не удалось изменить изображение набора", ephemeral: true });
		}

		await collectorInteraction.editReply({ embeds: [editableEmbed] });

		return;
	}

	async function handleCancelAction(message: Message, collector: InteractionCollector<ButtonInteraction>) {
		const cancelEmbed = new EmbedBuilder().setColor(colors.invisible).setTitle("Оповещение участников отменено");
		await message.edit({ components: [], embeds: [cancelEmbed] });
		collector.stop("canceled");
	}

	const raidVoiceChannels = member.guild.channels.cache
		.filter((chn) => chn.parentId === process.env.RAID_CATEGORY! && chn.type === ChannelType.GuildVoice && chn.name.includes("Raid"))
		.reverse() as Collection<string, VoiceChannel>;

	let inviteToVoiceWithCreator: Invite | null = null;
	let raidWithMostMembersInvite: Invite | null = null;

	const voiceWithCreator = raidVoiceChannels.find((channel) => channel.members.has(raidEvent.creator));
	const voiceWithMostMembers = await findVoiceChannelWithMostActivityMembers(raidVoiceChannels, raidEvent.joined);

	if (voiceWithCreator) {
		inviteToVoiceWithCreator = await createInvite(voiceWithCreator, "Raid invite to the voice with the raid leader");
	}
	if (voiceWithMostMembers) {
		raidWithMostMembersInvite = await createInvite(voiceWithMostMembers, "Raid invite to the raid channel with the most raid members");
	} else {
		const emptiestRaidChannel = raidVoiceChannels.reduce((prev, curr) => {
			if (curr.members.size < prev.members.size) return curr;
			return prev;
		});
		if (emptiestRaidChannel) {
			raidWithMostMembersInvite = await createInvite(emptiestRaidChannel, "Raid invite to the emptiest raid channel");
		}
	}

	const components = [
		new ButtonBuilder().setCustomId(RaidButtons.confirmNotify).setLabel("Отправить").setStyle(ButtonStyle.Primary),
		new ButtonBuilder().setCustomId(RaidButtons.editNotify).setLabel("Изменить текст").setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId(RaidButtons.notifyCancel).setLabel("Отменить оповещение").setStyle(ButtonStyle.Danger),
	];

	const linkButtons: ButtonBuilder[] = [];
	if (inviteToVoiceWithCreator) {
		linkButtons.push(
			new ButtonBuilder({ style: ButtonStyle.Link, url: inviteToVoiceWithCreator.url, label: "Перейти к создателю рейда" })
		);
	}
	if (raidWithMostMembersInvite) {
		linkButtons.push(
			new ButtonBuilder({ style: ButtonStyle.Link, url: raidWithMostMembersInvite.url, label: "Перейти в рейдовый канал" })
		);
	}

	const raidLeaderEmbed = new EmbedBuilder()
		.setColor(colors.serious)
		.setAuthor({ name: "Отправьте заготовленное оповещение или измените его", iconURL: icons.notify })
		.setDescription(
			`Рейдер, тебя оповестил ${
				raidEvent.creator === user.id ? "создатель рейда" : "администратор"
			} об скором старте.\n\nЗаходи в голосовой канал как можно скорее!`
		)
		.setImage(gifImage);

	const message = await user
		.send({
			embeds: [raidLeaderEmbed],
			components: addButtonsToMessage(components),
		})
		.catch((error: RESTError) => {
			if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
				throw { errorType: UserErrors.CLOSED_DM };
			} else {
				console.error("[Error code: 1960] Unexpected error", error);
			}
			return null;
		});

	if (!message) return;

	const collector = message.createMessageComponentCollector({
		filter: (i) => i.user.id === user.id,
		time: 60 * 1000 * 10,
		componentType: ComponentType.Button,
	});

	collector.on("collect", async (collectorInteraction) => {
		if (interactionId !== interaction.id) return;

		switch (collectorInteraction.customId) {
			case RaidAdditionalFunctional.confirm:
				await sendNotificationToMembers(raidEvent, linkButtons, interaction, message!);
				break;
			case RaidAdditionalFunctional.edit:
				await handleEditAction(collectorInteraction);
				break;
			case RaidAdditionalFunctional.cancel:
				await handleCancelAction(message!, collector);
				break;
		}
	});

	collector.on("end", (_, reason) => {
		if (reason === "time") {
			const embed = EmbedBuilder.from(message!.embeds[0]).setFooter({ text: "Время для редактирования вышло" });
			message!.edit({ components: [], embeds: [embed] });
		}
	});
}

export default notifyInChannelButton;
