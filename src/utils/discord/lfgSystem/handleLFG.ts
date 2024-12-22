import { ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, Message, ModalSubmitInteraction, TextChannel, User } from "discord.js";
import { LfgButtons } from "../../../configs/Buttons.js";
import colors from "../../../configs/colors.js";
import icons from "../../../configs/icons.js";
import { client } from "../../../index.js";
import LfgUserSettings from "../../../interfaces/Lfg.js";
import { addButtonsToMessage } from "../../general/addButtonsToMessage.js";
import nameCleaner from "../../general/nameClearer.js";
import { escapeString } from "../../general/utilities.js";
import { bungieNames, channelDataMap } from "../../persistence/dataStore.js";
import checkIfUserRecentlyCreatedActivity from "../checkRecentlyCreatedActivity.js";
import handleAdditionalLfgParams from "./handleAdditionalParams.js";
import { removeChannelData } from "./handleLfgJoin.js";

let pvePartyChannel: TextChannel | null = null;

function getTextInputValue(interaction: ModalSubmitInteraction, fieldName: string): string {
	return (interaction.fields.getTextInputValue(fieldName) || "")?.replace(/\s\s+/g, " ");
}

async function handleLfgModal(interaction: ModalSubmitInteraction) {
	const roomActivityName = getTextInputValue(interaction, "roomActivityName");
	const userLimitString = getTextInputValue(interaction, "userLimit");
	const description = getTextInputValue(interaction, "description");
	const activityName = getTextInputValue(interaction, "activityName");
	const additionalParams = getTextInputValue(interaction, "additionalParams");

	if (roomActivityName.length < 1) return resolveLfgError("Ошибка названия", "Слишком короткое или пустое", interaction);

	let userLimit = parseInt(userLimitString, 10);

	if (userLimit == null || isNaN(userLimit))
		return resolveLfgError("Ошибка лимита участников", "Лимит должен быть от 2 до 98 человек", interaction);

	if (userLimitString.startsWith("+")) userLimit + 1;

	if (userLimit <= 0 || userLimit >= 98) userLimit = 99;

	await createLfgPost({
		roomActivityName,
		userLimit,
		description,
		activityName,
		additionalParams,
		user: interaction.user,
		interaction,
	});
}

async function handleLfgMessage(message: Message<boolean>) {
	let userMessageContent = message.cleanContent;
	const userLimitString = userMessageContent.match(/\+ *(\d+) */)?.[0] || "1";

	const voiceLimit = parseInt(userLimitString, 10) + 1;
	const userLimit = voiceLimit >= 98 ? 99 : voiceLimit <= 1 ? 2 : voiceLimit;

	if (isNaN(userLimit) || userLimit <= 1 || userLimit > 99) {
		await resolveLfgError("Ошибка числа участников", "Число участников должно быть больше 1 и меньше 100", message);
		return;
	}

	userMessageContent = userMessageContent.replace(/\+ *(\d+) */, "").trim();
	const separatorIndex = userMessageContent.indexOf("|");
	const attributeIndex = userMessageContent.indexOf("--");
	const roomActivityName = userMessageContent
		.slice(0, separatorIndex !== -1 ? separatorIndex : attributeIndex !== -1 ? attributeIndex : userMessageContent.length)
		.trim()
		.replace(/^в\s*/, "");
	const description =
		separatorIndex !== -1 ? userMessageContent.slice(userMessageContent.indexOf("|") + 1, userMessageContent.length).trim() : null;

	if (roomActivityName.length === 0) {
		await resolveLfgError("Ошибка названия", "Название набора обязательно", message);
		return;
	}

	const activityNameArg = userMessageContent.match(/--activity=(?:"[^"]*"|'[^']*')/)?.[0];
	const activityName = activityNameArg?.slice(activityNameArg.indexOf("=") + 1, activityNameArg.length).replace(/\"|\'/g, "") || null;

	const additionalParams = userMessageContent.match(/--\w+(?:=(?:"[^"]*"|'[^']*'))?/g)?.join(" ") || "";

	await createLfgPost({
		userLimit,
		roomActivityName,
		description,
		activityName,
		additionalParams,
		message,
		user: message.author,
	});
}

interface LfgPostCreationParams {
	userLimit: number;
	roomActivityName: string;
	description: string | null;
	activityName: string | null;
	additionalParams: string | null;
	message?: Message<boolean>;
	interaction?: ModalSubmitInteraction;
	user: User;
}

async function createLfgPost({
	userLimit,
	roomActivityName,
	description,
	additionalParams,
	activityName,
	message,
	user,
	interaction,
}: LfgPostCreationParams) {
	if (roomActivityName.length < 1 || isNaN(userLimit) || userLimit <= 1 || userLimit > 99) {
		const errorMsg =
			roomActivityName.length < 1
				? ["Ошибка названия", "Название набора обязательно"]
				: ["Ошибка числа участников", "Число участников должно быть больше 1 и меньше 100"];
		await resolveLfgError(errorMsg[0], errorMsg[1], message!);
		return;
	}

	if (roomActivityName.length > 100) {
		await resolveLfgError(
			"Ошибка названия",
			`Название сбора должно быть меньше 100 символов\n\n> Ваше название:\n${roomActivityName}`,
			message
		);
		return;
	}

	const userSettings: LfgUserSettings = {
		invite: true,
		ping: null,
		activity: null,
		color: colors.serious,
		activitySettings: null,
	};

	if (additionalParams) {
		handleAdditionalLfgParams(additionalParams, userSettings, activityName || undefined);
	}
	const member = await client.getMember(user.id);
	const lfgData = member.voice.channel && channelDataMap.get(member.voice.channel?.id);
	let deletable = member.voice.channel ? false : true;

	const embed = new EmbedBuilder().setThumbnail(userSettings.activitySettings?.image ?? null);

	try {
		let userLimitWithCurrentVoiceMembers = userLimit - (member.voice.channel?.members.size || 0);
		embed.setTitle(
			`+${userLimitWithCurrentVoiceMembers < 0 ? 0 : userLimitWithCurrentVoiceMembers} в ${
				(userSettings.activitySettings?.name ?? roomActivityName) || "неизвестную активность"
			}`
		);
	} catch (error) {
		await resolveLfgError(
			"Ошибка названия",
			"Не удалось установить ваш заголовок\nВозможные причины: текст слишком длинный или содержит специальные символы",
			message || interaction
		);
	}

	const lfgDescriptionRegex = /--\w+((="[^"]+")|=('[^']+')|)?/g;

	try {
		const lfgDescription = userSettings.activitySettings?.description ?? description;

		if (lfgDescription && lfgDescription.length > 1) {
			const cleanedDescription = lfgDescription.replace(lfgDescriptionRegex, "").trim();
			embed.setDescription(cleanedDescription);
		}
	} catch (error) {
		await resolveLfgError(
			"Ошибка описания",
			"Не удалось установить ваше описание\nВозможные причины: текст слишком длинный или содержит специальные символы",
			message || interaction
		);
	}

	try {
		embed.setColor(userSettings.color);
	} catch (error) {
		embed.setColor(colors.error);
		await resolveLfgError("Ошибка цвета", `Не удалось установить ваш цвет: \`${userSettings.color}\``, message || interaction);
	}

	if (userSettings.activitySettings?.name && roomActivityName) {
		embed.addFields({
			name: (userSettings.activitySettings?.name && description && embed.data.description !== description
				? roomActivityName
				: description && embed.data.description !== description
				? `${roomActivityName}`
				: "Описание"
			)
				.replace(lfgDescriptionRegex, "")
				.trim(),
			value: (description && embed.data.description !== description ? description : `${roomActivityName}`)
				.replace(lfgDescriptionRegex, "")
				.trim(),
		});
	}
	if (userSettings.activitySettings?.lightLevel) {
		embed.addFields({ name: "Рекомендуемый уровень силы", value: `${userSettings.activitySettings.lightLevel}`, inline: true });
	}
	if (member) {
		embed.addFields({
			name: "Создатель набора",
			value: `<@${user.id}> — ${nameCleaner(member.displayName, true)}${
				bungieNames.has(user.id) ? ` — ${escapeString(bungieNames.get(user.id)!)}` : ""
			}`,
		});
	}
	if (member.voice.channel) {
		let i = 1;
		embed.addFields({
			name: "Состав группы",
			value: member.voice.channel.members
				.map((guildMember) => {
					const bungieName = bungieNames.get(guildMember.id);
					return `${i++}. <@${guildMember.id}>${bungieName ? ` — ${escapeString(bungieName)}` : ""}`;
				})
				.join("\n"),
		});
	}

	if (!pvePartyChannel) pvePartyChannel = await client.getTextChannel(process.env.PVE_PARTY_CHANNEL_ID!);

	const voiceChannel =
		member.voice.channel?.type === ChannelType.GuildVoice
			? member.voice.channel
			: await member.guild?.channels.create({
					name: roomActivityName || userSettings.activitySettings?.name || "⚡｜набор в активность",
					type: ChannelType.GuildVoice,
					parent: pvePartyChannel.parent,
					permissionOverwrites: [
						...pvePartyChannel.permissionOverwrites.cache.toJSON(),
						{ allow: "Connect", id: pvePartyChannel.guild.roles.everyone },
						{ allow: "ManageChannels", id: user.id },
					],
					reason: `Created by ${member?.displayName} request`,
					userLimit,
			  });

	if (!voiceChannel) return resolveLfgError("Ошибка во время создания голосового канала", "Попробуйте позже", message || interaction);

	const buttonForLfgDeletion = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel("Удалить сбор").setCustomId(LfgButtons.delete);

	const components: ButtonBuilder[] = [buttonForLfgDeletion];

	if (userSettings.invite) {
		const invite = await voiceChannel.createInvite({ maxAge: 60 * 300 });
		if (invite) {
			components.push(new ButtonBuilder().setURL(invite.url).setLabel("Перейти в голосовой канал").setStyle(ButtonStyle.Link));
		}
	}

	const ping =
		userSettings.ping && !checkIfUserRecentlyCreatedActivity(user.id)
			? userSettings.ping === "everyone"
				? "@everyone"
				: userSettings.ping === "@here"
				? "@here"
				: `<@&${userSettings.ping}>`
			: undefined;

	if (interaction) {
		try {
			const embed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Сбор создан", iconURL: icons.success });
			interaction.reply({ embeds: [embed], ephemeral: true });
		} catch (error) {}
	}

	const partyMessage = await pvePartyChannel.send({
		embeds: [embed],
		content: ping,
		components: addButtonsToMessage(components),
	});

	if (lfgData) {
		await removeChannelData(member.voice.channel.id);
		if (lfgData.isDeletable === true) {
			deletable = true;
		}
	}

	channelDataMap.set(voiceChannel.id, {
		members: member.voice.channel?.members.map((member) => member.id) ?? [],
		channelMessage: partyMessage,
		voiceChannel,
		isDeletable: deletable,
		creator: member.id,
	});

	await message?.delete();

	return;
}

async function resolveLfgError(name: string, description: string, input: Message<boolean> | ModalSubmitInteraction | undefined) {
	if (!input || !input.channelId) return;

	const errorEmbed = new EmbedBuilder().setColor(colors.error).setAuthor({ name, iconURL: icons.error }).setDescription(description);
	const errorMessage = await client.getCachedTextChannel(input.channelId).send({ embeds: [errorEmbed] });

	setTimeout(async () => await errorMessage.delete(), 5000);

	return;
}

export { handleLfgMessage, handleLfgModal };
