import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import Parser from "rss-parser";
import { Op } from "sequelize";
import colors from "../../../configs/colors.js";
import icons from "../../../configs/icons.js";
import { dungeonsTriumphHashes, roleRequirements } from "../../../configs/roleRequirements.js";
import { activityRoles, clanJoinDateRoles, dlcRoles, raidRoles, seasonalRoles, statisticsRoles, trialsRoles, } from "../../../configs/roles.js";
import openai from "../../../structures/OpenAI.js";
import { Command } from "../../../structures/command.js";
import { GetManifest } from "../../../utils/api/ManifestManager.js";
import { generateTwitterEmbed } from "../../../utils/discord/twitterHandler/twitterMessageParser.js";
import calculateVoteResults from "../../../utils/discord/twitterHandler/twitterTranslationVotes.js";
import { addButtonsToMessage } from "../../../utils/general/addButtonsToMessage.js";
import { convertSeconds } from "../../../utils/general/convertSeconds.js";
import { pause } from "../../../utils/general/utilities.js";
import { AuthData, AutoRoleData, UserActivityData } from "../../../utils/persistence/sequelize.js";
import exportCodeToFile from "./exportRaidData.js";
const SlashCommand = new Command({
    name: "scripts",
    description: "Script system",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "script",
            description: "Specify the script to run",
            required: true,
        },
    ],
    run: async ({ client, interaction, args }) => {
        const defferedReply = interaction.deferReply({ ephemeral: true });
        const scriptId = args.getString("script", true).toLowerCase();
        switch (scriptId) {
            case "notiunreg": {
                const embed = new EmbedBuilder()
                    .setColor(colors.serious)
                    .setAuthor({ name: "Приветствуем! Важное оповещение", iconURL: icons.notify })
                    .setDescription(`Вы всё ещё не обновили данные своей регистрации после [сброса данных](https://discord.com/channels/604967226243809302/690969928353710148/1141125205406777354). Для обновления нажмите кнопку «Обновить регистрацию» ниже или введите команду \`/init\`.
Если вы не обновите данные до 10 сентября, вы будете исключены из клана.

Не забудьте о скорой презентации следующего дополнения и сезона; обсудить её можно будет в [голосовых каналах](https://discord.gg/xHAzB6qU) во время презентации в <t:1692720000>, <t:1692720000:R> (пре-шоу начнётся в <t:1692716400:R>).`);
                const components = [
                    new ButtonBuilder().setCustomId("initEvent_register").setLabel("Обновить регистрацию").setStyle(ButtonStyle.Primary),
                ];
                const membersToSend = await AuthData.findAll({
                    where: { [Op.and]: { accessToken: null, clan: true, refreshToken: null } },
                    attributes: ["discordId"],
                });
                for (const { discordId } of membersToSend) {
                    const member = client.getCachedMembers().get(discordId) || (await client.getAsyncMember(discordId));
                    if (!member) {
                        console.debug(`Failed to fetch user ${discordId}`);
                        continue;
                    }
                    await member.send({ embeds: [embed], components: addButtonsToMessage(components) });
                    console.debug(`Sent message to ${member.displayName}`);
                }
                return;
            }
            case "exportraidguide": {
                exportCodeToFile(interaction, defferedReply);
                return;
            }
            case "resolvevotes": {
                await calculateVoteResults();
                const embed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setAuthor({ name: "Голоса успешно обработаны", iconURL: icons.success });
                await defferedReply;
                interaction.editReply({ embeds: [embed] });
                return;
            }
            case "getmodels": {
                const request = await openai.models.list();
                console.debug(request.data);
                return;
            }
            case "rsstry": {
                const parser = new Parser();
                const feed = await parser.parseURL(`https://n9-rss.up.railway.app/twitter/user/destiny2team?readable=0&limit=1`);
                const entry = feed.items[0];
                const author = getBungieTwitterAuthor(entry.creator);
                await generateTwitterEmbed({ twitterData: entry, author, icon: feed.image?.url, url: entry.link });
                function getBungieTwitterAuthor(creator) {
                    switch (creator) {
                        case "Destiny 2":
                            return 1;
                        case "Bungie":
                            return 2;
                        case "Bungie Help":
                            return 3;
                        case "Destiny 2 Team":
                            return 4;
                        default:
                            return null;
                    }
                }
                return;
            }
            case "checkrole": {
                const members = client
                    .getCachedMembers()
                    .filter((r) => r.roles.cache.has(process.env.MEMBER) && !r.roles.cache.has(process.env.VERIFIED));
                const usersInDatabase = await AuthData.findAll({ attributes: ["discordId"] });
                const discordIdsInDatabase = usersInDatabase.map((user) => user.discordId);
                for (const [id, member] of members) {
                    const hasVerifiedRole = member.roles.cache.has(process.env.VERIFIED);
                    if (hasVerifiedRole) {
                        if (!discordIdsInDatabase.includes(member.id)) {
                            await member.roles.remove(process.env.MEMBER);
                            await member.roles.add(process.env.NEWBIE);
                            console.debug(`Removed verified role from ${member.displayName || member.user.username}`);
                        }
                    }
                }
                return;
            }
            case "activitytop": {
                const dbData = (await AuthData.findAll({ include: UserActivityData, attributes: ["displayName", "discordId"] })).filter((v) => v.UserActivityData && (v.UserActivityData.messages > 0 || v.UserActivityData.voice > 0));
                const usersWithoutData = dbData.filter((v) => !v.UserActivityData);
                if (usersWithoutData.length > 0) {
                    console.error(`[Error code: 1730]`, usersWithoutData);
                }
                const messageTop = dbData
                    .filter((v) => v.UserActivityData.messages > 0)
                    .sort((a, b) => b.UserActivityData.messages - a.UserActivityData.messages);
                const voiceTop = dbData
                    .filter((v) => v.UserActivityData.voice > 0)
                    .sort((a, b) => b.UserActivityData.voice - a.UserActivityData.voice);
                const msgEmbed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle("Топ по текстовому активу")
                    .setFooter(messageTop.length > 50 ? { text: `И еще ${messageTop.length - 50} участников` } : null)
                    .setDescription(`${messageTop
                    .splice(0, 50)
                    .map((v, i) => {
                    return `${i + 1}. <@${v.discordId}> — ${v.UserActivityData.messages} ${v.UserActivityData.messages === 1 ? "сообщение" : "сообщений"}`;
                })
                    .join("\n")}`);
                const voiceEmbed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle("Топ по голосовому активу")
                    .setFooter(voiceTop.length > 50 ? { text: `И еще ${voiceTop.length - 50} участников` } : null)
                    .setDescription(`${voiceTop
                    .splice(0, 50)
                    .map((v, i) => {
                    return `${i + 1}. <@${v.discordId}> — ${convertSeconds(v.UserActivityData.voice)}`;
                })
                    .join("\n")
                    .slice(0, 2048)}`);
                await defferedReply;
                await interaction.channel?.send({ embeds: [msgEmbed, voiceEmbed] });
                return;
            }
            case "roles": {
                const roleData = await AutoRoleData.findAll();
                const manifest = await GetManifest("DestinyRecordDefinition");
                const topRolesRaw = new EmbedBuilder()
                    .setTitle("⁣⁣Ненастраиваемые роли")
                    .setDescription("⁣Роли этой категории нельзя отключить. Некоторые из них выделяют в отдельном списке участников")
                    .setColor(colors.serious)
                    .addFields({
                    name: "⁣",
                    value: "```fix\nОсобые роли```Некоторые из особых ролей будут выделять вас в списке участников\n\n- <@&951448755314503721> — за максимальный уровень поддержки через [Boosty](https://boosty.to/night9)\n- <@&746392332647137402> — за 3 уровень поддержки через [Boosty](https://boosty.to/night9)\n- <@&1022036001822081024> — за 2 уровень поддержки через [Boosty](https://boosty.to/night9)\n- <@&1022035885237227580> — за 1 уровень поддержки через [Boosty](https://boosty.to/night9)",
                }, {
                    name: "⁣",
                    value: `\`\`\`fix\nРейдовые роли\`\`\`Учитываются лишь доступные на данный момент рейды\n\n${raidRoles.roles
                        .map((r) => {
                        return `- <@&${r.roleId}> — за ${r.individualClears} закрытий каждого или ${r.totalClears} в сумме`;
                    })
                        .join("\n")}`,
                }, {
                    name: "⁣",
                    value: `\`\`\`fix\nРоли за дополнения\`\`\`\n　╭✧<@&${seasonalRoles.currentSeasonRole}>\n　︰За наличие сезонного пропуска\n　╰✧<@&${seasonalRoles.nonCurrentSeasonRole}>\n\n- <@&${dlcRoles.frs}> — за покупку Отвергнутых\n- <@&${dlcRoles.sk}> — за покупку Обители Теней\n- <@&${dlcRoles.bl}> — за покупку За гранью Света\n- <@&${dlcRoles.anni}> — за покупку набора к 30-летию\n- <@&${dlcRoles.twq}> — за покупку Королевы-ведьмы\n- <@&${dlcRoles.lf}> — за покупку Конца Света`,
                });
                const classRolesRaw = new EmbedBuilder()
                    .setTitle("Классовые роли")
                    .setDescription("Нажмите на кнопку ниже для установки своего основного класса в игре. Вы можете поменять роль в любое время")
                    .setColor(colors.serious)
                    .addFields({
                    name: "⁣　　　　　<:hunter:995496474978824202>",
                    value: "```fix\n⁣　⁣　⁣  ⁣Охотник⁣```⁣",
                    inline: true,
                }, {
                    name: "⁣　　　　　<:warlock:995496471526920232>⁣⁣",
                    value: "```fix\n⁣　⁣　　 ⁣⁣Варлок⁣```",
                    inline: true,
                }, {
                    name: "⁣　　　　　<:titan:995496472722284596>",
                    value: "```fix\n⁣　⁣　⁣   ⁣Титан⁣```",
                    inline: true,
                });
                const statsRolesRaw = new EmbedBuilder()
                    .setTitle("⁣Общая статистика")
                    .setColor(colors.serious)
                    .addFields({
                    name: "⁣",
                    value: `\`\`\`fix\nСчет триумфов\`\`\`\n- За (${statisticsRoles.active
                        .map((r) => r.triumphScore)
                        .sort((a, b) => a - b)
                        .map((r) => `**${r}**`)
                        .join(", ")}) очков триумфа`,
                    inline: true,
                }, {
                    name: "⁣",
                    value: `\`\`\`fix\nУ/С\`\`\`\n- За соотношение убийств/смерти (${statisticsRoles.kd
                        .map((r) => r.kd)
                        .sort((a, b) => a - b)
                        .map((r) => `**${r}**`)
                        .join(", ")}) в PvP`,
                    inline: true,
                });
                const trialsRolesRaw = new EmbedBuilder()
                    .setTitle("Статистика Испытаний Осириса")
                    .setDescription("⁣⁣Для отображения категории требуется от одного безупречного прохождения")
                    .setColor(colors.serious)
                    .addFields({
                    name: "⁣",
                    value: `\`\`\`fix\n⁣У/С в Испытаниях Осириса\`\`\`\n- За соотношение убийств/смерти (${trialsRoles.kd
                        .map((r) => r.kd)
                        .sort((a, b) => a - b)
                        .map((r) => `**${r}**`)
                        .join(", ")})\n- За 10 и более нечестных матчей выдается <@&${trialsRoles.wintrader}>`,
                    inline: true,
                }, {
                    name: "⁣",
                    value: `\`\`\`fix\n⁣Число безупречных билетов\`\`\`\n- За достижение (${trialsRoles.roles
                        .map((r) => r.totalFlawless)
                        .sort((a, b) => a - b)
                        .map((r) => `**${r}**`)
                        .join(", ")}) безупречных прохождений`,
                    inline: true,
                });
                const titlesRaw = new EmbedBuilder()
                    .setTitle("Титулы")
                    .setDescription("⁣⁣Для отображения категории требуется наличие как минимум 1 актуальной печати")
                    .setColor(colors.serious)
                    .addFields({
                    name: "⁣",
                    value: "```fix\n⁣Обычные печати```\n- За выполнение печати в игре",
                    inline: true,
                }, {
                    name: "⁣",
                    value: "```fix\nЗолотые печати```\n- За улучшение печати в игре",
                    inline: true,
                });
                const triumphsRaw = new EmbedBuilder()
                    .setTitle("⁣Триумфы")
                    .setDescription("⁣Для отображения этой категории необходимо выполнить требования как минимум для 1 триумфа")
                    .setColor(colors.serious);
                const activityRolesRaw = new EmbedBuilder()
                    .setTitle("Активность на сервере")
                    .setDescription("⁣Учитывается каждое отправленное вами сообщение в любом из каналов. Время в AFK-канале не учитывается")
                    .setColor(colors.serious)
                    .addFields({
                    name: "⁣",
                    value: `\`\`\`fix\nАктив в голосовом чате\`\`\`\n${activityRoles.voice
                        .map((r) => {
                        return `- <@&${r.roleId}> за ${r.voiceMinutes / 60} минут`;
                    })
                        .join("⁣\n")}`,
                    inline: true,
                }, {
                    name: "⁣",
                    value: `\`\`\`fix\nАктив в текстовом чате\`\`\`\n${activityRoles.messages
                        .map((r) => {
                        return `- <@&${r.roleId}> за ${r.messageCount} сообщений`;
                    })
                        .join("⁣\n")}`,
                    inline: true,
                });
                triumphsRaw.addFields({
                    name: "⁣",
                    value: `\`\`\`fix\nРоли за различные триумфы в игре\`\`\`\n- ${roleData
                        .filter((v) => !dungeonsTriumphHashes.includes(v.triumphRequirement) && v.category === 8)
                        .map((data) => {
                        const recordDescription = roleRequirements[Number(data.triumphRequirement)] ||
                            manifest[Number(data.triumphRequirement)].displayProperties.name;
                        return `<@&${data.roleId}> — ${recordDescription}`;
                    })
                        .join("\n- ")}`,
                });
                triumphsRaw.addFields({
                    name: "⁣",
                    value: `\`\`\`fix\nРоли за прохождение подземелий в одиночку без смертей\`\`\`\n- ${roleData
                        .filter((v) => dungeonsTriumphHashes.includes(v.triumphRequirement))
                        .map((data) => {
                        const recordDescription = roleRequirements[Number(data.triumphRequirement)] ||
                            manifest[Number(data.triumphRequirement)].displayProperties.name;
                        return `<@&${data.roleId}> — ${recordDescription}`;
                    })
                        .join("\n- ")}`,
                });
                triumphsRaw.addFields({
                    name: "⁣",
                    value: `\`\`\`fix\nРоли за состояние в клане\`\`\`\n${clanJoinDateRoles.roles
                        .map((r) => {
                        return `- <@&${r.roleId}> — за ${r.days} дней в клане`;
                    })
                        .join("\n")}`,
                });
                const components = (roleRow) => [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            new ButtonBuilder()
                                .setCustomId(`roleChannel_roles_enable_${roleRow}`)
                                .setLabel("Включить")
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`roleChannel_roles_disable_${roleRow}`)
                                .setLabel("Отключить")
                                .setStyle(ButtonStyle.Secondary),
                        ],
                    },
                ];
                const classRoles = [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            new ButtonBuilder()
                                .setCustomId("roleChannel_classRoles_hunter")
                                .setEmoji("<:hunter:995496474978824202>")
                                .setLabel("Охотник")
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId("roleChannel_classRoles_warlock")
                                .setEmoji("<:warlock:995496471526920232>")
                                .setLabel("Варлок")
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId("roleChannel_classRoles_titan")
                                .setEmoji("<:titan:995496472722284596>")
                                .setLabel("Титан")
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId("roleChannel_classRoles_disable").setLabel("Отключить").setStyle(ButtonStyle.Danger),
                        ],
                    },
                ];
                const channel = interaction.channel;
                channel.send({
                    embeds: [topRolesRaw],
                });
                await pause(1500);
                channel.send({
                    embeds: [classRolesRaw],
                    components: classRoles,
                });
                await pause(1500);
                channel.send({
                    embeds: [statsRolesRaw],
                    components: components(1),
                });
                await pause(1500);
                channel.send({
                    embeds: [trialsRolesRaw],
                    components: components(2),
                });
                await pause(1500);
                channel.send({
                    embeds: [titlesRaw],
                    components: components(4),
                });
                await pause(1500);
                channel.send({
                    embeds: [triumphsRaw],
                    components: components(8),
                });
                await pause(1500);
                channel.send({
                    embeds: [activityRolesRaw],
                    components: components(16),
                });
                await pause(1000);
                const endEmbed = new EmbedBuilder()
                    .setColor(colors.serious)
                    .setTitle("Дополнительная информация")
                    .setDescription("- Все категории включены по умолчанию\n- Ваши роли обновляются в течение 5-120 минут (зависит от того, как давно вы заходили в игру)\n- Все роли визуальны и не дают каких-либо особых прав\n- Роли служат визуальным показателем вашего опыта в игре");
                channel.send({ embeds: [endEmbed] });
            }
            default:
                await defferedReply;
                await interaction.editReply("Base response");
                break;
        }
    },
});
export default SlashCommand;
//# sourceMappingURL=main.js.map