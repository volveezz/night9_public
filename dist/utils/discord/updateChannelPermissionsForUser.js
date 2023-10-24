export async function updateChannelPermissionsForUser(channel, userId, permissionsStatus) {
    if (permissionsStatus) {
        await channel.permissionOverwrites.create(userId, {
            ViewChannel: true,
            ReadMessageHistory: true,
        });
    }
    else {
        await channel.permissionOverwrites.delete(userId);
    }
}
//# sourceMappingURL=updateChannelPermissionsForUser.js.map