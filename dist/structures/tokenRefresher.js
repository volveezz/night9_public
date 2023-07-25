let lastRefresh = Date.now();
export function UpdateTokenRefreshTime() {
    return (lastRefresh = Date.now());
}
export function WasRefreshedRecently() {
    if (Date.now() - lastRefresh < 1000 * 60 * 60) {
        return true;
    }
    else {
        return false;
    }
}
//# sourceMappingURL=tokenRefresher.js.map