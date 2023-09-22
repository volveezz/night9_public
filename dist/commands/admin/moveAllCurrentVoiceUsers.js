import { ApplicationCommandOptionType, ChannelType, EmbedBuilder, GuildMember } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { Command } from "../../structures/command.js";
import { pause } from "../../utils/general/utilities.js";
const SlashCommand = new Command({
    name: "move-members",
    nameLocalizations: {
        ru: "переместить-участников",
    },
    description: "Move all members from your current voice channel to a specified one",
    descriptionLocalizations: {
        ru: "Переместите всех участников из вашего текущего голосового канала в указанный",
    },
    defaultMemberPermissions: ["MoveMembers"],
    options: [
        {
            type: ApplicationCommandOptionType.Channel,
            channelTypes: [ChannelType.GuildVoice],
            name: "target-channel",
            nameLocalizations: {
                ru: "целевой-канал",
            },
            description: "The channel to move members to",
            descriptionLocalizations: {
                ru: "Канал для перемещения участников",
            },
            required: true,
        },
    ],
    run: async ({ interaction, args }) => {
        if (!interaction.channel ||
            !interaction.member ||
            !(interaction.member instanceof GuildMember) ||
            !interaction.member.voice.channel) {
            const ERROR_VOICE_CHANNEL_EMBED = new EmbedBuilder()
                .setColor(colors.error)
                .setAuthor({ name: "Ошибка. Вы должны быть в голосовом канале", iconURL: icons.error });
            return interaction.reply({ embeds: [ERROR_VOICE_CHANNEL_EMBED], ephemeral: true });
        }
        const channel = args.getChannel("target-channel", true, [ChannelType.GuildVoice]);
        const members = interaction.member.voice.channel.members;
        if (members.size > 0) {
            const promiseArray = [];
            for (let i = 0; i < members.size; i++) {
                const member = members.at(i);
                const promise = member.voice.setChannel(channel, `Перемещение пользователем ${interaction.member.displayName}`);
                promiseArray.push(promise);
                if (i === 0) {
                    await pause(333);
                }
            }
            await Promise.allSettled(promiseArray);
            const embed = new EmbedBuilder()
                .setColor(colors.success)
                .setAuthor({ name: "Успешно", iconURL: icons.success })
                .setDescription(`Перемещено **${members.size}** пользователей в канал ${channel}`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        else {
            const embed = new EmbedBuilder()
                .setColor(colors.error)
                .setAuthor({ name: "Ошибка. В вашем голосовом канале нет пользователей", iconURL: icons.error });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
});
export default SlashCommand;
//# sourceMappingURL=moveAllCurrentVoiceUsers.js.map