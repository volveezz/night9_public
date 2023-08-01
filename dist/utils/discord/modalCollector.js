const activeModals = new Map();
async function createModalCollector(ineraction, options) {
    const modalId = Symbol();
    const userId = ineraction.user.id;
    activeModals.set(userId, modalId);
    const result = await ineraction.awaitModalSubmit(options);
    if (activeModals.get(userId) === modalId) {
        activeModals.delete(userId);
        return result;
    }
}
export default createModalCollector;
//# sourceMappingURL=modalCollector.js.map