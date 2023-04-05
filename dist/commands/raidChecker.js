import { ApplicationCommandOptionType, ChatInputCommandInteraction, EmbedBuilder, UserContextMenuCommandInteraction } from "discord.js";
import colors from "../configs/colors.js";
import { Command } from "../structures/command.js";
import { fetchRequest } from "../utils/api/fetchRequest.js";
import { CachedDestinyActivityDefinition } from "../utils/api/manifestHandler.js";
import { AuthData } from "../utils/persistence/sequelize.js";
export default new Command({
    name: "закрытия_рейдов",
    nameLocalizations: {
        "en-US": "raid_checker",
        "en-GB": "raid_checker",
    },
    description: "Статистика закрытых рейдов на каждом классе",
    descriptionLocalizations: {
        "en-US": "Statistics of completed raid on each character",
        "en-GB": "Statistics of completed raid on each character",
    },
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: "пользователь",
            nameLocalizations: { "en-US": "user", "en-GB": "user" },
            description: "Укажите искомого пользователя",
            descriptionLocalizations: { "en-US": "Select the user", "en-GB": "Select the user" },
        },
        {
            type: ApplicationCommandOptionType.Boolean,
            name: "все_активности",
            nameLocalizations: { "en-US": "all_activities", "en-GB": "all_activities" },
            description: "Проверить все пройденные активности",
            descriptionLocalizations: { "en-US": "Check all completed activities", "en-GB": "Check all completed activities" },
        },
    ],
    run: async ({ interaction }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const user = interaction instanceof ChatInputCommandInteraction ? interaction.options.getUser("пользователь") : interaction.targetUser;
        const db_data = await AuthData.findOne({
            where: { discordId: user ? user.id : interaction.user.id },
            attributes: ["bungieId", "platform", "accessToken"],
        });
        if (db_data === null) {
            if (interaction instanceof UserContextMenuCommandInteraction ||
                interaction.options.getUser("пользователь")?.id !== interaction.user.id) {
                throw { name: `Выбранный пользователь не зарегистрирован` };
            }
            throw { name: "Эта команда доступна после регистрации" };
        }
        const characters_list = await fetchRequest(`Platform/Destiny2/${db_data.platform}/Profile/${db_data.bungieId}/?components=200`, db_data);
        if (!characters_list || !characters_list?.characters?.data)
            throw { name: "Произошла ошибка со стороны Bungie" };
        const manifest = interaction instanceof ChatInputCommandInteraction && interaction.options.getBoolean("все_активности") === true
            ? CachedDestinyActivityDefinition
            : Object.keys(CachedDestinyActivityDefinition).reduce(function (acc, val) {
                if (CachedDestinyActivityDefinition[Number(val)].activityTypeHash === 2043403989)
                    acc[Number(val)] = CachedDestinyActivityDefinition[Number(val)];
                return acc;
            }, {});
        const arr = [];
        Object.keys(manifest).forEach(async (key) => {
            arr.push({
                activity: key,
                acitivty_name: manifest[key].displayProperties.name,
                clears: 0,
            });
        });
        const characters = Object.keys(characters_list.characters.data);
        const activity_map = new Map();
        const set = [
            [
                new Map(),
                characters_list.characters.data[characters[0]]?.classHash === 671679327
                    ? "<:hunter:995496474978824202>"
                    : characters_list.characters.data[characters[0]]?.classHash === 2271682572
                        ? "<:warlock:995496471526920232>"
                        : "<:titan:995496472722284596>",
            ],
            [
                new Map(),
                characters_list.characters.data[characters[1]]?.classHash === 671679327
                    ? "<:hunter:995496474978824202>"
                    : characters_list.characters.data[characters[1]]?.classHash === 2271682572
                        ? "<:warlock:995496471526920232>"
                        : "<:titan:995496472722284596>",
            ],
            [
                new Map(),
                characters_list.characters.data[characters[2]]?.classHash === 671679327
                    ? "<:hunter:995496474978824202>"
                    : characters_list.characters.data[characters[2]]?.classHash === 2271682572
                        ? "<:warlock:995496471526920232>"
                        : "<:titan:995496472722284596>",
            ],
        ];
        await Promise.all(characters.map(async (character, index) => {
            const { activities: activity_fresh } = await fetchRequest(`Platform/Destiny2/${db_data.platform}/Account/${db_data.bungieId}/Character/${character}/Stats/AggregateActivityStats/`, db_data);
            if (!activity_fresh)
                throw { name: "Произошла ошибка со стороны Bungie" };
            arr.forEach(async (activity_data) => {
                const clears = activity_fresh.filter((d) => d.activityHash === Number(activity_data.activity))[0]?.values.activityCompletions
                    .basic.value;
                if (clears !== undefined && clears >= 1) {
                    activity_map.set(activity_data.acitivty_name, {
                        activity: activity_data.acitivty_name,
                    });
                    if (set[index][0].has(activity_data.acitivty_name)) {
                        set[index][0].set(activity_data.acitivty_name, {
                            clears: clears +
                                set[index][0].get(activity_data.acitivty_name)?.clears,
                        });
                    }
                    else {
                        set[index][0].set(activity_data.acitivty_name, {
                            clears: clears,
                        });
                    }
                }
            });
        }));
        const embed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle(interaction instanceof ChatInputCommandInteraction && interaction.options.getBoolean("все_активности") === true
            ? "Статистика закрытх активностей по классам"
            : "Статистка закрытых рейдов по классам")
            .setFooter({ text: "Удаленные персонажи не проверяются" });
        interaction instanceof UserContextMenuCommandInteraction
            ? embed.setAuthor({
                name: interaction.guild?.members.cache.get(interaction.targetId)?.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "") ||
                    interaction.targetUser.username,
                iconURL: interaction.targetUser.displayAvatarURL(),
            })
            : [];
        const embed_map = new Map([...activity_map].sort());
        let replied = false, i = 0;
        const e = embed;
        embed_map.forEach(async (_activity_name, key) => {
            i++;
            if (embed.data.fields?.length === 25) {
                if (i === 26) {
                    await deferredReply;
                    interaction.editReply({ embeds: [e] });
                    e.data.fields = [];
                    e.data.footer = undefined;
                    e.data.title = undefined;
                    replied = true;
                }
                else {
                    interaction.followUp({ embeds: [e], ephemeral: true });
                    e.data.fields = [];
                }
            }
            try {
                embed.addFields([
                    {
                        name: key || "blankNameOrNameNotFound",
                        value: `${set[0][0]?.get(key)?.clears
                            ? set[0][1] + " " + set[0][0]?.get(key)?.clears
                            : ""} ${set[1][0]?.get(key)?.clears
                            ? set[1][1] + " " + set[1][0]?.get(key)?.clears
                            : ""} ${set[2][0]?.get(key)?.clears
                            ? set[2][1] + " " + set[2][0]?.get(key)?.clears
                            : ""}`,
                    },
                ]);
            }
            catch (e) {
                console.error(`Error during addin RaidEvent to embed raidChecker`, e.stack);
            }
        });
        if (embed.data.fields?.length === 0)
            embed.setDescription("Нет данных по закрытым рейдам\nВозможно, пользователь не закрыл ни одного рейда");
        await deferredReply;
        !replied
            ? interaction.editReply({ embeds: [embed] }).catch((e) => {
                console.error(e);
                interaction.editReply({ content: "Ошибка :(" });
            })
            : interaction.followUp({ embeds: [embed], ephemeral: true });
    },
});
