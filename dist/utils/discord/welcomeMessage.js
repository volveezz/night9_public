import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { ClanButtons, RegisterButtons } from "../../configs/Buttons.js";
import { clan } from "../../configs/channels.js";
import colors from "../../configs/colors.js";
import { guildId } from "../../configs/ids.js";
import { statusRoles } from "../../configs/roles.js";
import { escapeString } from "../general/utilities.js";
import { AuthData } from "../persistence/sequelize.js";
export default function welcomeMessage(member) {
    member.roles
        .add(statusRoles.newbie)
        .catch((err) => console.error(err.code === 50013 ? `[Error code: 1128] Failed to assign role to ${member.displayName}` : err));
    const welcomeEmbed = new EmbedBuilder()
        .setColor(colors.invisible)
        .setTitle(` Приветствуем Вас на сервере `)
        .setDescription(`Вы зашли на сервер [клана Night 9](https://www.bungie.net/ru/ClanV2?groupid=4123712)\nСервер доступен для всех желающих вне зависимости от их клана`);
    const clanJoinEmbed = new EmbedBuilder()
        .setColor(colors.invisible)
        .setTitle(` Я хочу вступить в клан `)
        .setDescription(`Для этого перейдите в канал <#${clan.joinRequest.chnId}> и следуйте [инструкции](https://discord.com/channels/${guildId}/${clan.joinRequest.chnId}/${clan.joinRequest.joinRequestGuideMessageId})`);
    const nonClanMemberEmbed = new EmbedBuilder()
        .setColor(colors.invisible)
        .setTitle(` Я хочу ознакомиться с сервером `)
        .setDescription(`Не проблема! Сервер доступен для всех - каждый может заходить во все [голосовые каналы](https://discord.com/channels/604967226243809302/604967226755383300), [записываться и создавать наборы](https://discord.com/channels/604967226243809302/677551388514844682), а также [писать в любом чате](https://discord.com/channels/604967226243809302/959129358314922044)`);
    const questionsEmbed = new EmbedBuilder()
        .setColor(colors.invisible)
        .setTitle(` У меня есть вопросы по клану/серверу `)
        .setDescription(`Вы можете задать их [в канале по вопросам](https://discord.com/channels/604967226243809302/694119710677008425) или написав лично лидеру клана <@298353895258980362> ||(пишите даже если не в сети)||`);
    member
        .send({
        embeds: [welcomeEmbed, clanJoinEmbed, nonClanMemberEmbed, questionsEmbed],
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
                const registrationRestoredEmbed = new EmbedBuilder()
                    .setColor(colors.invisible)
                    .setTitle(` Регистрация восстановлена `)
                    .setDescription(`Ранее Вы уже были на нашем сервере - все данные сохранены!\n\n\`${escapeString(data.displayName)}\` - [Bungie.net профиль](https://www.bungie.net/7/ru/User/Profile/254/${data.membershipId})`);
                m.channel.send({
                    embeds: [registrationRestoredEmbed],
                });
                m.edit({
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder()
                                    .setCustomId(ClanButtons.modal)
                                    .setLabel("Форма на вступление")
                                    .setStyle(ButtonStyle.Secondary),
                            ],
                        },
                    ],
                });
            }
        }, 2500);
    })
        .catch((err) => console.error(err.code === 50007
        ? `[Error code: 1129] ${member.displayName} blocked DM from server members`
        : `[Error code: 1130] ${err.stack ?? err}`));
}