const ownerId = process.env.OWNER_ID;
const ids = {
    adminChnId: process.env.ADMIN_CHANNEL_ID,
    adminVoiceChnId: process.env.ADMIN_VOICE_CHANNEL_ID,
    guildMemberChnId: process.env.GUILD_MEMBER_CHANNEL_ID,
    guildChnId: process.env.GUILD_CHANNEL_ID,
    messagesChnId: process.env.MESSAGES_CHANNEL_ID,
    voiceChnId: process.env.VOICE_CHANNEL_ID,
    clanChnId: process.env.CLAN_CHANNEL_ID,
    botChnId: process.env.BOT_CHANNEL_ID,
    raidChnId: process.env.RAID_CHANNEL_ID,
    raidChnCategoryId: process.env.RAID_CHANNEL_CATEGORY_ID,
    dmMsgsChnId: process.env.DIRECT_MESSAGES_CHANNEL_ID,
    activityChnId: process.env.ACTIVITY_CHANNEL_ID,
    manifestChnId: process.env.MANIFEST_CHANNEL_ID,
    patchGeneratorChnId: process.env.PATCHNOTE_GENERATOR_CHANNEL_ID,
    godChnId: process.env.GOD_CHANNEL_ID,
    newsChnId: process.env.NEWS_CHANNEL_ID,
    pvePartyChnId: process.env.PVE_PARTY_CHANNEL_ID,
    pvePartyCategoryId: process.env.PVE_PARTY_CATEGORY_ID,
};
const forbiddenRaidIds = [
    548750096, 960175301, 3213556450, 757116822, 2693136601, 417231112, 809170886, 3333172150, 119944200, 3446541099, 2693136602, 3879860661,
    2693136604, 2693136603, 2812525063, 2693136605, 2693136600, 3089205900, 2449714930, 1685065161, 2164432138, 287649202, 2164432138,
    287649202, 1875726950,
];
const checkedStoryActivities = [
    3755529435,
    3083261666,
];
const guildId = process.env.GUILD_ID;
export { checkedStoryActivities, forbiddenRaidIds, guildId, ids, ownerId };
