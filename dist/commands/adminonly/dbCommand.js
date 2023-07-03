import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Op } from "sequelize";
import NightRoleCategory from "../../configs/RoleCategory.js";
import UserErrors from "../../configs/UserErrors.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { activityRoles, raidRoles } from "../../configs/roles.js";
import { longOffline, userTimezones } from "../../core/userStatisticsManagement.js";
import { Command } from "../../structures/command.js";
import { CachedDestinyRecordDefinition } from "../../utils/api/manifestHandler.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import { convertSeconds } from "../../utils/general/convertSeconds.js";
import { completedRaidsData } from "../../utils/general/destinyActivityChecker.js";
import { AuthData, AutoRoleData, UserActivityData, database } from "../../utils/persistence/sequelize.js";
export default new Command({
    name: "db",
    description: "Database",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "select",
            nameLocalizations: { "en-US": "get", "en-GB": "get" },
            description: "SELECT",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "id",
                    description: "id",
                    required: true,
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "delete",
            description: "DELETE",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "id",
                    description: "id",
                    required: true,
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "name_change",
            description: "NAME CHANGE",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "id",
                    description: "id",
                    required: true,
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.SubcommandGroup,
            name: "role",
            description: "ROLE",
            options: [
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "add",
                    description: "ADD",
                    options: [
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "hash",
                            description: "HASH",
                            required: true,
                        },
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "roleid",
                            description: "ROLE ID",
                        },
                        {
                            type: ApplicationCommandOptionType.Integer,
                            name: "category",
                            description: "ROLE CATEGORY",
                            choices: [
                                {
                                    name: "Top",
                                    value: 0,
                                },
                                {
                                    name: "Stats",
                                    value: NightRoleCategory.Stats,
                                },
                                {
                                    name: "Titles",
                                    value: NightRoleCategory.Titles,
                                },
                                {
                                    name: "Triumphs",
                                    value: NightRoleCategory.Triumphs,
                                },
                                {
                                    name: "Activity",
                                    value: NightRoleCategory.Activity,
                                },
                            ],
                        },
                        {
                            type: ApplicationCommandOptionType.Integer,
                            name: "unique",
                            description: "Unique limit",
                            minValue: -99,
                            maxValue: 1000,
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "fetch",
                    description: "Fetch",
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "remove",
                    description: "Remove",
                    options: [
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "removeroleid",
                            description: "Id of role or it hash",
                            required: true,
                        },
                    ],
                },
            ],
        },
    ],
    run: async ({ client, interaction, args }) => {
        const member = interaction.member || client.getCachedMembers().get(interaction.user.id);
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const subcommand = args.getSubcommand();
        const id = args.getString("id") ? (args.getString("id") === "me" ? member.id : args.getString("id", true)) : "";
        switch (subcommand) {
            case "select": {
                const benchmarkStart = client.uptime;
                const request = await AuthData.findOne({
                    attributes: ["discordId", "bungieId", "platform", "clan", "displayName", "refreshToken", "membershipId", "timezone"],
                    where: { [Op.or]: [{ discordId: id }, { bungieId: id }] },
                    include: UserActivityData,
                });
                if (!request || !request.discordId) {
                    await deferredReply;
                    const isSelf = id === interaction.user.id || id === "";
                    throw { errorType: UserErrors.DB_USER_NOT_FOUND, errorData: { isSelf } };
                }
                const benchmarkEnd = client.uptime;
                const raidClears = completedRaidsData.get(request.discordId);
                const embed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setFooter({
                    text: `Запрос занял: ${benchmarkEnd - benchmarkStart}мс`,
                })
                    .setDescription(`> ${(userTimezones.get(request.discordId) ?? "Timezone not cached").toString()} | ${request.timezone} <@${request.discordId}>${raidClears ? ` - ${Object.values(raidClears)}` : ""}`)
                    .addFields([
                    {
                        name: "BungieId",
                        value: `${request.platform}/${request.bungieId}`,
                        inline: true,
                    },
                    { name: "Clan", value: request.clan ? "Участник клана" : "Вне клана", inline: true },
                    {
                        name: "DisplayName",
                        value: request.displayName,
                        inline: true,
                    },
                    {
                        name: "MembershipId",
                        value: `[${request.membershipId}](https://www.bungie.net/7/ru/User/Profile/254/${request.membershipId})`,
                        inline: true,
                    },
                    {
                        name: "NameChangeStatus",
                        value: request.displayName.startsWith("⁣") ? "disabled" : "enabled",
                        inline: true,
                    },
                    {
                        name: "RefreshToken",
                        value: request.refreshToken && request.refreshToken.length > 35 ? "Cached" : `${request.refreshToken?.length}`,
                        inline: true,
                    },
                ]);
                if (request.UserActivityData && request.UserActivityData.messages != null) {
                    embed.addFields([
                        { name: "Сообщений отправлено", value: `${request.UserActivityData.messages}`, inline: true },
                        {
                            name: "Времени в голосовых",
                            value: `${convertSeconds(request.UserActivityData.voice)}`,
                            inline: true,
                        },
                        {
                            name: "Пройдено рейдов/дажней",
                            value: `${request.UserActivityData.raids}/${request.UserActivityData.dungeons}`,
                            inline: true,
                        },
                    ]);
                }
                if (longOffline.has(request.discordId))
                    embed.addFields([{ name: "LongOffline", value: "Включен", inline: true }]);
                (await deferredReply) && interaction.editReply({ embeds: [embed] });
                if (userTimezones.get(request.discordId) === undefined && request.timezone !== undefined && request.timezone !== null)
                    userTimezones.set(request.discordId, request.timezone);
                return;
            }
            case "delete": {
                const request = await AuthData.destroy({
                    where: { [Op.or]: [{ discordId: id }, { bungieId: id }] },
                    limit: 1,
                });
                const embed = new EmbedBuilder().setColor(colors.success).setAuthor({
                    name: `${request === 1 ? `Успех. Удалено ${request} строк` : `Удалено ${request} строк`}`,
                    iconURL: icons.success,
                });
                (await deferredReply) && interaction.editReply({ embeds: [embed] });
                return;
            }
            case "name_change": {
                const data = await AuthData.findOne({
                    where: { discordId: id },
                    attributes: ["displayName"],
                });
                if (!data) {
                    const embed = new EmbedBuilder().setColor(colors.error).setTitle(`${id} not found in DB`);
                    await deferredReply;
                    return interaction.editReply({ embeds: [embed] });
                }
                if (!data.displayName.startsWith("⁣")) {
                    await AuthData.update({
                        displayName: data.displayName.replace("⁣", ""),
                    }, {
                        where: { displayName: data.displayName },
                    });
                    const embed = new EmbedBuilder().setColor(colors.success).setTitle(`Autonickname disabled for ${data.displayName}`);
                    await deferredReply;
                    return interaction.editReply({ embeds: [embed] });
                }
                else if (data.displayName.startsWith("⁣")) {
                    await AuthData.update({
                        displayName: `⁣${data.displayName}`,
                    }, { where: { displayName: data.displayName } });
                    const embed = new EmbedBuilder().setColor(colors.success).setTitle(`Autonickname enabled for ${data.displayName}`);
                    await deferredReply;
                    return interaction.editReply({ embeds: [embed] });
                }
                return;
            }
            case "add": {
                const hash = args.getString("hash", true);
                const roleId = args.getString("roleid");
                const unique = args.getInteger("unique") ?? -99;
                const recordDefinition = CachedDestinyRecordDefinition[Number(hash)];
                if (!recordDefinition)
                    throw { name: "Триумф под таким хешем не найден", description: `Hash: ${hash}` };
                const databaseRoleData = roleId !== null
                    ? await AutoRoleData.findOne({
                        where: { roleId: roleId },
                    })
                    : null;
                const title = recordDefinition.titleInfo.hasTitle;
                const guildableTitle = title ? (recordDefinition.titleInfo.gildingTrackingRecordHash ? true : false) : false;
                let titleName = title
                    ? guildableTitle
                        ? "⚜️" + recordDefinition.titleInfo.titlesByGender.Male
                        : recordDefinition.titleInfo.titlesByGender.Male
                    : recordDefinition.displayProperties.name;
                const category = databaseRoleData
                    ? databaseRoleData.category
                    : title
                        ? NightRoleCategory.Titles
                        : args.getInteger("category") ?? NightRoleCategory.Triumphs;
                const embed = new EmbedBuilder().setColor(colors.default);
                if (databaseRoleData) {
                    embed.setTitle("Дополнение существующей авто-роли");
                    embed.setDescription(`Добавление условия ${hash} к <@&${databaseRoleData.roleId}>`);
                }
                else {
                    embed.setTitle("Создание авто-роли");
                }
                if (recordDefinition.displayProperties.hasIcon) {
                    embed.setThumbnail(`https://www.bungie.net${recordDefinition.displayProperties.icon}`);
                }
                if (titleName) {
                    embed.addFields({
                        name: "Название",
                        value: titleName,
                        inline: true,
                    });
                }
                embed.addFields({
                    name: "Категория",
                    value: `${databaseRoleData?.category ?? category ?? NightRoleCategory.Titles}`,
                    inline: true,
                });
                if (unique && unique >= 1) {
                    embed.addFields({ name: "Лимит пользователей", value: unique.toString(), inline: true });
                }
                if (recordDefinition.displayProperties.description) {
                    embed.addFields({
                        name: "Описание роли",
                        value: recordDefinition.displayProperties.description,
                    });
                }
                const components = [
                    new ButtonBuilder().setCustomId("db_roles_add_confirm").setLabel("Создать").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("db_roles_add_change_name")
                        .setLabel("Изменить название")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(databaseRoleData?.roleId ? true : false),
                    new ButtonBuilder().setCustomId("db_roles_add_cancel").setLabel("Отменить").setStyle(ButtonStyle.Danger),
                ];
                await deferredReply;
                const interactionReply = await interaction.editReply({
                    embeds: [embed],
                    components: await addButtonsToMessage(components),
                });
                const collector = interactionReply.createMessageComponentCollector({
                    time: 60 * 2 * 1000,
                    filter: (int) => interaction.user.id == int.user.id,
                });
                collector
                    .on("collect", async (collected) => {
                    if (!collected.deferred)
                        collected.deferUpdate();
                    if (collected.customId === "db_roles_add_cancel") {
                        (await deferredReply) && interaction.editReply({ components: [], embeds: [], content: "Отменено" });
                        collector.stop("Canceled");
                    }
                    else if (collected.customId === "db_roles_add_confirm") {
                        let role, embed, gildedRoles = [];
                        if (!databaseRoleData?.roleId) {
                            role = await interaction.guild.roles.create({
                                name: guildableTitle ? titleName.slice(1) : titleName,
                                reason: "Creating auto-role",
                                color: colors.default,
                                position: interaction.guild.roles.cache.get(category === NightRoleCategory.Activity
                                    ? activityRoles.category
                                    : category === NightRoleCategory.Triumphs
                                        ? process.env.TRIUMPHS_CATEGORY
                                        : category === NightRoleCategory.Titles
                                            ? process.env.TITLE_CATEGORY
                                            : category === NightRoleCategory.Stats
                                                ? process.env.STATISTICS_CATEGORY
                                                : raidRoles.roles[0].roleId)?.position ?? undefined,
                            });
                            if (guildableTitle) {
                                const guildedRole = await interaction.guild.roles.create({
                                    name: titleName + " 1",
                                    reason: "Creating guildable auto-role",
                                    position: role.position,
                                    color: "#ffb300",
                                });
                                gildedRoles.push(guildedRole.id);
                            }
                        }
                        else {
                            role = member.guild.roles.cache.get(databaseRoleData.roleId);
                        }
                        if (!databaseRoleData) {
                            try {
                                if (guildableTitle) {
                                    await AutoRoleData.create({
                                        triumphRequirement: hash,
                                        roleId: role.id,
                                        category: category,
                                        gildedTriumphRequirement: recordDefinition.titleInfo.gildingTrackingRecordHash,
                                        gildedRoles: gildedRoles,
                                        available: unique,
                                    });
                                }
                                else {
                                    await AutoRoleData.create({
                                        triumphRequirement: hash,
                                        roleId: role.id,
                                        category: category,
                                        available: unique,
                                    });
                                }
                            }
                            catch (e) {
                                const errorEmbed = new EmbedBuilder()
                                    .setColor(colors.error)
                                    .setTitle(`Ошибка ${e.parent.name}`)
                                    .setDescription(e.parent.detail);
                                await deferredReply;
                                interaction.editReply({ embeds: [errorEmbed], components: [] });
                                collector.stop("error");
                                role.delete("Got error during creation");
                                return;
                            }
                            embed = new EmbedBuilder().setColor(colors.success).addFields({
                                name: "Роль была создана",
                                value: `<@&${role.id}>${gildedRoles.length > 0 ? `, <@&${gildedRoles[0]}>` : ""}`,
                            });
                        }
                        else {
                            await AutoRoleData.update({
                                triumphRequirement: hash,
                            }, {
                                where: { roleId: databaseRoleData.roleId },
                            });
                            embed = new EmbedBuilder()
                                .setColor(colors.success)
                                .addFields([{ name: "Требования к роли были дополнены", value: `<@&${role.id}>` }]);
                        }
                        collector.stop("Completed");
                        await deferredReply;
                        await interaction.editReply({
                            embeds: [embed],
                            components: [],
                        });
                    }
                    else if (collected.customId === "db_roles_add_change_name") {
                        interaction.channel
                            ?.createMessageCollector({
                            time: 60 * 1000,
                            max: 1,
                            filter: (message) => message.author.id === interaction.user.id,
                        })
                            .on("collect", (msg) => {
                            msg.delete();
                            interaction.fetchReply().then(async (m) => {
                                const embed = m.embeds[0];
                                embed.fields[0].value = `${msg.cleanContent}`;
                                titleName = guildableTitle ? "⚜️" + msg.cleanContent : msg.cleanContent;
                                (await deferredReply) && interaction.editReply({ embeds: [embed] });
                            });
                        });
                    }
                })
                    .on("end", async () => {
                    (await deferredReply) &&
                        interaction.editReply({
                            components: [],
                        });
                });
                break;
            }
            case "fetch": {
                const dbQuery = await AutoRoleData.findAll({ attributes: ["triumphRequirement", "roleId"] });
                const embed = new EmbedBuilder().setColor(colors.default).setTitle("Auto roles");
                for (let i = 0; i < dbQuery.length; i++) {
                    const roleData = dbQuery[i];
                    embed.addFields({
                        name: `Hash: ${roleData.triumphRequirement}`,
                        value: `Role: <@&${roleData.roleId}>`,
                        inline: true,
                    });
                    if (embed.data.fields?.length === 25 || i === dbQuery.length - 1) {
                        if (i === 24) {
                            (await deferredReply) && (await interaction.editReply({ embeds: [embed] }));
                            embed.setTitle(null).spliceFields(0, 25);
                        }
                        else {
                            await interaction.followUp({ embeds: [embed], ephemeral: true });
                            embed.spliceFields(0, 25);
                        }
                    }
                }
                if (dbQuery.length === 0) {
                    embed.setDescription("There are no auto-roles");
                    (await deferredReply) && interaction.editReply({ embeds: [embed] });
                    return;
                }
                return;
            }
            case "remove": {
                const removeroleid = args.getString("removeroleid", true);
                const t = await database.transaction();
                const selectQuery = await AutoRoleData.findOne({
                    where: { [Op.or]: [{ roleId: removeroleid }, { triumphRequirement: removeroleid }] },
                    transaction: t,
                });
                if (interaction.guild?.roles.cache.has(removeroleid)) {
                    var query = await AutoRoleData.destroy({ where: { roleId: removeroleid }, transaction: t, limit: 1 });
                }
                else {
                    var query = await AutoRoleData.destroy({
                        where: { triumphRequirement: removeroleid },
                        transaction: t,
                        limit: 1,
                    });
                }
                await t.commit();
                if (query) {
                    const embed = new EmbedBuilder().setColor(colors.success).setTitle(`Удалена ${query} авто-роль`);
                    const fetchedRole = selectQuery ? interaction.guild.roles.cache.get(String(selectQuery.roleId)) : undefined;
                    selectQuery
                        ? embed.addFields({
                            name: `Hash: ${selectQuery.triumphRequirement}`,
                            value: fetchedRole ? `Role: ${fetchedRole.name}` : "Role not found",
                        })
                        : "";
                    fetchedRole ? fetchedRole.delete("Deleting auto-role") : [];
                    await deferredReply;
                    interaction.editReply({ embeds: [embed] });
                }
                else {
                    throw { name: `Удалено ${query} авто-ролей`, description: `Hash: ${removeroleid}` };
                }
                return;
            }
        }
    },
});
//# sourceMappingURL=dbCommand.js.map