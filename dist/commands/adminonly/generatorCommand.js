import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { ClanButtons, RegisterButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { Command } from "../../structures/command.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
export default new Command({
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
                        { type: ApplicationCommandOptionType.String, name: "embed_code", description: "Embed code", required: true },
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "message_id",
                            description: "Specify a message ID if you want to edit an existing message",
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "preset",
                    description: "Create an embed from a pre-defined preset",
                    options: [{ type: ApplicationCommandOptionType.String, name: "preset_name", description: "Preset name", required: true }],
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
    ],
    run: async ({ interaction, args }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const subcommandGroup = args.getSubcommandGroup() || args.getSubcommand();
        const channel = interaction.channel;
        if (subcommandGroup === "embed") {
            const subcommand = args.getSubcommand();
            if (subcommand === "code") {
                const embedCode = args.getString("embed_code", true);
                const messageId = args.getString("message_id");
                try {
                    let parsedJSON = JSON.parse(embedCode);
                    let embedJSON;
                    if (parsedJSON.embed && typeof parsedJSON.embed === "object") {
                        embedJSON = parsedJSON.embed;
                    }
                    else {
                        embedJSON = parsedJSON;
                    }
                    const embed = EmbedBuilder.from(embedJSON);
                    const responseEmbed = new EmbedBuilder()
                        .setColor(colors.success)
                        .setAuthor({ name: `Сообщение успешно ${messageId ? "изменено" : "отправлено"}`, iconURL: icons.success });
                    if (messageId) {
                        const message = await channel.messages.fetch(messageId);
                        if (!message) {
                            throw { name: "Ошибка", description: "Редактируемое сообщение не найдено" };
                        }
                        await message.edit({ content: parsedJSON.content, embeds: [embed] });
                        await deferredReply;
                        interaction.editReply({ embeds: [responseEmbed] });
                        return;
                    }
                    else {
                        try {
                            await channel.send({ content: parsedJSON.content, embeds: [embed] });
                        }
                        catch (error) {
                            throw {
                                name: "Discord API Error",
                                description: "An error occurred while sending the embed to Discord",
                                details: error,
                            };
                        }
                        await deferredReply;
                        interaction.editReply({ embeds: [responseEmbed] });
                        return;
                    }
                }
                catch (error) {
                    console.error("[Error code: 1646] Error during handling embed message", error);
                    const errorResponse = new EmbedBuilder().setColor(colors.error).setAuthor({
                        name: `Произошла ошибка во время ${messageId ? "редактирования" : "отправки"} сообщения`,
                        iconURL: icons.close,
                    });
                    await deferredReply;
                    interaction.editReply({ embeds: [errorResponse] });
                    return;
                }
            }
            else if (subcommand === "preset") {
                const presetName = args.getString("preset_name", true);
                const preset = await getPreset(presetName);
                if (!preset) {
                    throw { name: "Ошибка", description: `Искомый пресет \`${presetName}\` не найден` };
                }
                const { embeds, components } = preset;
                await channel.send({ embeds, components: await addButtonsToMessage(components) });
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
                interaction.editReply({ embeds: [interactionEmbed], components: await addButtonsToMessage(components) });
            }
            else {
                await channel.send({ embeds: [interactionEmbed], components: await addButtonsToMessage(components) });
                const responseEmbed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setAuthor({ name: `Кнопка ${customId} успешно отправлена`, iconURL: icons.success });
                interaction.editReply({ embeds: [responseEmbed] });
            }
            return;
        }
    },
});
async function getPreset(presetName) {
    switch (presetName) {
        case "clanjoin": {
            const embed = new EmbedBuilder()
                .setColor(colors.default)
                .setTitle("Вступление в клан")
                .setDescription("Приём в клан у нас полностью автоматизирован\nВыполните 3 простых условия ниже и Вы будете приняты в кратчайшие сроки\nПо любым вопросам пишите <@719557130188750920> или <@298353895258980362>")
                .addFields([
                {
                    name: "<:eine:1087575481647374416> Зарегистрируйтесь у кланового бота",
                    value: "Нажмите кнопку `Регистрация` ниже или введите `/init`",
                },
                {
                    name: "<:zwei:1087575495912206357> Заполните форму на вступление в клан",
                    value: "Сделать это можно нажав на кнопку `Форма на вступление`",
                },
                {
                    name: "<:drei:1087575479617331253> Вступите в клан",
                    value: `[Подайте заявку в клан](https://www.bungie.net/ru/ClanV2?groupid=${process.env
                        .GROUP_ID}) или отправьте её себе сами нажав \`Приглашение в клан\``,
                },
            ]);
            const components = [
                new ButtonBuilder().setCustomId(RegisterButtons.register).setLabel("Регистрация").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(ClanButtons.modal).setLabel("Форма на вступление").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(ClanButtons.invite).setLabel("Приглашение в клан").setStyle(ButtonStyle.Secondary),
            ];
            return { embeds: [embed], components };
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
        case "godmsg2": {
            const components = [
                new ButtonBuilder().setCustomId("godEvent_color_red").setEmoji("🟥").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("godEvent_color_white").setEmoji("⬜").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("godEvent_color_purple").setEmoji("🟪").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("godEvent_color_brown").setEmoji("🟫").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("godEvent_color_blue").setEmoji("🟦").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("godEvent_color_orange").setEmoji("🟧").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("godEvent_color_green").setEmoji("🟩").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("godEvent_color_reset").setEmoji("❌").setStyle(ButtonStyle.Secondary),
            ];
            const embed = new EmbedBuilder().setColor("DarkGold").setTitle("Выберите любой из цветов ника");
            return { embeds: [embed], components };
        }
        case "leavedclanmsg": {
            const components = [
                new ButtonBuilder().setCustomId(RegisterButtons.register).setLabel("Регистрация").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(ClanButtons.invite).setLabel("Отправить приглашение в клан").setStyle(ButtonStyle.Success),
            ];
            const embed = new EmbedBuilder()
                .setColor(colors.default)
                .setTitle("Возвращение в клан")
                .setDescription(`Нажмите на кнопку ниже для получения приглашения в клан в игре или перейдите на [страницу клана](https://www.bungie.net/ru/ClanV2?groupid=${process
                .env
                .GROUP_ID}) и вступите там\n -  Приглашение можно принять на [Bungie.net](https://bungie.net/) или в игре\n - Доступно **только для зарегистрированных** пользователей`);
            return { embeds: [embed], components };
        }
        case "raids_additional": {
            const components = [
                new ButtonBuilder().setCustomId("raidGuide_ron").setLabel("Источник кошмаров").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("raidGuide_vog").setLabel("Хрустальный чертог").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("raidGuide_lw").setLabel("Последнее желание").setStyle(ButtonStyle.Secondary),
            ];
            const embed = new EmbedBuilder()
                .setColor("#0092FF")
                .setTitle("Полезная информация")
                .setDescription("1. Создание, изменение, участие в рейдах доступны всем, но некоторый функционал доступен только зарегистрированным (через команду </init:1035073892894654534>).\n2. На **абсолютно всех** рейдах мы рады новичкам и тем, кто желает изучить что-то новое. Мы обучим всех желающих в каждом рейде.\n3. Отображаемое время старта рейда указано с учетом часового пояса вашего устройства.\n4. После записи на любой из рейдов, вам автоматически будут выданы права на закрытый текстовый канал этого рейда, где вы можете обсудить с другими участниками что угодно. Для перехода в канал нажмите на цифру в поле Id в сообщении вашего рейда или перейдите в канал через список каналов.\n5. Этот канал служит как площадка для записи на рейды, это не канал для общения или обсуждения. Для обсуждения вопросов по рейду, запишитесь на нужный рейд как `Возможно буду` и задайте все необходимые вопросы в канале рейда.\n6. Пожалуйста, не бойтесь обращаться с любыми вопросами к разработчику бота - <@298353895258980362>. Ему можно писать даже когда он не в сети.\n\n- Стоит уточнить, что если на рейд ставятся требования по закрытиям, или в описании указано что-то вроде: `только опыт`,`5+ закрытий рейда`,`Рейд: Клятва Послушника от 5 закрытий`, то опыт требуется только в таких случаях.\n\nТекстовые руководства по прохождению рейдов находятся под сообщением");
            return { embeds: [embed], components };
        }
    }
    return null;
}
//# sourceMappingURL=generatorCommand.js.map