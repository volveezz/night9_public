"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DestinyActivityDefinition = exports.DestinyMetricDefinition = exports.DestinyRecordDefinition = exports.manifestData = void 0;
const request_promise_native_1 = require("request-promise-native");
function getManifest() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const manifest = (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/Destiny2/Manifest/`, {
                json: true,
            });
            return (yield manifest)["Response"];
        }
        catch (e) {
            getManifest();
            throw { name: "Manifest error", message: e.statusCode };
        }
    });
}
function getSpecificManifest(page) {
    return __awaiter(this, void 0, void 0, function* () {
        const link = yield exports.manifestData;
        return (0, request_promise_native_1.get)(`https://www.bungie.net${link.jsonWorldComponentContentPaths.ru[page]}`, { json: true })
            .then((manifest) => {
            return manifest;
        })
            .catch((e) => console.error(`getSpecificManifest error`, page, e.statusCode));
    });
}
exports.manifestData = getManifest();
exports.DestinyRecordDefinition = getSpecificManifest("DestinyRecordDefinition");
exports.DestinyMetricDefinition = getSpecificManifest("DestinyMetricDefinition");
exports.DestinyActivityDefinition = getSpecificManifest("DestinyActivityDefinition");
