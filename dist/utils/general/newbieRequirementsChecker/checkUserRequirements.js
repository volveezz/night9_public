import { sendApiRequest } from "../../api/sendApiRequest.js";
import { getEndpointStatus } from "../../api/statusCheckers/statusTracker.js";
import checkRequirements from "./checkRequirements.js";
async function checkUserRequirements(authData) {
    if (getEndpointStatus("account") !== 1)
        return;
    const { platform, bungieId, accessToken } = authData;
    const userProfile = await sendApiRequest(`/Platform/Destiny2/${platform}/Profile/${bungieId}/?components=900`, accessToken);
    if (!userProfile || !userProfile.profileRecords.data) {
        return false;
    }
    const { allRequirementsMet, message } = checkRequirements(userProfile);
    return allRequirementsMet ? true : message;
}
export default checkUserRequirements;
//# sourceMappingURL=checkUserRequirements.js.map