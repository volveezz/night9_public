import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { StatsButton } from "../configs/Buttons.js";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import { apiStatus } from "../structures/apiStatus.js";
import { fetchRequest } from "../utils/api/fetchRequest.js";
import { CachedDestinyMilestoneDefinition, CachedDestinyProgressionDefinition } from "../utils/api/manifestHandler.js";
import { addButtonComponentsToMessage } from "../utils/general/addButtonsToMessage.js";
import { AuthData } from "../utils/persistence/sequelize.js";
export default {
    name: "statsEvent",
    async run({ interaction }) {
        if (interaction.customId !== StatsButton.oldEvents && interaction.customId !== StatsButton.pinnacle)
            return;
        if (apiStatus.status !== 1) {
            throw { errorType: UserErrors.API_UNAVAILABLE };
        }
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const footerText = interaction.message.embeds[0]?.footer?.text || "";
        const id = footerText.slice(4) || interaction.user.id;
        const userData = await AuthData.findOne({
            where: { discordId: id },
            attributes: ["bungieId", "platform", "accessToken"],
        });
        if (!userData) {
            const isSelf = id === interaction.user.id || id === "";
            throw { errorType: UserErrors.DB_USER_NOT_FOUND, errorData: { isSelf } };
        }
        const { platform, bungieId } = userData;
        switch (interaction.customId) {
            case StatsButton.oldEvents: {
                const data = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/?components=202`, userData);
                const factions = data.characterProgressions?.data?.[Object.keys(data.characterProgressions.data)[0]].factions || {};
                const dataFact = Object.entries(factions)
                    .filter(([_, faction]) => faction.progressionHash)
                    .map(([_, { factionHash, progressionHash, currentProgress, level, levelCap }]) => ({
                    factionHash,
                    progressionHash,
                    currentProgress,
                    level,
                    levelCap,
                }));
                const embedFields = dataFact.slice(0, 25).map(({ factionHash, progressionHash, currentProgress, level, levelCap }) => {
                    const embedName = CachedDestinyProgressionDefinition[progressionHash]?.displayProperties?.name ||
                        CachedDestinyProgressionDefinition[progressionHash]?.displayProperties?.displayUnitsName ||
                        "blank";
                    const isTrialsOfTheNine = progressionHash === 3468066401;
                    const value = `${currentProgress} очков, ${level} ранг${levelCap !== -1 ? ` / ${levelCap}` : []}`;
                    return { name: isTrialsOfTheNine ? "Испытания девяти" : embedName, value, inline: true };
                });
                const embed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setFooter({ text: `Id: ${interaction.user.id}` })
                    .addFields(...embedFields);
                await deferredReply;
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            case StatsButton.pinnacle: {
                const data = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/?components=200,202`, userData);
                if (!data.characterProgressions.data) {
                    throw { name: "Ошибка", description: "Не найти данные об ваших персонажах" };
                }
                const chars = [];
                const components = [];
                const charKeys = Object.keys(data.characters.data || {});
                charKeys.forEach((charKey, i) => {
                    const char = data.characters.data?.[charKey];
                    if (!char)
                        return;
                    const classHash = char.classHash;
                    const label = classHash === 671679327 ? "Охотник" : classHash === 2271682572 ? "Варлок" : "Титан";
                    components[i] = new ButtonBuilder({
                        style: classHash === 671679327 ? ButtonStyle.Primary : classHash === 2271682572 ? ButtonStyle.Secondary : ButtonStyle.Danger,
                        label,
                        customId: `statsEvent_pinnacle_char_${i}`,
                    });
                    chars[i] = label;
                });
                if (chars.length === 0)
                    chars.push("персонажи отсутствуют");
                const embed = new EmbedBuilder()
                    .setTitle("Выберите персонажа")
                    .setDescription(chars.join("\n") || "nothing")
                    .setColor(colors.serious);
                await deferredReply;
                const int = await interaction.editReply({ embeds: [embed], components: await addButtonComponentsToMessage(components) });
                const collector = int.channel.createMessageComponentCollector({
                    message: int,
                    filter: ({ user }) => user.id === interaction.user.id,
                });
                collector.on("collect", async (collected) => {
                    collected.deferUpdate();
                    const characterId = Object.keys(data.characterProgressions.data)[Number(collected.customId.slice(-1))];
                    const characterMilestones = data.characterProgressions.data[characterId].milestones;
                    const storedMilestones = [];
                    Object.entries(characterMilestones).forEach(([k, milestone]) => {
                        if (!milestone.rewards || milestone.rewards[0].rewardCategoryHash !== 326786556)
                            return;
                        storedMilestones.push({
                            milestoneHash: milestone.milestoneHash,
                            endDate: new Date(milestone.endDate || Date.now()).getTime(),
                            rewards: milestone.rewards,
                        });
                    });
                    const embed = new EmbedBuilder().setColor(colors.success).setFooter({ text: `Id: ${id}` });
                    const curDate = Date.now();
                    storedMilestones.forEach((mile) => {
                        if (curDate > mile.endDate)
                            return;
                        mile.rewards.forEach((reward) => {
                            reward.entries.forEach((subRew) => {
                                if (subRew.redeemed === true)
                                    return;
                                if (embed.data.fields && embed.data.fields.length >= 25)
                                    return;
                                embed.addFields({
                                    name: `${CachedDestinyMilestoneDefinition[mile.milestoneHash].displayProperties.name}\n${CachedDestinyMilestoneDefinition[mile.milestoneHash].displayProperties.description}`,
                                    value: `Условие ${subRew.earned ? "выполнено" : "не выполнено"}${!subRew.redeemed && subRew.earned ? ", но не получено" : ""}`,
                                });
                            });
                        });
                    });
                    if (storedMilestones.length === 0) {
                        embed.setTitle("Все испытания на сверхмощное снаряжение пройдены");
                    }
                    else {
                        embed.setTitle("Испытания на сверхмощное снаряжение");
                    }
                    await interaction.editReply({ embeds: [embed], components: [] });
                });
                return;
            }
        }
    },
};
