import {
	APIEmbed,
	ApplicationCommandOptionType,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	Message,
} from "discord.js";
import UserErrors from "../../configs/UserErrors.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { Command } from "../../structures/command.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";

const SlashCommand = new Command({
	name: "message",
	description: "Message related commands",
	descriptionLocalizations: {
		ru: "Команды, связанные с сообщениями",
	},
	defaultMemberPermissions: ["Administrator"],
	options: [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "send",
			nameLocalizations: { ru: "отправить" },
			description: "Send a message",
			descriptionLocalizations: {
				ru: "Отправить сообщение",
			},
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "embed",
					description: "Embed code for a message",
					descriptionLocalizations: { ru: "Embed код" },
				},
				{
					type: ApplicationCommandOptionType.String,
					name: "content",
					nameLocalizations: { ru: "текст" },
					description: "Content for a message",
					descriptionLocalizations: { ru: "Текст сообщения" },
				},
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					nameLocalizations: { ru: "пользователь" },
					description: "Select the user whose DM channel you want to interact with",
					descriptionLocalizations: { ru: "Выберите пользователя, с личными сообщенями которого вы хотите взаимодействовать" },
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "fetch",
			nameLocalizations: { ru: "получить" },
			description: "Fetch a specific message",
			descriptionLocalizations: {
				ru: "Получить конкретное сообщение",
			},
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "message-id",
					nameLocalizations: { ru: "id-сообщения" },
					description: "Id of the message to fetch",
					descriptionLocalizations: { ru: "Id сообщения для получения" },
					required: true,
				},
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					nameLocalizations: { ru: "пользователь" },
					description: "Select the user whose DM channel you want to interact with",
					descriptionLocalizations: { ru: "Выберите пользователя, с личными сообщенями которого вы хотите взаимодействовать" },
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "delete",
			nameLocalizations: { ru: "удалить" },
			description: "Delete a specific message",
			descriptionLocalizations: {
				ru: "Удалить конкретное сообщение",
			},
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "message-id",
					nameLocalizations: { ru: "id-сообщения" },
					description: "Id of the message to delete",
					descriptionLocalizations: { ru: "Id сообщения для удаления" },
					required: true,
				},
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					nameLocalizations: { ru: "пользователь" },
					description: "Select the user whose DM channel you want to interact with",
					descriptionLocalizations: { ru: "Выберите пользователя, с личными сообщенями которого вы хотите взаимодействовать" },
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "edit",
			nameLocalizations: { ru: "редактировать" },
			description: "Edit a specific message",
			descriptionLocalizations: {
				ru: "Редактировать сообщение",
			},
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "message-id",
					nameLocalizations: { ru: "id-сообщения" },
					description: "Id of the message to edit",
					descriptionLocalizations: { ru: "Id сообщения для редактирования" },
					required: true,
				},
				{
					type: ApplicationCommandOptionType.String,
					name: "embed",
					description: "Embed to be added/edited",
					descriptionLocalizations: { ru: "Embed код" },
				},
				{
					type: ApplicationCommandOptionType.String,
					name: "content",
					nameLocalizations: { ru: "текст" },
					description: "New content for the message",
					descriptionLocalizations: { ru: "Текст сообщения" },
				},
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					nameLocalizations: { ru: "пользователь" },
					description: "Select the user whose DM channel you want to interact with",
					descriptionLocalizations: { ru: "Выберите пользователя, с личными сообщенями которого вы хотите взаимодействовать" },
				},
			],
		},
		{
			type: ApplicationCommandOptionType.SubcommandGroup,
			name: "buttons",
			description: "button-related commands",
			options: [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "add",
					description: "add a button to a message",
					options: [
						{
							type: ApplicationCommandOptionType.String,
							name: "message-id",
							nameLocalizations: { ru: "id-сообщения" },
							description: "Id of the message to which we will add a button",
							descriptionLocalizations: { ru: "Id сообщения для добавления кнопки" },
							required: true,
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "button-custom-id",
							description: "Specify the custom id of the adding button",
							required: true,
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "button-style",
							description: "Specify the style of the adding button",
							choices: [
								{ name: "Primary", value: ButtonStyle.Primary.toString() },
								{ name: "Secondary", value: ButtonStyle.Secondary.toString() },
								{ name: "Danger", value: ButtonStyle.Danger.toString() },
								{ name: "Success", value: ButtonStyle.Success.toString() },
							],
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "button-label",
							description: "Specify the label of the adding button",
						},
						{
							type: ApplicationCommandOptionType.Integer,
							name: "add-index",
							description: "Specify the index of the adding button",
						},
						{
							type: ApplicationCommandOptionType.Boolean,
							name: "disabled",
							description: "Specify if the adding button is disabled",
						},
						{
							type: ApplicationCommandOptionType.User,
							name: "user",
							nameLocalizations: { ru: "пользователь" },
							description: "Select the user whose DM channel you want to interact with",
							descriptionLocalizations: { ru: "Выберите пользователя, с личными сообщенями которого вы хотите взаимодействовать" },
						},
					],
				},
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "delete",
					description: "Delete a button from a message",
					options: [
						{
							type: ApplicationCommandOptionType.String,
							name: "message-id",
							nameLocalizations: { ru: "id-сообщения" },
							description: "Id of the message from which we will delete a button",
							descriptionLocalizations: { ru: "Id сообщения для удаления кнопки" },
							required: true,
						},
						{
							type: ApplicationCommandOptionType.String,
							name: "index-custom-id",
							description: "Specify the index of the button or its customId to specify the deleted button",
							required: true,
						},
						{
							type: ApplicationCommandOptionType.User,
							name: "user",
							nameLocalizations: { ru: "пользователь" },
							description: "Select the user whose DM channel you want to interact with",
							descriptionLocalizations: { ru: "Выберите пользователя, с личными сообщенями которого вы хотите взаимодействовать" },
						},
					],
				},
			],
		},
	],

	run: async ({ client, interaction, args }) => {
		const subcommand = args.getSubcommand(true);
		const user = args.getUser("user");

		const channel = await (user
			? user.dmChannel || user.createDM().catch(() => null)
			: client.getTextChannel(interaction.channelId).catch(() => null));

		if (!channel) {
			throw { errorType: UserErrors.CHANNEL_NOT_FOUND };
		}

		const message = (subcommand !== "send" &&
			(await channel.messages.fetch(args.getString("message-id", true)).catch(() => null))) as Message;

		if (!message && subcommand !== "send") {
			throw { errorType: UserErrors.SPECIFIED_MESSAGE_NOT_FOUND };
		}

		switch (subcommand) {
			case "send": {
				// If 'content' is null, delete the message content.
				// If 'content' is undefined, don't change the message content.
				const { content, embeds } = extractMessageData();

				await channel.send({ content: content || undefined, embeds });

				const responseEmbed = new EmbedBuilder()
					.setColor(colors.success)
					.setAuthor({ name: "Сообщение отправлено", iconURL: icons.success });

				await interaction.reply({
					embeds: [responseEmbed],
					ephemeral: true,
				});

				break;
			}
			case "fetch": {
				const jsonMessage = JSON.stringify(message.toJSON(), null, 2);

				const jsonFile = new AttachmentBuilder(Buffer.from(jsonMessage), { name: "message.json", description: "Message JSON file" });
				await interaction.reply({
					files: [jsonFile],
					ephemeral: true,
				});

				break;
			}
			case "delete": {
				await message.delete();

				const embed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Сообщение удалено", iconURL: icons.success });

				await interaction.reply({
					embeds: [embed],
					ephemeral: true,
				});

				break;
			}
			case "edit": {
				// If 'content' is null, delete the message content.
				// If 'content' is undefined, don't change the message content.
				const { content, embeds } = extractMessageData();

				await message.edit({ content, embeds });

				const responseEmbed = new EmbedBuilder()
					.setColor(colors.success)
					.setAuthor({ name: "Сообщение изменено", iconURL: icons.success });

				await interaction.reply({
					embeds: [responseEmbed],
					ephemeral: true,
				});

				break;
			}
			case "add": {
				const buttonCustomId = args.getString("button-custom-id", true);
				const buttonStyle = parseInt(args.getString("button-style") || ButtonStyle.Secondary.toString());
				const buttonLabel = args.getString("button-label") || buttonCustomId;
				const buttonIndex = args.getInteger("add-index");
				const isDisabled = args.getBoolean("disabled") ?? false;

				const button = new ButtonBuilder()
					.setCustomId(buttonCustomId)
					.setLabel(buttonLabel)
					.setStyle(buttonStyle)
					.setDisabled(isDisabled);

				let addedComponents;

				if (message.components.length > 0) {
					const flatMap = (message.components || []).flatMap((v) =>
						v.components.map((c) => (c.type === ComponentType.Button ? ButtonBuilder.from(c) : null)).filter((button) => button)
					) as ButtonBuilder[];

					if (buttonIndex && flatMap.length > 0) {
						flatMap.splice(buttonIndex - 1, 0, button);
					} else {
						flatMap.push(button);
					}

					addedComponents = addButtonsToMessage(flatMap);
				} else {
					addedComponents = addButtonsToMessage([button]);
				}

				await message.edit({ components: addedComponents });

				const embed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Кнопка добавлена", iconURL: icons.success });

				await interaction.reply({ embeds: [embed], ephemeral: true });

				return;
			}
			case "delete": {
				const buttonIndentifier = args.getString("index-custom-id", true);

				const flatMap = message.components.flatMap((v) =>
					v.components
						.map((c) => (c.type === ComponentType.Button && c.customId !== buttonIndentifier ? ButtonBuilder.from(c) : null))
						.filter((button) => button)
				) as ButtonBuilder[];

				if (+buttonIndentifier != null && !isNaN(+buttonIndentifier)) {
					flatMap.splice(+buttonIndentifier, 1);
				}

				const addedComponents = addButtonsToMessage(flatMap);

				await message.edit({ components: addedComponents });

				const embed = new EmbedBuilder()
					.setColor(colors.success)
					.setAuthor({ name: "Кнопка сообщения удалена", iconURL: icons.success });

				await interaction.reply({ embeds: [embed], ephemeral: true });

				return;
			}
		}

		function extractMessageData() {
			let content: string | null | undefined = args.getString("content") ?? undefined;
			const embed = args.getString("embed");

			const parsedEmbed = embed ? JSON.parse(embed) : null;
			const embeds: APIEmbed[] | undefined = parsedEmbed
				? Array.isArray(parsedEmbed)
					? parsedEmbed
					: [parsedEmbed.embeds || parsedEmbed.embed || parsedEmbed]
				: undefined;

			if (content && ["null", "delete", "deleted", "удалить", "-", "undefined"].includes(content)) {
				content = null;
			}

			return { content, embeds };
		}
	},
});

export default SlashCommand;
