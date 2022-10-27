import { EmbedBuilder, ButtonStyle, ApplicationCommandOptionType, ButtonBuilder, ComponentType } from "discord.js";
import { auth_data, db, discord_activities, role_data } from "../handlers/sequelize.js";
import { Op } from "sequelize";
import { colors } from "../base/colors.js";
import { guildId } from "../base/ids.js";
import { CachedDestinyRecordDefinition } from "../handlers/manifestHandler.js";
import { rActivity, rRaids, rStats, rTitles, rTriumphs } from "../base/roles.js";
export default {
    name: "db",
    description: "Database",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "select",
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
                            description: "ROLE_ID or HASH",
                            required: true,
                        },
                    ],
                },
            ],
        },
    ],
    callback: async (client, interaction, member, _guild, _channel) => {
        const start = new Date().getTime();
        await interaction.deferReply({ ephemeral: true });
        const { options } = interaction;
        const Subcommand = options.getSubcommand();
        const id = options.getString("id") ? (options.getString("id") === "me" ? member.id : options.getString("id", true)) : [];
        switch (Subcommand) {
            case "select": {
                const middle = new Date().getTime();
                const request = await auth_data
                    .findOne({
                    where: { [Op.or]: [{ discord_id: id }, { bungie_id: id }] },
                    include: discord_activities,
                })
                    .catch((err) => {
                    return err;
                });
                if (!request || !request.discord_id) {
                    throw { name: "Запись не найдена" };
                }
                else if (request?.discord_id === undefined || request?.discord_id === null) {
                    throw { name: `Ошибка ${request?.code ? request.code : ""}`, message: request?.message ? request.message : "no message :(" };
                }
                const after = new Date().getTime();
                const embed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setAuthor({
                    name: `${request.displayname} (${request.discord_id})`,
                    iconURL: client.guilds.cache.get(guildId)?.members.cache.get(request.discord_id)?.displayAvatarURL(),
                })
                    .setFooter({
                    text: `Query took: ${after - middle}ms, full interaction: ${after - start}ms`,
                })
                    .addFields([
                    {
                        name: "bungieId",
                        value: `${request.platform + "/" + request.bungie_id}`,
                        inline: true,
                    },
                    { name: "clan", value: request.clan.toString(), inline: true },
                    {
                        name: "displayName",
                        value: request.displayname,
                        inline: true,
                    },
                    {
                        name: "membershipId",
                        value: `${request.membership_id}`,
                        inline: true,
                    },
                    {
                        name: "nameChangeStatus",
                        value: request.displayname.startsWith("⁣") ? "disabled" : "enabled",
                        inline: true,
                    },
                    {
                        name: "refreshToken",
                        value: request.refresh_token && request.refresh_token.length > 35 ? "cached" : `${request.refresh_token?.length.toString()}`,
                        inline: true,
                    },
                ]);
                if (request && request.discord_activity && request.discord_activity.messages >= 0) {
                    embed.addFields([{ name: "Сообщений отправлено", value: request.discord_activity.messages.toString(), inline: true }]);
                    embed.addFields([
                        {
                            name: "Времени в голосовых",
                            value: `${request.discord_activity.voice}с${request.discord_activity.voice > 60 ? ` = ${Math.trunc(request.discord_activity.voice / 60)}м` : ""}`,
                            inline: true,
                        },
                    ]);
                    embed.addFields([
                        {
                            name: "Пройдено данжей/рейдов с сокланами",
                            value: request.discord_activity.dungeons.toString() + "/" + request.discord_activity.raids.toString(),
                            inline: true,
                        },
                    ]);
                }
                interaction.editReply({ embeds: [embed] });
                break;
            }
            case "delete": {
                var request = await auth_data
                    .destroy({
                    where: { [Op.or]: [{ discord_id: id }, { bungie_id: id }] },
                })
                    .catch((err) => {
                    return err.parent;
                });
                if (request?.code === "22P02") {
                    throw { name: `Ошибка ${request.code}`, message: request.message };
                }
                const embed = new EmbedBuilder().setColor(colors.default).setAuthor({
                    name: `${request === 1 ? `Успех. Удалено ${request} строк` : `Удалено ${request} строк`}`,
                });
                interaction.editReply({ embeds: [embed] });
                break;
            }
            case "name_change": {
                auth_data
                    .findOne({
                    where: { discord_id: id },
                    attributes: ["displayname"],
                })
                    .then((data) => {
                    if (!data) {
                        const embed = new EmbedBuilder().setColor("Red").setTitle(`${id} not found in DB`);
                        return interaction.editReply({ embeds: [embed] });
                    }
                    if (data.displayname.startsWith("⁣")) {
                        auth_data
                            .update({
                            displayname: data.displayname.slice(1),
                        }, {
                            where: { displayname: data.displayname },
                        })
                            .then((_resp) => {
                            const embed = new EmbedBuilder().setColor("Green").setTitle(`Autonickname disabled for ${data.displayname}`);
                            interaction.editReply({ embeds: [embed] });
                        });
                    }
                    else if (!data.displayname.startsWith("⁣")) {
                        auth_data
                            .update({
                            displayname: `⁣${data.displayname}`,
                        }, { where: { displayname: data.displayname } })
                            .then((_resp) => {
                            const embed = new EmbedBuilder().setColor("Green").setTitle(`Autonickname enabled for ${data.displayname}`);
                            return interaction.editReply({ embeds: [embed] });
                        });
                    }
                });
                break;
            }
            case "add": {
                const hash = options.getInteger("hash", true);
                const roleId = options.getString("roleid");
                const record_manifest = await CachedDestinyRecordDefinition;
                const unique = options.getInteger("unique") || -99;
                if ((await record_manifest[hash]) === undefined) {
                    throw { name: "Триумф под таким хешем не найден", message: `Hash: ${hash}`, falseAlarm: true };
                }
                const db_query = await role_data.findOne({
                    where: { role_id: roleId },
                });
                const title = record_manifest[hash].titleInfo.hasTitle;
                const guildableTitle = title ? (record_manifest[hash].titleInfo.gildingTrackingRecordHash !== undefined ? true : false) : false;
                let title_name = title
                    ? guildableTitle
                        ? "⚜️" + record_manifest[hash].titleInfo.titlesByGender[0]
                        : record_manifest[hash].titleInfo.titlesByGender[0]
                    : record_manifest[hash].displayProperties.name;
                let category = db_query ? db_query.category : title ? 3 : options.getInteger("category") || 4;
                const embed = new EmbedBuilder().setColor(colors.default);
                if (db_query) {
                    embed.setTitle(`Дополнение существующей авто-роли`);
                    embed.setDescription(`Добавление условия ${hash} к <@&${db_query.role_id}>`);
                }
                else {
                    embed.setTitle(`Создание авто-роли`);
                }
                if (record_manifest[hash].displayProperties.hasIcon) {
                    embed.setThumbnail(`https://www.bungie.net${record_manifest[hash].displayProperties.icon}`);
                }
                if (title_name) {
                    embed.addFields({
                        name: "Название",
                        value: title_name,
                        inline: true,
                    });
                }
                if (title && !db_query) {
                    category = 3;
                    embed.addFields({
                        name: "Категория",
                        value: String(category),
                        inline: true,
                    });
                }
                else {
                    embed.addFields({
                        name: "Категория",
                        value: String(db_query?.category || category),
                        inline: true,
                    });
                }
                if (record_manifest[hash].displayProperties.description) {
                    embed.addFields({
                        name: "Описание роли",
                        value: await record_manifest[hash].displayProperties.description,
                    });
                }
                if (unique && unique >= 1) {
                    embed.addFields({ name: "Лимит пользователей", value: unique.toString() });
                }
                const components = [
                    new ButtonBuilder().setCustomId("db_roles_add_confirm").setLabel("Создать").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("db_roles_add_change_name")
                        .setLabel("Изменить название")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(db_query?.role_id ? true : false),
                    new ButtonBuilder().setCustomId("db_roles_add_cancel").setLabel("Отменить").setStyle(ButtonStyle.Danger),
                ];
                await interaction.editReply({
                    embeds: [embed],
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: components,
                        },
                    ],
                });
                const interactionUId = interaction.user.id;
                const collector = interaction.channel?.createMessageComponentCollector({
                    time: 50000,
                    max: 5,
                    filter: (interaction) => interaction.user.id == interactionUId,
                });
                collector
                    .on("collect", async (collected) => {
                    if (!collected.deferred)
                        await collected.deferUpdate().catch((e) => console.log(e));
                    if (collected.customId === "db_roles_add_cancel") {
                        interaction.editReply({ components: [], embeds: [], content: "Отменено" });
                        collector.stop("Canceled");
                    }
                    else if (collected.customId === "db_roles_add_confirm") {
                        let role, embed, guildedRoles = [];
                        if (!db_query?.role_id) {
                            role = await interaction.guild.roles.create({
                                name: guildableTitle ? title_name.slice(1) : title_name,
                                reason: "Creating auto-role",
                                position: interaction.guild.roles.cache.get(category === 5
                                    ? rActivity.category
                                    : category === 4
                                        ? rTriumphs.category
                                        : category === 3
                                            ? rTitles.category
                                            : category === 1
                                                ? rStats.category
                                                : rRaids.roles[0].roleId).position || undefined,
                            });
                            if (guildableTitle) {
                                guildedRoles.push((await interaction.guild.roles.create({
                                    name: title_name + " 1",
                                    reason: "Creating guildable auto-role",
                                    position: role.position,
                                    color: "#ffb300",
                                })).id);
                            }
                        }
                        else {
                            role = member.guild.roles.cache.get(String(db_query.role_id));
                        }
                        if (!db_query) {
                            try {
                                if (guildableTitle) {
                                    await role_data.create({
                                        hash: `{${hash}}`,
                                        role_id: role.id,
                                        category: category,
                                        guilded_hash: record_manifest[hash].titleInfo.gildingTrackingRecordHash,
                                        guilded_roles: `{${guildedRoles.toString()}}`,
                                        unique: unique,
                                    });
                                }
                                else {
                                    await role_data.create({
                                        hash: `{${hash}}`,
                                        role_id: role.id,
                                        category: category,
                                        unique: unique,
                                    });
                                }
                            }
                            catch (e) {
                                const errorEmbed = new EmbedBuilder().setColor("Red").setTitle(`Ошибка ${e.parent.name}`).setDescription(e.parent.detail);
                                interaction.editReply({ embeds: [errorEmbed], components: [] });
                                collector.stop("error");
                                role.delete("Got error during creation");
                                return;
                            }
                            embed = new EmbedBuilder()
                                .setColor("Green")
                                .addFields([{ name: "Роль была создана", value: `<@&${role.id}>${guildedRoles.length > 0 ? `, <@&${guildedRoles[0]}>` : ""}` }]);
                        }
                        else {
                            var newHash = db_query.hash;
                            newHash.push(String(hash));
                            await role_data.update({
                                hash: `{${newHash.toString()}}`,
                            }, {
                                where: { role_id: db_query.role_id },
                            });
                            embed = new EmbedBuilder().setColor("Green").addFields([{ name: "Требования к роли были дополнены", value: `<@&${role.id}>` }]);
                        }
                        collector.stop("Completed");
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
                            interaction.fetchReply().then((m) => {
                                const embed = m.embeds[0];
                                embed.fields[0].value = `${msg.cleanContent}`;
                                title_name = guildableTitle ? "⚜️" + msg.cleanContent : msg.cleanContent;
                                interaction.editReply({ embeds: [embed] });
                            });
                        });
                    }
                })
                    .on("end", () => {
                    interaction.editReply({
                        components: [],
                    });
                });
                break;
            }
            case "fetch": {
                const data = await role_data.findAll();
                const embed = new EmbedBuilder().setColor(colors.default).setTitle("Auto roles");
                for (let i = 0; i < data.length; i++) {
                    const d = data[i];
                    embed.addFields({
                        name: `Hash: ${d.hash}`,
                        value: `Role: <@&${d.role_id}>`,
                        inline: true,
                    });
                    if (embed.data.fields?.length === 25 || i === data.length - 1) {
                        if (i === 24) {
                            await interaction.editReply({ embeds: [embed] });
                            embed.setTitle(null).spliceFields(0, 25);
                        }
                        else {
                            await interaction.followUp({ embeds: [embed], ephemeral: true });
                            embed.spliceFields(0, 25);
                        }
                    }
                }
                if (data.length === 0) {
                    embed.setDescription("There are no auto-roles");
                    interaction.editReply({ embeds: [embed] });
                    break;
                }
                break;
            }
            case "remove": {
                const removeroleid = options.getString("removeroleid", true);
                const t = await db.transaction();
                var selectQuery = await role_data.findOne({ where: { [Op.or]: [{ role_id: removeroleid }, { hash: `{${removeroleid}}` }] }, transaction: t });
                if (interaction.guild?.roles.cache.has(removeroleid)) {
                    var query = await role_data.destroy({ where: { role_id: removeroleid }, transaction: t });
                }
                else {
                    var query = await role_data.destroy({
                        where: { hash: "{" + removeroleid + "}" },
                        transaction: t,
                    });
                }
                await t.commit();
                if (query) {
                    const embed = new EmbedBuilder().setColor("Green").setTitle(`Удалена ${query} авто-роль`);
                    const fetchedRole = selectQuery ? interaction.guild.roles.cache.get(String(selectQuery.role_id)) : undefined;
                    selectQuery ? embed.addFields({ name: `Hash: ${selectQuery.hash}`, value: fetchedRole ? `Role: ${fetchedRole.name}` : "Role not found" }) : "";
                    fetchedRole ? fetchedRole.delete("Deleting auto-role") : [];
                    interaction.editReply({ embeds: [embed] });
                }
                else {
                    throw { name: `Удалено ${query} авто-ролей`, message: `Hash: ${removeroleid}` };
                }
                break;
            }
        }
    },
};
