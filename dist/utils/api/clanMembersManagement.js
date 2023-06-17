import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { getAdminAccessToken } from "../../commands/clanCommand.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { groupId } from "../../configs/ids.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import getClanMemberData from "./getClanMemberData.js";
import kickClanMember from "./kickClanMember.js";
async function kickMemberFromClan(id, interaction) {
    const memberData = await getClanMemberData(id);
    if (!memberData || (!memberData.bungieId && !memberData.member)) {
        throw { name: "Ошибка. Пользователь не найден" };
    }
    if (!memberData.group || memberData.group.groupId !== groupId) {
        throw {
            name: "Ошибка. Пользователь уже не в клане",
            ...(memberData.group != null ? { description: `Пользователь в клане: ${memberData.group.name}` } : {}),
        };
    }
    const memberDisplayName = memberData.displayName ||
        memberData.member?.destinyUserInfo.bungieGlobalDisplayName ||
        memberData.member?.destinyUserInfo.LastSeenDisplayName ||
        memberData.member?.destinyUserInfo.displayName;
    const embed = new EmbedBuilder().setColor(colors.warning).setAuthor({
        name: `Подтвердите исключение ${memberDisplayName} из клана`,
        iconURL: icons.warning,
    });
    const components = [
        new ButtonBuilder().setCustomId("clanSystem_confirmKick").setLabel("Подтвердить").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("clanSystem_cancelKick").setLabel("Отменить").setStyle(ButtonStyle.Secondary),
    ];
    const confirmationMessage = await interaction.editReply({ embeds: [embed], components: await addButtonsToMessage(components) });
    const collector = confirmationMessage.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        max: 1,
        message: confirmationMessage,
        time: 1000 * 60 * 5,
    });
    const adminAccessToken = await getAdminAccessToken(interaction.user.id);
    if (!adminAccessToken) {
        throw { name: "Ошибка. Ваш токен авторизации не найден" };
    }
    collector.on("collect", async (collected) => {
        const { customId } = collected;
        switch (customId) {
            case "clanSystem_confirmKick": {
                const deferredReply = collected.deferReply({ ephemeral: true });
                const errorCode = await kickClanMember((memberData.platform || memberData.member?.destinyUserInfo.membershipType), (memberData.bungieId || memberData.member?.destinyUserInfo.membershipId), adminAccessToken);
                let embed = new EmbedBuilder();
                if (errorCode === 1) {
                    embed.setColor(colors.success).setAuthor({ name: `${memberDisplayName} был исключен`, iconURL: icons.success });
                }
                else {
                    embed
                        .setColor(colors.error)
                        .setAuthor({ name: `Произошла ошибка во время исключения ${memberDisplayName}`, iconURL: icons.error });
                }
                await deferredReply;
                collected.editReply({ embeds: [embed] });
                return;
            }
            case "clanSystem_cancelKick": {
                await collected.deferUpdate();
                return;
            }
        }
    });
    collector.on("end", async () => await interaction.deleteReply());
    return memberData;
}
export default kickMemberFromClan;
