import { EmbedBuilder, ButtonStyle, ApplicationCommandOptionType, ButtonBuilder, ComponentType, } from "discord.js";
import { AuthData, database, UserActivityData, AutoRoleData } from "../../handlers/sequelize.js";
import { Op } from "sequelize";
import { Command } from "../../structures/command.js";
import colors from "../../configs/colors.js";
import { CachedDestinyRecordDefinition } from "../../functions/manifestHandler.js";
import { activityRoles, raidRoles, statisticsRoles, titleCategory, triumphsCategory } from "../../configs/roles.js";
import { completedRaidsData, longOffline } from "../../features/memberStatisticsHandler.js";
import convertSeconds from "../../functions/convertSeconds.js";
export default new Command({
    name: "db",
    description: "Database",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "select",
            nameLocalizations: { "en-US": "get" },
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
                            type: ApplicationCommandOptionType.Integer,
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
                                    value: 1,
                                },
                                {
                                    name: "Titles",
                                    value: 3,
                                },
                                {
                                    name: "Triumphs",
                                    value: 4,
                                },
                                {
                                    name: "Activity",
                                    value: 5,
                                },
                            ],
                        },
                        { type: ApplicationCommandOptionType.Integer, name: "unique", description: "unique limit", minValue: -99, maxValue: 1000 },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "fetch",
                    description: "FETCH",
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "remove",
                    description: "REMOVE",
                    options: [
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "removeroleid",
                            description: "roleId or HASH",
                            required: true,
                        },
                    ],
                },
            ],
        },
    ],
    run: async ({ client, interaction: CommandInteraction }) => {
        const interaction = CommandInteraction;
        const { options, member: APIMember } = interaction;
        const member = APIMember;
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const Subcommand = options.getSubcommand();
        const id = options.getString("id") ? (options.getString("id") === "me" ? member.id : options.getString("id", true)) : [];
        switch (Subcommand) {
            case "select": {
                const middle = client.uptime;
                const request = await AuthData.findOne({
                    attributes: ["discordId", "bungieId", "platform", "clan", "displayName", "refreshToken", "membershipId"],
                    where: { [Op.or]: [{ discordId: id }, { bungieId: id }] },
                    include: UserActivityData,
                });
                if (!request || !request.discordId)
                    throw { name: "Запись не найдена" };
                const after = client.uptime;
                const raidClears = completedRaidsData.get(request.discordId);
                const embed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setFooter({
                    text: `Query took: ${after - middle}ms`,
                })
                    .setDescription(`> <@${request.discordId}>${raidClears ? ` - ${Object.values(raidClears)}` : ""}`)
                    .addFields([
                    {
                        name: "bungieId",
                        value: `${request.platform}/${request.bungieId}`,
                        inline: true,
                    },
                    { name: "clan", value: request.clan ? "Участник клана" : "Вне клана", inline: true },
                    {
                        name: "displayName",
                        value: request.displayName,
                        inline: true,
                    },
                    {
                        name: "membershipId",
                        value: `[${request.membershipId}](https://www.bungie.net/7/ru/User/Profile/254/${request.membershipId})`,
                        inline: true,
                    },
                    {
                        name: "nameChangeStatus",
                        value: request.displayName.startsWith("⁣") ? "disabled" : "enabled",
                        inline: true,
                    },
                    {
                        name: "refreshToken",
                        value: request.refreshToken && request.refreshToken.length > 35 ? "cached" : `${request.refreshToken?.length.toString()}`,
                        inline: true,
                    },
                ]);
                if (request.UserActivityData && request.UserActivityData.messages >= 0) {
                    embed.addFields([
                        { name: "Сообщений отправлено", value: request.UserActivityData.messages.toString(), inline: true },
                        {
                            name: "Времени в голосовых",
                            value: `${convertSeconds(request.UserActivityData.voice)}`,
                            inline: true,
                        },
                        {
                            name: "Пройдено данжей/рейдов с сокланами",
                            value: request.UserActivityData.dungeons.toString() + "/" + request.UserActivityData.raids.toString(),
                            inline: true,
                        },
                    ]);
                }
                if (longOffline.has(request.discordId)) {
                    embed.addFields([{ name: "longOffline", value: "included", inline: true }]);
                }
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
                return;
            }
            case "delete": {
                const request = await AuthData.destroy({
                    where: { [Op.or]: [{ discordId: id }, { bungieId: id }] },
                });
                const embed = new EmbedBuilder().setColor(colors.default).setAuthor({
                    name: `${request === 1 ? `Успех. Удалено ${request} строк` : `Удалено ${request} строк`}`,
                });
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
                return;
            }
            case "name_change": {
                const data = await AuthData.findOne({
                    where: { discordId: id },
                    attributes: ["displayName"],
                });
                if (!data) {
                    const embed = new EmbedBuilder().setColor("Red").setTitle(`${id} not found in DB`);
                    await deferredReply;
                    return interaction.editReply({ embeds: [embed] });
                }
                if (data.displayName.startsWith("⁣")) {
                    await AuthData.update({
                        displayName: data.displayName.replace("⁣", ""),
                    }, {
                        where: { displayName: data.displayName },
                    });
                    const embed = new EmbedBuilder().setColor("Green").setTitle(`Autonickname disabled for ${data.displayName}`);
                    await deferredReply;
                    return interaction.editReply({ embeds: [embed] });
                }
                else if (!data.displayName.startsWith("⁣")) {
                    await AuthData.update({
                        displayName: `⁣${data.displayName}`,
                    }, { where: { displayName: data.displayName } });
                    const embed = new EmbedBuilder().setColor("Green").setTitle(`Autonickname enabled for ${data.displayName}`);
                    await deferredReply;
                    return interaction.editReply({ embeds: [embed] });
                }
                return;
            }
            case "add": {
                const hash = options.getInteger("hash", true);
                const roleId = options.getString("roleid");
                const unique = options.getInteger("unique") ?? -99;
                if (!CachedDestinyRecordDefinition[hash])
                    throw { name: "Триумф под таким хешем не найден", description: `Hash: ${hash}` };
                const db_query = roleId !== null
                    ? await AutoRoleData.findOne({
                        where: { roleId: roleId },
                    })
                    : null;
                const title = CachedDestinyRecordDefinition[hash].titleInfo.hasTitle;
                const guildableTitle = title ? (CachedDestinyRecordDefinition[hash].titleInfo.gildingTrackingRecordHash ? true : false) : false;
                let title_name = title
                    ? guildableTitle
                        ? "⚜️" + CachedDestinyRecordDefinition[hash].titleInfo.titlesByGender.Male
                        : CachedDestinyRecordDefinition[hash].titleInfo.titlesByGender.Male
                    : CachedDestinyRecordDefinition[hash].displayProperties.name;
                const category = db_query ? db_query.category : title ? 3 : options.getInteger("category") ?? 4;
                const embed = new EmbedBuilder().setColor(colors.default);
                if (db_query) {
                    embed.setTitle(`Дополнение существующей авто-роли`);
                    embed.setDescription(`Добавление условия ${hash} к <@&${db_query.roleId}>`);
                }
                else {
                    embed.setTitle(`Создание авто-роли`);
                }
                if (CachedDestinyRecordDefinition[hash].displayProperties.hasIcon) {
                    embed.setThumbnail(`https://www.bungie.net${CachedDestinyRecordDefinition[hash].displayProperties.icon}`);
                }
                if (title_name) {
                    embed.addFields({
                        name: "Название",
                        value: title_name,
                        inline: true,
                    });
                }
                embed.addFields({
                    name: "Категория",
                    value: String(db_query?.category ?? category ?? 3),
                    inline: true,
                });
                if (unique && unique >= 1) {
                    embed.addFields({ name: "Лимит пользователей", value: unique.toString(), inline: true });
                }
                if (CachedDestinyRecordDefinition[hash].displayProperties.description) {
                    embed.addFields({
                        name: "Описание роли",
                        value: CachedDestinyRecordDefinition[hash].displayProperties.description,
                    });
                }
                const components = [
                    new ButtonBuilder().setCustomId("db_roles_add_confirm").setLabel("Создать").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("db_roles_add_change_name")
                        .setLabel("Изменить название")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(db_query?.roleId ? true : false),
                    new ButtonBuilder().setCustomId("db_roles_add_cancel").setLabel("Отменить").setStyle(ButtonStyle.Danger),
                ];
                await deferredReply;
                const interactionReply = await interaction.editReply({
                    embeds: [embed],
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: components,
                        },
                    ],
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
                        await deferredReply;
                        interaction.editReply({ components: [], embeds: [], content: "Отменено" });
                        collector.stop("Canceled");
                    }
                    else if (collected.customId === "db_roles_add_confirm") {
                        let role, embed, gildedRoles = [];
                        if (!db_query?.roleId) {
                            role = await interaction.guild.roles.create({
                                name: guildableTitle ? title_name.slice(1) : title_name,
                                reason: "Creating auto-role",
                                color: colors.default,
                                position: interaction.guild.roles.cache.get(category === 5
                                    ? activityRoles.category
                                    : category === 4
                                        ? triumphsCategory
                                        : category === 3
                                            ? titleCategory
                                            : category === 1
                                                ? statisticsRoles.category
                                                : raidRoles.roles[0].roleId)?.position ?? undefined,
                            });
                            if (guildableTitle) {
                                gildedRoles.push((await interaction.guild.roles.create({
                                    name: title_name + " 1",
                                    reason: "Creating guildable auto-role",
                                    position: role.position,
                                    color: "#ffb300",
                                })).id);
                            }
                        }
                        else {
                            role = member.guild.roles.cache.get(String(db_query.roleId));
                        }
                        if (!db_query) {
                            try {
                                if (guildableTitle) {
                                    await AutoRoleData.create({
                                        triumphRequirement: hash,
                                        roleId: role.id,
                                        category: category,
                                        gildedTriumphRequirement: CachedDestinyRecordDefinition[hash].titleInfo.gildingTrackingRecordHash,
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
                                const errorEmbed = new EmbedBuilder().setColor("Red").setTitle(`Ошибка ${e.parent.name}`).setDescription(e.parent.detail);
                                await deferredReply;
                                interaction.editReply({ embeds: [errorEmbed], components: [] });
                                collector.stop("error");
                                role.delete("Got error during creation");
                                return;
                            }
                            embed = new EmbedBuilder()
                                .setColor("Green")
                                .addFields([
                                { name: "Роль была создана", value: `<@&${role.id}>${gildedRoles.length > 0 ? `, <@&${gildedRoles[0]}>` : ""}` },
                            ]);
                        }
                        else {
                            await AutoRoleData.update({
                                triumphRequirement: hash,
                            }, {
                                where: { roleId: db_query.roleId },
                            });
                            embed = new EmbedBuilder()
                                .setColor("Green")
                                .addFields([{ name: "Требования к роли были дополнены", value: `<@&${role.id}>` }]);
                        }
                        collector.stop("Completed");
                        await deferredReply;
                        interaction.editReply({
                            embeds: [embed],
                            components: [],
                        });
                    }
                    else if (collected.customId === "db_roles_add_change_name") {
                        interaction.channel
                            ?.createMessageCollector({
                            time: 15 * 1000,
                            max: 1,
                            filter: (message) => message.author.id === interaction.user.id,
                        })
                            .on("collect", (msg) => {
                            msg.delete();
                            interaction.fetchReply().then(async (m) => {
                                const embed = m.embeds[0];
                                embed.fields[0].value = `${msg.cleanContent}`;
                                title_name = guildableTitle ? "⚜️" + msg.cleanContent : msg.cleanContent;
                                await deferredReply;
                                interaction.editReply({ embeds: [embed] });
                            });
                        });
                    }
                })
                    .on("end", async () => {
                    await deferredReply;
                    interaction.editReply({
                        components: [],
                    });
                });
                break;
            }
            case "fetch": {
                const dbQuery = await AutoRoleData.findAll({ attributes: ["hash", "roleId"] });
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
                            await deferredReply;
                            await interaction.editReply({ embeds: [embed] });
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
                    await deferredReply;
                    interaction.editReply({ embeds: [embed] });
                    return;
                }
                return;
            }
            case "remove": {
                const removeroleid = options.getString("removeroleid", true);
                const t = await database.transaction();
                const selectQuery = await AutoRoleData.findOne({
                    where: { [Op.or]: [{ roleId: removeroleid }, { triumphRequirement: removeroleid }] },
                    transaction: t,
                });
                if (interaction.guild?.roles.cache.has(removeroleid)) {
                    var query = await AutoRoleData.destroy({ where: { roleId: removeroleid }, transaction: t });
                }
                else {
                    var query = await AutoRoleData.destroy({
                        where: { triumphRequirement: removeroleid },
                        transaction: t,
                    });
                }
                await t.commit();
                if (query) {
                    const embed = new EmbedBuilder().setColor("Green").setTitle(`Удалена ${query} авто-роль`);
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