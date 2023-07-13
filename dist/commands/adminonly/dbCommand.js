import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder, } from "discord.js";
import { Op } from "sequelize";
import { DatabaseCommandButtons } from "../../configs/Buttons.js";
import NightRoleCategory from "../../configs/RoleCategory.js";
import UserErrors from "../../configs/UserErrors.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { activityRoles, raidRoles } from "../../configs/roles.js";
import { longOffline, userTimezones } from "../../core/userStatisticsManagement.js";
import { Command } from "../../structures/command.js";
import { GetManifest } from "../../utils/api/ManifestManager.js";
import setMemberRoles from "../../utils/discord/setRoles.js";
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
            name: "clear",
            description: "Delete user from database and clear his data on the server",
            options: [
                {
                    type: ApplicationCommandOptionType.User,
                    name: "user",
                    description: "User to clear",
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
                return select();
            }
            case "clear": {
                return clearCase();
            }
            case "delete": {
                return deleteCase();
            }
            case "name_change": {
                return nameChange();
            }
            case "add": {
                return addCase();
            }
            case "fetch": {
                return fetchCase();
            }
            case "remove": {
                return removeCase();
            }
        }
        async function select() {
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
        async function clearCase() {
            const user = args.getUser("user", true);
            const userData = await AuthData.findOne({
                where: { discordId: user.id },
                attributes: ["discordId"],
                include: UserActivityData,
            });
            const embed = new EmbedBuilder();
            if (!userData) {
                embed
                    .setColor(colors.error)
                    .setAuthor({ name: "Ошибка", iconURL: icons.error })
                    .setDescription("Пользователь не найден в базе данных");
            }
            else if (!userData.UserActivityData || (userData.UserActivityData.messages < 5 && userData.UserActivityData.voice < 120)) {
                const member = await client.getAsyncMember(user.id);
                await userData.destroy();
                await member.setNickname(null, "Удаление данных пользователя");
                await setMemberRoles({ member, roles: [process.env.NEWBIE], reason: "Удаление данных пользователя" });
                embed
                    .setColor(colors.success)
                    .setAuthor({ name: "Успех", iconURL: icons.success })
                    .setDescription("Данные пользователя успешно удалены");
            }
            else {
                embed
                    .setColor(colors.serious)
                    .setAuthor({ name: "Внимание", iconURL: icons.warning })
                    .setDescription("У пользователя есть актив на сервере, проверьте вручную для удаления")
                    .addFields([
                    { name: "Сообщений отправлено", value: userData.UserActivityData.messages.toString(), inline: true },
                    { name: "Времени в голосовых", value: convertSeconds(userData.UserActivityData.voice).toString(), inline: true },
                    {
                        name: "Активность в игре",
                        value: `${userData.UserActivityData.raids}/${userData.UserActivityData.dungeons}`,
                        inline: true,
                    },
                ]);
            }
            await deferredReply;
            return await interaction.editReply({ embeds: [embed] });
        }
        async function deleteCase() {
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
        async function nameChange() {
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
        async function addCase() {
            const hash = args.getString("hash", true);
            const unique = args.getInteger("unique") ?? -99;
            const recordDefinition = (await GetManifest("DestinyRecordDefinition"))[Number(hash)];
            if (!recordDefinition)
                throw { name: "Триумф под таким хешем не найден", description: `Hash: ${hash}` };
            const isTitle = recordDefinition.titleInfo.hasTitle;
            const guildableTitle = isTitle ? (recordDefinition.titleInfo.gildingTrackingRecordHash ? true : false) : false;
            let futureRoleName = isTitle
                ? guildableTitle
                    ? "⚜️" + recordDefinition.titleInfo.titlesByGender.Male
                    : recordDefinition.titleInfo.titlesByGender.Male
                : recordDefinition.displayProperties.name;
            const category = (isTitle ? NightRoleCategory.Titles : args.getInteger("category")) ?? NightRoleCategory.Triumphs;
            const embed = new EmbedBuilder().setColor(colors.default).setTitle("Создание авто-роли");
            if (recordDefinition.displayProperties.hasIcon) {
                embed.setThumbnail(`https://www.bungie.net${recordDefinition.displayProperties.icon}`);
            }
            if (futureRoleName) {
                embed.addFields({
                    name: "Название роли",
                    value: futureRoleName,
                    inline: true,
                });
            }
            embed.addFields({
                name: "Категория",
                value: `${category}`,
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
                new ButtonBuilder().setCustomId(DatabaseCommandButtons.Confirm).setLabel("Создать").setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(DatabaseCommandButtons.ChangeName)
                    .setLabel("Изменить название")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(DatabaseCommandButtons.Cancel).setLabel("Отменить").setStyle(ButtonStyle.Danger),
            ];
            await deferredReply;
            const interactionReply = await interaction.editReply({
                embeds: [embed],
                components: await addButtonsToMessage(components),
            });
            const collector = interaction.channel.createMessageComponentCollector({
                message: interactionReply,
                time: 60 * 2 * 1000,
                filter: (int) => interaction.user.id == int.user.id,
            });
            let messageCollector = null;
            collector
                .on("collect", async (collected) => {
                if (collected.customId === DatabaseCommandButtons.Confirm) {
                    return confromRoleAdd();
                }
                else if (collected.customId === DatabaseCommandButtons.Cancel) {
                    return cancelRoleAdd();
                }
                else if (collected.customId === DatabaseCommandButtons.ChangeName) {
                    return changeRoleName();
                }
                async function cancelRoleAdd() {
                    await interaction.reply({ ephemeral: true, content: "Отменено" });
                    collector.stop("Canceled");
                }
                async function confromRoleAdd() {
                    const gildedRoles = [];
                    const embed = new EmbedBuilder().setColor(colors.success);
                    const rolePosition = interaction.guild.roles.cache.get(category === NightRoleCategory.Activity
                        ? activityRoles.category
                        : category === NightRoleCategory.Triumphs
                            ? process.env.TRIUMPHS_CATEGORY
                            : category === NightRoleCategory.Titles
                                ? process.env.TITLE_CATEGORY
                                : category === NightRoleCategory.Stats
                                    ? process.env.STATISTICS_CATEGORY
                                    : raidRoles.roles[0].roleId)?.position ?? undefined;
                    const role = await interaction.guild.roles.create({
                        name: guildableTitle ? futureRoleName.slice(1) : futureRoleName,
                        reason: "Creating auto-role",
                        color: colors.default,
                        position: rolePosition,
                    });
                    if (guildableTitle) {
                        const guildedRole = await interaction.guild.roles.create({
                            name: futureRoleName + " 1",
                            reason: "Creating guildable auto-role",
                            position: role.position,
                            color: "#ffb300",
                        });
                        gildedRoles.push(guildedRole.id);
                    }
                    try {
                        const roleParams = {
                            triumphRequirement: hash,
                            roleId: role.id,
                            category: category,
                            available: unique,
                        };
                        if (guildableTitle) {
                            await AutoRoleData.create({
                                gildedTriumphRequirement: recordDefinition.titleInfo.gildingTrackingRecordHash,
                                gildedRoles,
                                ...roleParams,
                            });
                        }
                        else {
                            await AutoRoleData.create(roleParams);
                        }
                    }
                    catch (e) {
                        collector.stop("Error");
                        await role.delete("Got error during creation");
                        throw e;
                    }
                    embed.addFields({
                        name: "Роль была создана",
                        value: `<@&${role.id}>${gildedRoles.length > 0 ? `, <@&${gildedRoles[0]}>` : ""}`,
                    });
                    collector.stop("Completed");
                    await deferredReply;
                    await interaction.editReply({
                        embeds: [embed],
                        components: [],
                    });
                }
                async function changeRoleName() {
                    const interactionChannel = interaction.channel;
                    messageCollector = !messageCollector
                        ? interactionChannel.createMessageCollector({
                            time: 60 * 1000,
                            max: 1,
                            filter: (message) => message.author.id === interaction.user.id,
                        })
                        : messageCollector;
                    messageCollector.on("collect", async (msg) => {
                        msg.delete();
                        futureRoleName = guildableTitle ? "⚜️" + msg.cleanContent : msg.cleanContent;
                        const embedField = embed.data.fields?.[0];
                        if (embedField) {
                            embedField.value = futureRoleName;
                        }
                        else {
                            embed.spliceFields(0, 0, { name: "Название роли", value: futureRoleName, inline: true });
                        }
                        await interaction.editReply({ embeds: [embed] });
                    });
                }
            })
                .on("end", async () => {
                interaction.deleteReply();
                messageCollector = null;
            });
        }
        async function fetchCase() {
            const roleDatabaseData = await AutoRoleData.findAll({ attributes: ["triumphRequirement", "roleId"] });
            const embed = new EmbedBuilder().setColor(colors.default).setTitle("Auto roles");
            for (let i = 0; i < roleDatabaseData.length; i++) {
                const roleData = roleDatabaseData[i];
                embed.addFields({
                    name: `Hash: ${roleData.triumphRequirement}`,
                    value: `Role: <@&${roleData.roleId}>`,
                    inline: true,
                });
                if (embed.data.fields?.length === 25 || i === roleDatabaseData.length - 1) {
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
            if (roleDatabaseData.length === 0) {
                embed.setDescription("There are no auto roles");
                (await deferredReply) && interaction.editReply({ embeds: [embed] });
                return;
            }
            return;
        }
        async function removeCase() {
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
    },
});
//# sourceMappingURL=dbCommand.js.map