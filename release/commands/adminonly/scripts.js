import { EmbedBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ComponentType, } from "discord.js";
import colors from "../../configs/colors.js";
import { statusRoles } from "../../configs/roles.js";
import { AuthData, UserActivityData } from "../../handlers/sequelize.js";
import { Command } from "../../structures/command.js";
export default new Command({
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
    run: async ({ interaction }) => {
        const defferedReply = interaction.deferReply();
        const scriptId = interaction.options.getString("script", true).toLowerCase();
        switch (scriptId) {
            case "rolesweeper": {
                const members = interaction.guild.members.cache.filter((m) => {
                    return ((m.roles.cache.has(statusRoles.member) || m.roles.cache.has(statusRoles.kicked)) &&
                        m.roles.cache.has(statusRoles.verified));
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
                const embed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle(`${updatedMembers.length} пользователей было обновлено из ${members.size}`);
                interaction.editReply({ embeds: [embed] });
                return;
            }
            case "activitytop": {
                const dbData = (await AuthData.findAll({ include: UserActivityData, attributes: ["displayName", "discordId"] })).filter((v) => v.UserActivityData && (v.UserActivityData.messages > 0 || v.UserActivityData.voice > 0));
                const messageTop = dbData
                    .filter((v) => v.UserActivityData.messages > 0)
                    .sort((a, b) => b.UserActivityData.messages - a.UserActivityData.messages);
                const voiceTop = dbData
                    .filter((v) => v.UserActivityData.voice > 0)
                    .sort((a, b) => b.UserActivityData.voice - a.UserActivityData.voice);
                const msgEmbed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle("Топ по текстовому активу")
                    .setFooter(messageTop.length > 50 ? { text: `И еще ${messageTop.length - 50} участников` } : null)
                    .setDescription(`${messageTop
                    .splice(0, 50)
                    .map((v, i) => {
                    return `${i + 1}. <@${v.discordId}> — ${v.UserActivityData.messages} ${v.UserActivityData.messages === 1 ? "сообщение" : "сообщений"}`;
                })
                    .join("\n")}`);
                const voiceEmbed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle("Топ по голосовому активу")
                    .setFooter(voiceTop.length > 49 ? { text: `И еще ${voiceTop.length - 50} участников` } : null)
                    .setDescription(`${voiceTop
                    .splice(0, 50)
                    .map((v, i) => {
                    return `${i + 1}. <@${v.discordId}> —${v.UserActivityData.voice > 3600 ? ` ${Math.floor(v.UserActivityData.voice / 3600)} ч` : ""}${v.UserActivityData.voice % 3600 > 60 ? ` ${Math.floor((v.UserActivityData.voice % 3600) / 60)} м` : ""}`;
                })
                    .join("\n")
                    .slice(0, 2048)}`);
                return defferedReply.then((m) => interaction.editReply({ embeds: [msgEmbed, voiceEmbed] }));
            }
            case "surveyrestart": {
                const embed = new EmbedBuilder().setColor(colors.default).setTitle("Начать опрос?");
                const components = [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            new ButtonBuilder().setCustomId("startSurvey_from_godChannel").setStyle(ButtonStyle.Success).setLabel("Начать"),
                        ],
                    },
                ];
                (await defferedReply) && interaction.editReply({ embeds: [embed], components });
                return;
            }
            default:
                await defferedReply;
                interaction.editReply("Base response");
                break;
        }
    },
});
