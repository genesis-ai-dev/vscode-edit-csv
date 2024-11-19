import * as vscode from "vscode";
import * as path from "path";
import { debugLog, partitionString, debounce } from "./util";
import { createEditorHtml } from "./getHtml";
import { InstanceManager, Instance, SomeInstance } from "./instanceManager";
import { getExtensionConfiguration } from "./configurationHelper";

export function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
export class TsvCustomDocumentProvider
  implements vscode.CustomTextEditorProvider
{
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new TsvCustomDocumentProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      TsvCustomDocumentProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    );
    return providerRegistration;
  }

  private static readonly viewType = "csv.tsvCustomDocument";

  constructor(private readonly context: vscode.ExtensionContext) {
    this.instanceManager = new InstanceManager();
  }

  private instanceManager: InstanceManager;

  /**
   * Called when our custom editor is opened.
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const uri = document.uri;
    const title = this.getEditorTitle(document);

    webviewPanel.title = title;

    // Create an instance to manage this editor
    let instance: SomeInstance;

    const config = getExtensionConfiguration();

    let isInCurrentWorkspace =
      document.uri.fsPath !==
      vscode.workspace.asRelativePath(document.uri.fsPath);

    let watcher: vscode.FileSystemWatcher | null = null;

    if (isInCurrentWorkspace) {
      if (config.shouldWatchCsvSourceFile !== "no") {
        watcher = vscode.workspace.createFileSystemWatcher(
          document.fileName,
          true,
          false,
          true
        );
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
    } else {
      if (config.shouldWatchCsvSourceFile !== "no") {
        watcher = vscode.workspace.createFileSystemWatcher(
          new vscode.RelativePattern(document.fileName, "*"),
          true,
          false,
          true
        );
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

    if (
      config.shouldWatchCsvSourceFile !== "no" &&
      instance.sourceFileWatcher
    ) {
      const debounced = debounce(
        this.onWatcherChangeDetectedHandler.bind(this),
        1000
      );
      let unsubscribe = instance.sourceFileWatcher.onDidChange((e) => {
        debugLog(`debounce sourceFileWatcher ${e.fsPath}`);
        debounced(e, this.instanceManager);
      });

      instance.unsubscribeWatcher = unsubscribe;
    }

    try {
      this.instanceManager.addInstance(instance);
    } catch (error: any) {
      vscode.window.showErrorMessage(
        `Could not create an editor instance, error: ${error.message}`
      );

      instance.unsubscribeWatcher?.dispose();
      instance.sourceFileWatcher?.dispose();

      return;
    }

    webviewPanel.webview.options = {
      //   enableFindWidget: false,
      enableScripts: true,
      enableCommandUris: true,
      //   retainContextWhenHidden: true,
    };

    webviewPanel.webview.onDidReceiveMessage(
      (message: PostMessage) => {
        this.onDidReceiveMessage(message, instance, config);
      },
      undefined,
      this.context.subscriptions
    );

    webviewPanel.onDidDispose(
      () => {
        debugLog(`dispose csv editor panel (webview)`);

        try {
          this.instanceManager.removeInstance(instance);
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Could not destroy an editor instance, error: ${error.message}`
          );
        }

        try {
          instance.unsubscribeWatcher?.dispose();
          instance.sourceFileWatcher?.dispose();
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Could not dispose source file watcher for file ${instance.document.uri.fsPath}, error: ${error.message}`
          );
        }
      },
      null,
      this.context.subscriptions
    );

    let activeCol = 0;
    let activeLine = 0;
    let activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor && activeTextEditor.document === document) {
      activeCol = activeTextEditor.selection.active.character;
      activeLine = activeTextEditor.selection.active.line;
      if (
        activeTextEditor.document.lineAt(activeLine).text.length === activeCol
      ) {
        activeCol =
          activeTextEditor.document.lineAt(activeLine).text.length - 1;
      }
    }

    let platform: InitialVars["os"];
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

    webviewPanel.webview.html = createEditorHtml(
      webviewPanel.webview,
      this.context,
      config,
      {
        isWatchingSourceFile: instance.sourceFileWatcher ? true : false,
        sourceFileCursorLineIndex: activeLine,
        sourceFileCursorColumnIndex: activeCol,
        isCursorPosAfterLastColumn:
          document.lineAt(activeLine).text.length === activeCol,
        openTableAndSelectCellAtCursorPos:
          config.openTableAndSelectCellAtCursorPos,
        os: platform,
      }
    );
  }

  private onDidReceiveMessage(
    message: PostMessage,
    instance: SomeInstance,
    config: any
  ) {
    switch (message.command) {
      case "ready": {
        debugLog("received ready from webview");

        instance.hasChanges = false;
        this.setEditorHasChanges(instance, false);

        let funcSendContent = (initialText: string) => {
          const textSlices = partitionString(initialText, 1024 * 1024);

          for (let i = 0; i < textSlices.length; i++) {
            const textSlice = textSlices[i];

            const msg: ReceivedMessageFromVsCode = {
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
          vscode.workspace.openTextDocument(instance.sourceUri).then(
            (document) => {
              const content = document.getText();
              instance.lastCommittedContent = content;
              funcSendContent(content);
            },
            (error) => {
              vscode.window.showErrorMessage(
                `Could not read the source file, error: ${error?.message}`
              );
            }
          );
        } else if (instance.document.isClosed) {
          vscode.workspace.openTextDocument(instance.sourceUri).then(
            (document) => {
              const content = document.getText();
              instance.lastCommittedContent = content;
              funcSendContent(content);
            },
            (error) => {
              vscode.window.showErrorMessage(
                `Could not read the source file, error: ${error?.message}`
              );
            }
          );
        } else {
          const content = instance.document.getText();
          instance.lastCommittedContent = content;
          funcSendContent(content);
        }

        debugLog("finished sending csv content to webview");

        break;
      }
      case "msgBox": {
        if (message.type === "info") {
          vscode.window.showInformationMessage(message.content);
        } else if (message.type === "warn") {
          vscode.window.showWarningMessage(message.content);
        } else if (message.type === "error") {
          vscode.window.showErrorMessage(message.content);
        } else {
          const _msg = `Unknown message box type: ${message.type}, message: ${message.content}`;
          console.error(_msg);
          vscode.window.showErrorMessage(_msg);
        }
        break;
      }
      case "apply": {
        const { csvContent, saveSourceFile } = message;
        this.applyContent(
          instance,
          csvContent,
          saveSourceFile,
          config.openSourceFileAfterApply
        );
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
        this.notExhaustive(
          message,
          `Received unknown message from webview: ${JSON.stringify(message)}`
        );
    }
  }

  private getEditorTitle(document: vscode.TextDocument): string {
    return `CSV edit ${path.basename(document.fileName)}`;
  }

  private setEditorHasChanges(instance: Instance, hasChanges: boolean) {
    instance.panel.title = `${hasChanges ? "* " : ""}${instance.originalTitle}`;
  }

  private notExhaustive(x: never, message: string): never {
    vscode.window.showErrorMessage(message);
    throw new Error(message);
  }

  private applyContent(
    instance: Instance,
    newContent: string,
    saveSourceFile: boolean,
    openSourceFileAfterApply: boolean
  ) {
    const edit = new vscode.WorkspaceEdit();

    var document = instance.document;

    var firstLine = document.lineAt(0);
    var lastLine = document.lineAt(document.lineCount - 1);
    var textRange = new vscode.Range(
      0,
      firstLine.range.start.character,
      document.lineCount - 1,
      lastLine.range.end.character
    );

    // Don't apply if the content didn't change
    if (document.getText() === newContent) {
      debugLog(`content didn't change`);
      return;
    }

    edit.replace(document.uri, textRange, newContent);
    vscode.workspace.applyEdit(edit).then(
      (editsApplied) => {
        instance.lastCommittedContent = newContent;
        this._afterEditsApplied(
          instance,
          document,
          editsApplied,
          saveSourceFile,
          openSourceFileAfterApply
        );
      },
      (reason) => {
        console.warn(`Error applying edits`);
        console.warn(reason);
        vscode.window.showErrorMessage(`Error applying edits`);
      }
    );
  }

  private _afterEditsApplied(
    instance: Instance,
    document: vscode.TextDocument,
    editsApplied: boolean,
    saveSourceFile: boolean,
    openSourceFileAfterApply: boolean
  ) {
    const afterShowDocument = () => {
      if (!editsApplied) {
        console.warn(`Edits could not be applied`);
        vscode.window.showErrorMessage(`Edits could not be applied`);
        return;
      }

      if (saveSourceFile) {
        document.save().then(
          (wasSaved) => {
            if (!wasSaved) {
              console.warn(`Could not save csv file`);
              vscode.window.showErrorMessage(`Could not save csv file`);
              return;
            }

            this.setEditorHasChanges(instance, false);
          },
          (reason) => {
            console.warn(`Error saving csv file`);
            console.warn(reason);
            vscode.window.showErrorMessage(`Error saving csv file`);
          }
        );
        return;
      }

      this.setEditorHasChanges(instance, false);
    };

    if (openSourceFileAfterApply) {
      vscode.window.showTextDocument(document).then(() => {
        afterShowDocument();
      });
    } else {
      afterShowDocument();
    }
  }

  private onWatcherChangeDetectedHandler(
    e: vscode.Uri,
    instanceManager: InstanceManager
  ) {
    const instance: Instance | null =
      instanceManager.findInstanceBySourceUri(e);
    if (!instance) return;

    if (instance.ignoreChangeEvents || instance.sourceFileWatcher === null) {
      debugLog(`source file changed: ${e.fsPath}, ignored`);
      return;
    }

    vscode.workspace.openTextDocument(instance.sourceUri).then(
      (document) => {
        let content = document.getText();
        debugLog(`content ${content.split("\n")[0]}`);

        if (content === instance.lastCommittedContent) {
          debugLog(`content didn't change, fake change`);
          return;
        }

        debugLog(`source file changed: ${e.fsPath}`);
        this.onSourceFileChanged(e.fsPath, instance);
      },
      (error) => {
        vscode.window.showErrorMessage(
          `Could not read the source file, error: ${error?.message}`
        );
      }
    );
  }

  private onSourceFileChanged(path: string, instance: Instance) {
    const msg: SourceFileChangedMessage = {
      command: "sourceFileChanged",
    };
    instance.panel.webview.postMessage(msg);
  }
}
