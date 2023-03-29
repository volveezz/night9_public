class ApiStatusService {
    _status = 1;
    get status() {
        return this._status;
    }
    set status(status) {
        this._status = status;
    }
    toString() {
        return this.status;
    }
}
export const apiStatus = new ApiStatusService();
