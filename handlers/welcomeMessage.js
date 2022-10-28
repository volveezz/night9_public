import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { statusRoles } from "../base/roles.js";
import { colors } from "../base/colors.js";
import { guildId } from "../base/ids.js";
import { clan } from "../base/channels.js";
import { auth_data } from "./sequelize.js";
export async function welcomeMessage(client, member) {
    member.roles
        .add(statusRoles.newbie)
        .catch((err) => console.error(err.code === 50013 ? `welcomeMessage err: Missing permissions to give role to ${member.displayName}` : err));
    const embed = new EmbedBuilder()
        .setColor(colors.default)
        .setAuthor({
        name: "Добро пожаловать на сервер клана Night 9",
        iconURL: client.guilds.cache.get(guildId)?.iconURL() || client.user?.displayAvatarURL(),
    })
        .setTimestamp()
        .addFields({
        name: "Вступление в клан",
        value: `⁣　⁣Для вступления в клан перейдите в канал <#${clan.joinRequest.chnId}> и следуйте [инструкции](https://discord.com/channels/${guildId}/${clan.joinRequest.chnId}/${clan.joinRequest.joinRequestGuideMessageId})`,
    }, {
        name: "Общение без вступления",
        value: `⁣　⁣Для получения доступа к каналам сервера вам достаточно зарегистрироваться через кнопку ниже`,
    }, {
        name: "FAQ",
        value: `⁣　По каким-либо вопросам вы можете задать их напрямую в этом чате или в канале <#${clan.questionChnId}>`,
    });
    member
        .send({
        embeds: [embed],
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    new ButtonBuilder().setCustomId(`initEvent_register`).setLabel("Регистрация").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`clanJoinEvent_modalBtn`).setLabel("Форма на вступление").setStyle(ButtonStyle.Secondary),
                ],
            },
        ],
    })
        .then((m) => {
        setTimeout(() => {
            auth_data
                .findOne({
                where: { discord_id: member.id },
                attributes: ["displayname", "membership_id"],
            })
                .then((data) => {
                if (data !== null) {
                    embed.addFields([
                        {
                            name: "Регистрация восстановлена",
                            value: `⁣　⁣Ранее вы уже регистрировались под аккаунтом ${data.displayname} ([bungie.net](https://www.bungie.net/7/ru/User/Profile/254/${data.membership_id}))`,
                        },
                    ]);
                    m.edit({
                        embeds: [embed],
                        components: [
                            {
                                type: ComponentType.ActionRow,
                                components: [
                                    new ButtonBuilder()
                                        .setCustomId(`clanJoinEvent_modalBtn`)
                                        .setLabel("Форма на вступление")
                                        .setStyle(ButtonStyle.Secondary),
                                ],
                            },
                        ],
                    });
                }
            });
        }, 3333);
    })
        .catch((err) => {
        console.error(err.code === 50007 ? `welcomeMessage err: ${member.displayName} blocked DMs from server members` : err);
    });
}
