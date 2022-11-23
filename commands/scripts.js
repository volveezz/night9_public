import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import { colors } from "../base/colors.js";
import { statusRoles } from "../base/roles.js";
import { auth_data, discord_activities } from "../handlers/sequelize.js";
export default {
    name: "scripts",
    description: "script system",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "script",
            description: "script",
            required: true,
        },
    ],
    callback: async (_client, interaction, member, _guild, _channel) => {
        const defferedReply = interaction.deferReply();
        const scriptId = interaction.options.getString("script", true).toLowerCase();
        switch (scriptId) {
            case "rolesweeper": {
                const members = interaction.guild.members.cache.filter((m) => {
                    return (m.roles.cache.has(statusRoles.member) || m.roles.cache.has(statusRoles.kicked)) && m.roles.cache.has(statusRoles.verified);
                });
                const updatedMembers = members.map(async (member) => {
                    await member.roles
                        .set([
                        member.roles.cache.has(statusRoles.member)
                            ? statusRoles.member
                            : member.roles.cache.has(statusRoles.kicked)
                                ? statusRoles.kicked
                                : "",
                        member.roles.cache.has(statusRoles.verified) ? statusRoles.verified : "",
                    ])
                        .catch((e) => defferedReply.then((v) => interaction.followUp(`Возникла ошибка во время обновления ${member.displayName}`)));
                    await new Promise((res) => setTimeout(res, 500));
                });
                const embed = new EmbedBuilder().setColor("Green").setTitle(`${updatedMembers.length} пользователей было обновлено из ${members.size}`);
                interaction.editReply({ embeds: [embed] });
                return;
            }
            case "activitytop": {
                const dbData = (await auth_data.findAll({ include: discord_activities, attributes: ["displayname", "discord_id"] })).filter((v) => v.discord_activity && (v.discord_activity.messages > 0 || v.discord_activity.voice > 0));
                const messageTop = dbData
                    .filter((v) => v.discord_activity.messages > 0)
                    .sort((a, b) => b.discord_activity.messages - a.discord_activity.messages);
                const voiceTop = dbData
                    .filter((v) => v.discord_activity.voice > 0)
                    .sort((a, b) => b.discord_activity.voice - a.discord_activity.voice);
                const msgEmbed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle("Топ по текстовому активу")
                    .setFooter(messageTop.length > 50 ? { text: `И еще ${messageTop.length - 50} участников` } : null)
                    .setDescription(`${messageTop
                    .splice(0, 50)
                    .map((v, i) => {
                    return `${i + 1}. <@${v.discord_id}> — ${v.discord_activity.messages} ${v.discord_activity.messages === 1 ? "сообщение" : "сообщений"}`;
                })
                    .join("\n")}`);
                const voiceEmbed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle("Топ по голосовому активу")
                    .setFooter(voiceTop.length > 49 ? { text: `И еще ${voiceTop.length - 50} участников` } : null)
                    .setDescription(`${voiceTop
                    .splice(0, 50)
                    .map((v, i) => {
                    return `${i + 1}. <@${v.discord_id}> —${v.discord_activity.voice > 3600 ? ` ${Math.floor(v.discord_activity.voice / 3600)} ч` : ""}${v.discord_activity.voice % 3600 > 60 ? ` ${Math.floor((v.discord_activity.voice % 3600) / 60)} м` : ""}`;
                })
                    .join("\n")
                    .slice(0, 2048)}`);
                return defferedReply.then((m) => interaction.editReply({ embeds: [msgEmbed, voiceEmbed] }));
            }
            default:
                await defferedReply;
                interaction.editReply("Base response");
                break;
        }
    },
};
