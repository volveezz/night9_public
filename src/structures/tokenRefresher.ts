class TokenRefresherSystem {
	private lastRefresh: number | null = null;

	constructor() {}

	public updateTokenRefreshTime() {
		return (this.lastRefresh = Date.now());
	}

	public getLatestRefreshTime() {
		return this.lastRefresh;
	}

	public wasRefreshedRecently() {
		if (this.lastRefresh && Date.now() - this.lastRefresh < 1000 * 60 * 60) {
			return true;
		}
		return false;
	}
}

const tokenRefresher = new TokenRefresherSystem();

export default tokenRefresher;
