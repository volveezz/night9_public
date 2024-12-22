import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, Embed, EmbedBuilder, TextChannel } from "discord.js";
import { LfgModal } from "../../configs/Modals.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { Command } from "../../structures/command.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";

const SlashCommand = new Command({
	name: "generator",
	description: "Embed or button generator",
	defaultMemberPermissions: ["Administrator"],
	options: [
		{
			type: ApplicationCommandOptionType.SubcommandGroup,
			name: "embed",
			description: "Embed generator",
			options: [
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "code",
					description: "Generate embed from code",
					options: [
						{ type: ApplicationCommandOptionType.String, name: "embed-code", description: "Embed code", required: true },
						{
							type: ApplicationCommandOptionType.String,
							name: "message-id",
							description: "Specify a message ID if you want to edit an existing message",
						},
					],
				},
				{
					type: ApplicationCommandOptionType.Subcommand,
					name: "preset",
					description: "Create an embed from a pre-defined preset",
					options: [{ type: ApplicationCommandOptionType.String, name: "preset-name", description: "Preset name", required: true }],
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "button",
			description: "Button generator",
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "customid",
					description: "Specify a button custom ID",
					required: true,
				},
				{ type: ApplicationCommandOptionType.String, name: "label", description: "Specify a button label" },
				{
					type: ApplicationCommandOptionType.Number,
					name: "style",
					description: "Specify a button style",
					choices: [
						{ name: "Primary", value: ButtonStyle.Primary },
						{ name: "Secondary", value: ButtonStyle.Secondary },
						{ name: "Success", value: ButtonStyle.Success },
						{ name: "Danger", value: ButtonStyle.Danger },
					],
				},
				{ type: ApplicationCommandOptionType.Boolean, name: "ephemeral", description: "Send this button as ephemeral or not" },
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "image",
			description: "Sets a image or/and a thumbnail for the message embed",
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "message-id",
					description: "Specify a message ID if you want to edit an existing message",
					required: true,
				},
				{ type: ApplicationCommandOptionType.String, name: "image-link", description: "Link to the image" },
				{ type: ApplicationCommandOptionType.String, name: "thumbnail-url", description: "Link to the image" },
			],
		},
	],
	run: async ({ client, interaction, args }) => {
		const deferredReply = interaction.deferReply({ ephemeral: true });

		const subcommandGroup = args.getSubcommandGroup() || args.getSubcommand();
		const channel = interaction.channel as TextChannel;

		if (subcommandGroup === "embed") {
			const subcommand = args.getSubcommand();
			if (subcommand === "code") {
				const embedCode = args.getString("embed-code");
				const messageId = args.getString("message-id");
				const channelId = args.getString("channelId");

				const embedChannel = await client.getTextChannel(interaction.channel || channelId!);

				try {
					let content;
					let embeds: EmbedBuilder[] = [];

					if (embedCode) {
						let parsedJSON = JSON.parse(embedCode);

						content = parsedJSON.content || undefined;

						const embedPath = parsedJSON.embed || parsedJSON.embeds || parsedJSON;

						if (embedPath) {
							if (Array.isArray(embedPath)) {
								embeds = embedPath.map((embedJSON: Embed) => EmbedBuilder.from(embedJSON));
							} else {
								const embedJSON = embedPath;
								embeds.push(EmbedBuilder.from(embedJSON));
							}
						}
					}

					const responseEmbed = new EmbedBuilder()
						.setColor(colors.success)
						.setAuthor({ name: `Сообщение было ${messageId ? "изменено" : "отправлено"}`, iconURL: icons.success });

					const messageOptions: { content?: string; embeds?: EmbedBuilder[] } = {};
					if (content) messageOptions.content = content;
					if (embeds.length > 0) messageOptions.embeds = embeds;

					if (messageId) {
						const message = await embedChannel.messages.fetch(messageId);

						if (!message) {
							throw { name: "Ошибка", description: "Изменяемое сообщение не найдено" };
						}

						await message.edit(messageOptions);
					} else {
						if (!content && !embeds) throw { name: "Ошибка", description: "Ни текст, ни embed-сообщение не были предоставлены" };
						await embedChannel.send(messageOptions);
					}

					await deferredReply;
					interaction.editReply({ embeds: [responseEmbed] });
				} catch (error) {
					console.error("[Error code: 2097] Error during handling message", error);

					const errorResponse = new EmbedBuilder().setColor(colors.error).setAuthor({
						name: `Произошла ошибка во время ${messageId ? "изменения" : "отправления"} сообщения`,
						iconURL: icons.close,
					});

					await deferredReply;
					interaction.editReply({ embeds: [errorResponse] });
				}
			} else if (subcommand === "preset") {
				const presetName = args.getString("preset-name", true);

				const preset = await getPreset(presetName);

				if (!preset) {
					throw { name: "Ошибка", description: `Искомый пресет \`${presetName}\` не найден` };
				}

				const { embeds, components } = preset;

				await channel.send({ embeds, components: addButtonsToMessage(components) });

				const responseEmbed = new EmbedBuilder()
					.setColor(colors.success)
					.setAuthor({ name: `Пресет ${presetName} отправлен`, iconURL: icons.success });

				await deferredReply;
				interaction.editReply({ embeds: [responseEmbed] });

				return;
			}
		} else if (subcommandGroup === "button") {
			const customId = args.getString("customid", true);
			const label = args.getString("label") || customId;
			const style = (args.getNumber("style") as ButtonStyle) || ButtonStyle.Secondary;
			const ephemeral = args.getBoolean("ephemeral") ?? true;

			const interactionEmbed = new EmbedBuilder().setColor(colors.invisible).setTitle(`${label}`);
			const components = [new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style)];

			await deferredReply;

			if (ephemeral === true) {
				interaction.editReply({ embeds: [interactionEmbed], components: addButtonsToMessage(components) });
			} else {
				await channel.send({ embeds: [interactionEmbed], components: addButtonsToMessage(components) });
				const responseEmbed = new EmbedBuilder()
					.setColor(colors.success)
					.setAuthor({ name: `Кнопка ${customId} отправлена`, iconURL: icons.success });
				interaction.editReply({ embeds: [responseEmbed] });
			}

			return;
		} else if (subcommandGroup === "image") {
			const messageId = args.getString("message-id", true);
			const imageLink = args.getString("image-link");
			const thumbnailLink = args.getString("thumbnail-url");

			const message = await client.getAsyncMessage(channel, messageId);

			if (!message) {
				throw { name: "Сообщение не найдено" };
			}

			const embed = EmbedBuilder.from(message.embeds[0]);

			if (imageLink) {
				embed.setImage(imageLink);
			}
			if (thumbnailLink) {
				embed.setThumbnail(thumbnailLink);
			}
			await message.edit({ embeds: [embed] });
			await deferredReply;
			interaction.editReply({ content: "Сообщение отредактировано" });
		}
	},
});

async function getPreset(presetName: string): Promise<{ embeds: EmbedBuilder[]; components: ButtonBuilder[] } | null> {
	switch (presetName) {
		case "lfg": {
			const components = [new ButtonBuilder().setCustomId(LfgModal.ShowModal).setLabel("Создать сбор").setStyle(ButtonStyle.Primary)];
			const embeds = [
				new EmbedBuilder()
					.setColor(colors.deepBlue)
					.setTitle("Создание сборов через меню")
					.setDescription(
						"В дополнение к существующему методу (через чат), вы можете создать сбор через меню.\nОдно отличие: через меню нужно устанавливать лимит комнаты, а не число искомых вами участников.\n\nПример:\n- При сборе через чат вы указываете: `+2 грандмастер`.\n- При сборе через меню вы указываете: лимит участников — `3`, название комнаты — `грандмастер`."
					),
			];
			return { components, embeds };
		}
		case "access": {
			const createComponent = (customId: string, label: string) => {
				return new ButtonBuilder().setStyle(ButtonStyle.Secondary).setCustomId(`getAccessToChannel_${customId}`).setLabel(label);
			};

			const components = [
				createComponent(process.env.LORE_CHANNEL_ID!, "Обсуждение лора игры"),
				createComponent(process.env.VEX_INCURSION_CHANNEL_ID!, "Оповещения об вторжениях вексов"),
				createComponent(process.env.CHECKPOINTS_CHANNEL_ID!, "Контрольные точки"),
			];

			const embed = new EmbedBuilder().setColor(colors.invisible).setTitle("Выберите канал, к которому хотите получить доступ");

			return { components, embeds: [embed] };
		}
		// case "clanjoin": {
		// 	const embed = new EmbedBuilder()
		// 		.setColor(colors.default)
		// 		.setTitle("Вступление в клан")
		// 		.setDescription(
		// 			"Приём в клан у нас полностью автоматизирован\nВыполните 3 простых условия ниже и Вы будете приняты в кратчайшие сроки\nПо любым вопросам пишите <@719557130188750920> или <@298353895258980362>"
		// 		)
		// 		.addFields([
		// 			{
		// 				name: "<:eine:1087575481647374416> Зарегистрируйтесь у кланового бота",
		// 				value: "Нажмите кнопку `Регистрация` ниже или введите `/init`",
		// 			},
		// 			{
		// 				name: "<:zwei:1087575495912206357> Заполните форму на вступление в клан",
		// 				value: "Сделать это можно нажав на кнопку `Форма на вступление`",
		// 			},
		// 			{
		// 				name: "<:drei:1087575479617331253> Вступите в клан",
		// 				value: `[Подайте заявку в клан](https://www.bungie.net/ru/ClanV2?groupid=${process.env
		// 					.GROUP_ID!}) или отправьте её себе сами нажав \`Приглашение в клан\``,
		// 			},
		// 		]);
		// 	const components = [
		// 		new ButtonBuilder().setCustomId(RegisterButtons.register).setLabel("Регистрация").setStyle(ButtonStyle.Success),
		// 		new ButtonBuilder().setCustomId(ClanButtons.modal).setLabel("Форма на вступление").setStyle(ButtonStyle.Secondary),
		// 		new ButtonBuilder().setCustomId(ClanButtons.invite).setLabel("Приглашение в клан").setStyle(ButtonStyle.Secondary),
		// 	];

		// 	return { embeds: [embed], components };
		// }
		case "godmsg1": {
			const components = [
				new ButtonBuilder()
					.setCustomId("godEvent_customRoleColor")
					.setLabel("Установить свой цвет ника")
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId("godEvent_customRoleName")
					.setLabel("Установить свое название роли")
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder().setCustomId("godEvent_getInvite").setLabel("Приглашение на альфа-сервер").setStyle(ButtonStyle.Secondary),
				new ButtonBuilder().setCustomId("godEvent_achatAccess").setLabel("Получить доступ к а-чату").setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId("godEvent_achatVoiceAccess")
					.setLabel("Доступ к голосовому а-чату")
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId("godEvent_manifestAccess")
					.setLabel("Канал с обновлениями базы данных игры")
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder().setCustomId("godEvent_vchatAccess").setLabel("Логи голосовых каналов").setStyle(ButtonStyle.Secondary),
				new ButtonBuilder().setCustomId("godEvent_sortraids").setLabel("Отсортировка рейдов").setStyle(ButtonStyle.Secondary),
			];
			const embed = new EmbedBuilder()
				.setColor("#ff7624")
				.setDescription("Hex-код для установки собственного цвета роли можно найти [на этом сайте](https://htmlcolorcodes.com/)");
			return { embeds: [embed], components };
		}
		// case "godmsg2": {
		// 	const components = [
		// 		new ButtonBuilder().setCustomId("godEvent_color_red").setEmoji("🟥").setStyle(ButtonStyle.Secondary),
		// 		new ButtonBuilder().setCustomId("godEvent_color_white").setEmoji("⬜").setStyle(ButtonStyle.Secondary),
		// 		new ButtonBuilder().setCustomId("godEvent_color_purple").setEmoji("🟪").setStyle(ButtonStyle.Secondary),
		// 		new ButtonBuilder().setCustomId("godEvent_color_brown").setEmoji("🟫").setStyle(ButtonStyle.Secondary),
		// 		new ButtonBuilder().setCustomId("godEvent_color_blue").setEmoji("🟦").setStyle(ButtonStyle.Secondary),
		// 		new ButtonBuilder().setCustomId("godEvent_color_orange").setEmoji("🟧").setStyle(ButtonStyle.Secondary),
		// 		new ButtonBuilder().setCustomId("godEvent_color_green").setEmoji("🟩").setStyle(ButtonStyle.Secondary),
		// 		new ButtonBuilder().setCustomId("godEvent_color_reset").setEmoji("❌").setStyle(ButtonStyle.Secondary),
		// 	];
		// 	const embed = new EmbedBuilder().setColor("DarkGold").setTitle("Выберите любой из цветов ника");
		// 	return { embeds: [embed], components };
		// }
		// case "leavedclanmsg": {
		// 	const components = [
		// 		new ButtonBuilder().setCustomId(RegisterButtons.register).setLabel("Регистрация").setStyle(ButtonStyle.Success),
		// 		new ButtonBuilder().setCustomId(ClanButtons.invite).setLabel("Отправить приглашение в клан").setStyle(ButtonStyle.Success),
		// 	];
		// 	const embed = new EmbedBuilder()
		// 		.setColor(colors.default)
		// 		.setTitle("Возвращение в клан")
		// 		.setDescription(
		// 			`Нажмите на кнопку ниже для получения приглашения в клан в игре или перейдите на [страницу клана](https://www.bungie.net/ru/ClanV2?groupid=${process
		// 				.env
		// 				.GROUP_ID!}) и вступите там\n -  Приглашение можно принять на [Bungie.net](https://bungie.net/) или в игре\n - Доступно **только для зарегистрированных** пользователей`
		// 		);
		// 	return { embeds: [embed], components };
		// }
		// case "raids_additional": {
		// 	const components = [
		// 		new ButtonBuilder().setCustomId("raidGuide_ron").setLabel("Источник кошмаров").setStyle(ButtonStyle.Secondary),
		// 		new ButtonBuilder().setCustomId("raidGuide_vog").setLabel("Хрустальный чертог").setStyle(ButtonStyle.Secondary),
		// 		new ButtonBuilder().setCustomId("raidGuide_lw").setLabel("Последнее желание").setStyle(ButtonStyle.Secondary),
		// 		new ButtonBuilder().setCustomId("raidGuide_dsc").setLabel("Склеп Глубокого камня").setStyle(ButtonStyle.Secondary),
		// 	];
		// 	const embed = new EmbedBuilder()
		// 		.setColor("#0092FF")
		// 		.setTitle("Полезная информация")
		// 		.setDescription(
		// 			"1. Создание, изменение, участие в рейдах доступны всем, но некоторый функционал доступен только зарегистрированным (через команду </init:1035073892894654534>).\n2. На **абсолютно всех** рейдах мы рады новичкам и тем, кто желает изучить что-то новое. Мы обучим всех желающих в каждом рейде.\n3. Отображаемое время старта рейда указано с учетом часового пояса вашего устройства.\n4. После записи на любой из рейдов, вам автоматически будут выданы права на закрытый текстовый канал этого рейда, где вы можете обсудить с другими участниками что угодно. Для перехода в канал нажмите на цифру в поле Id в сообщении вашего рейда или перейдите в канал через список каналов.\n5. Этот канал служит как площадка для записи на рейды, это не канал для общения или обсуждения. Для обсуждения вопросов по рейду, запишитесь на нужный рейд как `Возможно буду` и задайте все необходимые вопросы в канале рейда.\n6. Пожалуйста, не бойтесь обращаться с любыми вопросами к разработчику бота - <@298353895258980362>. Ему можно писать даже когда он не в сети.\n\n- Стоит уточнить, что если на рейд ставятся требования по закрытиям, или в описании указано что-то вроде: `только опыт`,`5+ закрытий рейда`,`Рейд: Клятва Послушника от 5 закрытий`, то опыт требуется только в таких случаях.\n\nТекстовые руководства по прохождению рейдов находятся под сообщением"
		// 		);
		// 	return { embeds: [embed], components };
		// }
	}

	return null;
}

export default SlashCommand;
