import * as vscode from "vscode";
import { TsvCustomDocumentProvider } from "./TableCustomDocument";

export const editorUriScheme = "csv-edit";

export function activate(context: vscode.ExtensionContext) {
  // Register the custom editor provider for tsv, csv, and tab files
  context.subscriptions.push(TsvCustomDocumentProvider.register(context));
}

export function deactivate() {}
