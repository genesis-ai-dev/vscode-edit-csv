# custom-csv-editor

This extension provides a customized CSV editor with an Excel-like table UI, forked from [vscode-edit-csv](https://github.com/janisdd/vscode-edit-csv).

## Features

Execute the command `edit as csv` to open the custom editor for the current file.

_Execute the command again to switch back to the source file or to switch back to the editor_

![feature X](images/titleImg.gif)

**Note: Data flow is one-way (editor to source file). Changes made to the source file (.csv) while the editor is open will not be reflected in the editor.**

## Important Notes

- On initial load, all rows are expanded to ensure equal length (number of cells)
  - This may trigger the `unsaved changes` indicator immediately
- Enabling/disabling the `has header` option will clear the undo/redo stack
- Empty lines are skipped during processing
- Quote information is retained by default (see [Retain Quote Information Rules](#retain-quote-information-rules))
- Comment rows will only export the first cell
- Context menu available via right-click on the table (since v0.1.0)

## How this Extension Works

The extension operates by:

1. Converting CSV content for display in a table UI
2. Managing changes through a webview interface
3. Writing updates back to the source file

When clicking `Edit CSV file`:

- File content is transferred via `[webview].postMessage`
- Configuration is injected into the editor HTML
- References are stored to manage the connection between source and editor

## Building Locally

To compile and watch files:

```bash
tsc -w #or just tsc to transpile once
# new terminal
cd csvEditorHtml
tsc -w #or just tsc to transpile once
```

Run the extension by pressing `F5` in VS Code.

## Credits

This project is forked from [vscode-edit-csv](https://github.com/janisdd/vscode-edit-csv) and uses the following key technologies:

- [PapaParse](https://github.com/mholt/PapaParse) for CSV parsing/writing
- [Handsontable](https://github.com/handsontable/handsontable) for the table interface
- [VS Code Webview UI Toolkit](https://github.com/microsoft/vscode-webview-ui-toolkit)

## License

Code: MIT (following the original project's license)
