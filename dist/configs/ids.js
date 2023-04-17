const ownerId = process.env.OWNER_ID;
const channelIds = {
    admin: process.env.ADMIN_CHANNEL_ID,
    adminVoice: process.env.ADMIN_VOICE_CHANNEL_ID,
    guildMember: process.env.GUILD_MEMBER_CHANNEL_ID,
    guild: process.env.GUILD_CHANNEL_ID,
    messages: process.env.MESSAGES_CHANNEL_ID,
    voice: process.env.VOICE_CHANNEL_ID,
    clan: process.env.CLAN_CHANNEL_ID,
    bot: process.env.BOT_CHANNEL_ID,
    raid: process.env.RAID_CHANNEL_ID,
    raidCategory: process.env.RAID_CHANNEL_CATEGORY_ID,
    directMessages: process.env.DIRECT_MESSAGES_CHANNEL_ID,
    activity: process.env.ACTIVITY_CHANNEL_ID,
    manifest: process.env.MANIFEST_CHANNEL_ID,
    patchNoteGenerator: process.env.PATCHNOTE_GENERATOR_CHANNEL_ID,
    supporters: process.env.GOD_CHANNEL_ID,
    news: process.env.NEWS_CHANNEL_ID,
    externalNewsFeed: process.env.PUBLIC_NEWS_CHANNEL_ID,
    pveParty: process.env.PVE_PARTY_CHANNEL_ID,
    pvePartyCategory: process.env.PVE_PARTY_CATEGORY_ID,
    publicBotSpam: process.env.PUBLIC_BOT_CHANNEL_ID,
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
export { channelIds, checkedStoryActivities, forbiddenRaidIds, guildId, ownerId };
