import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import openai from "../../structures/OpenAI.js";
import { Command } from "../../structures/command.js";
import calculateVoteResults from "../../utils/discord/twitterTranslationVotes.js";
import { convertSeconds } from "../../utils/general/convertSeconds.js";
import { AuthData, UserActivityData } from "../../utils/persistence/sequelize.js";
export default new Command({
    name: "scripts",
    description: "Script system",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "script",
            description: "script",
            required: true,
        },
    ],
    run: async ({ client, interaction, args }) => {
        const defferedReply = interaction.deferReply({ ephemeral: true });
        const scriptId = args.getString("script", true).toLowerCase();
        switch (scriptId) {
            case "resolvevotes": {
                await calculateVoteResults();
                const embed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setAuthor({ name: "Голоса успешно обработаны", iconURL: icons.success });
                await defferedReply;
                interaction.editReply({ embeds: [embed] });
                return;
            }
            case "getmodels": {
                const request = await openai.listModels();
                console.debug(request.data.data);
                return;
            }
            case "checkrole": {
                const members = client
                    .getCachedMembers()
                    .filter((r) => r.roles.cache.has(process.env.MEMBER) && !r.roles.cache.has(process.env.VERIFIED));
                const usersInDatabase = await AuthData.findAll({ attributes: ["discordId"] });
                const discordIdsInDatabase = usersInDatabase.map((user) => user.discordId);
                for (const [id, member] of members) {
                    const hasVerifiedRole = member.roles.cache.has(process.env.VERIFIED);
                    if (hasVerifiedRole) {
                        if (!discordIdsInDatabase.includes(member.id)) {
                            await member.roles.remove(process.env.MEMBER);
                            await member.roles.add(process.env.NEWBIE);
                            console.debug(`Removed verified role from ${member.displayName || member.user.username}`);
                        }
                    }
                }
                return;
            }
            case "activitytop": {
                const dbData = (await AuthData.findAll({ include: UserActivityData, attributes: ["displayName", "discordId"] })).filter((v) => v.UserActivityData && (v.UserActivityData.messages > 0 || v.UserActivityData.voice > 0));
                const usersWithoutData = dbData.filter((v) => !v.UserActivityData);
                if (usersWithoutData.length > 0) {
                    console.error(`[Error code: 1730]`, usersWithoutData);
                }
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
                    .setFooter(voiceTop.length > 50 ? { text: `И еще ${voiceTop.length - 50} участников` } : null)
                    .setDescription(`${voiceTop
                    .splice(0, 50)
                    .map((v, i) => {
                    return `${i + 1}. <@${v.discordId}> — ${convertSeconds(v.UserActivityData.voice)}`;
                })
                    .join("\n")
                    .slice(0, 2048)}`);
                await defferedReply;
                await interaction.editReply({ embeds: [msgEmbed, voiceEmbed] });
                return;
            }
            default:
                await defferedReply;
                await interaction.editReply("Base response");
                break;
        }
    },
});
//# sourceMappingURL=scriptsCommand.js.map