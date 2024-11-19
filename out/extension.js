"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = exports.editorUriScheme = void 0;
const TableCustomDocument_1 = require("./TableCustomDocument");
exports.editorUriScheme = "csv-edit";
function activate(context) {
    // Register the custom editor provider for tsv, csv, and tab files
    context.subscriptions.push(TableCustomDocument_1.TsvCustomDocumentProvider.register(context));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map