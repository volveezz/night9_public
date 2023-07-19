let apiStatuses = {
    account: 1,
    oauth: 1,
    activity: 1,
    api: 1,
};
export function SetApiStatus(endpoint, status) {
    apiStatuses[endpoint] = status;
    if (status === 1 && apiStatuses.api !== 1) {
        apiStatuses.api = 1;
    }
}
export function GetApiStatus(endpoint) {
    if (apiStatuses.api !== 1) {
        return apiStatuses.api;
    }
    else {
        return apiStatuses[endpoint];
    }
}
//# sourceMappingURL=apiStatus.js.map