import { EmbedBuilder, Role, TextChannel, VoiceChannel } from "discord.js";
import colors from "../configs/colors.js";
import { guildId, ids } from "../configs/ids.js";
import UserErrors from "../enums/UserErrors.js";
export default {
    name: "godEvent",
    run: async ({ client, interaction }) => {
        const param = interaction.customId.split("_")[1];
        const member = (interaction.member ? interaction.member : client.guilds.cache.get(guildId)?.members.cache.get(interaction.user.id));
        const channel = interaction.channel;
        const guild = interaction.guild;
        switch (param) {
            case "customRoleColor":
                {
                    const initialColor = member.roles.highest.color;
                    const embed = new EmbedBuilder().setColor(colors.default).setTitle("Введите HEX-код цвета роли");
                    const collector = channel.createMessageCollector({
                        filter: (m) => m.author.id === interaction.user.id,
                        max: 1,
                        time: 60 * 1000,
                    });
                    interaction.reply({ embeds: [embed], ephemeral: true });
                    collector.on("collect", async (m) => {
                        m.delete();
                        const code = m.cleanContent.trim();
                        if (code.length > 9)
                            throw { errorType: UserErrors.WRONG_HEX };
                        const role = member.roles.highest.name.startsWith("◈")
                            ? member.roles.highest.edit({ color: code }).catch((e) => {
                                throw { errorType: UserErrors.WRONG_HEX };
                            })
                            : member.roles.add(await guild.roles
                                .create({ name: "◈", color: code, position: member.roles.highest.position + 1 })
                                .catch((e) => {
                                throw { errorType: UserErrors.WRONG_HEX };
                            }));
                        role.then((r) => {
                            const resultRole = r instanceof Role ? r : r.roles.highest;
                            const resultEmbed = new EmbedBuilder()
                                .setColor("Green")
                                .setTitle("Цвет роли был изменен")
                                .setDescription(`**Предыдущий:** ${initialColor.toString(16).toUpperCase()}\n**Текущий:** ${resultRole.color
                                .toString(16)
                                .toUpperCase()}`);
                            interaction.editReply({ embeds: [resultEmbed] });
                            return collector.stop("Completed");
                        });
                    });
                    collector.on("end", (_u, reason) => {
                        if (reason !== "time")
                            return;
                        embed.setTitle("Время вышло").setColor(null);
                        interaction.editReply({ embeds: [embed] });
                    });
                }
                return;
            case "customRoleName":
                {
                    const embed = new EmbedBuilder().setColor(colors.default).setTitle("Введите название роли");
                    const collector = channel.createMessageCollector({
                        filter: (m) => m.author.id === interaction.user.id,
                        max: 1,
                        time: 60 * 1000,
                    });
                    interaction.reply({ embeds: [embed], ephemeral: true });
                    collector.on("collect", async (m) => {
                        m.delete();
                        const previousName = member.roles.highest.name.startsWith("◈") ? member.roles.highest.name : undefined;
                        const name = m.cleanContent.trim();
                        const role = member.roles.highest.name.startsWith("◈")
                            ? member.roles.highest.edit({ name: `◈ ${name}` }).catch((e) => {
                                throw { name: "Проверьте название роли" };
                            })
                            : member.roles.add(await guild.roles.create({ name: `◈ ${name}`, position: member.roles.highest.position + 1 }).catch((e) => {
                                throw { name: "Проверьте название роли" };
                            }));
                        role.then((r) => {
                            const resultRole = r instanceof Role ? r : r.roles.highest;
                            const resultEmbed = new EmbedBuilder()
                                .setColor("Green")
                                .setTitle("Название роли было изменено")
                                .setDescription(`${previousName ? `**Предыдущий:** ${previousName}\n` : ""}**Текущий:** ${resultRole.name}`);
                            interaction.editReply({ embeds: [resultEmbed] });
                            return collector.stop("Completed");
                        });
                    });
                    collector.on("end", (_u, reason) => {
                        if (reason !== "time")
                            return;
                        embed.setTitle("Время вышло").setColor(null);
                        interaction.editReply({ embeds: [embed] });
                    });
                }
                return;
            case "getInvite":
                {
                    const embed = new EmbedBuilder().setColor(colors.default).setAuthor({
                        name: "Перейти на сервер",
                        url: "https://discord.gg/YZZz5aaEQK",
                        iconURL: "https://cdn.discordapp.com/icons/1007814171267707001/b8b3e04b052f469607b68ae1c7a7cdfa.webp",
                    });
                    interaction.reply({ embeds: [embed], ephemeral: true });
                }
                return;
            case "achatAccess": {
                return chnPermGranter(ids.adminChnId);
            }
            case "achatVoiceAccess": {
                return chnPermGranter(ids.adminVoiceChnId);
            }
            case "manifestAccess": {
                return chnPermGranter(ids.manifestChnId);
            }
            case "vchatAccess": {
                return chnPermGranter(ids.voiceChnId);
            }
            case "color":
                {
                    const colorName = interaction.customId.split("_")[2];
                    if (member.roles.highest.name === "⁣")
                        member.roles.remove(member.roles.highest);
                    switch (colorName) {
                        case "red": {
                            member.roles.add("1033431078960103445");
                            break;
                        }
                        case "white": {
                            member.roles.add("779024628034174986");
                            break;
                        }
                        case "purple": {
                            member.roles.add("779024608178208778");
                            break;
                        }
                        case "brown": {
                            member.roles.add("779024275873071105");
                            break;
                        }
                        case "blue": {
                            member.roles.add("779024192162234418");
                            break;
                        }
                        case "orange": {
                            member.roles.add("779024477723033630");
                            break;
                        }
                        case "green": {
                            member.roles.add("779024401823432755");
                            break;
                        }
                    }
                    const embed = new EmbedBuilder().setColor(colors.default).setTitle("Вы поменяли цвет роли");
                    interaction.reply({ embeds: [embed], ephemeral: true });
                }
                return;
        }
        function chnPermGranter(chnId) {
            const chn = guild.channels.cache.get(chnId);
            if (chn instanceof TextChannel || chn instanceof VoiceChannel) {
                const embed = new EmbedBuilder().setColor(colors.default);
                if (chn.permissionsFor(interaction.user.id)?.has("ViewChannel")) {
                    chn.permissionOverwrites.delete(interaction.user.id);
                    embed.setDescription(`Вы **отключили** доступ к <#${chn.id}>`);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                else {
                    chn.permissionOverwrites.create(interaction.user.id, { ViewChannel: true }, { reason: "godEvent button" });
                    embed.setDescription(`Вы **получили** доступ к <#${chn.id}>`);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }
        }
    },
};
