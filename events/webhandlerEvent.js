import { EmbedBuilder } from "discord.js";
import { Op } from "sequelize";
import { ownerId } from "../base/ids.js";
import { auth_data } from "../handlers/sequelize.js";
import fetch from "node-fetch";
const inviteCd = new Set();
export default {
    callback: async (_client, interaction, _member, _guild, _channel) => {
        if (interaction.customId !== "webhandlerEvent_clan_request")
            return;
        await interaction.deferReply({ ephemeral: true });
        if (inviteCd.has(interaction.user.id) || interaction.user.id === ownerId) {
            throw {
                name: "Время вышло",
                message: `Приглашения действуют лишь в течении 15-ти минут\nДля вступления в клан вручную подайте заявку через [сайт bungie.net](https://www.bungie.net/ru/ClanV2?groupid=4123712)`,
            };
        }
        const authData = await auth_data.findAll({
            attributes: ["clan", "bungie_id", "platform", "access_token"],
            where: {
                [Op.or]: [{ discord_id: interaction.user.id }, { discord_id: ownerId }],
            },
        });
        if (authData[0].toJSON().discord_id === ownerId) {
            var { clan: invitee_clan, bungie_id: invitee_bungie_id, platform: invitee_platform } = authData[1].toJSON();
            var { access_token: inviter_access_token } = authData[0].toJSON();
        }
        else {
            var { clan: invitee_clan, bungie_id: invitee_bungie_id, platform: invitee_platform } = authData[0].toJSON();
            var { access_token: inviter_access_token } = authData[1].toJSON();
        }
        if (authData.length === 2) {
            if (invitee_clan === true) {
                interaction.channel?.messages.fetch(interaction.message.id).then((msg) => {
                    const reEmbed = EmbedBuilder.from(msg.embeds[0]);
                    reEmbed.setDescription(null);
                    msg.edit({ components: [] });
                    interaction.editReply({ embeds: [reEmbed] });
                });
                return;
            }
            try {
                const fetchQuery = await fetch(`https://www.bungie.net/platform/GroupV2/4123712/Members/IndividualInvite/${invitee_platform}/${invitee_bungie_id}/`, {
                    headers: { "X-API-Key": process.env.XAPI, Authorization: `Bearer ${inviter_access_token}` },
                    body: JSON.stringify({ message: "IndividualInvite" }),
                });
                var request = fetchQuery;
            }
            catch (err) {
                if (err.error.ErrorCode === 676) {
                    const embed = new EmbedBuilder().setColor("DarkGreen").setTitle("Вы уже участник нашего клана :)");
                    interaction.editReply({ embeds: [embed] });
                    interaction.channel?.messages.fetch(interaction.message.id).then((msg) => {
                        const reEmbed = EmbedBuilder.from(msg.embeds[0]).setDescription(null);
                        msg.edit({ components: [], embeds: [reEmbed] });
                    });
                    return;
                }
                else {
                    console.error(err.error);
                    return;
                }
            }
            console.log("webHanderEvent clan invite debug", request.resolution);
            if (true) {
                const embed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Приглашение было отправлено")
                    .setDescription(`Приглашение будет действительно лишь в течении 15-ти минут`);
                interaction.editReply({ embeds: [embed] });
                interaction.channel?.messages
                    .fetch(interaction.message.id)
                    .then((msg) => {
                    const reEmbed = EmbedBuilder.from(msg.embeds[0]).setDescription(null);
                    msg.edit({ components: [], embeds: [reEmbed] });
                })
                    .catch((err) => {
                    if (err.code !== 10008)
                        console.error(err);
                });
                setTimeout(() => {
                    inviteCd.add(interaction.user.id);
                    fetch(`https://www.bungie.net/platform/GroupV2/4123712/Members/IndividualInviteCancel/${invitee_platform}/${invitee_bungie_id}/`, {
                        headers: { "X-API-Key": process.env.XAPI, Authorization: `Bearer ${inviter_access_token}` },
                    }).catch((e) => {
                        return console.error("webHandler invite cancel err", e);
                    });
                }, 1000 * 60 * 16);
            }
            else {
                throw { name: "Произошла неизвестная ошибка" };
            }
        }
        else {
            throw { name: "Произошла неизвестная ошибка" };
        }
    },
};
