"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const boards_1 = __importDefault(require("./boards"));
const health_1 = __importDefault(require("./health"));
const router = (0, express_1.Router)();
router.use('/api', health_1.default);
router.use('/api/boards', boards_1.default);
exports.default = router;
