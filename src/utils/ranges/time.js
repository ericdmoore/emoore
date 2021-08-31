"use strict";
exports.__esModule = true;
exports.daySteppedArray = exports.hourSteppedArray = exports.minSteppedArray = exports.monthedSteppedArray = exports.makeSteppedArray = void 0;
var makeSteppedArray = function (iterStep) {
    return function (iterSize, startTime) {
        if (startTime === void 0) { startTime = Date.now(); }
        return Array.from({ length: iterSize }, function (_, i) { return startTime - (i * iterStep); });
    };
};
exports.makeSteppedArray = makeSteppedArray;
var monthedSteppedArray = function (iterSize, startTime) {
    if (startTime === void 0) { startTime = Date.now(); }
    var start = new Date(startTime);
    return Array.from({ length: iterSize }, function (_, i) {
        var d = new Date(startTime);
        d.setMonth(start.getMonth() - i);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    });
};
exports.monthedSteppedArray = monthedSteppedArray;
var minSteppedArray = function (iterStep) {
    if (iterStep === void 0) { iterStep = 1; }
    return function (iterSize, startTime) {
        if (startTime === void 0) { startTime = Date.now(); }
        var start = new Date(startTime);
        return Array.from({ length: iterSize }, function (_, i) {
            var d = new Date(startTime);
            d.setMinutes(start.getMinutes() - (iterStep * i));
            return d.getTime();
        });
    };
};
exports.minSteppedArray = minSteppedArray;
var hourSteppedArray = function (iterStep) {
    if (iterStep === void 0) { iterStep = 1; }
    return function (iterSize, startTime) {
        if (startTime === void 0) { startTime = Date.now(); }
        var start = new Date(startTime);
        return Array.from({ length: iterSize }, function (_, i) {
            var d = new Date(startTime);
            d.setHours(start.getHours() - iterStep);
            return d.getTime();
        });
    };
};
exports.hourSteppedArray = hourSteppedArray;
var daySteppedArray = function (iterStep) {
    if (iterStep === void 0) { iterStep = 1; }
    return function (iterSize, startTime) {
        if (startTime === void 0) { startTime = Date.now(); }
        var start = new Date(startTime);
        return Array.from({ length: iterSize }, function (_, i) {
            var d = new Date(startTime);
            d.setDate(start.getDate() - iterStep);
            return d.getTime();
        });
    };
};
exports.daySteppedArray = daySteppedArray;
