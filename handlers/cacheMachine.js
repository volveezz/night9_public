export default async (client) => {
    client.guilds.cache.forEach((preCachedGuild) => {
        preCachedGuild
            .fetch()
            .then(async (guild) => {
            const members = guild.members.fetch();
            const bans = guild.bans.fetch();
            const channels = guild.channels.fetch();
            console.log(`Working at ${guild.name} with ${(await members).size} members, ${(await bans).size} bans and ${(await channels).size} channels`);
        })
            .catch((e) => console.error(`[Error code: 1114] Encountered error while fetching guild ${preCachedGuild.name}/${preCachedGuild.id}`, e));
    });
};
