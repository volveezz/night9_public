import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, ModalBuilder, RESTJSONErrorCodes, TextInputBuilder, TextInputStyle, } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { client } from "../../index.js";
import { addButtonsToMessage } from "../../utils/general/addButtonsToMessage.js";
import nameCleaner from "../../utils/general/nameClearer.js";
import { descriptionFormatter, getRandomRaidGIF } from "../../utils/general/utilities.js";
async function notifyInChannelButton({ deferredUpdate, interaction, raidEvent, guild, member }) {
    await deferredUpdate;
    interaction.editReply({
        content: `Перейдите в [личные сообщения](https://discord.com/channels/@me/${client.user.dmChannel?.id || "774617169169743872"}) для настройки и отправки оповещения`,
    });
    const GIFImage = (await getRandomRaidGIF()) || "https://media.giphy.com/media/cKJZAROeOx7MfU6Kws/giphy.gif";
    let modalTitle = `Рейдовое оповещение ${raidEvent.id}-${raidEvent.raid}`;
    let modalDescription = `Рейдер, тебя оповестил ${raidEvent.creator === interaction.user.id ? "создатель рейда" : "администратор"} об скором старте.\n\nЗаходи в голосовой канал как можно скорее!`;
    let modalImage = GIFImage;
    let interactionResponded = false;
    async function sendNotificationToMembers(raidEvent, linkComponent, interaction, message) {
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
        const linkButton = [
            {
                type: ComponentType.ActionRow,
                components: linkComponent,
            },
        ];
        const cachedMembers = client.getCachedMembers();
        const creatorVoiceChannel = guild.channels.cache.filter((ch) => ch.type === ChannelType.GuildVoice).find((m) => m.id === raidEvent.creator);
        await Promise.all(raidEvent.joined.map(async (id) => {
            const member = cachedMembers.get(id);
            if (!member)
                return console.error("[Error code: 1211]", id, member);
            if (member.id === raidEvent.creator || (creatorVoiceChannel && creatorVoiceChannel.members.has(member.id)))
                return;
            await member
                .send({
                embeds: [notificationEmbed],
                components: linkComponent.length > 0 ? linkButton : undefined,
            })
                .then((_) => sendedTo.push(`${nameCleaner(member.displayName, true)} получил оповещение`))
                .catch(async (e) => {
                if (e.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
                    await channel
                        .send({ content: `<@${member.id}>`, embeds: [notificationEmbed] })
                        .then((d) => sendedTo.push(`${nameCleaner(member.displayName, true)} получил текстовое оповещение`));
                }
                else {
                    console.error("[Error code: 1212]", e.requestBody.json.components);
                }
            });
        }));
        const finishEmbed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle(`Оповещение доставлено ${sendedTo.length} участникам из ${raidMembersLength} записавшихся`);
        sendedTo.length === 0 ? [] : finishEmbed.setDescription(sendedTo.join("\n") || "nothing");
        message.edit({ components: [], embeds: [finishEmbed] }).catch((e) => console.error("[Error code: 1660]", e));
        return;
    }
    async function handleEditAction(collectorInteraction) {
        const RaidModal = new ModalBuilder().setTitle("Измените текст оповещения").setCustomId("raidAddFunc_modal_edit");
        const RaidModal_title = new TextInputBuilder()
            .setLabel("Заголовок")
            .setStyle(TextInputStyle.Short)
            .setCustomId("RaidNotifyEdit_title")
            .setPlaceholder(modalTitle.slice(0, 100) || "Укажите заголовок оповещения")
            .setValue(modalTitle || "")
            .setRequired(false)
            .setMaxLength(128);
        const RaidModal_description = new TextInputBuilder()
            .setLabel("Описание")
            .setStyle(TextInputStyle.Paragraph)
            .setCustomId("RaidNotifyEdit_description")
            .setPlaceholder(modalDescription.slice(0, 100) || "Укажите описание набора")
            .setValue(modalDescription || "")
            .setRequired(false)
            .setMaxLength(1024);
        const RaidModal_image = new TextInputBuilder()
            .setLabel("Изображение")
            .setStyle(TextInputStyle.Short)
            .setCustomId("RaidNotifyEdit_image" || null)
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
            const replyEmbed = new EmbedBuilder()
                .setColor(colors.serious)
                .setAuthor({ name: "Оповещение изменено", iconURL: icons.notify })
                .setDescription("Нажмите на кнопку ` Отправить ` для отправки оповещения участникам рейда");
            interactionSubmit.reply({ embeds: [replyEmbed], ephemeral: true });
        }
        catch (error) {
            console.error("[Error code: 1661] Edit button was deferred multiple times");
            return;
        }
        const raidEditedTitle = interactionSubmit.fields.getTextInputValue("RaidNotifyEdit_title").trim();
        const raidEditedDescription = interactionSubmit.fields.getTextInputValue("RaidNotifyEdit_description").trim();
        const raidEditedImage = interactionSubmit.fields.getTextInputValue("RaidNotifyEdit_image").trim();
        if (!raidEditedTitle && !raidEditedDescription && !raidEditedImage) {
            const errorEmbed = new EmbedBuilder()
                .setColor(colors.error)
                .setAuthor({ name: "Ошибка. Нельзя не указать все поля", iconURL: icons.close });
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
            collectorInteraction.followUp({ content: "Не удалось изменить заголовок набора", ephemeral: true });
        }
        try {
            editableEmbed.setDescription(descriptionFormatter(raidEditedDescription) || null);
            modalDescription = raidEditedDescription;
        }
        catch (error) {
            collectorInteraction.followUp({ content: "Не удалось изменить описание набора", ephemeral: true });
        }
        try {
            editableEmbed.setImage(raidEditedImage || null);
            modalImage = raidEditedImage;
        }
        catch (error) {
            collectorInteraction.followUp({ content: "Не удалось изменить изображение набора", ephemeral: true });
        }
        await collectorInteraction.editReply({ embeds: [editableEmbed] });
        return;
    }
    async function handleCancelAction(message, collector) {
        const cancelEmbed = new EmbedBuilder().setColor(colors.invisible).setTitle("Оповещение участников отменено");
        await message.edit({ components: [], embeds: [cancelEmbed] });
        collector.stop("canceled");
    }
    let invite = member.voice.channel?.members.has(raidEvent.creator)
        ? await member.voice.channel?.createInvite({ reason: "Raid invite to raid leader", maxAge: 60 * 120 })
        : null;
    const raidVoiceChannels = member.guild.channels.cache
        .filter((chn) => chn.parentId === process.env.RAID_CATEGORY && chn.type === ChannelType.GuildVoice && chn.name.includes("Raid"))
        .reverse();
    let raidChnInvite = null;
    for (const [_, voiceChannel] of raidVoiceChannels) {
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
        new ButtonBuilder().setCustomId("raidAddFunc_notify_confirm").setLabel("Отправить").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("raidAddFunc_notify_edit").setLabel("Изменить текст").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("raidAddFunc_notify_cancel").setLabel("Отменить оповещение").setStyle(ButtonStyle.Danger),
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
        .setAuthor({ name: "Отправьте заготовленное оповещение или измените его", iconURL: icons.notify })
        .setDescription(`Рейдер, тебя оповестил ${raidEvent.creator === interaction.user.id ? "создатель рейда" : "администратор"} об скором старте.\n\nЗаходи в голосовой канал как можно скорее!`)
        .setImage(GIFImage);
    let message = null;
    try {
        message = await interaction.user.send({
            embeds: [raidLeaderEmbed],
            components: addButtonsToMessage(components),
        });
    }
    catch (error) {
        if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
            throw { errorType: "CLOSED_DM" };
        }
        else {
            console.error("[Error code: 1960] Unexpected error", error);
        }
    }
    if (!message)
        return;
    const collector = message.createMessageComponentCollector({
        filter: (interaction) => interaction.user.id === member.id,
        time: 60 * 1000 * 10,
        componentType: ComponentType.Button,
    });
    const interactionId = interaction.id;
    collector.on("collect", async (collectorInteraction) => {
        if (interactionId !== interaction.id)
            return;
        switch (collectorInteraction.customId) {
            case "raidAddFunc_notify_confirm":
                await sendNotificationToMembers(raidEvent, linkComponent, interaction, message);
                break;
            case "raidAddFunc_notify_edit":
                await handleEditAction(collectorInteraction);
                break;
            case "raidAddFunc_notify_cancel":
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
export default notifyInChannelButton;
//# sourceMappingURL=notifyInChannelButton.js.map