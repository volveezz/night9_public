import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { Button } from "../structures/button.js";
import { GetManifest } from "../utils/api/ManifestManager.js";
import { sendApiRequest } from "../utils/api/sendApiRequest.js";
import { getEndpointStatus } from "../utils/api/statusCheckers/statusTracker.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
import { convertModifiersPlaceholders } from "../utils/general/raidFunctions/convertModifiersPlaceholders.js";
import { AuthData } from "../utils/persistence/sequelizeModels/authData.js";
const ButtonCommand = new Button({
    name: "statsEvent",
    run: async ({ interaction }) => {
        if (interaction.customId !== "statsEvent_old_events" && interaction.customId !== "statsEvent_pinnacle")
            return;
        if (getEndpointStatus("account") !== 1) {
            throw { errorType: "API_UNAVAILABLE" };
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
            throw { errorType: "DB_USER_NOT_FOUND", errorData: { isSelf } };
        }
        const { platform, bungieId } = userData;
        switch (interaction.customId) {
            case "statsEvent_old_events": {
                const data = await sendApiRequest(`/Platform/Destiny2/${platform}/Profile/${bungieId}/?components=202`, userData);
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
                const progressionDefinition = await GetManifest("DestinyProgressionDefinition");
                const embedFields = dataFact.slice(0, 25).map(({ factionHash, progressionHash, currentProgress, level, levelCap }) => {
                    const embedName = progressionDefinition[progressionHash]?.displayProperties?.name ||
                        progressionDefinition[progressionHash]?.displayProperties?.displayUnitsName ||
                        "blank";
                    const isTrialsOfTheNine = progressionHash === 3468066401;
                    const value = `${currentProgress} очков, ${level} ранг${levelCap !== -1 ? `/${levelCap}` : []}`;
                    return { name: isTrialsOfTheNine ? "Испытания девяти" : embedName, value, inline: true };
                });
                const embed = new EmbedBuilder().setColor(colors.success).addFields(embedFields);
                await deferredReply;
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            case "statsEvent_pinnacle": {
                const data = await sendApiRequest(`/Platform/Destiny2/${platform}/Profile/${bungieId}/?components=200,202`, userData);
                if (!data.characterProgressions.data) {
                    throw { name: "Ошибка", description: "Не найти данные об ваших персонажах" };
                }
                const components = [];
                const charKeys = Object.keys(data.characters.data || {});
                let embedDescription = null;
                charKeys.forEach((charKey, i) => {
                    const character = data.characters.data?.[charKey];
                    if (!character)
                        return;
                    const { classHash } = character;
                    const emoji = classHash === 671679327
                        ? "<:hunter:995496474978824202>"
                        : classHash === 2271682572
                            ? "<:warlock:995496471526920232>"
                            : "<:titan:995496472722284596>";
                    const label = classHash === 671679327 ? "Охотник" : classHash === 2271682572 ? "Варлок" : "Титан";
                    components[i] = new ButtonBuilder({
                        style: ButtonStyle.Secondary,
                        label,
                        customId: `statsEvent_pinnacle_char_${i}`,
                        emoji,
                    });
                    if (!embedDescription) {
                        embedDescription = `${emoji} **${label}**`;
                    }
                    else {
                        embedDescription += `\n${emoji} **${label}**`;
                    }
                });
                if (!embedDescription)
                    embedDescription = "Персонажи отсутствуют";
                const embed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setAuthor({ name: "Выберите персонажа" })
                    .setDescription(embedDescription);
                await deferredReply;
                const int = await interaction.editReply({ embeds: [embed], components: addButtonsToMessage(components) });
                const collector = int.createMessageComponentCollector({
                    filter: ({ user }) => user.id === interaction.user.id,
                    time: 60 * 1000 * 2,
                    max: 1,
                    componentType: ComponentType.Button,
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
                    const embed = new EmbedBuilder().setColor(colors.success);
                    const curDate = Date.now();
                    const milestoneDefinition = await GetManifest("DestinyMilestoneDefinition");
                    storedMilestones.forEach((mile) => {
                        if (curDate > mile.endDate)
                            return;
                        mile.rewards.forEach((reward) => {
                            reward.entries.forEach((subRew) => {
                                if (subRew.redeemed === true || (embed.data.fields && embed.data.fields.length >= 25))
                                    return;
                                embed.addFields({
                                    name: convertModifiersPlaceholders(milestoneDefinition[mile.milestoneHash].displayProperties.name),
                                    value: convertModifiersPlaceholders(milestoneDefinition[mile.milestoneHash].displayProperties.description),
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
                collector.on("end", async (_, reason) => {
                    if (reason === "time") {
                        await interaction.deleteReply();
                    }
                });
                return;
            }
        }
    },
});
export default ButtonCommand;
//# sourceMappingURL=statsEvent.js.map