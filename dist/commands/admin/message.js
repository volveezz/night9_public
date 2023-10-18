import { ApplicationCommandOptionType, AttachmentBuilder, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { Command } from "../../structures/command.js";
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
                ru: "Редактировать конкретное сообщение",
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
                    type: ApplicationCommandOptionType.User,
                    name: "user",
                    nameLocalizations: { ru: "пользователь" },
                    description: "Select the user whose DM channel you want to interact with",
                    descriptionLocalizations: { ru: "Выберите пользователя, с личными сообщенями которого вы хотите взаимодействовать" },
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "content",
                    nameLocalizations: { ru: "содержание" },
                    description: "New content for the message",
                    descriptionLocalizations: { ru: "Новое содержание для сообщения" },
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "embed",
                    description: "Embed to be added/edited",
                    descriptionLocalizations: { ru: "Встроенное содержание для добавления/редактирования" },
                },
            ],
        },
    ],
    run: async ({ client, interaction, args }) => {
        const subcommand = args.getSubcommand(true);
        const messageId = args.getString("message-id", true);
        const user = args.getUser("user");
        const channel = await (user
            ? user.dmChannel || user.createDM().catch(() => null)
            : client.getTextChannel(interaction.channelId).catch(() => null));
        if (!channel) {
            throw { errorType: "CHANNEL_NOT_FOUND" };
        }
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (!message) {
            throw { errorType: "SPECIFIED_MESSAGE_NOT_FOUND" };
        }
        switch (subcommand) {
            case "fetch": {
                const jsonMessage = JSON.stringify(message.toJSON(), null, 2);
                if (jsonMessage.length > 2000) {
                    const jsonFile = new AttachmentBuilder(Buffer.from(jsonMessage), { name: "message.json", description: "Message JSON file" });
                    await interaction.reply({
                        files: [jsonFile],
                        ephemeral: true,
                    });
                }
                else {
                    await interaction.reply({
                        content: `\`\`\`json\n${jsonMessage}\n\`\`\``,
                        ephemeral: true,
                    });
                }
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
                let content = args.getString("content") ?? undefined;
                const embed = args.getString("embed");
                const parsedEmbed = embed ? JSON.parse(embed) : null;
                const embeds = parsedEmbed ? (Array.isArray(parsedEmbed) ? parsedEmbed : [parsedEmbed]) : undefined;
                if (content && ["null", "delete", "deleted", "удалить", "-", "undefined"].includes(content)) {
                    content = null;
                }
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
        }
    },
});
export default SlashCommand;
//# sourceMappingURL=message.js.map