import { ButtonBuilder, EmbedBuilder, ButtonStyle, ComponentType } from "discord.js";
import { fetchRequest } from "../handlers/webHandler.js";
import { auth_data } from "../handlers/sequelize.js";
import { CachedDestinyMilestoneDefinition, CachedDestinyProgressionDefinition } from "../handlers/manifestHandler.js";
export default {
    callback: async (_client, interaction, _member, _guild, _channel) => {
        if (!interaction.isButton())
            return;
        if (interaction.customId === "statsEvent_old_events" || interaction.customId === "statsEvent_pinnacle") {
            await interaction.deferReply({ ephemeral: true });
            const id = interaction.message.embeds[0].footer?.text.slice(4);
            const userData = await auth_data.findOne({
                where: { discord_id: id || interaction.user.id },
                attributes: ["bungie_id", "platform", "access_token"],
            });
            if (!userData)
                throw { name: "Вы не зарегистрированы" };
            const { platform, bungie_id } = userData;
            switch (interaction.customId) {
                case "statsEvent_old_events": {
                    const data = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungie_id}/?components=202`, userData);
                    const dataFact = [];
                    const obj = data.characterProgressions.data[Object.keys(data.characterProgressions.data)[0]].factions;
                    Object.entries(obj).forEach(([k, faction]) => {
                        const { factionHash, progressionHash, currentProgress, level, levelCap } = faction;
                        dataFact.push({ factionHash, progressionHash, currentProgress, level, levelCap });
                    });
                    const embed = new EmbedBuilder()
                        .setColor("Green")
                        .setTimestamp()
                        .setFooter({ text: `Id: ${interaction.user.id}` });
                    dataFact.forEach((d) => {
                        if (embed.data.fields?.length >= 25)
                            return;
                        if (d.progressionHash === 3468066401) {
                            embed.addFields({
                                name: "Испытания девяти",
                                value: `${d.currentProgress} очков, ${d.level} ранг${d.levelCap !== -1 ? ` / ${d.levelCap}` : []}`,
                                inline: true,
                            });
                        }
                        else {
                            const embedName = CachedDestinyProgressionDefinition[d.progressionHash].displayProperties.name ||
                                CachedDestinyProgressionDefinition[d.progressionHash].displayProperties.displayUnitsName ||
                                "blank";
                            embed.addFields({
                                name: embedName,
                                value: `${d.currentProgress} очков, ${d.level} ранг${d.levelCap !== -1 ? ` / ${d.levelCap}` : []}`,
                                inline: true,
                            });
                        }
                    });
                    interaction.editReply({ embeds: [embed] });
                    break;
                }
                case "statsEvent_pinnacle": {
                    const data = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungie_id}/?components=200,202`, userData);
                    let chars = [];
                    const components = [];
                    const charKeys = Object.keys(data.characters.data);
                    charKeys.forEach((charKey, i) => {
                        const char = data.characters.data[charKey];
                        components[i] = new ButtonBuilder({
                            style: char.classHash === 671679327 ? ButtonStyle.Primary : char.classHash === 2271682572 ? ButtonStyle.Secondary : ButtonStyle.Danger,
                            label: char.classHash === 671679327 ? "Охотник" : char.classHash === 2271682572 ? "Варлок" : "Титан",
                            customId: `statsEvent_pinnacle_char_${i}`,
                        });
                        chars[i] = char.classHash === 671679327 ? "Охотник" : char.classHash === 2271682572 ? "Варлок" : "Титан";
                    });
                    chars.length === 0 ? (chars = ["персонажи отсутствуют"]) : [];
                    const embed = new EmbedBuilder().setTitle("Выберите персонажа").setDescription(chars.join("\n").toString()).setTimestamp().setColor("DarkGreen");
                    const int = await interaction.editReply({
                        embeds: [embed],
                        components: [{ type: ComponentType.ActionRow, components: components }],
                    });
                    const collector = int.createMessageComponentCollector({
                        filter: ({ user }) => user.id == interaction.user.id,
                    });
                    collector.on("collect", (collected) => {
                        const obj = data.characterProgressions.data[Object.keys(data.characterProgressions.data)[Number(collected.customId.slice(-1))]].milestones;
                        const dataMile = [];
                        Object.entries(obj).forEach(([k, milestone]) => {
                            if (!milestone.rewards || milestone.rewards[0].rewardCategoryHash !== 326786556)
                                return;
                            dataMile.push({
                                milestoneHash: milestone.milestoneHash,
                                endDate: new Date(milestone.endDate).getTime(),
                                rewards: milestone.rewards,
                            });
                        });
                        const embed = new EmbedBuilder()
                            .setColor("Green")
                            .setTimestamp()
                            .setFooter({ text: `Id: ${id}` });
                        const curDate = new Date().getTime();
                        dataMile.forEach((mile) => {
                            if (curDate > mile.endDate)
                                return;
                            mile.rewards.forEach((reward) => {
                                reward.entries.forEach((subRew) => {
                                    if (subRew.redeemed === true)
                                        return;
                                    if (embed.data.fields?.length >= 25)
                                        return;
                                    embed.addFields({
                                        name: `${CachedDestinyMilestoneDefinition[mile.milestoneHash].displayProperties.name +
                                            `\n` +
                                            CachedDestinyMilestoneDefinition[mile.milestoneHash].displayProperties.description}`,
                                        value: `Условие ${subRew.earned ? "выполнено" : "не выполнено"}${!subRew.redeemed && subRew.earned ? ", но не получено" : ""}`,
                                    });
                                });
                            });
                        });
                        interaction.editReply({ embeds: [embed], components: [] });
                    });
                    break;
                }
            }
        }
    },
};
