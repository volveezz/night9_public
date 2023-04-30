import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { Command } from "../../structures/command.js";
export default new Command({
    name: "commandresolver",
    description: "commandresolver",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "fetch",
            description: "Retrieve all Discord slash commands",
            options: [
                {
                    type: ApplicationCommandOptionType.Boolean,
                    name: "global",
                    description: "Are you fetching global commands?",
                    required: true,
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "delete",
            description: "Remove a specific Discord slash command",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    description: "The ID of the command to delete",
                    name: "id",
                    required: true,
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "fetch-specific",
            description: "Retrieve a specific Discord slash command by its ID",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    description: "The ID of the command to fetch",
                    name: "specific_id",
                    required: true,
                },
            ],
        },
    ],
    run: async ({ client, interaction, args }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const subCommand = args.getSubcommand();
        switch (subCommand) {
            case "fetch":
                const isGlobal = args.getBoolean("global", true);
                fetchCommands(isGlobal);
                break;
            case "delete":
                const id = args.getString("id", true);
                deleteCommand(id);
                break;
            case "fetch-specific":
                const specific_id = args.getString("specific_id", true);
                fetchSpecific(specific_id);
                break;
        }
        async function deleteCommand(id) {
            if (isNaN(parseInt(id))) {
                id =
                    client.application?.commands.cache.find((command) => command.name == id)?.id ||
                        client.getCachedGuild().commands.cache.find((command) => command.name == id)?.id ||
                        "NaN";
            }
            if (id === "NaN" || isNaN(parseInt(id))) {
                throw { name: "Command '${id}' not found" };
            }
            client.application?.commands
                .delete(id)
                .then(async (resp) => {
                const embed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle(`Global command ${resp?.name} was deleted`)
                    .setFooter({ text: `Id: ${resp?.id}` });
                if (resp?.description) {
                    embed.addFields([
                        {
                            name: `Type: ${resp.type}`,
                            value: `Description: ${resp.description}`,
                        },
                    ]);
                }
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
            })
                .catch((e) => {
                if (e.code === 10063) {
                    client
                        .getCachedGuild()
                        .commands.delete(id)
                        .then(async (resp) => {
                        const embed = new EmbedBuilder()
                            .setColor(colors.success)
                            .setTitle(`Guild command ${resp?.name} was deleted`)
                            .setFooter({ text: `Id: ${resp?.id}` });
                        if (resp?.description) {
                            embed.addFields([
                                {
                                    name: `Type: ${resp.type}`,
                                    value: `Description: ${resp.description}`,
                                },
                            ]);
                        }
                        await deferredReply;
                        interaction.editReply({ embeds: [embed] });
                    })
                        .catch((e) => {
                        if (e.code === 10063) {
                            throw { name: "Command '${id}' not found as global or guild command", falseAlarm: true };
                        }
                        else {
                            console.error(e);
                        }
                    });
                }
                else
                    console.error(e);
            });
        }
        async function fetchCommands(isGlobal) {
            const commandList = await getCommandList(isGlobal);
            const embed = createCommandEmbed(commandList, isGlobal);
            await deferredReply;
            interaction.editReply({ embeds: [embed] });
        }
        async function getCommandList(isGlobal) {
            const commandList = [];
            const commands = isGlobal ? await client.application?.commands.fetch() : await client.getCachedGuild().commands.fetch();
            commands.forEach((command) => {
                commandList.push({
                    commandName: command.name,
                    commandType: command.type,
                    commandId: command.id,
                });
            });
            return commandList;
        }
        function createCommandEmbed(commandList, isGlobal) {
            const embed = new EmbedBuilder().setColor(colors.default).setTitle(isGlobal ? "Global command list" : "Guild command list");
            commandList.forEach((command) => {
                if (embed.data.fields?.length >= 24) {
                    if (embed.data.footer === null) {
                        embed.setFooter({
                            text: `and ${commandList.length - commandList.indexOf(command)} more`,
                        });
                    }
                    return;
                }
                embed.addFields({
                    name: command.commandName || "blank",
                    value: `${command.commandType}\n${command.commandId}` || "blank",
                    inline: true,
                });
            });
            if (embed.data.fields?.length === 0)
                embed.setDescription("0 commands");
            return embed;
        }
        async function fetchSpecific(specific_id) {
            const command = await findCommandById(specific_id);
            if (!command) {
                await deferredReply;
                return interaction.editReply({ content: "Command not found." });
            }
            const embed = new EmbedBuilder()
                .setColor(colors.default)
                .setTitle(`Command: ${command.name}`)
                .setDescription(`Type: ${command.type}\nID: ${command.id}\nDescription: ${command.description}`);
            const formattedOptions = formatOptions(command.options);
            embed.addFields({ name: "Options", value: formattedOptions || "No options" });
            await deferredReply;
            interaction.editReply({ embeds: [embed] });
        }
        function formatOptions(options, depth = 0, lastChild = []) {
            if (!options)
                return "";
            let formattedOptions = "";
            for (const [index, option] of options.entries()) {
                const isLastChild = index === options.length - 1;
                const prefix = depth === 0
                    ? ""
                    : lastChild
                        .slice(0, -1)
                        .map((last) => (last ? "  " : "│ "))
                        .join("");
                const treeSymbol = isLastChild ? "└─" : "├─";
                switch (option.type) {
                    case ApplicationCommandOptionType.SubcommandGroup:
                        formattedOptions += `${prefix}${treeSymbol}📁 ${option.name} (Subcommand Group)\n`;
                        formattedOptions += formatOptions(option.options, depth + 1, [...lastChild, isLastChild]);
                        break;
                    case ApplicationCommandOptionType.Subcommand:
                        formattedOptions += `${prefix}${treeSymbol}🔹 ${option.name} (Subcommand)\n`;
                        formattedOptions += formatOptions(option.options, depth + 1, [...lastChild, isLastChild]);
                        break;
                    default:
                        formattedOptions += `${prefix}${treeSymbol}⚪ ${option.name} (${option.type})\n`;
                }
            }
            return formattedOptions;
        }
        async function findCommandById(commandId) {
            const globalCommands = await client.application?.commands.fetch();
            const guildCommands = await client.getCachedGuild().commands.fetch();
            return globalCommands.find((command) => command.id === commandId) || guildCommands.find((command) => command.id === commandId);
        }
    },
});
