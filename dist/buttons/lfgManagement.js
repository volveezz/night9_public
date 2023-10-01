import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { LFGController } from "../structures/LFGController.js";
import { Button } from "../structures/button.js";
import { validateAvailableOrInputedLfgId } from "../utils/discord/lfgSystem/v2/getAvailableLfgIdsForUser.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
const LFG_DELETION_TEXT = `Если Вы хотите изменить сбор, то не удаляйте сбор, а измените его с помощью команды: \`/сбор изменить\` (</lfg edit:1036145721696600134>)\n### Можно изменить следующие параметры сбора\n - Время: \`/сбор изменить новое-время:20:00 21/06\`\n - Описание: \`/сбор изменить новое-описание:Новое описание для сильных\`\n### В одной команде можно изменить сразу несколько параметров\n - \`/сбор изменить новая-активность:Шлем новое-требуемое-дополнение:Финальная форма\``;
const ButtonCommand = new Button({
    name: "lfgManagement",
    run: async ({ interaction }) => {
        const { customId, id: interactionId } = interaction;
        const lfgPart = customId.split("_").pop();
        const lfgId = parseInt(lfgPart, 10);
        if (!lfgId) {
            console.error("[Error code: 2058] Found invalid lfg Id", customId, interaction.user.id);
            throw { errorType: "LFG_NOT_FOUND", interaction };
        }
        await validateAvailableOrInputedLfgId(interaction.member || interaction.user.id, lfgId);
        switch (true) {
            case customId.startsWith("lfgManagement_lock"): {
                const deferUpdatePromise = interaction.deferUpdate();
                const embed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Сбор закрыт", iconURL: icons.success });
                await LFGController.getInstance().toggleLfgButtons(lfgId, true);
                (await deferUpdatePromise) && interaction.followUp({ embeds: [embed], ephemeral: true });
                const components = interaction.message.components[0].components;
                const button = interaction.message.components[0].components.find((b) => b.customId?.startsWith("lfgManagement_lock"));
                const buttonBuilder = ButtonBuilder.from(button);
                buttonBuilder
                    .setLabel("Открыть сбор")
                    .setCustomId("lfgManagement_unlock" + `_${lfgId}`)
                    .setStyle(ButtonStyle.Success);
                interaction.message.edit({
                    components: addButtonsToMessage([
                        buttonBuilder,
                        ...components
                            .filter((c) => !c.customId?.startsWith(button.customId))
                            .map((c) => ButtonBuilder.from(c)),
                    ]),
                });
                break;
            }
            case customId.startsWith("lfgManagement_unlock"): {
                const deferUpdatePromise = interaction.deferUpdate();
                const embed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Сбор открыт", iconURL: icons.success });
                await LFGController.getInstance().toggleLfgButtons(lfgId, false);
                (await deferUpdatePromise) && interaction.followUp({ embeds: [embed], ephemeral: true });
                const components = interaction.message.components[0].components;
                const button = interaction.message.components[0].components.find((b) => b.customId?.startsWith("lfgManagement_unlock"));
                const buttonBuilder = ButtonBuilder.from(button);
                buttonBuilder
                    .setLabel("Закрыть сбор")
                    .setCustomId("lfgManagement_lock" + `_${lfgId}`)
                    .setStyle(ButtonStyle.Danger);
                interaction.message.edit({
                    components: addButtonsToMessage([
                        buttonBuilder,
                        ...components
                            .filter((c) => !c.customId?.startsWith(button.customId))
                            .map((c) => ButtonBuilder.from(c)),
                    ]),
                });
                break;
            }
            case customId.startsWith("lfgManagement_resendMainMessage"): {
                const embed = new EmbedBuilder();
                const lfgInstance = LFGController.getInstance();
                const lfgCache = lfgInstance.getCacheById(lfgId);
                if (!lfgCache) {
                    embed.setColor(colors.error).setAuthor({ name: "Произошла ошибка. Сбор не найден", iconURL: icons.error });
                    interaction.reply({ ephemeral: true, embeds: [embed] });
                    return;
                }
                lfgCache.message?.delete();
                lfgCache.message = null;
                await lfgInstance.updateMessage(lfgCache);
                embed.setColor(colors.success).setAuthor({ name: "Сообщение обновлено", iconURL: icons.success });
                interaction.reply({ ephemeral: true, embeds: [embed] });
                return;
            }
            case customId.startsWith("lfgManagement_resendManagementMessage"): {
                const lfg = LFGController.getInstance().getCacheById(lfgId);
                const embed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Сообщение обновлено", iconURL: icons.success });
                if (lfg) {
                    lfg.managementMessage?.delete();
                    lfg.managementMessage = null;
                    await LFGController.getInstance().sendOrUpdateManagementMessage(lfg);
                    await interaction.reply({ ephemeral: true, embeds: [embed] });
                }
                else {
                    await interaction.reply({
                        ephemeral: true,
                        embeds: [
                            embed
                                .setColor(colors.error)
                                .setAuthor({ name: "Произошла ошибка во время обновления сообщения", iconURL: icons.error }),
                        ],
                    });
                }
                return;
            }
            case customId.startsWith("lfgManagement_delete"): {
                const deferredReply = interaction.deferReply({ ephemeral: true });
                const confirmButtons = [
                    new ButtonBuilder()
                        .setCustomId("lfgSubManagement_deleteConfirm")
                        .setLabel("Подтвердить удаление")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId("lfgSubManagement_deleteCancel").setLabel("Отменить").setStyle(ButtonStyle.Secondary),
                ];
                const embed = new EmbedBuilder()
                    .setColor(colors.warning)
                    .setAuthor({ name: `Подтвердите удаление сбора ${lfgId}`, iconURL: icons.warning })
                    .setDescription(LFG_DELETION_TEXT);
                await deferredReply;
                await interaction.editReply({
                    embeds: [embed],
                    components: addButtonsToMessage(confirmButtons),
                });
                const collector = interaction.channel.createMessageComponentCollector({
                    time: 60 * 1000 * 2,
                    max: 1,
                    filter: (i) => i.user.id === interaction.user.id,
                    componentType: ComponentType.Button,
                });
                collector.on("collect", async (col) => {
                    if (interactionId !== interaction.id)
                        return;
                    if (col.customId === "lfgSubManagement_deleteConfirm") {
                        await LFGController.getInstance().deleteLFG(lfgId);
                        const embed = new EmbedBuilder().setColor(colors.success).setAuthor({ name: "Сбор удален", iconURL: icons.success });
                        try {
                            await col.update({ components: [], embeds: [embed] });
                        }
                        catch (error) {
                            console.error("[Error code: 2065] Failed to update deletion message");
                        }
                    }
                    else if (col.customId === "lfgSubManagement_deleteCancel") {
                        const canceledEmbed = new EmbedBuilder().setColor(colors.invisible).setTitle("Удаление сбора отменено");
                        await col.update({ components: [], embeds: [canceledEmbed] });
                    }
                });
                collector.on("end", async (_, reason) => {
                    if (reason === "time") {
                        embed.setAuthor({ name: "Время для удаления вышло. Повторите снова", iconURL: undefined }).setColor(colors.invisible);
                        await interaction.editReply({ components: [], embeds: [embed] });
                    }
                });
                break;
            }
        }
    },
});
export default ButtonCommand;
//# sourceMappingURL=lfgManagement.js.map