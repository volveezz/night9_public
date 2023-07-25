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