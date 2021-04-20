"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSchemaFromFs = exports.loadSchemaFromFsSync = void 0;
var path_1 = require("path");
var loadSchemaFromFsSync = function (fs, path) {
    return fs.readFileSync(path_1.resolve(__dirname, path)).toString();
};
exports.loadSchemaFromFsSync = loadSchemaFromFsSync;
var loadSchemaFromFs = function (fs, path) {
    return new Promise(function (resolve, reject) {
        fs.readFile(path_1.resolve(__dirname, path), function (err, data) {
            err
                ? reject(err)
                : data
                    ? resolve(data.toString())
                    : reject(new Error("file was undefined"));
        });
    });
};
exports.loadSchemaFromFs = loadSchemaFromFs;
exports.default = exports.loadSchemaFromFsSync;
