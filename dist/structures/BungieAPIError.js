class BungieAPIError extends Error {
    statusCode;
    statusText;
    errorCode;
    errorStatus;
    constructor(message, statusCode, statusText, errorCode, errorStatus) {
        super(message);
        this.name = "APIError";
        this.statusCode = statusCode;
        this.statusText = statusText;
        this.errorCode = errorCode;
        this.errorStatus = errorStatus;
    }
}
export default BungieAPIError;
//# sourceMappingURL=BungieAPIError.js.map