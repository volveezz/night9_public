import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { client } from "../index.js";
import { clan } from "../configs/channels.js";
import colors from "../configs/colors.js";
import { guildId } from "../configs/ids.js";
import { statusRoles } from "../configs/roles.js";
import { AuthData } from "../handlers/sequelize.js";
import { ClanButtons, RegisterButtons } from "../enums/Buttons.js";
export default function welcomeMessage(member) {
    member.roles
        .add(statusRoles.newbie)
        .catch((err) => console.error(err.code === 50013 ? `[Error code: 1128] Failed to assign role to ${member.displayName}` : err));
    const embed = new EmbedBuilder()
        .setColor(colors.default)
        .setAuthor({
        name: `Добро пожаловать на сервер клана ${client.guilds.cache.get(guildId)?.name ?? "Night 9"}`,
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
                    new ButtonBuilder().setCustomId(RegisterButtons.register).setLabel("Регистрация").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(ClanButtons.modal).setLabel("Форма на вступление").setStyle(ButtonStyle.Secondary),
                ],
            },
        ],
    })
        .then((m) => {
        setTimeout(async () => {
            const data = await AuthData.findOne({
                where: { discordId: member.id },
                attributes: ["displayName", "membershipId"],
            });
            if (data) {
                embed.addFields([
                    {
                        name: "Регистрация восстановлена",
                        value: `⁣　⁣Ранее вы уже регистрировались под аккаунтом ${data.displayName} ([bungie.net](https://www.bungie.net/7/ru/User/Profile/254/${data.membershipId}))`,
                    },
                ]);
                m.edit({
                    embeds: [embed],
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder().setCustomId(ClanButtons.modal).setLabel("Форма на вступление").setStyle(ButtonStyle.Secondary),
                            ],
                        },
                    ],
                });
            }
        }, 2500);
    })
        .catch((err) => console.error(err.code === 50007 ? `[Error code: 1129] ${member.displayName} blocked DM from server members` : `[Error code: 1130] ${err.stack ?? err}`));
}
