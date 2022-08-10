"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const sequelize_1 = require("../handlers/sequelize");
const sequelize_2 = require("sequelize");
const colors_1 = require("../base/colors");
const ids_1 = require("../base/ids");
const manifestHandler_1 = require("../handlers/manifestHandler");
exports.default = {
    name: "db",
    description: "Database",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "select",
            description: "SELECT",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "id",
                    description: "id",
                    required: true,
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "delete",
            description: "DELETE",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "id",
                    description: "id",
                    required: true,
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "name_change",
            description: "NAME CHANGE",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "id",
                    description: "id",
                    required: true,
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.SubcommandGroup,
            name: "role",
            description: "ROLE",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
                    name: "add",
                    description: "ADD",
                    options: [
                        {
                            type: discord_js_1.ApplicationCommandOptionType.Integer,
                            name: "hash",
                            description: "HASH",
                            required: true,
                        },
                        {
                            type: discord_js_1.ApplicationCommandOptionType.String,
                            name: "roleId",
                            description: "ROLE ID",
                        },
                        {
                            type: discord_js_1.ApplicationCommandOptionType.Integer,
                            name: "category",
                            description: "ROLE CATEGORY",
                            choices: [
                                {
                                    name: "Top",
                                    value: 0,
                                },
                                {
                                    name: "PVE Stats",
                                    value: 1,
                                },
                                {
                                    name: "PVP Stats",
                                    value: 2,
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
                    ],
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
                    name: "fetch",
                    description: "FETCH",
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
                    name: "remove",
                    description: "REMOVE",
                    options: [
                        {
                            type: discord_js_1.ApplicationCommandOptionType.String,
                            name: "id",
                            description: "ROLE_ID or HASH",
                            required: true,
                        },
                    ],
                },
            ],
        },
    ],
    callback: (client, interaction, member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        yield interaction.deferReply({ ephemeral: true });
        const start = new Date().getTime();
        const { options } = interaction;
        const Subcommand = options.getSubcommand();
        const id = options.getString("id") === "me" ? member.id : options.getSubcommandGroup() !== "role" ? options.getString("id", true) : [];
        switch (Subcommand) {
            case "select": {
                const middle = new Date().getTime();
                const request = yield sequelize_1.auth_data
                    .findOne({
                    where: { [sequelize_2.Op.or]: [{ discord_id: id }, { bungie_id: id }] },
                })
                    .catch((err) => {
                    return err.parent;
                });
                if (request && (request === null || request === void 0 ? void 0 : request.code) !== "22P02") {
                    var response = request.toJSON();
                }
                else if (request === null) {
                    const embed = new discord_js_1.EmbedBuilder().setColor("Red").setTitle(`Запись не найдена`);
                    interaction.editReply({ embeds: [embed] });
                    break;
                }
                else {
                    const embed = new discord_js_1.EmbedBuilder().setColor("Red").setTitle(`Ошибка ${request.code}`).setDescription(`${request.message}`);
                    interaction.editReply({ embeds: [embed] });
                    break;
                }
                const after = new Date().getTime();
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_1.colors.default)
                    .setAuthor({
                    name: `${response.displayname} (${response.discord_id})`,
                    iconURL: (_b = (_a = client.guilds.cache.get(ids_1.guildId)) === null || _a === void 0 ? void 0 : _a.members.cache.get(response.discord_id)) === null || _b === void 0 ? void 0 : _b.displayAvatarURL(),
                })
                    .setFooter({
                    text: `Query took: ${after - middle}ms, full interaction: ${after - start}ms`,
                })
                    .addFields([
                    {
                        name: "bungieId",
                        value: String(response.platform + "/" + response.bungie_id),
                        inline: true,
                    },
                    { name: "clan", value: String(response.clan), inline: true },
                    {
                        name: "displayName",
                        value: String(response.displayname),
                        inline: true,
                    },
                    {
                        name: "membershipId",
                        value: String(response.membership_id),
                        inline: true,
                    },
                    {
                        name: "nameChangeStatus",
                        value: String(response.displayname.startsWith("⁣") ? "enabled" : "disabled"),
                        inline: true,
                    },
                    {
                        name: "refreshToken",
                        value: String(response.refresh_token.length > 35 ? "cached" : response.refresh_token.length),
                        inline: true,
                    },
                ]);
                interaction.editReply({ embeds: [embed] });
                break;
            }
            case "delete": {
                var request = yield sequelize_1.auth_data
                    .destroy({
                    where: { [sequelize_2.Op.or]: [{ discord_id: id }, { bungie_id: id }] },
                })
                    .catch((err) => {
                    return err.parent;
                });
                if ((request === null || request === void 0 ? void 0 : request.code) === "22P02") {
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor("Red")
                        .setAuthor({ name: `Ошибка ${request.code}` })
                        .setDescription(`${request.message}`);
                    interaction.editReply({ embeds: [embed] });
                    break;
                }
                const embed = new discord_js_1.EmbedBuilder().setColor(colors_1.colors.default).setAuthor({
                    name: `${request === 1 ? `Успех. Удалено ${request} строк` : `Удалено ${request} строк`}`,
                });
                interaction.editReply({ embeds: [embed] });
                break;
            }
            case "name_change": {
                sequelize_1.auth_data
                    .findOne({
                    where: { discord_id: id },
                    attributes: ["displayname"],
                })
                    .then((data) => {
                    if (!data) {
                        const embed = new discord_js_1.EmbedBuilder().setColor("Red").setTitle(`${id} not found in DB`);
                        return interaction.editReply({ embeds: [embed] });
                    }
                    if (data.displayname.startsWith("⁣")) {
                        sequelize_1.auth_data
                            .update({
                            displayname: data.displayname.slice(1),
                        }, {
                            where: { displayname: data.displayname },
                        })
                            .then((_resp) => {
                            const embed = new discord_js_1.EmbedBuilder().setColor("Green").setTitle(`Autonickname disabled for ${data.displayname}`);
                            interaction.editReply({ embeds: [embed] });
                        });
                    }
                    else if (!data.displayname.startsWith("⁣")) {
                        sequelize_1.auth_data
                            .update({
                            displayname: `⁣${data.displayname}`,
                        }, { where: { displayname: data.displayname } })
                            .then((_resp) => {
                            const embed = new discord_js_1.EmbedBuilder().setColor("Green").setTitle(`Autonickname enabled for ${data.displayname}`);
                            return interaction.editReply({ embeds: [embed] });
                        });
                    }
                });
                break;
            }
            case "add": {
                const hash = options.getInteger("hash", true);
                const roleId = options.getString("roleId");
                const record_manifest = yield manifestHandler_1.DestinyRecordDefinition;
                if ((yield record_manifest[hash]) === undefined) {
                    throw { name: "Триумф под таким хешем не найден", message: `Hash: ${hash}`, falseAlarm: true };
                }
                const db_query = yield sequelize_1.role_data.findOne({
                    where: { role_id: roleId },
                });
                const title = record_manifest[hash].titleInfo.hasTitle;
                if (title) {
                    var title_name = record_manifest[hash].titleInfo.titlesByGender.Male;
                }
                else {
                    var title_name = record_manifest[hash].displayProperties.name;
                }
                var category = db_query ? db_query.category : title ? 3 : options.getInteger("category") || 4;
                const embed = new discord_js_1.EmbedBuilder().setColor(colors_1.colors.default);
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
                    embed.addFields([
                        {
                            name: "Название",
                            value: title_name,
                            inline: true,
                        },
                    ]);
                }
                if (title && !db_query) {
                    category = 3;
                    embed.addFields([
                        {
                            name: "Категория",
                            value: String(category),
                            inline: true,
                        },
                    ]);
                }
                else {
                    embed.addFields([
                        {
                            name: "Категория",
                            value: String((db_query === null || db_query === void 0 ? void 0 : db_query.category) || category),
                            inline: true,
                        },
                    ]);
                }
                if (record_manifest[hash].displayProperties.description) {
                    embed.addFields([
                        {
                            name: "Описание роли",
                            value: yield record_manifest[hash].displayProperties.description,
                        },
                    ]);
                }
                const components = [
                    new discord_js_1.ButtonBuilder().setCustomId("db_roles_add_confirm").setLabel("Создать").setStyle(discord_js_1.ButtonStyle.Primary),
                    new discord_js_1.ButtonBuilder()
                        .setCustomId("db_roles_add_change_name")
                        .setLabel("Изменить название")
                        .setStyle(discord_js_1.ButtonStyle.Secondary)
                        .setDisabled((db_query === null || db_query === void 0 ? void 0 : db_query.role_id) ? true : false),
                    new discord_js_1.ButtonBuilder().setCustomId("db_roles_add_cancel").setLabel("Отменить").setStyle(discord_js_1.ButtonStyle.Danger),
                ];
                yield interaction.editReply({
                    embeds: [embed],
                    components: [
                        {
                            type: discord_js_1.ComponentType.ActionRow,
                            components: components,
                        },
                    ],
                });
                const interactionUId = interaction.user.id;
                const collector = (_c = interaction.channel) === null || _c === void 0 ? void 0 : _c.createMessageComponentCollector({
                    time: 50000,
                    max: 5,
                    filter: (interaction) => interaction.user.id == interactionUId,
                });
                collector
                    .on("collect", (collected) => __awaiter(void 0, void 0, void 0, function* () {
                    var _f;
                    if (!collected.deferred)
                        yield collected.deferUpdate().catch((e) => console.log(e));
                    if (collected.customId === "db_roles_add_cancel") {
                        interaction.editReply({ components: [] });
                        collector.stop("Canceled");
                    }
                    else if (collected.customId === "db_roles_add_confirm") {
                        var role, embed;
                        if (!(db_query === null || db_query === void 0 ? void 0 : db_query.role_id)) {
                            role = yield interaction.guild.roles.create({
                                name: title_name,
                                reason: "Creating auto-role",
                            });
                        }
                        else {
                            role = member.guild.roles.cache.get(String(db_query.role_id));
                        }
                        if (!db_query) {
                            yield sequelize_1.role_data.findOrCreate({
                                where: {
                                    hash: { [sequelize_2.Op.contains]: `{${hash}}` },
                                },
                                defaults: {
                                    hash: `{${hash}}`,
                                    role_id: role.id,
                                    category: category,
                                },
                            });
                            embed = new discord_js_1.EmbedBuilder()
                                .setColor("Green")
                                .setTitle("Роль была создана")
                                .setDescription(`<@&${role.id}>`)
                                .setFooter({
                                text: `Role Id: ${role.id}`,
                            });
                        }
                        else {
                            var newHash = db_query.hash;
                            newHash.push(String(hash));
                            yield sequelize_1.role_data.update({
                                hash: `{${newHash.toString()}}`,
                            }, {
                                where: { role_id: db_query.role_id },
                            });
                            embed = new discord_js_1.EmbedBuilder()
                                .setColor("Green")
                                .setTitle("Требования к роли были дополнены")
                                .setDescription(`<@&${role.id}>`)
                                .setFooter({
                                text: `Role Id: ${role.id}`,
                            });
                        }
                        collector.stop("Completed");
                        interaction.editReply({
                            embeds: [embed],
                            components: [],
                        });
                    }
                    else if (collected.customId === "db_roles_add_change_name") {
                        (_f = interaction.channel) === null || _f === void 0 ? void 0 : _f.createMessageCollector({
                            time: 15000,
                            max: 1,
                            filter: (message) => message.author.id === interaction.user.id,
                        }).on("collect", (msg) => {
                            msg.delete();
                            interaction.fetchReply().then((m) => {
                                const embed = m.embeds[0];
                                embed.fields[0].value = `${msg.cleanContent}`;
                                title_name = msg.cleanContent;
                                interaction.editReply({ embeds: [embed] });
                            });
                        });
                    }
                }))
                    .on("end", () => {
                    interaction.editReply({
                        components: [],
                    });
                });
                break;
            }
            case "fetch": {
                const data = yield sequelize_1.role_data.findAll();
                const embed = new discord_js_1.EmbedBuilder().setColor(colors_1.colors.default).setTitle("Auto roles");
                data.forEach((d) => __awaiter(void 0, void 0, void 0, function* () {
                    var _g;
                    if (((_g = embed.data.fields) === null || _g === void 0 ? void 0 : _g.length) === 25) {
                        return embed.setFooter({
                            text: `and ${data.length - 25} more`,
                        });
                    }
                    embed.addFields([
                        {
                            name: `Hash: ${d.hash}`,
                            value: `Role: <@&${d.role_id}>\nRoleId: ${d.role_id}`,
                            inline: true,
                        },
                    ]);
                }));
                if (((_d = embed.data.fields) === null || _d === void 0 ? void 0 : _d.length) === 0)
                    embed.setDescription("There are no auto-roles");
                interaction.editReply({ embeds: [embed] });
                break;
            }
            case "remove": {
                if (typeof id !== "string")
                    return;
                if ((_e = interaction.guild) === null || _e === void 0 ? void 0 : _e.roles.cache.has(id)) {
                    var query = yield sequelize_1.role_data.destroy({ where: { role_id: id } });
                }
                else {
                    var query = yield sequelize_1.role_data.destroy({
                        where: { hash: "{" + id + "}" },
                    });
                }
                if (query) {
                    const embed = new discord_js_1.EmbedBuilder().setColor("Green").setTitle(`Удалена ${query} авто-роль`);
                    interaction.editReply({ embeds: [embed] });
                }
                else {
                    throw { name: `Удалено ${query} авто-ролей`, message: `Hash: ${id}`, falseAlarm: true };
                }
                break;
            }
        }
    }),
};
