import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { raidSelectionOptions } from "../configs/Raids.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { Command } from "../structures/command.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { getRaidDetails } from "../utils/general/raidFunctions.js";
import { completedRaidsData } from "../utils/persistence/dataStore.js";
const CLAN_MEMBER_ROLE = process.env.CLANMEMBER;
function generateRaidClears(raidUserData) {
    const raids = [
        { id: "ce", label: "КК" },
        { id: "ron", label: "ИК" },
        { id: "kf", label: "ГК" },
        { id: "votd", label: "КП" },
        { id: "vog", label: "ХЧ" },
        { id: "dsc", label: "СГК" },
        { id: "gos", label: "СС" },
        { id: "lw", label: "ПЖ" },
    ];
    return raids
        .filter((raid) => raidUserData[raid.id] > 0)
        .map((raid) => `${raidUserData[raid.id]}${raidUserData[raid.id + "Master"] > 0 ? `(${raidUserData[raid.id + "Master"]})` : ""} ${raid.label}`);
}
function formatRaidUserData(discordId) {
    const raidUserData = completedRaidsData.get(discordId);
    if (!raidUserData)
        return "нет данных по закрытиям";
    const member = client.getCachedMembers().get(discordId);
    if (!member)
        return "Неизвестный пользователь";
    const raidClears = generateRaidClears(raidUserData);
    const cleanedName = nameCleaner(member.displayName);
    return `**${cleanedName}**${raidClears.length > 0
        ? `: ${raidClears.join(", ")}`
        : raidUserData?.totalRaidClears === 0
            ? " не проходил ранее рейды"
            : " не проходил доступные на данный момент рейды"}`;
}
async function sendEmbed({ deferredReply, embedIndex, interaction, raidDescription, selectedRaid }) {
    const embed = new EmbedBuilder()
        .setColor(colors.default)
        .setTitle(`Новички в ${getRaidDetails(selectedRaid).raidName}`)
        .setDescription(raidDescription);
    await deferredReply;
    if (embedIndex === 0) {
        await interaction.editReply({ embeds: [embed] }).catch(async (e) => {
            console.error("[Error code: 1702]", e);
            await interaction.followUp({ embeds: [embed], ephemeral: true });
        });
    }
    else {
        await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
}
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
        const clanMembers = [];
        const otherMembers = [];
        for (const [key, value] of completedRaidsData.entries()) {
            if (value[selectedRaid] + (value[selectedRaid + "Master"] || 0) === 0) {
                const member = client.getCachedMembers().get(key);
                if (!member)
                    continue;
                const raidRole = getRaidDetails(selectedRaid).requiredRole || client.getCachedGuild().roles.everyone.id;
                if (!member.roles.cache.has(raidRole))
                    continue;
                if (member.roles.cache.has(CLAN_MEMBER_ROLE)) {
                    clanMembers.push(key);
                }
                else {
                    otherMembers.push(key);
                }
            }
        }
        const allNoviceMembers = [...clanMembers, ...otherMembers];
        const maxLength = 2048;
        const raidClearsList = allNoviceMembers.map((userId, index) => `${index + 1}. ${formatRaidUserData(userId)}`);
        if (raidClearsList.length > 0) {
            let currentDescription = "";
            let embedIndex = 0;
            for (let i = 0; i < raidClearsList.length; i++) {
                const raidClear = raidClearsList[i];
                if (currentDescription.length + raidClear.length + 5 > maxLength) {
                    await sendEmbed({
                        deferredReply,
                        embedIndex,
                        interaction,
                        raidDescription: currentDescription,
                        selectedRaid,
                    });
                    currentDescription = "";
                    embedIndex = embedIndex + 1;
                }
                currentDescription += raidClear + "\n";
            }
            if (currentDescription.length > 0) {
                sendEmbed({ deferredReply, embedIndex, interaction, raidDescription: currentDescription, selectedRaid });
            }
        }
        else {
            const noNovicesText = "Похоже, в этот рейд нет новичков без закрытий";
            sendEmbed({ deferredReply, embedIndex: 0, interaction, raidDescription: noNovicesText, selectedRaid });
        }
    },
});
export default SlashCommand;
//# sourceMappingURL=sherpas.js.map