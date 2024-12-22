export function isNitterUrlAllowed(url: string): boolean {
	const forbiddenPattern = /https?:\/\/(nitter\.d420\.de|n\.populas\.no|nitter\.uni-sonia\.com)/;
	return !forbiddenPattern.test(url);
}
