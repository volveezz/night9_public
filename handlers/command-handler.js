import { ApplicationCommandType, ChatInputCommandInteraction, EmbedBuilder, GuildMember, InteractionType, PermissionsBitField, } from "discord.js";
import { guildId } from "../base/ids.js";
import { getFiles } from "./file-reader.js";
const commands = {};
const events = {};
export class Command {
    type;
    callback;
}
export class EventHandler {
    callback;
}
export class AutocompleteHandler {
    callback;
}
export class CustomError extends Error {
    name;
    interaction;
    constructor(interaction, name, message) {
        super();
        this.name = name;
        this.interaction = interaction;
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        }
        else {
            this.__proto__ = actualProto;
        }
        errorHandler(interaction, { name, message });
    }
}
export async function errorHandler(interaction, error) {
    const embed = new EmbedBuilder().setColor("Red");
    console.error(`[Error code: 1084] Slash command error. Reply to ${interaction.member instanceof GuildMember ? interaction.member.displayName : interaction.user.username}\n`, error);
    embed.setTitle(error.name);
    if (error.message)
        embed.setDescription(error?.message);
    (interaction.replied || interaction.deferred
        ? interaction.editReply({ embeds: [embed] })
        : interaction.reply({ embeds: [embed], ephemeral: true }))
        .catch((e) => {
        e.code === 40060 ? "" : console.error("[Error code: 1085]", e);
        return interaction.followUp({ embeds: [embed], ephemeral: true });
    })
        .catch((e) => console.error("[Error code: 1086]", e));
    return;
}
export default async (client, commandDir, eventsDir) => {
    const files = getFiles(commandDir);
    const eventsFiles = getFiles(eventsDir);
    for (const command of files) {
        const { default: commandFile } = await import(`../commands/${command}`);
        const { name: commandName, description: commandDescription, global, options, defaultMemberPermissions, type, nameLocalizations } = commandFile;
        setTimeout(() => {
            if (!type || type[0] === true) {
                if (commandName === "wasibanned") {
                    client.guilds.cache.get(guildId)?.commands.create({
                        name: commandName,
                        nameLocalizations: nameLocalizations || undefined,
                        description: commandDescription || commandName,
                        type: ApplicationCommandType.ChatInput,
                        defaultMemberPermissions: defaultMemberPermissions === undefined ? null : new PermissionsBitField(defaultMemberPermissions).bitfield,
                        options: options,
                    });
                }
            }
        }, 2000);
        commands[commandName.toLowerCase()] = commandFile;
    }
    for (const event of eventsFiles) {
        const { default: commandFile } = await import(`../events/${event}`);
        events[event.slice(0, -3).toLowerCase()] = commandFile;
    }
    client.on("interactionCreate", async (interaction) => {
        if ((interaction.isChatInputCommand() || interaction.isUserContextMenuCommand()) && interaction.channel) {
            const { commandName } = interaction;
            const guild = interaction.guild || client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId));
            const memberPre = interaction.member || guild.members.cache.get(interaction.user.id) || (await guild.members.fetch(interaction.user.id));
            const channel = interaction.channel;
            const member = memberPre instanceof GuildMember ? memberPre : await guild.members.fetch(memberPre.user.id);
            if (!commands[commandName])
                return;
            console.log(`${member.displayName} used ${commandName}`, interaction instanceof ChatInputCommandInteraction && interaction.options.data.some((d) => d.type === 1)
                ? interaction.options.getSubcommand()
                : "", interaction?.options?.data
                ? interaction.options.data
                    .map((d) => {
                    return d.options
                        ?.map((v) => {
                        return `${v.name}${v.value ? `: ${v.value}` : ""}`;
                    })
                        .join(", ");
                })
                    .join(" ")
                : "no options");
            try {
                commands[commandName].callback(client, interaction, member, guild, channel).catch((err) => {
                    const embed = new EmbedBuilder().setColor("Red");
                    console.error(`[Error code: 1027] Slash command error. Reply to ${member.displayName}\n`, err);
                    if (!err.stack && err.name) {
                        embed.setTitle(err.name);
                        if (err.message)
                            embed.setDescription(err?.message);
                    }
                    else {
                        embed.setTitle(`${err?.code
                            ? `Error ${err.code}`
                            : err.error?.ErrorCode
                                ? `Bungie request error ${err.error?.ErrorCode}`
                                : err.parent?.code
                                    ? `DB error ${err.parent?.code}`
                                    : `Error ${err.name}`}`);
                    }
                    (err.interaction?.replied || interaction.replied || err.interaction?.deferred || interaction.deferred
                        ? interaction.editReply({ embeds: [embed] })
                        : interaction.reply({ embeds: [embed], ephemeral: true }))
                        .catch((e) => {
                        e.code === 40060 ? "" : console.error("[Error code: 1050]", e);
                        return interaction.followUp({ embeds: [embed], ephemeral: true });
                    })
                        .catch((e) => console.error("[Error code: 1048]", e));
                    return;
                });
            }
            catch (error) {
                console.error("[Error code: 1038] Command error:", error);
            }
        }
        else if (interaction.isButton() || interaction.isSelectMenu() || interaction.isModalSubmit()) {
            const { customId } = interaction;
            const commandName = customId.split("_").shift()?.toLowerCase() || "blank";
            if (!events[commandName])
                return;
            const member = interaction.member instanceof GuildMember
                ? interaction.member
                : client.guilds.cache.get(guildId)?.members.cache.get(interaction.user.id);
            console.log(`${member.displayName} used ${customId}${interaction.channel && !interaction.channel.isDMBased() ? ` at ${interaction.channel.name}` : ""}`);
            events[commandName].callback(client, interaction, member, interaction.guild, interaction.channel).catch(async (e) => {
                const loggedError = e.deferredReply ? e : undefined;
                loggedError ? delete loggedError.deferredReply : "";
                console.error(`[Error code: 1028] CommandName: ${commandName}`, e.stack || loggedError);
                const embed = new EmbedBuilder().setColor("Red");
                embed.setTitle(e?.name);
                e && e.message && typeof e.message === "string" && e.message.length > 5 ? embed.setDescription(e.message) : [];
                if (e.deferredReply)
                    await e.deferredReply;
                (e.interaction?.replied || interaction.replied || e.interaction?.deferred || interaction.deferred
                    ? interaction.editReply({ embeds: [embed] })
                    : interaction.reply({ embeds: [embed], ephemeral: true }))
                    .catch((e) => {
                    e.code === 40060 ? "" : console.error("[Error code: 1046]", e.stack);
                    return interaction.followUp({ embeds: [embed], ephemeral: true });
                })
                    .catch((e) => console.error("[Error code: 1079]", e));
            });
        }
        else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
            if (interaction.commandName === "рейд") {
                events["raidautocomplete"].callback(client, interaction, interaction.member, interaction.guild, interaction.channel).catch((e) => {
                    console.error(e);
                });
            }
        }
        else if (interaction.isMessageContextMenuCommand() && interaction.commandName === "stats") {
            commands["stats"].callback(client, interaction, interaction.member, interaction.guild, interaction.channel).catch((e) => {
                console.error(`Slash command [Error code: 1029]`, e);
                const embed = new EmbedBuilder().setColor("Red");
                embed.setTitle(e?.name);
                interaction.deferred
                    ? interaction.followUp({ ephemeral: true, embeds: [embed] })
                    : interaction.reply({ ephemeral: true, embeds: [embed] });
            });
        }
    });
};
