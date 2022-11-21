import { EmbedBuilder } from "discord.js";
import { Op } from "sequelize";
import { ownerId } from "../base/ids.js";
import { auth_data } from "../handlers/sequelize.js";
import fetch from "node-fetch";
export default {
    callback: async (_client, interaction, _member, _guild, _channel) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        if (interaction.user.id === ownerId)
            return deferredReply.then((v) => interaction.editReply({ content: "Вам нельзя вступать в клан" }));
        const authData = await auth_data.findAll({
            attributes: ["clan", "bungie_id", "platform", "access_token"],
            where: {
                [Op.or]: [{ discord_id: interaction.user.id }, { discord_id: ownerId }],
            },
        });
        if (authData.length !== 2)
            throw {
                name: "Ошибка. Вы не зарегистрированы",
                message: `Для использования этого функционала вы должны быть зарегистрированы\n\nВведите \`/init\` и перейдите по ссылке в сообщении`,
            };
        if (authData[0].discord_id === ownerId) {
            var { clan: invitee_clan, bungie_id: invitee_bungie_id, platform: invitee_platform } = authData[1];
            var { access_token: inviter_access_token } = authData[0];
        }
        else {
            var { clan: invitee_clan, bungie_id: invitee_bungie_id, platform: invitee_platform } = authData[0];
            var { access_token: inviter_access_token } = authData[1];
        }
        if (authData.length === 2) {
            if (invitee_clan === true) {
                interaction.channel?.isDMBased()
                    ? interaction.channel?.messages.fetch(interaction.message.id).then(async (msg) => {
                        msg.edit({ components: [] });
                    })
                    : "";
                await deferredReply;
                interaction.editReply("Вы уже являетесь участником нашего клана :)");
                return;
            }
            const clanInviteRequest = await (await fetch(`https://www.bungie.net/platform/GroupV2/4123712/Members/IndividualInvite/${invitee_platform}/${invitee_bungie_id}/`, {
                method: "POST",
                headers: { "X-API-Key": process.env.XAPI, Authorization: `Bearer ${inviter_access_token}` },
                body: JSON.stringify({ message: "Автоматическое приглашение в клан Night 9" }),
            })).json();
            if (clanInviteRequest.ErrorCode === 1) {
                const embed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Приглашение было отправлено")
                    .setDescription(`Принять приглашение можно в игре или на [сайте Bungie](https://www.bungie.net/ru/ClanV2?groupId=4123712)`);
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
                if (!interaction.channel?.isDMBased())
                    return;
                interaction.channel?.messages
                    .fetch(interaction.message.id)
                    .then((msg) => {
                    const reEmbed = EmbedBuilder.from(msg.embeds[0]).setDescription(null);
                    msg.edit({ components: [], embeds: [reEmbed] });
                })
                    .catch((err) => {
                    if (err.code !== 10008)
                        console.error(`[Error code: 1107]`, err);
                });
            }
            else if (clanInviteRequest.ErrorCode === 676) {
                const embed = new EmbedBuilder().setColor("DarkGreen").setTitle("Вы уже участник нашего клана :)");
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
                if (!interaction.channel?.isDMBased())
                    return;
                interaction.channel?.messages.fetch(interaction.message.id).then((msg) => {
                    const reEmbed = EmbedBuilder.from(msg.embeds[0]).setDescription(null);
                    msg.edit({ components: [], embeds: [reEmbed] });
                });
                return;
            }
            else {
                console.error(clanInviteRequest);
                throw { name: "Неожиданная ошибка" };
            }
        }
        else {
            throw { name: "Произошла неизвестная ошибка", message: "Возможно, вы уже участник нашего клана" };
        }
    },
};
