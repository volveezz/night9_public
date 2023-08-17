class TokenRefresherSystem {
    lastRefresh = null;
    constructor() { }
    updateTokenRefreshTime() {
        return (this.lastRefresh = Date.now());
    }
    getLatestRefreshTime() {
        return this.lastRefresh;
    }
    wasRefreshedRecently() {
        if (this.lastRefresh && Date.now() - this.lastRefresh < 1000 * 60 * 60) {
            return true;
        }
        return false;
    }
}
const tokenRefresher = new TokenRefresherSystem();
export default tokenRefresher;
//# sourceMappingURL=tokenRefresher.js.map