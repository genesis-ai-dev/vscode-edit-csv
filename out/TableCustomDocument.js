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
exports.TsvCustomDocumentProvider = exports.getNonce = void 0;
const vscode = require("vscode");
const path = require("path");
const util_1 = require("./util");
const getHtml_1 = require("./getHtml");
const instanceManager_1 = require("./instanceManager");
const configurationHelper_1 = require("./configurationHelper");
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
exports.getNonce = getNonce;
class TsvCustomDocumentProvider {
    static register(context) {
        const provider = new TsvCustomDocumentProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(TsvCustomDocumentProvider.viewType, provider, {
            webviewOptions: {
                retainContextWhenHidden: true,
            },
        });
        return providerRegistration;
    }
    constructor(context) {
        this.context = context;
        this.instanceManager = new instanceManager_1.InstanceManager();
    }
    /**
     * Called when our custom editor is opened.
     */
    resolveCustomTextEditor(document, webviewPanel, _token) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const uri = document.uri;
            const title = this.getEditorTitle(document);
            webviewPanel.title = title;
            // Create an instance to manage this editor
            let instance;
            const config = (0, configurationHelper_1.getExtensionConfiguration)();
            let isInCurrentWorkspace = document.uri.fsPath !==
                vscode.workspace.asRelativePath(document.uri.fsPath);
            let watcher = null;
            if (isInCurrentWorkspace) {
                if (config.shouldWatchCsvSourceFile !== "no") {
                    watcher = vscode.workspace.createFileSystemWatcher(document.fileName, true, false, true);
                }
                instance = {
                    kind: "workspaceFile",
                    panel: webviewPanel,
                    sourceUri: uri,
                    editorUri: uri.with({
                        scheme: TsvCustomDocumentProvider.viewType,
                    }),
                    hasChanges: false,
                    originalTitle: title,
                    sourceFileWatcher: watcher,
                    document: document,
                    ignoreChangeEvents: false,
                    unsubscribeWatcher: null,
                    lastCommittedContent: "",
                };
            }
            else {
                if (config.shouldWatchCsvSourceFile !== "no") {
                    watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(document.fileName, "*"), true, false, true);
                }
                instance = {
                    kind: "externalFile",
                    panel: webviewPanel,
                    sourceUri: uri,
                    editorUri: uri.with({
                        scheme: TsvCustomDocumentProvider.viewType,
                    }),
                    hasChanges: false,
                    originalTitle: title,
                    sourceFileWatcher: watcher,
                    document: document,
                    ignoreChangeEvents: false,
                    unsubscribeWatcher: null,
                    lastCommittedContent: "",
                };
            }
            if (config.shouldWatchCsvSourceFile !== "no" &&
                instance.sourceFileWatcher) {
                const debounced = (0, util_1.debounce)(this.onWatcherChangeDetectedHandler.bind(this), 1000);
                let unsubscribe = instance.sourceFileWatcher.onDidChange((e) => {
                    (0, util_1.debugLog)(`debounce sourceFileWatcher ${e.fsPath}`);
                    debounced(e, this.instanceManager);
                });
                instance.unsubscribeWatcher = unsubscribe;
            }
            try {
                this.instanceManager.addInstance(instance);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Could not create an editor instance, error: ${error.message}`);
                (_a = instance.unsubscribeWatcher) === null || _a === void 0 ? void 0 : _a.dispose();
                (_b = instance.sourceFileWatcher) === null || _b === void 0 ? void 0 : _b.dispose();
                return;
            }
            webviewPanel.webview.options = {
                //   enableFindWidget: false,
                enableScripts: true,
                enableCommandUris: true,
                //   retainContextWhenHidden: true,
            };
            webviewPanel.webview.onDidReceiveMessage((message) => {
                this.onDidReceiveMessage(message, instance, config);
            }, undefined, this.context.subscriptions);
            webviewPanel.onDidDispose(() => {
                var _a, _b;
                (0, util_1.debugLog)(`dispose csv editor panel (webview)`);
                try {
                    this.instanceManager.removeInstance(instance);
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Could not destroy an editor instance, error: ${error.message}`);
                }
                try {
                    (_a = instance.unsubscribeWatcher) === null || _a === void 0 ? void 0 : _a.dispose();
                    (_b = instance.sourceFileWatcher) === null || _b === void 0 ? void 0 : _b.dispose();
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Could not dispose source file watcher for file ${instance.document.uri.fsPath}, error: ${error.message}`);
                }
            }, null, this.context.subscriptions);
            let activeCol = 0;
            let activeLine = 0;
            let activeTextEditor = vscode.window.activeTextEditor;
            if (activeTextEditor && activeTextEditor.document === document) {
                activeCol = activeTextEditor.selection.active.character;
                activeLine = activeTextEditor.selection.active.line;
                if (activeTextEditor.document.lineAt(activeLine).text.length === activeCol) {
                    activeCol =
                        activeTextEditor.document.lineAt(activeLine).text.length - 1;
                }
            }
            let platform;
            switch (process.platform) {
                case "aix":
                case "freebsd":
                case "linux":
                case "openbsd":
                case "android":
                case "cygwin":
                case "sunos":
                    platform = "linux";
                    break;
                case "win32":
                    platform = "win";
                    break;
                case "darwin":
                    platform = "mac";
                    break;
                default:
                    platform = "linux";
            }
            webviewPanel.webview.html = (0, getHtml_1.createEditorHtml)(webviewPanel.webview, this.context, config, {
                isWatchingSourceFile: instance.sourceFileWatcher ? true : false,
                sourceFileCursorLineIndex: activeLine,
                sourceFileCursorColumnIndex: activeCol,
                isCursorPosAfterLastColumn: document.lineAt(activeLine).text.length === activeCol,
                openTableAndSelectCellAtCursorPos: config.openTableAndSelectCellAtCursorPos,
                os: platform,
            });
        });
    }
    onDidReceiveMessage(message, instance, config) {
        switch (message.command) {
            case "ready": {
                (0, util_1.debugLog)("received ready from webview");
                instance.hasChanges = false;
                this.setEditorHasChanges(instance, false);
                let funcSendContent = (initialText) => {
                    const textSlices = (0, util_1.partitionString)(initialText, 1024 * 1024);
                    for (let i = 0; i < textSlices.length; i++) {
                        const textSlice = textSlices[i];
                        const msg = {
                            command: "csvUpdate",
                            csvContent: {
                                text: textSlice.text,
                                sliceNr: textSlice.sliceNr,
                                totalSlices: textSlice.totalSlices,
                            },
                        };
                        instance.panel.webview.postMessage(msg);
                    }
                };
                if (instance.kind === "externalFile") {
                    vscode.workspace.openTextDocument(instance.sourceUri).then((document) => {
                        const content = document.getText();
                        instance.lastCommittedContent = content;
                        funcSendContent(content);
                    }, (error) => {
                        vscode.window.showErrorMessage(`Could not read the source file, error: ${error === null || error === void 0 ? void 0 : error.message}`);
                    });
                }
                else if (instance.document.isClosed) {
                    vscode.workspace.openTextDocument(instance.sourceUri).then((document) => {
                        const content = document.getText();
                        instance.lastCommittedContent = content;
                        funcSendContent(content);
                    }, (error) => {
                        vscode.window.showErrorMessage(`Could not read the source file, error: ${error === null || error === void 0 ? void 0 : error.message}`);
                    });
                }
                else {
                    const content = instance.document.getText();
                    instance.lastCommittedContent = content;
                    funcSendContent(content);
                }
                (0, util_1.debugLog)("finished sending csv content to webview");
                break;
            }
            case "msgBox": {
                if (message.type === "info") {
                    vscode.window.showInformationMessage(message.content);
                }
                else if (message.type === "warn") {
                    vscode.window.showWarningMessage(message.content);
                }
                else if (message.type === "error") {
                    vscode.window.showErrorMessage(message.content);
                }
                else {
                    const _msg = `Unknown message box type: ${message.type}, message: ${message.content}`;
                    console.error(_msg);
                    vscode.window.showErrorMessage(_msg);
                }
                break;
            }
            case "apply": {
                const { csvContent, saveSourceFile } = message;
                this.applyContent(instance, csvContent, saveSourceFile, config.openSourceFileAfterApply);
                break;
            }
            case "copyToClipboard": {
                vscode.env.clipboard.writeText(message.text);
                break;
            }
            case "setHasChanges": {
                instance.hasChanges = message.hasChanges;
                this.setEditorHasChanges(instance, message.hasChanges);
                break;
            }
            default:
                this.notExhaustive(message, `Received unknown message from webview: ${JSON.stringify(message)}`);
        }
    }
    getEditorTitle(document) {
        return `CSV edit ${path.basename(document.fileName)}`;
    }
    setEditorHasChanges(instance, hasChanges) {
        instance.panel.title = `${hasChanges ? "* " : ""}${instance.originalTitle}`;
    }
    notExhaustive(x, message) {
        vscode.window.showErrorMessage(message);
        throw new Error(message);
    }
    applyContent(instance, newContent, saveSourceFile, openSourceFileAfterApply) {
        const edit = new vscode.WorkspaceEdit();
        var document = instance.document;
        var firstLine = document.lineAt(0);
        var lastLine = document.lineAt(document.lineCount - 1);
        var textRange = new vscode.Range(0, firstLine.range.start.character, document.lineCount - 1, lastLine.range.end.character);
        // Don't apply if the content didn't change
        if (document.getText() === newContent) {
            (0, util_1.debugLog)(`content didn't change`);
            return;
        }
        edit.replace(document.uri, textRange, newContent);
        vscode.workspace.applyEdit(edit).then((editsApplied) => {
            instance.lastCommittedContent = newContent;
            this._afterEditsApplied(instance, document, editsApplied, saveSourceFile, openSourceFileAfterApply);
        }, (reason) => {
            console.warn(`Error applying edits`);
            console.warn(reason);
            vscode.window.showErrorMessage(`Error applying edits`);
        });
    }
    _afterEditsApplied(instance, document, editsApplied, saveSourceFile, openSourceFileAfterApply) {
        const afterShowDocument = () => {
            if (!editsApplied) {
                console.warn(`Edits could not be applied`);
                vscode.window.showErrorMessage(`Edits could not be applied`);
                return;
            }
            if (saveSourceFile) {
                document.save().then((wasSaved) => {
                    if (!wasSaved) {
                        console.warn(`Could not save csv file`);
                        vscode.window.showErrorMessage(`Could not save csv file`);
                        return;
                    }
                    this.setEditorHasChanges(instance, false);
                }, (reason) => {
                    console.warn(`Error saving csv file`);
                    console.warn(reason);
                    vscode.window.showErrorMessage(`Error saving csv file`);
                });
                return;
            }
            this.setEditorHasChanges(instance, false);
        };
        if (openSourceFileAfterApply) {
            vscode.window.showTextDocument(document).then(() => {
                afterShowDocument();
            });
        }
        else {
            afterShowDocument();
        }
    }
    onWatcherChangeDetectedHandler(e, instanceManager) {
        const instance = instanceManager.findInstanceBySourceUri(e);
        if (!instance)
            return;
        if (instance.ignoreChangeEvents || instance.sourceFileWatcher === null) {
            (0, util_1.debugLog)(`source file changed: ${e.fsPath}, ignored`);
            return;
        }
        vscode.workspace.openTextDocument(instance.sourceUri).then((document) => {
            let content = document.getText();
            (0, util_1.debugLog)(`content ${content.split("\n")[0]}`);
            if (content === instance.lastCommittedContent) {
                (0, util_1.debugLog)(`content didn't change, fake change`);
                return;
            }
            (0, util_1.debugLog)(`source file changed: ${e.fsPath}`);
            this.onSourceFileChanged(e.fsPath, instance);
        }, (error) => {
            vscode.window.showErrorMessage(`Could not read the source file, error: ${error === null || error === void 0 ? void 0 : error.message}`);
        });
    }
    onSourceFileChanged(path, instance) {
        const msg = {
            command: "sourceFileChanged",
        };
        instance.panel.webview.postMessage(msg);
    }
}
TsvCustomDocumentProvider.viewType = "csv.tsvCustomDocument";
exports.TsvCustomDocumentProvider = TsvCustomDocumentProvider;
//# sourceMappingURL=TableCustomDocument.js.map