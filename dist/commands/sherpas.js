import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { raidSelectionOptions } from "../configs/Raids.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { Command } from "../structures/command.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { getRaidDetails } from "../utils/general/raidFunctions.js";
import { completedRaidsData } from "../utils/persistence/dataStore.js";
const SlashCommand = new Command({
    name: "новички",
    nameLocalizations: { "en-GB": "sherpas", "en-US": "sherpas" },
    description: "Список новичков, которые никогда не ходили в те или иные рейды",
    descriptionLocalizations: {
        "en-GB": "List of newbies who have never gone on certain raids",
        "en-US": "List of newbies who have never gone on certain raids",
    },
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "рейд",
            nameLocalizations: { "en-GB": "raid", "en-US": "raid" },
            description: "Выберите рейд, новичков на который ищем",
            descriptionLocalizations: {
                "en-GB": "Select the raid to which you are looking for newbies",
                "en-US": "Select the raid to which you are looking for newbies",
            },
            required: true,
            choices: raidSelectionOptions,
        },
    ],
    run: async ({ interaction, args }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const selectedRaid = args.getString("рейд", true);
        const noviceRaidList = {};
        noviceRaidList[selectedRaid] = [];
        for (const [key, value] of completedRaidsData) {
            if (value[selectedRaid] + (value[selectedRaid + "Master"] || 0) === 0) {
                const member = client.getCachedMembers().get(key);
                if (!member) {
                    console.error(`[Error code: 1692] No member ${key}`);
                    continue;
                }
                const raidRole = getRaidDetails(selectedRaid).requiredRole || client.getCachedGuild().roles.everyone.id;
                const hasRaidRole = member.roles.cache.has(raidRole);
                if (hasRaidRole === false)
                    continue;
                noviceRaidList[selectedRaid].push(key);
            }
        }
        async function formatRaidUserData(discordId) {
            const raidUserData = completedRaidsData.get(discordId);
            if (!raidUserData)
                return "нет данных по закрытиям";
            const member = client.getCachedMembers().get(discordId);
            const raidClears = [];
            if (raidUserData.ce > 0)
                raidClears.push(`${raidUserData.ce} КК`);
            if (raidUserData.ron > 0)
                raidClears.push(`${raidUserData.ron}${raidUserData.ronMaster > 0 ? `(${raidUserData.ronMaster})` : ""} ИК`);
            if (raidUserData.kf > 0)
                raidClears.push(`${raidUserData.kf}${raidUserData.kfMaster > 0 ? `(${raidUserData.kfMaster})` : ""} ГК`);
            if (raidUserData.votd > 0)
                raidClears.push(`${raidUserData.votd}${raidUserData.votdMaster > 0 ? `(${raidUserData.votdMaster})` : ""} КП`);
            if (raidUserData.vog > 0)
                raidClears.push(`${raidUserData.vog}${raidUserData.vogMaster > 0 ? `(${raidUserData.vogMaster})` : ""} ХЧ`);
            if (raidUserData.dsc > 0)
                raidClears.push(`${raidUserData.dsc} СГК`);
            if (raidUserData.gos > 0)
                raidClears.push(`${raidUserData.gos} СС`);
            if (raidUserData.lw > 0)
                raidClears.push(`${raidUserData.lw} ПЖ`);
            const memberDisplayName = member && member.id
                ? nameCleaner((client.getCachedMembers().get(member.id) || (await client.getAsyncMember(member.id))).displayName)
                : "Неизвстный пользователь";
            return ` **${memberDisplayName}** ${raidClears.length > 0
                ? `завершил: ${raidClears.join(", ")}`
                : raidUserData?.totalRaidClears === 0
                    ? "не проходил ранее рейды"
                    : "не проходил доступные на данный момент рейды"}`;
        }
        async function sendEmbed(raidEmbedData, embedCountIndex = 0) {
            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle(`Новички в ${getRaidDetails(selectedRaid).raidName}`)
                .setDescription(raidEmbedData);
            await deferredReply;
            if (embedCountIndex === 0) {
                await interaction.editReply({ embeds: [embed] }).catch(async (e) => {
                    console.error("[Error code: 1702]", e);
                    await interaction.followUp({ embeds: [embed], ephemeral: true });
                });
            }
            else {
                await interaction.followUp({ embeds: [embed], ephemeral: true });
            }
        }
        const maxLength = 2048;
        const raidClearsList = await noviceRaidList[selectedRaid].map(async (userId, index) => {
            const raidDataClears = await formatRaidUserData(userId);
            return `${index + 1}.${raidDataClears}`;
        });
        if (raidClearsList.length > 0) {
            let currentDescription = "";
            let embedIndex = 0;
            raidClearsList.forEach(async (raidClear) => {
                if (currentDescription.length + raidClear.length + 1 > maxLength) {
                    await sendEmbed(currentDescription, embedIndex);
                    currentDescription = "";
                    embedIndex++;
                }
                currentDescription += raidClear + "\n";
            });
            if (currentDescription.length > 0) {
                await sendEmbed(currentDescription, embedIndex);
            }
        }
        else {
            const noNovicesText = "Похоже, в этот рейд нет новичков без закрытий";
            await sendEmbed(noNovicesText);
        }
    },
});
export default SlashCommand;
//# sourceMappingURL=sherpas.js.map