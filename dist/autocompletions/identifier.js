import Sequelize from "sequelize";
import { client } from "../index.js";
import { Autocomplete } from "../structures/autocomplete.js";
import { sendApiPostRequest } from "../utils/api/sendApiPostRequest.js";
import { sendApiRequest } from "../utils/api/sendApiRequest.js";
import { isBungieId, isMembershipId } from "../utils/general/utilities.js";
import { AuthData } from "../utils/persistence/sequelizeModels/authData.js";
const { Op } = Sequelize;
const AutocompleteFile = new Autocomplete({
    name: "identifier",
    run: async ({ interaction, option }) => {
        const { value: target } = option;
        if (!target || target.length <= 0) {
            interaction.respond([{ name: "Введите Bungie Id, Discord Id или ник пользователя", value: "null" }]);
            return;
        }
        const param = option.name.split("_")[1];
        const userData = await fetchUserProfile(target);
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
            const responses = userData
                .slice(0, 25)
                .sort((a, b) => {
                const nameFirstArray = a.displayName.split("#");
                const nameSecondArray = b.displayName.split("#");
                nameFirstArray.pop();
                nameSecondArray.pop();
                const nameA = nameFirstArray.join("#");
                const nameB = nameSecondArray.join("#");
                if (nameA === target && nameB !== target) {
                    return -1;
                }
                if (nameA !== target && nameB === target) {
                    return 1;
                }
                if (nameA === target.toUpperCase() && nameB !== target.toUpperCase()) {
                    return -1;
                }
                if (nameA !== target.toUpperCase() && nameB === target.toUpperCase()) {
                    return 1;
                }
                return 0;
            })
                .map((user) => {
                const value = createValue(user, param);
                if (value === null) {
                    return { name: "Discord Id не найден", value: "null" };
                }
                return {
                    name: user.displayName || "incomplete displayname",
                    value: value,
                };
            });
            await interaction.respond(responses).catch((e) => console.error("[Error code: 1046]", e));
        }
        else {
            let memberName = null;
            let clanStatus = undefined;
            try {
                memberName = userData.discordId ? (await client.getMember(userData.discordId)).displayName : null;
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
                    name: `${userData.displayName}${memberName ? ` ${clanStatus ? "[Участник клана]" : ""} (На сервере: ${memberName})` : ""}`,
                    value: value,
                },
            ])
                .catch((e) => console.error("[Error code: 1046]", e));
        }
    },
});
export default AutocompleteFile;
const invisibleChar = "⁣";
async function fetchUserProfile(searchTerm) {
    const authData = await AuthData.findAll({
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
    if (authData && authData.length > 0) {
        return authData;
    }
    let response;
    const isInputId = isBungieId(searchTerm) || isMembershipId(searchTerm);
    if (isInputId) {
        response = await sendApiRequest(`/Platform/User/GetMembershipsById/${searchTerm}/-1`);
    }
    else {
        response = await sendApiPostRequest({
            apiEndpoint: "/Platform/User/Search/GlobalName/0/",
            requestData: {
                displayNamePrefix: searchTerm,
            },
            returnResponse: true,
        });
    }
    if (!response)
        return null;
    return parseResponse(response);
}
function parseResponse(response) {
    const users = [];
    if ("destinyMemberships" in response) {
        parseDestinyMemberships(response, users);
    }
    else {
        for (const userGroup of response.searchResults) {
            parseDestinyMemberships(userGroup, users);
        }
    }
    return users.length === 1 ? users[0] : users.length > 1 ? users : null;
}
function parseDestinyMemberships(userInfo, users) {
    for (const membership of userInfo.destinyMemberships) {
        const { membershipId, bungieGlobalDisplayName, bungieGlobalDisplayNameCode, membershipType, displayName } = membership;
        const bungieName = bungieGlobalDisplayName && bungieGlobalDisplayNameCode
            ? `${bungieGlobalDisplayName}#${bungieGlobalDisplayNameCode.toString().length === 3 ? `0${bungieGlobalDisplayNameCode}` : bungieGlobalDisplayNameCode}`
            : displayName;
        if (membership.crossSaveOverride === 0 || membership.crossSaveOverride === membership.membershipType) {
            users.push({
                bungieId: membershipId,
                displayName: bungieName,
                platform: membershipType,
            });
            break;
        }
    }
}
//# sourceMappingURL=identifier.js.map