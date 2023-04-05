import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, } from "discord.js";
import { Op } from "sequelize";
import { RaidAdditionalFunctional, RaidButtons } from "../configs/Buttons.js";
import { RaidNotifyEdit } from "../configs/Modals.js";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { guildId, ids } from "../configs/ids.js";
import { addButtonComponentsToMessage } from "../utils/general/addButtonsToMessage.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { removeRaid } from "../utils/general/raidFunctions.js";
import { descriptionFormatter, getRandomRaidGIF } from "../utils/general/utilities.js";
import { RaidEvent } from "../utils/persistence/sequelize.js";
export default {
    name: "raidInChnButton",
    run: async ({ client, interaction }) => {
        if (![
            RaidButtons.notify,
            RaidButtons.transfer,
            RaidButtons.unlock,
            RaidButtons.delete,
            RaidButtons.resend,
            RaidButtons.invite,
        ].includes(interaction.customId))
            return;
        const deferredUpdate = [RaidButtons.transfer, RaidButtons.delete, RaidButtons.invite].includes(interaction.customId)
            ? interaction.deferReply({ ephemeral: true })
            : interaction.deferUpdate();
        const attributes = ["creator", "id", "raid", "joined", "messageId", "channelId"];
        const raidEventPromise = interaction.channel?.isDMBased()
            ? RaidEvent.findOne({
                where: {
                    [Op.and]: [
                        { id: parseInt(interaction.message.embeds[0].data.footer?.text.split("RId: ").pop()) },
                        { creator: interaction.user.id },
                    ],
                },
                attributes,
            })
            : RaidEvent.findOne({ where: { inChannelMessageId: interaction.message.id }, attributes });
        const guild = interaction.guild || client.getCachedGuild() || (await client.guilds.fetch(guildId));
        const member = client.getCachedMembers().get(interaction.user.id) || (await guild.members.fetch(interaction.user.id));
        if (!member) {
            await deferredUpdate;
            throw {
                name: "Вы не участник сервера",
                description: "Пожалуйста, объясните администрации как вы получили эту ошибку",
            };
        }
        if (!guild) {
            await deferredUpdate;
            throw { name: "Ошибка. Сервер недоступен" };
        }
        const raidEvent = (await raidEventPromise);
        if (!raidEvent) {
            if (interaction.channel?.isDMBased())
                interaction.message.edit({ components: [] });
            await deferredUpdate;
            throw { errorType: UserErrors.RAID_NOT_FOUND };
        }
        if (raidEvent.creator !== interaction.user.id && !interaction.memberPermissions?.has("Administrator")) {
            await deferredUpdate;
            throw { errorType: UserErrors.RAID_MISSING_PERMISSIONS };
        }
        if (interaction.customId === RaidButtons.notify) {
            const GIFImage = (await getRandomRaidGIF()) || "https://media.giphy.com/media/cKJZAROeOx7MfU6Kws/giphy.gif";
            let modalTitle = `Рейдовое оповещение ${raidEvent.id}-${raidEvent.raid}`;
            let modalDescription = `Рейдер, тебя оповестил ${raidEvent.creator === interaction.user.id ? "создатель рейда" : "администратор"} об скором старте.\n\nЗаходи в голосовой канал как можно скорее!`;
            let modalImage = GIFImage;
            let interactionResponded = false;
            async function sendNotificationToMembers(allVoiceChannels, raidEvent, linkComponent, guild, interaction, message) {
                const channel = client.getCachedTextChannel(interaction.channel.id);
                const notificationEmbed = new EmbedBuilder().setColor(colors.serious);
                if (modalTitle?.length > 0) {
                    try {
                        notificationEmbed.setAuthor({ name: modalTitle, iconURL: icons.notify });
                    }
                    catch (e) { }
                }
                if (modalDescription?.length > 0) {
                    try {
                        notificationEmbed.setDescription(modalDescription || null);
                    }
                    catch (e) { }
                }
                if (modalImage?.length > 0) {
                    try {
                        notificationEmbed.setImage(modalImage || null);
                    }
                    catch (e) { }
                }
                collector.stop("completed");
                const sendedTo = [];
                const raidMembersLength = interaction.user.id === raidEvent.creator ? raidEvent.joined.length - 1 : raidEvent.joined.length;
                await Promise.all(allVoiceChannels.map(async (chn) => {
                    if (!chn.members.has(raidEvent.creator) && chn.parent?.id !== ids.raidChnCategoryId) {
                        await Promise.all(raidEvent.joined.map(async (member) => {
                            if (chn.members.has(member)) {
                                raidEvent.joined.splice(raidEvent.joined.indexOf(member), 1);
                                const user = chn.members.get(member);
                                await user
                                    .send({
                                    embeds: [notificationEmbed],
                                    components: await addButtonComponentsToMessage(linkComponent),
                                })
                                    .then((_) => sendedTo.push(`${nameCleaner(user.displayName, true)} получил оповещение`))
                                    .catch(async (e) => {
                                    if (e.code === 50007) {
                                        await channel
                                            .send({ content: `<@${user.id}>`, embeds: [notificationEmbed] })
                                            .then((_) => sendedTo.push(`${nameCleaner(user.displayName, true)} получил текстовое оповещение`));
                                    }
                                    else {
                                        console.error(`[Error code: 1210]`, e);
                                    }
                                });
                            }
                        }));
                    }
                    else if (chn.members.has(raidEvent.creator)) {
                        chn.members.forEach((member) => {
                            if (raidEvent.joined.includes(member.id))
                                raidEvent.joined.splice(raidEvent.joined.indexOf(member.id), 1);
                        });
                    }
                }));
                const linkButton = [
                    {
                        type: ComponentType.ActionRow,
                        components: linkComponent,
                    },
                ];
                await Promise.all(raidEvent.joined.map(async (id) => {
                    const member = guild.members.cache.get(id);
                    if (!member)
                        return console.error(`[Error code: 1211]`, id, member);
                    if (member.id === raidEvent.creator)
                        return;
                    await member
                        .send({
                        embeds: [notificationEmbed],
                        components: linkComponent.length > 0 ? linkButton : undefined,
                    })
                        .then((_) => sendedTo.push(`${nameCleaner(member.displayName, true)} получил оповещение`))
                        .catch(async (e) => {
                        if (e.code === 50007) {
                            await channel
                                .send({ content: `<@${member.id}>`, embeds: [notificationEmbed] })
                                .then((d) => sendedTo.push(`${nameCleaner(member.displayName, true)} получил текстовое оповещение`));
                        }
                        else {
                            console.error(`[Error code: 1212]`, e.requestBody.json.components);
                        }
                    });
                }));
                const finishEmbed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setTitle(`Оповещение доставлено ${sendedTo.length} участникам из ${raidMembersLength} записавшихся`);
                sendedTo.length === 0 ? [] : finishEmbed.setDescription(sendedTo.join("\n") || "nothing");
                message.edit({ components: [], embeds: [finishEmbed] }).catch((e) => console.error(`[Error code: 1660]`, e));
                return;
            }
            async function handleEditAction(collectorInteraction) {
                const RaidModal = new ModalBuilder().setTitle(`Измените текст оповещения`).setCustomId(RaidAdditionalFunctional.modalEdit);
                const RaidModal_title = new TextInputBuilder()
                    .setLabel("Заголовок")
                    .setStyle(TextInputStyle.Short)
                    .setCustomId(RaidNotifyEdit.title)
                    .setPlaceholder(modalTitle.slice(0, 100) || "Укажите заголовок оповещения")
                    .setValue(modalTitle || "")
                    .setRequired(false)
                    .setMaxLength(128);
                const RaidModal_description = new TextInputBuilder()
                    .setLabel("Описание")
                    .setStyle(TextInputStyle.Paragraph)
                    .setCustomId(RaidNotifyEdit.description)
                    .setPlaceholder(modalDescription.slice(0, 100) || "Укажите описание набора")
                    .setValue(modalDescription || "")
                    .setRequired(false)
                    .setMaxLength(1024);
                const RaidModal_image = new TextInputBuilder()
                    .setLabel("Изображение")
                    .setStyle(TextInputStyle.Short)
                    .setCustomId(RaidNotifyEdit.imageURL || null)
                    .setPlaceholder(modalImage.slice(0, 100) || "Укажите ссылку на изображение набора")
                    .setValue(modalImage || "")
                    .setRequired(false);
                RaidModal.setComponents([
                    new ActionRowBuilder().addComponents(RaidModal_title),
                    new ActionRowBuilder().addComponents(RaidModal_description),
                    new ActionRowBuilder().addComponents(RaidModal_image),
                ]);
                interactionResponded = false;
                await collectorInteraction.showModal(RaidModal);
                const interactionSubmit = await collectorInteraction.awaitModalSubmit({
                    time: 60 * 1000 * 10,
                });
                if (interactionResponded === true)
                    return;
                try {
                    interactionResponded = true;
                    interactionSubmit.deferUpdate();
                }
                catch (error) {
                    console.error(`[Error code: 1661] Edit button was deferred multiple times`);
                    return;
                }
                const raidEditedTitle = interactionSubmit.fields.getTextInputValue(RaidNotifyEdit.title).trim();
                const raidEditedDescription = interactionSubmit.fields.getTextInputValue(RaidNotifyEdit.description).trim();
                const raidEditedImage = interactionSubmit.fields.getTextInputValue(RaidNotifyEdit.imageURL).trim();
                if (!raidEditedTitle && !raidEditedDescription && !raidEditedImage) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(colors.error)
                        .setAuthor({ name: `Ошибка. Нельзя не указать все поля`, iconURL: icons.close });
                    return await collectorInteraction.followUp({ embeds: [errorEmbed], ephemeral: true });
                }
                const editableEmbed = EmbedBuilder.from(collectorInteraction.message.embeds[0]);
                try {
                    if (raidEditedTitle.length > 0) {
                        editableEmbed.setAuthor({ name: raidEditedTitle, iconURL: icons.notify });
                    }
                    else {
                        editableEmbed.setAuthor(null);
                    }
                    modalTitle = raidEditedTitle;
                }
                catch (error) {
                    collectorInteraction.followUp({ content: `Не удалось изменить заголовок набора`, ephemeral: true });
                }
                try {
                    editableEmbed.setDescription(descriptionFormatter(raidEditedDescription) || null);
                    modalDescription = raidEditedDescription;
                }
                catch (error) {
                    collectorInteraction.followUp({ content: `Не удалось изменить описание набора`, ephemeral: true });
                }
                try {
                    editableEmbed.setImage(raidEditedImage || null);
                    modalImage = raidEditedImage;
                }
                catch (error) {
                    collectorInteraction.followUp({ content: `Не удалось изменить изображение набора`, ephemeral: true });
                }
                await collectorInteraction.editReply({ embeds: [editableEmbed] });
                return;
            }
            async function handleCancelAction(message, collector) {
                const cancelEmbed = new EmbedBuilder().setColor(colors.invisible).setTitle("Оповещение участников отменено");
                await message.edit({ components: [], embeds: [cancelEmbed] });
                collector.stop("canceled");
            }
            const allVoiceChannels = guild.channels.cache.filter((chn) => chn.type === ChannelType.GuildVoice);
            let invite = member.voice.channel?.members.has(raidEvent.creator)
                ? await member.voice.channel?.createInvite({ reason: "Raid invite to raid leader", maxAge: 60 * 120 })
                : null;
            const raidVoiceChannels = member.guild.channels.cache
                .filter((chn) => chn.parentId === ids.raidChnCategoryId && chn.type === ChannelType.GuildVoice && chn.name.includes("Raid"))
                .reverse();
            let raidChnInvite = null;
            for await (const [_, voiceChannel] of raidVoiceChannels) {
                if (voiceChannel.members.has(raidEvent.creator)) {
                    if (!invite)
                        invite = await voiceChannel.createInvite({ reason: "Raid invite", maxAge: 60 * 120 });
                    break;
                }
                if (voiceChannel.userLimit === 0 || voiceChannel.userLimit - 6 > voiceChannel.members.size) {
                    raidChnInvite = await voiceChannel.createInvite({ reason: "Raid invite", maxAge: 60 * 120 });
                    break;
                }
            }
            const components = [
                new ButtonBuilder().setCustomId(RaidButtons.confirmNotify).setLabel("Отправить").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(RaidButtons.editNotify).setLabel("Изменить текст").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(RaidButtons.notifyCancel).setLabel("Отменить оповещение").setStyle(ButtonStyle.Danger),
            ];
            const linkComponent = [];
            if (invite) {
                linkComponent.push(new ButtonBuilder({ style: ButtonStyle.Link, url: invite.url, label: "Перейти к создателю рейда" }));
            }
            if (raidChnInvite) {
                linkComponent.push(new ButtonBuilder({ style: ButtonStyle.Link, url: raidChnInvite.url, label: "Перейти в рейдовый канал" }));
            }
            const raidLeaderEmbed = new EmbedBuilder()
                .setColor(colors.serious)
                .setAuthor({ name: `Отправьте заготовленное оповещение или измените его`, iconURL: icons.notify })
                .setDescription(`Рейдер, тебя оповестил ${raidEvent.creator === interaction.user.id ? "создатель рейда" : "администратор"} об скором старте.\n\nЗаходи в голосовой канал как можно скорее!`)
                .setImage(GIFImage);
            const message = await interaction.user.send({
                embeds: [raidLeaderEmbed],
                components: await addButtonComponentsToMessage(components),
            });
            const collector = message.createMessageComponentCollector({
                filter: (interaction) => interaction.user.id === member.id,
                time: 60 * 1000 * 10,
            });
            const interactionId = interaction.id;
            collector.on("collect", async (collectorInteraction) => {
                if (interactionId !== interaction.id)
                    return;
                switch (collectorInteraction.customId) {
                    case RaidAdditionalFunctional.confirm:
                        await sendNotificationToMembers(allVoiceChannels, raidEvent, linkComponent, guild, interaction, message);
                        break;
                    case RaidAdditionalFunctional.edit:
                        await handleEditAction(collectorInteraction);
                        break;
                    case RaidAdditionalFunctional.cancel:
                        await handleCancelAction(message, collector);
                        break;
                }
            });
            collector.on("end", (_, reason) => {
                if (reason === "time") {
                    const embed = EmbedBuilder.from(message.embeds[0]).setFooter({ text: "Время для редактирования вышло" });
                    message.edit({ components: [], embeds: [embed] });
                }
            });
        }
        else if (interaction.customId === RaidButtons.transfer) {
            const guildVoiceChannels = guild.channels.cache.filter((chn) => chn.isVoiceBased() && chn.members.size > 0);
            const membersCollection = [];
            guildVoiceChannels.forEach((voiceChannel) => {
                voiceChannel.members.forEach((memb) => membersCollection.push(memb));
            });
            const raidChns = guild.channels.cache.filter((chn) => chn.parentId === ids.raidChnCategoryId && chn.type === ChannelType.GuildVoice && chn.name.includes("Raid"));
            const freeRaidVC = raidChns.find((chn) => chn.type === ChannelType.GuildVoice && chn.members.has(raidEvent.creator)) ||
                raidChns.find((chn) => chn.type === ChannelType.GuildVoice && chn.userLimit > chn.members.size);
            const movedUsers = [];
            const alreadyMovedUsers = [];
            await Promise.all(raidEvent.joined.map(async (jId) => {
                const member = membersCollection.find((m) => m.id === jId);
                if (member) {
                    if (!freeRaidVC || freeRaidVC.type !== ChannelType.GuildVoice)
                        return console.error(`[Error code: 1213]`, freeRaidVC);
                    if (!freeRaidVC.members.has(member.id)) {
                        await member.voice.setChannel(freeRaidVC, `${interaction.user.username} переместил участников в рейдовый голосовой`);
                        movedUsers.push(`${nameCleaner(member.displayName, true)} был перемещен`);
                    }
                    else {
                        alreadyMovedUsers.push(`${nameCleaner(member.displayName, true)} уже в канале`);
                    }
                }
            }));
            const replyEmbed = new EmbedBuilder()
                .setColor(colors.success)
                .setTitle(`${movedUsers.length}/${raidEvent.joined.length - alreadyMovedUsers.length} пользователей перемещено`)
                .setDescription(`${movedUsers.join("\n") + "\n" + alreadyMovedUsers.join("\n")}`);
            (await deferredUpdate) && interaction.editReply({ embeds: [replyEmbed] });
        }
        else if (interaction.customId === RaidButtons.unlock) {
            const raidChannel = client.getCachedTextChannel(ids.raidChnId) || (await client.getCachedGuild().channels.fetch(ids.raidChnId));
            const raidMsg = raidChannel.messages.cache.get(raidEvent.messageId) || (await raidChannel.messages.fetch(raidEvent.messageId));
            async function raidButtonsUnlocker() {
                const inChannelMessageButtonRows = interaction.message.components.map((actionRow) => {
                    const inChannelMessageButtons = actionRow.components.map((component) => {
                        const unlockButton = component;
                        if (component.customId === RaidButtons.unlock && unlockButton) {
                            if (unlockButton.label === "Закрыть набор") {
                                return ButtonBuilder.from(unlockButton).setStyle(ButtonStyle.Success).setLabel("Открыть набор");
                            }
                            else if (unlockButton.label === "Открыть набор") {
                                return ButtonBuilder.from(unlockButton).setStyle(ButtonStyle.Danger).setLabel("Закрыть набор");
                            }
                        }
                        return ButtonBuilder.from(unlockButton);
                    });
                    return inChannelMessageButtons;
                });
                const raidMessageButtonRows = raidMsg.components.map((actionRow) => {
                    const raidMessageButtons = actionRow.components.map((component) => {
                        if (component.type === ComponentType.Button) {
                            if (component.customId === RaidButtons.join || component.customId === RaidButtons.alt) {
                                return ButtonBuilder.from(component).setDisabled(!component.disabled);
                            }
                            else {
                                return ButtonBuilder.from(component);
                            }
                        }
                        else {
                            throw { name: "Found unknown join button type", description: `${component.type}, ${raidEvent}` };
                        }
                    });
                    return raidMessageButtons;
                });
                return [raidMessageButtonRows, inChannelMessageButtonRows];
            }
            const [components, inChannelComponents] = await raidButtonsUnlocker();
            raidMsg.edit({
                components: components.map((components) => {
                    return { components, type: ComponentType.ActionRow };
                }),
            });
            interaction.message.edit({
                components: inChannelComponents.map((components) => {
                    return { components, type: ComponentType.ActionRow };
                }),
            });
        }
        else if (interaction.customId === RaidButtons.delete) {
            const embed = new EmbedBuilder()
                .setColor(colors.warning)
                .setAuthor({ name: `Подтвердите удаление рейда ${raidEvent.id}-${raidEvent.raid}`, iconURL: icons.warning });
            const components = [
                new ButtonBuilder().setCustomId(RaidButtons.deleteConfirm).setLabel("Подтвердить").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(RaidButtons.deleteCancel).setLabel("Отменить").setStyle(ButtonStyle.Secondary),
            ];
            await deferredUpdate;
            const message = await interaction.editReply({
                embeds: [embed],
                components: await addButtonComponentsToMessage(components),
            });
            const collector = interaction.channel.createMessageComponentCollector({
                message,
                time: 60 * 1000 * 2,
                max: 1,
                filter: (i) => i.user.id === interaction.user.id,
            });
            collector.on("collect", async (col) => {
                if (col.customId === RaidButtons.deleteConfirm) {
                    await removeRaid(raidEvent, col);
                }
                else if (col.customId === RaidButtons.deleteCancel) {
                    const canceledEmbed = new EmbedBuilder().setColor(colors.invisible).setTitle("Удаление рейда отменено");
                    col.update({ components: [], embeds: [canceledEmbed] });
                }
            });
            collector.on("end", async (_, reason) => {
                if (reason === "time") {
                    embed.setAuthor({ name: `Время для удаления вышло. Повторите снова`, iconURL: undefined }).setColor(colors.invisible);
                    interaction.editReply({ components: [], embeds: [embed] });
                }
            });
        }
        else if (interaction.customId === RaidButtons.resend) {
            return interaction.channel
                .send({ embeds: [interaction.message.embeds[0]], components: interaction.message.components })
                .then((msg) => {
                RaidEvent.update({ inChannelMessageId: msg.id }, { where: { channelId: interaction.channelId } }).then(async () => {
                    await interaction.message.delete();
                });
            });
        }
        else if (interaction.customId === RaidButtons.invite) {
            interaction.editReply({ content: "Under development" });
        }
    },
};
