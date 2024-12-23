import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
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
        const channel = interaction.channel;
        if (subcommandGroup === "embed") {
            const subcommand = args.getSubcommand();
            if (subcommand === "code") {
                const embedCode = args.getString("embed-code");
                const messageId = args.getString("message-id");
                const channelId = args.getString("channelId");
                const embedChannel = await client.getTextChannel(interaction.channel || channelId);
                try {
                    let content;
                    let embeds = [];
                    if (embedCode) {
                        let parsedJSON = JSON.parse(embedCode);
                        content = parsedJSON.content || undefined;
                        const embedPath = parsedJSON.embed || parsedJSON.embeds || parsedJSON;
                        if (embedPath) {
                            if (Array.isArray(embedPath)) {
                                embeds = embedPath.map((embedJSON) => EmbedBuilder.from(embedJSON));
                            }
                            else {
                                const embedJSON = embedPath;
                                embeds.push(EmbedBuilder.from(embedJSON));
                            }
                        }
                    }
                    const responseEmbed = new EmbedBuilder()
                        .setColor(colors.success)
                        .setAuthor({ name: `Сообщение было ${messageId ? "изменено" : "отправлено"}`, iconURL: icons.success });
                    const messageOptions = {};
                    if (content)
                        messageOptions.content = content;
                    if (embeds.length > 0)
                        messageOptions.embeds = embeds;
                    if (messageId) {
                        const message = await embedChannel.messages.fetch(messageId);
                        if (!message) {
                            throw { name: "Ошибка", description: "Изменяемое сообщение не найдено" };
                        }
                        await message.edit(messageOptions);
                    }
                    else {
                        if (!content && !embeds)
                            throw { name: "Ошибка", description: "Ни текст, ни embed-сообщение не были предоставлены" };
                        await embedChannel.send(messageOptions);
                    }
                    await deferredReply;
                    interaction.editReply({ embeds: [responseEmbed] });
                }
                catch (error) {
                    console.error("[Error code: 2097] Error during handling message", error);
                    const errorResponse = new EmbedBuilder().setColor(colors.error).setAuthor({
                        name: `Произошла ошибка во время ${messageId ? "изменения" : "отправления"} сообщения`,
                        iconURL: icons.close,
                    });
                    await deferredReply;
                    interaction.editReply({ embeds: [errorResponse] });
                }
            }
            else if (subcommand === "preset") {
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
        }
        else if (subcommandGroup === "button") {
            const customId = args.getString("customid", true);
            const label = args.getString("label") || customId;
            const style = args.getNumber("style") || ButtonStyle.Secondary;
            const ephemeral = args.getBoolean("ephemeral") ?? true;
            const interactionEmbed = new EmbedBuilder().setColor(colors.invisible).setTitle(`${label}`);
            const components = [new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style)];
            await deferredReply;
            if (ephemeral === true) {
                interaction.editReply({ embeds: [interactionEmbed], components: addButtonsToMessage(components) });
            }
            else {
                await channel.send({ embeds: [interactionEmbed], components: addButtonsToMessage(components) });
                const responseEmbed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setAuthor({ name: `Кнопка ${customId} отправлена`, iconURL: icons.success });
                interaction.editReply({ embeds: [responseEmbed] });
            }
            return;
        }
        else if (subcommandGroup === "image") {
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
async function getPreset(presetName) {
    switch (presetName) {
        case "lfg": {
            const components = [new ButtonBuilder().setCustomId("lfg_show").setLabel("Создать сбор").setStyle(ButtonStyle.Primary)];
            const embeds = [
                new EmbedBuilder()
                    .setColor(colors.deepBlue)
                    .setTitle("Создание сборов через меню")
                    .setDescription("В дополнение к существующему методу (через чат), вы можете создать сбор через меню.\nОдно отличие: через меню нужно устанавливать лимит комнаты, а не число искомых вами участников.\n\nПример:\n- При сборе через чат вы указываете: `+2 грандмастер`.\n- При сборе через меню вы указываете: лимит участников — `3`, название комнаты — `грандмастер`."),
            ];
            return { components, embeds };
        }
        case "access": {
            const createComponent = (customId, label) => {
                return new ButtonBuilder().setStyle(ButtonStyle.Secondary).setCustomId(`getAccessToChannel_${customId}`).setLabel(label);
            };
            const components = [
                createComponent(process.env.LORE_CHANNEL_ID, "Обсуждение лора игры"),
                createComponent(process.env.VEX_INCURSION_CHANNEL_ID, "Оповещения об вторжениях вексов"),
                createComponent(process.env.CHECKPOINTS_CHANNEL_ID, "Контрольные точки"),
            ];
            const embed = new EmbedBuilder().setColor(colors.invisible).setTitle("Выберите канал, к которому хотите получить доступ");
            return { components, embeds: [embed] };
        }
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
    }
    return null;
}
export default SlashCommand;
//# sourceMappingURL=generator.js.map