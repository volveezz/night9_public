import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import welcomeMessage from "../utils/discord/welcomeMessage.js";
import { AuthData, LeavedUsersData, database } from "../utils/persistence/sequelize.js";
const guildMemberChannel = client.getCachedTextChannel(ids.guildMemberChnId);
export default new Event("guildMemberAdd", (member) => {
    welcomeMessage(member);
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setAuthor({
        name: "Присоединился новый участник",
        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086264591706771488/3600-icon-join.png",
    })
        .setFooter({ text: String(`Id: ` + member.id) })
        .setDescription(`<@${member.id}> ${member.user.username}#${member.user.discriminator}`)
        .addFields({
        name: "Дата создания аккаунта",
        value: String("<t:" + Math.round(member.user.createdTimestamp / 1000) + ">"),
    })
        .setThumbnail(String(member.displayAvatarURL()));
    if (member.communicationDisabledUntil !== null) {
        embed.addFields([
            {
                name: "Тайм-аут до",
                value: String(`<t:${Math.round(member.communicationDisabledUntilTimestamp / 1000)}>`),
            },
        ]);
    }
    guildMemberChannel.send({ embeds: [embed] }).then(async (m) => {
        const data = await LeavedUsersData.findOne({
            where: { discordId: member.id },
        });
        if (!data)
            return;
        const transaction = await database.transaction();
        const embed = m.embeds[0];
        try {
            await AuthData.create({
                discordId: data.discordId,
                bungieId: data.bungieId,
                displayName: data.displayName,
                platform: data.platform ?? 3,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                membershipId: data.membershipId,
                timezone: data.timezone ?? 3,
            }, {
                transaction,
            });
            await LeavedUsersData.destroy({
                where: { discordId: data.discordId },
                transaction,
                limit: 1,
            });
            embed.fields.push({
                name: "Данные аккаунта восстановлены",
                value: `${data.displayName} (${data.platform}/${data.bungieId})`,
            });
            await transaction.commit();
            m.edit({ embeds: [embed] });
        }
        catch (error) {
            await transaction.rollback();
            embed.fields.push({
                name: "Ошибка",
                value: "Во время восстановления данных произошла ошибка",
            });
            console.error(`[Error code: 1131]`, error, data, transaction);
            m.edit({ embeds: [embed] });
        }
    });
});
