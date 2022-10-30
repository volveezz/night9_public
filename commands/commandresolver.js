import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import { colors } from "../base/colors.js";
import { guildId } from "../base/ids.js";
export default {
    name: "commandresolver",
    description: "commandresolver",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "fetch",
            description: "fetch commands",
            options: [
                {
                    type: ApplicationCommandOptionType.Boolean,
                    name: "global",
                    description: "global?",
                    required: true,
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "delete",
            description: "delete command",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    description: "command",
                    name: "id",
                    required: true,
                },
            ],
        },
    ],
    callback: async (client, interaction, _member, _guild, _channel) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const subCommand = interaction.options.getSubcommand();
        if (subCommand === "fetch") {
            return fetch(interaction.options.getBoolean("global", true));
        }
        else if (subCommand === "delete") {
            return commandDelete(interaction.options.getString("id", true));
        }
        async function commandDelete(id) {
            if (isNaN(parseInt(id))) {
                id =
                    client.application?.commands.cache.find((command) => command.name == id)?.id ||
                        client.guilds.cache.get(guildId)?.commands.cache.find((command) => command.name == id)?.id ||
                        "NaN";
            }
            if (id === "NaN" || isNaN(parseInt(id))) {
                throw { name: `Command \`${id}\` not found` };
            }
            client.application?.commands
                .delete(id)
                .then(async (resp) => {
                const embed = new EmbedBuilder()
                    .setColor("Green")
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
                    client.guilds.cache
                        .get(guildId)
                        ?.commands.delete(id)
                        .then(async (resp) => {
                        const embed = new EmbedBuilder()
                            .setColor("Green")
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
                            throw { name: `Command \`${id}\` not found as global or guild command`, falseAlarm: true };
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
        async function fetch(global) {
            const commandArray = [];
            if (global) {
                await client.application?.commands.fetch().then((commands) => {
                    commands.forEach((command) => {
                        commandArray.push({
                            commandName: command.name,
                            commandType: command.type,
                            commandId: command.id,
                        });
                    });
                });
            }
            else {
                await client.guilds.cache
                    .get(guildId)
                    ?.commands.fetch()
                    .then((commands) => {
                    commands.forEach((command) => {
                        commandArray.push({
                            commandName: command.name,
                            commandType: command.type,
                            commandId: command.id,
                        });
                    });
                });
            }
            const embed = new EmbedBuilder().setColor(colors.default).setTitle(global ? "Global command list" : "Guild command list");
            commandArray.forEach((command) => {
                if (embed.data.fields?.length >= 24) {
                    if (embed.data.footer === null) {
                        return embed.setFooter({
                            text: `and ${commandArray.length - commandArray.indexOf(command)} more`,
                        });
                    }
                }
                embed.addFields({
                    name: command.commandName || "blank",
                    value: `${command.commandType}\n${command.commandId}` || "blank",
                    inline: true,
                });
            });
            if (embed.data.fields?.length === 0)
                embed.setDescription("0 commands");
            await deferredReply;
            interaction.editReply({ embeds: [embed] });
        }
    },
};
