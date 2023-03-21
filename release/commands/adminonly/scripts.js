import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import colors from "../../configs/colors.js";
import { AuthData, UserActivityData } from "../../handlers/sequelize.js";
import { Command } from "../../structures/command.js";
import convertSeconds from "../../functions/utilities.js";
import { clan } from "../../configs/channels.js";
import { guildId } from "../../configs/ids.js";
export default new Command({
    name: "scripts",
    description: "script system",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "script",
            description: "script",
            required: true,
        },
    ],
    run: async ({ interaction }) => {
        const defferedReply = interaction.deferReply();
        const scriptId = interaction.options.getString("script", true).toLowerCase();
        switch (scriptId) {
            case "newembed": {
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
                const registrationRestoredEmbed = new EmbedBuilder()
                    .setColor(colors.invisible)
                    .setTitle(` Регистрация восстановлена `)
                    .setDescription(`Ранее Вы уже были на нашем сервере - все данные сохранены!\n\n\`Volve\` - [Bungie.net профиль](https://google.com)`);
                (await defferedReply) &&
                    interaction.editReply({
                        embeds: [welcomeEmbed, clanJoinEmbed, nonClanMemberEmbed, questionsEmbed, registrationRestoredEmbed],
                    });
                return;
            }
            case "activitytop": {
                const dbData = (await AuthData.findAll({ include: UserActivityData, attributes: ["displayName", "discordId"] })).filter((v) => v.UserActivityData && (v.UserActivityData.messages > 0 || v.UserActivityData.voice > 0));
                const messageTop = dbData
                    .filter((v) => v.UserActivityData.messages > 0)
                    .sort((a, b) => b.UserActivityData.messages - a.UserActivityData.messages);
                const voiceTop = dbData
                    .filter((v) => v.UserActivityData.voice > 0)
                    .sort((a, b) => b.UserActivityData.voice - a.UserActivityData.voice);
                const msgEmbed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle("Топ по текстовому активу")
                    .setFooter(messageTop.length > 50 ? { text: `И еще ${messageTop.length - 50} участников` } : null)
                    .setDescription(`${messageTop
                    .splice(0, 50)
                    .map((v, i) => {
                    return `${i + 1}. <@${v.discordId}> — ${v.UserActivityData.messages} ${v.UserActivityData.messages === 1 ? "сообщение" : "сообщений"}`;
                })
                    .join("\n")}`);
                const voiceEmbed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle("Топ по голосовому активу")
                    .setFooter(voiceTop.length > 49 ? { text: `И еще ${voiceTop.length - 50} участников` } : null)
                    .setDescription(`${voiceTop
                    .splice(0, 50)
                    .map((v, i) => {
                    return `${i + 1}. <@${v.discordId}> — ${convertSeconds(v.UserActivityData.voice)}`;
                })
                    .join("\n")
                    .slice(0, 2048)}`);
                return (await defferedReply) && interaction.editReply({ embeds: [msgEmbed, voiceEmbed] });
            }
            default:
                (await defferedReply) && interaction.editReply("Base response");
                break;
        }
    },
});
