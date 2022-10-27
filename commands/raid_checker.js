import { ApplicationCommandOptionType, ChatInputCommandInteraction, EmbedBuilder, UserContextMenuCommandInteraction } from "discord.js";
import { auth_data } from "../handlers/sequelize.js";
import { fetchRequest } from "../handlers/webHandler.js";
import { CachedDestinyActivityDefinition } from "../handlers/manifestHandler.js";
export default {
    name: "raid_checker",
    nameLocalizations: {
        ru: "закрытия_рейдов",
    },
    options: [
        { type: ApplicationCommandOptionType.User, name: "пользователь", description: "Укажите искомого пользователя" },
        {
            type: ApplicationCommandOptionType.Boolean,
            name: "nonraidchecker",
            description: "Проверить абсолютно все активности в игре?",
            nameLocalizations: { ru: "проверка_не_рейдов" },
        },
    ],
    description: "Статистика по рейдам",
    type: [true, true, false],
    callback: async (_client, interaction, _member, _guild, _channel) => {
        await interaction.deferReply({ ephemeral: true });
        const user = interaction instanceof ChatInputCommandInteraction ? interaction.options.getUser("пользователь") : interaction.targetUser;
        const db_data = await auth_data.findOne({
            where: { discord_id: user ? user.id : interaction.user.id },
            attributes: ["bungie_id", "platform", "access_token"],
        });
        if (db_data === null) {
            if (interaction instanceof UserContextMenuCommandInteraction || interaction.options.getUser("пользователь")?.id !== interaction.user.id) {
                throw { name: `Выбранный пользователь не зарегистрирован` };
            }
            throw { name: "Эта команда доступна после регистрации" };
        }
        const characters_list = await fetchRequest(`Platform/Destiny2/${db_data.platform}/Profile/${db_data.bungie_id}/?components=200`, db_data);
        const manifest = interaction instanceof ChatInputCommandInteraction && interaction.options.getBoolean("nonraidchecker") === true
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
            const { activities: activity_fresh } = await fetchRequest(`Platform/Destiny2/${db_data.platform}/Account/${db_data.bungie_id}/Character/${character}/Stats/AggregateActivityStats/`, db_data);
            arr.forEach(async (activity_data) => {
                const clears = activity_fresh.filter((d) => d.activityHash === Number(activity_data.activity))[0]?.values.activityCompletions.basic
                    .value;
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
            .setColor("Green")
            .setTitle(interaction instanceof ChatInputCommandInteraction && interaction.options.getBoolean("nonraidchecker") === true
            ? "Статистика закрытх активностей по классам"
            : "Статистка закрытых рейдов по классам")
            .setTimestamp()
            .setFooter({ text: "Удаленные персонажи не проверяются" });
        interaction instanceof UserContextMenuCommandInteraction
            ? embed.setAuthor({
                name: interaction.guild?.members.cache.get(interaction.targetId)?.displayName || interaction.targetUser.username,
                iconURL: interaction.targetUser.displayAvatarURL(),
            })
            : [];
        const embed_map = new Map([...activity_map].sort());
        let replied = false, i = 0;
        const e = embed;
        embed_map.forEach((_activity_name, key) => {
            i++;
            if (embed.data.fields?.length === 25) {
                if (i === 26) {
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
                console.error(`Error during addin raids to embed raidChecker`, e.stack);
            }
        });
        !replied
            ? interaction.editReply({ embeds: [embed] }).catch((e) => {
                console.error(e);
                interaction.editReply({ content: "Ошибка :(" });
            })
            : interaction.followUp({ embeds: [embed], ephemeral: true });
    },
};
