"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meModule = exports.resolvers = void 0;
var fs = __importStar(require("fs"));
var t = __importStar(require("io-ts"));
// import { isRight } from 'fp-ts/Either'
var graphql_modules_1 = require("graphql-modules");
var loadSchema_1 = require("../loadSchema");
//#region iots-interfaces
var stringArr = t.array(t.string);
var Me = t.type({
    name: t.string,
    settings: t.string,
    ownedInboxes: stringArr,
    sharedInboxes: stringArr
});
// confirm that the Me type from the `base.graphql` is imported as an io-ts type
// #endregion iots-interfaces
exports.resolvers = {
    me: function () { return ({ name: 'Eric', settings: JSON.stringify({}), ownedInboxes: [], sharedInboxes: [] }); }
};
exports.meModule = graphql_modules_1.createModule({
    id: 'me-Module',
    dirname: __dirname,
    typeDefs: graphql_modules_1.gql(loadSchema_1.loadSchemaFromFsSync(fs, 'base.graphql')),
    resolvers: exports.resolvers
});
exports.default = exports.meModule;
