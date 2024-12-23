import { ButtonBuilder, ButtonStyle, EmbedBuilder, Role, TextChannel, VoiceChannel } from "discord.js";
import Sequelize from "sequelize";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { Button } from "../structures/button.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
import { updateRaidMessage } from "../utils/general/raidFunctions.js";
import { RaidEvent } from "../utils/persistence/sequelizeModels/raidEvent.js";
const { Op } = Sequelize;
let raidChannel = null;
const ButtonCommand = new Button({
    name: "godEvent",
    run: async ({ client, interaction }) => {
        const categoryId = interaction.customId.split("_")[1];
        const [member, channel, guild] = await Promise.all([
            client.getMember(interaction.member),
            client.getTextChannel(interaction.channel || interaction.channelId),
            client.getGuild(interaction.guild),
        ]);
        switch (categoryId) {
            case "sortraids": {
                sortRaids();
                return;
            }
            case "customRoleColor": {
                customRoleColor();
                return;
            }
            case "customRoleName": {
                const embed = new EmbedBuilder().setColor(colors.default).setTitle("Введите название роли");
                const collector = channel.createMessageCollector({
                    filter: (m) => m.author.id === interaction.user.id,
                    max: 1,
                    time: 60 * 1000,
                });
                await interaction.reply({ embeds: [embed], ephemeral: true });
                collector.on("collect", async (m) => {
                    m.delete();
                    const previousName = member.roles.highest.name.startsWith("◈") ? member.roles.highest.name : undefined;
                    const name = m.cleanContent.trim();
                    const role = member.roles.highest.name.startsWith("◈")
                        ? await member.roles.highest.edit({ name: `◈ ${name}` }).catch((e) => {
                            throw { name: "Проверьте название роли" };
                        })
                        : await member.roles.add(await guild.roles.create({ name: `◈ ${name}`, position: member.roles.highest.position + 1 }).catch((e) => {
                            throw { name: "Проверьте название роли" };
                        }));
                    const resultRole = role instanceof Role ? role : role.roles.highest;
                    const resultEmbed = new EmbedBuilder()
                        .setColor(colors.success)
                        .setTitle("Название роли было изменено")
                        .setDescription(`${previousName ? `**Предыдущий:** ${previousName}\n` : ""}**Текущий:** ${resultRole.name}`);
                    interaction.editReply({ embeds: [resultEmbed] });
                    return collector.stop("Completed");
                });
                collector.on("end", (_u, reason) => {
                    if (reason !== "time")
                        return;
                    embed.setTitle("Время вышло").setColor(null);
                    interaction.editReply({ embeds: [embed] });
                });
                return;
            }
            case "getInvite": {
                const embed = new EmbedBuilder().setColor(colors.default).setAuthor({
                    name: "Перейти на сервер",
                    url: "https://discord.gg/YZZz5aaEQK",
                    iconURL: "https://cdn.discordapp.com/icons/1007814171267707001/b8b3e04b052f469607b68ae1c7a7cdfa.webp",
                });
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }
            case "achatAccess": {
                return chnPermGranter(process.env.ADMIN_CHANNEL_ID);
            }
            case "achatVoiceAccess": {
                return chnPermGranter(process.env.ADMIN_VOICE_CHANNEL_ID);
            }
            case "manifestAccess": {
                return chnPermGranter(process.env.MANIFEST_CHANNEL_ID);
            }
            case "vchatAccess": {
                return chnPermGranter(process.env.VOICE_LOG_CHANNEL_ID);
            }
            case "color": {
                const colorName = interaction.customId.split("_")[2];
                if (member.roles.highest.name === "⁣")
                    await member.roles.remove(member.roles.highest);
                switch (colorName) {
                    case "red": {
                        await member.roles.add("1033431078960103445");
                        break;
                    }
                    case "white": {
                        await member.roles.add("779024628034174986");
                        break;
                    }
                    case "purple": {
                        await member.roles.add("779024608178208778");
                        break;
                    }
                    case "brown": {
                        await member.roles.add("779024275873071105");
                        break;
                    }
                    case "blue": {
                        await member.roles.add("779024192162234418");
                        break;
                    }
                    case "orange": {
                        await member.roles.add("779024477723033630");
                        break;
                    }
                    case "green": {
                        await member.roles.add("779024401823432755");
                        break;
                    }
                }
                const embed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Вы поменяли цвет роли", iconURL: icons.success });
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }
        }
        async function sortRaids() {
            const deferredReply = interaction.deferReply({ ephemeral: true });
            const currentRaids = (await RaidEvent.findAll({ where: { time: { [Op.gt]: Math.floor(Date.now() / 1000) } } })).sort((a, b) => {
                if (a.joined.length >= 6 && b.joined.length < 6)
                    return -1;
                if (b.joined.length >= 6 && a.joined.length < 6)
                    return 1;
                if (a.time !== b.time)
                    return b.time - a.time;
                return b.joined.length - a.joined.length;
            });
            if (currentRaids.length === 0) {
                await deferredReply;
                throw { name: "Сейчас нет созданных рейдов" };
            }
            else if (currentRaids.length === 1) {
                await deferredReply;
                throw { name: "Сейчас создан лишь один рейд" };
            }
            if (!raidChannel)
                raidChannel = await client.getTextChannel(process.env.RAID_CHANNEL_ID);
            const baseComponents = [
                new ButtonBuilder().setCustomId("raidButton_action_join").setLabel("Записаться").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("raidButton_action_leave").setLabel("Выйти").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("raidButton_action_alt").setLabel("Возможно буду").setStyle(ButtonStyle.Secondary),
            ];
            let sortedRaidCount = 0;
            for (const raid of currentRaids) {
                try {
                    const messagePromise = raidChannel.messages.fetch(raid.messageId);
                    const messageOptions = await updateRaidMessage({ raidEvent: raid, returnComponents: true });
                    if (!messageOptions)
                        continue;
                    const { embeds, components: subComponents } = messageOptions;
                    const message = await messagePromise;
                    const components = message.components
                        .map((c) => c.components.map((com) => {
                        const button = com;
                        return ButtonBuilder.from(button);
                    }))
                        .flat();
                    const updatedRaidMessage = await raidChannel.send({
                        embeds,
                        components: addButtonsToMessage(components && components.length > 0 ? components : subComponents ? subComponents : baseComponents),
                    });
                    raid.messageId = updatedRaidMessage.id;
                    try {
                        await message.delete();
                    }
                    catch (error) {
                        console.error("[Error code: 1818]", error);
                        const embed = new EmbedBuilder()
                            .setColor(colors.error)
                            .setAuthor({ name: "Не удалось удалить сообщение рейда", iconURL: icons.error })
                            .setDescription("Сообщение рейда, возможно, было удалено");
                        try {
                            interaction.followUp({ embeds: [embed], ephemeral: true });
                        }
                        catch (e) {
                            console.error("[Error code: 1819]", e);
                        }
                    }
                    await raid.save();
                    sortedRaidCount++;
                }
                catch (error) {
                    if (error.code === 10008) {
                        await deferredReply;
                        const errorEmbed = new EmbedBuilder()
                            .setColor(colors.error)
                            .setAuthor({ name: `Ошибка. Похоже ${raid.id}-${raid.raid} был создан на другом сервере`, iconURL: icons.error });
                        await interaction.followUp({
                            embeds: [errorEmbed],
                            ephemeral: true,
                        });
                        continue;
                    }
                    else {
                        await deferredReply;
                        throw error;
                    }
                }
            }
            await deferredReply;
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${sortedRaidCount} рейдов отсортировано по времени`, iconURL: icons.success })
                .setColor(colors.success);
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        async function customRoleColor() {
            const initialColor = member.roles.highest.color;
            const embed = new EmbedBuilder().setColor(colors.default).setTitle("Введите HEX-код цвета роли");
            const collector = channel.createMessageCollector({
                filter: (m) => m.author.id === interaction.user.id,
                max: 1,
                time: 60 * 1000,
            });
            await interaction.reply({ embeds: [embed], ephemeral: true });
            collector.on("collect", async (m) => {
                m.delete();
                const code = m.cleanContent.trim();
                if (code.length > 9)
                    throw { errorType: "WRONG_HEX" };
                const role = member.roles.highest.name.startsWith("◈")
                    ? await member.roles.highest.edit({ color: code }).catch((e) => {
                        throw { errorType: "WRONG_HEX" };
                    })
                    : await member.roles.add(await guild.roles
                        .create({ name: "◈", color: code, position: member.roles.highest.position + 1 })
                        .catch((e) => {
                        throw { errorType: "WRONG_HEX" };
                    }));
                const resultRole = role instanceof Role ? role : role.roles.highest;
                const resultEmbed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle("Цвет роли был изменен")
                    .setDescription(`**Предыдущий:** ${initialColor.toString(16).toUpperCase()}\n**Текущий:** ${resultRole.color.toString(16).toUpperCase()}`);
                interaction.editReply({ embeds: [resultEmbed] });
                return collector.stop("Completed");
            });
            collector.on("end", (_u, reason) => {
                if (reason !== "time")
                    return;
                embed.setTitle("Время вышло").setColor(null);
                interaction.editReply({ embeds: [embed] });
            });
        }
        function chnPermGranter(chnId) {
            const chn = guild.channels.cache.get(chnId);
            if (chn instanceof TextChannel || chn instanceof VoiceChannel) {
                const embed = new EmbedBuilder().setColor(colors.default);
                if (chn.permissionsFor(interaction.user.id)?.has("ViewChannel")) {
                    chn.permissionOverwrites.delete(interaction.user.id);
                    embed.setDescription(`Вы **отключили** доступ к <#${chn.id}>`);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                else {
                    chn.permissionOverwrites.create(interaction.user.id, { ViewChannel: true }, { reason: "godEvent button" });
                    embed.setDescription(`Вы **получили** доступ к <#${chn.id}>`);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }
        }
    },
});
export default ButtonCommand;
//# sourceMappingURL=godEvent.js.map