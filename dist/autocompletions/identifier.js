import { Op } from "sequelize";
import { client } from "../index.js";
import { sendApiPostRequest } from "../utils/api/sendApiPostRequest.js";
import { sendApiRequest } from "../utils/api/sendApiRequest.js";
import { isBungieId } from "../utils/general/utilities.js";
import { AuthData } from "../utils/persistence/sequelize.js";
export default {
    name: "identifier",
    run: async ({ interaction, option }) => {
        if (option.value.length === 0) {
            interaction.respond([{ name: "Введите Bungie Id, Discord Id или ник пользователя", value: "null" }]);
            return;
        }
        const param = option.name.split("_")[1];
        const userData = await fetchUserProfile(option.value);
        if (!userData) {
            interaction.respond([{ name: "Пользователь не найден", value: "null" }]);
            return;
        }
        const createValue = (user, param) => {
            switch (param) {
                case "d":
                    if (!user.discordId) {
                        return null;
                    }
                    return user.discordId;
                case "pb":
                    return `${user.platform}/${user.bungieId}`;
                case "pbd":
                    return `${user.platform}/${user.bungieId}${user.discordId ? `/${user.discordId}` : ""}`;
                default:
                    return `${user.platform}/${user.bungieId}`;
            }
        };
        if (Array.isArray(userData)) {
            const responses = userData.map((user) => {
                const value = createValue(user, param);
                if (value === null) {
                    return { name: "Discord Id не найден", value: "null" };
                }
                return {
                    name: `${user.displayName}`,
                    value: value,
                };
            });
            await interaction.respond(responses).catch((e) => console.error("[Error code: 1046]", e));
        }
        else {
            let memberName = null;
            let clanStatus = undefined;
            try {
                memberName = userData.discordId ? (await client.getAsyncMember(userData.discordId)).displayName : null;
                clanStatus = userData.clan;
            }
            catch (error) {
                console.error("[Error code: 1833]", error.stack);
            }
            const value = createValue(userData, param);
            if (value === null) {
                interaction.respond([{ name: "Discord Id не найден", value: "null" }]);
                return;
            }
            await interaction
                .respond([
                {
                    name: `${userData.displayName}${memberName ? ` ${clanStatus ? `[Участник клана]` : ""} (На сервере: ${memberName})` : ""}`,
                    value: value,
                },
            ])
                .catch((e) => console.error("[Error code: 1046]", e));
        }
    },
};
const invisibleChar = "⁣";
async function fetchUserProfile(searchTerm) {
    const authData = await AuthData.findOne({
        where: {
            [Op.or]: [
                { discordId: searchTerm },
                { bungieId: searchTerm },
                { displayName: searchTerm },
                { displayName: { [Op.like]: `${searchTerm}%` } },
                { displayName: { [Op.like]: `${invisibleChar}${searchTerm}%` } },
            ],
        },
        attributes: ["discordId", "platform", "bungieId", "clan", "displayName"],
    });
    if (authData) {
        return {
            bungieId: authData.bungieId,
            platform: authData.platform,
            displayName: authData.displayName,
            discordId: authData.discordId,
            clan: authData.clan,
        };
    }
    let response;
    const isInputBungieId = isBungieId(searchTerm);
    if (isInputBungieId) {
        response = (await sendApiRequest(`Platform/User/GetMembershipsById/${searchTerm}/-1`));
    }
    else {
        response = await sendApiPostRequest({
            apiEndpoint: "Platform/User/Search/GlobalName/0/",
            requestData: {
                displayNamePrefix: searchTerm,
            },
        });
    }
    if (!response)
        return null;
    return parseResponse(response, isInputBungieId);
}
function parseResponse(response, isBungieId) {
    const users = [];
    if (isBungieId && response && "destinyMemberships" in response) {
        for (const membership of response.destinyMemberships) {
            if (membership.crossSaveOverride === membership.membershipType) {
                users.push({
                    bungieId: membership.membershipId,
                    displayName: membership.bungieGlobalDisplayName
                        ? membership.bungieGlobalDisplayName + "#" + membership.bungieGlobalDisplayNameCode
                        : membership.displayName,
                    platform: membership.membershipType,
                });
                continue;
            }
            else if (membership.crossSaveOverride === 0) {
                users.push({
                    bungieId: membership.membershipId,
                    displayName: membership.bungieGlobalDisplayName
                        ? membership.bungieGlobalDisplayName + "#" + membership.bungieGlobalDisplayNameCode
                        : membership.displayName,
                    platform: membership.membershipType,
                });
            }
        }
    }
    else if (!isBungieId && !("destinyMemberships" in response)) {
        for (const userGroup of response.searchResults) {
            for (const user of userGroup.destinyMemberships) {
                if (user.crossSaveOverride === user.membershipType) {
                    users.push({
                        bungieId: user.membershipId,
                        displayName: user.bungieGlobalDisplayName
                            ? user.bungieGlobalDisplayName + "#" + user.bungieGlobalDisplayNameCode
                            : user.displayName,
                        platform: user.membershipType,
                    });
                    continue;
                }
                else if (user.crossSaveOverride === 0) {
                    users.push({
                        bungieId: user.membershipId,
                        displayName: user.bungieGlobalDisplayName
                            ? user.bungieGlobalDisplayName + "#" + user.bungieGlobalDisplayNameCode
                            : user.displayName,
                        platform: user.membershipType,
                    });
                }
            }
        }
    }
    return users.length === 1 ? users[0] : users.length > 1 ? users : null;
}
//# sourceMappingURL=identifier.js.map