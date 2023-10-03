import { startEndpointCheck } from "./endpointChecker.js";
const endpointStatuses = {
    account: 1,
    oauth: 1,
    activity: 1,
    api: 1,
};
export const endpointCheckers = {
    account: undefined,
    oauth: undefined,
    activity: undefined,
    api: undefined,
};
export function updateEndpointStatus(endpoint, status) {
    endpointStatuses[endpoint] = status;
    if (status !== 1 && !endpointCheckers[endpoint]) {
        if (status === 1665) {
            console.error("[Error code: 2081] Request failed due user's privacy settings");
            return;
        }
        endpointCheckers[endpoint] = startEndpointCheck(endpoint);
    }
}
export function getEndpointStatus(endpoint) {
    if (endpointStatuses.api !== 1) {
        return endpointStatuses.api;
    }
    else {
        return endpointStatuses[endpoint];
    }
}
//# sourceMappingURL=statusTracker.js.map