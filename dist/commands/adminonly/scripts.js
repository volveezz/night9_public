import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { Command } from "../../structures/command.js";
import { convertSeconds } from "../../utils/general/convertSeconds.js";
import { AuthData, UserActivityData } from "../../utils/persistence/sequelize.js";
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
                    return `${i + 1}. <@${v.discordId}> — ${convertSeconds(v.UserActivityData.voice)}`;
                })
                    .join("\n")
                    .slice(0, 2048)}`);
                return (await defferedReply) && interaction.editReply({ embeds: [msgEmbed, voiceEmbed] });
            }
            default:
                (await defferedReply) && interaction.editReply("Base response");
                break;
        }
    },
});
