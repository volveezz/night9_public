import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import deleteLeavedUserData from "../utils/discord/deleteLeavedUserData.js";
import nameCleaner from "../utils/general/nameClearer.js";
import kickLeavedUserFromRaids from "../utils/general/raidFunctions/kickLeavedMemberFromRaids.js";
const guildMemberChannel = client.getCachedTextChannel(process.env.GUILD_MEMBER_CHANNEL_ID);
export default new Event("guildBanAdd", async (bannedMember) => {
    const member = bannedMember.guild.members.cache.get(bannedMember.user.id);
    const embed = new EmbedBuilder().setFooter({ text: `Id: ${bannedMember.user.id}` }).setColor(colors.error);
    if (member) {
        embed.setAuthor({
            name: `${nameCleaner(member.displayName)} был забанен`,
            iconURL: member.displayAvatarURL(),
        });
    }
    else {
        embed.setAuthor({
            name: `${bannedMember.user.username} был забанен`,
            iconURL: bannedMember.user.displayAvatarURL(),
        });
    }
    if (bannedMember.reason) {
        embed.addFields({
            name: "Причина бана",
            value: bannedMember.reason ? bannedMember.reason : "не указана",
        });
    }
    const message = await guildMemberChannel.send({ embeds: [embed] });
    await deleteLeavedUserData({ member: bannedMember, message });
    kickLeavedUserFromRaids(bannedMember);
});
//# sourceMappingURL=guildBanAdd.js.map