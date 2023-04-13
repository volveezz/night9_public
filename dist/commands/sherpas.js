import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { Command } from "../structures/command.js";
import { completedRaidsData } from "../utils/general/destinyActivityChecker.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { getRaidData } from "../utils/general/raidFunctions.js";
export default new Command({
    name: "sherpas",
    description: "Список новичков, которые никогда не ходили в те или иные рейды",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "рейд",
            description: "Выберите рейд, новичков на который ищем",
            required: true,
            choices: [
                { name: "Источник кошмаров", value: "ron" },
                { name: "Гибель короля", value: "kf" },
                { name: "Клятва послушника", value: "votd" },
                { name: "Хрустальный чертог", value: "vog" },
                { name: "Склеп Глубокого камня", value: "dsc" },
                { name: "Сад спасения", value: "gos" },
                { name: "Последнее желание", value: "lw" },
            ],
        },
    ],
    run: async ({ interaction, args }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const selectedRaid = args.getString("рейд", true);
        const noviceRaidList = {};
        noviceRaidList[selectedRaid] = [];
        for await (const [key, value] of completedRaidsData) {
            if (value[selectedRaid] + (value[selectedRaid + "Master"] || 0) === 0) {
                const member = client.getCachedMembers().get(key);
                if (!member)
                    return console.error(`[Error code: 1692] No member ${key}`);
                const raidRole = getRaidData(selectedRaid).requiredRole || client.getCachedGuild().roles.everyone.id;
                const hasRaidRole = member.roles.cache.has(raidRole);
                if (hasRaidRole === false)
                    return;
                noviceRaidList[selectedRaid].push(key);
            }
        }
        function formatRaidUserData(discordId) {
            const raidUserData = completedRaidsData.get(discordId);
            if (!raidUserData)
                return `нет данных по закрытиям`;
            const member = client.getCachedMembers().get(discordId);
            const raidClears = [];
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
            return ` **${nameCleaner(member?.displayName ||
                client.getCachedMembers().get(member?.id || "")?.displayName ||
                member?.user.username ||
                "Пользователь не на сервере", true)}** ${raidClears.length > 0
                ? `завершил: ${raidClears.join(", ")}`
                : raidUserData?.totalRaidCount === 0
                    ? `не проходил ранее рейды`
                    : `не проходил доступные на данный момент рейды`}`;
        }
        async function sendEmbed(raidEmbedData, index = 0) {
            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle(`Новички в ${getRaidData(selectedRaid).raidName}`)
                .setDescription(raidEmbedData);
            if (index === 0) {
                await deferredReply;
                await interaction.editReply({ embeds: [embed] });
            }
            else {
                await interaction.followUp({ embeds: [embed], ephemeral: true });
            }
        }
        const maxLength = 2048;
        const raidClearsList = await noviceRaidList[selectedRaid].map((userId, index) => {
            const raidDataClears = formatRaidUserData(userId);
            return `${index + 1}.${raidDataClears}`;
        });
        if (raidClearsList.length > 0) {
            let currentDescription = "";
            let embedIndex = 0;
            raidClearsList.forEach((raidClear) => {
                if (currentDescription.length + raidClear.length + 1 > maxLength) {
                    sendEmbed(currentDescription, embedIndex);
                    currentDescription = "";
                    embedIndex++;
                }
                currentDescription += raidClear + "\n";
            });
            if (currentDescription.length > 0) {
                sendEmbed(currentDescription, embedIndex);
            }
        }
        else {
            const noNovicesText = "Похоже, в этот рейд нет новичков без закрытий";
            sendEmbed(noNovicesText);
        }
    },
});