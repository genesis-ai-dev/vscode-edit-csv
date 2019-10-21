type ContextMenuSettings = import("../node_modules/handsontable/handsontable").contextMenu.Settings


type GridSettings = import("../node_modules/handsontable/handsontable").GridSettings

/* --- common helpers --- */


/**
 * displayed or hides the read options
 * @param shouldCollapse 
 */
function toggleReadOptions(shouldCollapse: boolean) {
	const el = _getById('read-options-icon')
	const content = _getById('read-options-content') //the wrapper



	if (shouldCollapse !== undefined) {
		_setCollapsed(shouldCollapse, el, content)

		_setReadOptionCollapsedVsState(shouldCollapse)
		return
	}

	_toggleCollapse(el, content, _setReadOptionCollapsedVsState)
}

/**
 * displayed or hides the write options
 * @param shouldCollapse 
 */
function toggleWriteOptions(shouldCollapse: boolean) {
	const el = _getById('write-options-icon')
	const content = _getById('write-options-content') //the wrapper

	if (vscode) {
		const lastState = _getVsState()
		vscode.setState({
			...lastState,
			writeOptionIsCollapsed: shouldCollapse
		})
	}

	if (shouldCollapse !== undefined) {
		_setCollapsed(shouldCollapse, el, content)

		_setWriteOptionCollapsedVsState(shouldCollapse)
		return
	}

	_toggleCollapse(el, content, _setWriteOptionCollapsedVsState)
}

/**
 * displayed or hides the preview
 * @param shouldCollapse 
 */
function togglePreview(shouldCollapse: boolean) {
	const el = _getById('preview-icon')
	const content = _getById('preview-content') //the wrapper

	if (vscode) {
		const lastState = _getVsState()
		vscode.setState({
			...lastState,
			previewIsCollapsed: shouldCollapse
		})
	}

	if (shouldCollapse !== undefined) {
		_setCollapsed(shouldCollapse, el, content)

		_setPreviewCollapsedVsState(shouldCollapse)
		return
	}

	_toggleCollapse(el, content, _setPreviewCollapsedVsState)
}

function _toggleCollapse(el: HTMLElement, wrapper: HTMLElement, afterToggled?: (isCollapsed: boolean) => void) {

	if (el.classList.contains('fa-chevron-right')) {
		//expand
		_setCollapsed(false, el, wrapper)

		if (afterToggled) afterToggled(false)
		return
	}

	//collapse
	_setCollapsed(true, el, wrapper)

	if (afterToggled) afterToggled(true)
}

/**
 * sets a collapseable sections state
 * @param shouldCollapsed 
 * @param el 
 * @param wrapper 
 */
function _setCollapsed(shouldCollapsed: boolean, el: HTMLElement, wrapper: HTMLElement) {

	if (shouldCollapsed) {
		el.classList.remove('fa-chevron-down')
		el.classList.add('fa-chevron-right')
		// el.classList.replace( 'fa-chevron-down','fa-chevron-right')
		wrapper.style.display = 'none'

		onResizeGrid()
		return
	}

	el.classList.add('fa-chevron-down')
	el.classList.remove('fa-chevron-right')

	// el.classList.replace('fa-chevron-right', 'fa-chevron-down')

	wrapper.style.display = 'block'

	onResizeGrid()
}


/* --- read options --- */
/**
 * if input value is set programmatically this is NOT called
 * 
 * when the settings apply header {@link startRenderData} we need to reset the status text here
 * 
 * @param fromUndo true: only update col headers, do not change the table data (will be done by undo/redo), false: normal
 */
function applyHasHeader(displayRenderInformation: boolean, fromUndo = false) {

	const el = _getById('has-header') as HTMLInputElement //or defaultCsvReadOptions._hasHeader

	const elWrite = _getById('has-header-write') as HTMLInputElement //or defaultCsvWriteOptions.header

	let func = () => {

		if (!hot) throw new Error('table was null')

		if (el.checked) {

			//this checked state is set from csvReadOptions._hasHeader
			const dataWithIndex = getFirstRowWithIndex()
	
			if (dataWithIndex === null) {
				//disable input...
				const el3 = _getById('has-header') as HTMLInputElement
				el3.checked = false
				headerRowWithIndex = null
				return
			}
	
			if (fromUndo) return
	
			headerRowWithIndex = dataWithIndex
	
			hot.alter('remove_row', headerRowWithIndex.physicalIndex);
	
			elWrite.checked = true
			defaultCsvWriteOptions.header = true
			defaultCsvReadOptions._hasHeader = true

			return
		}
	
		if (fromUndo) return
	
		if (headerRowWithIndex === null) {
			throw new Error('could not insert header row')
		}
	
		hot.alter('insert_row', headerRowWithIndex.physicalIndex)
		const visualRow = hot.toVisualRow(headerRowWithIndex.physicalIndex)
		const visualCol = hot.toVisualColumn(0)
		//see https://handsontable.com/docs/6.2.2/Core.html#populateFromArray
		hot.populateFromArray(visualRow, visualCol, [[...headerRowWithIndex.row]])
	
		headerRowWithIndex = null
	
		elWrite.checked = false
		defaultCsvWriteOptions.header = false
		defaultCsvReadOptions._hasHeader = false
	
		//we changed headerRowWithIndex / header row so force a re-render so that hot calls defaultColHeaderFunc again
		hot.render()
	}

	if (displayRenderInformation) {
		statusInfo.innerText = `Rendering table...`

		call_after_DOM_updated(() => {

			func()

			setTimeout(() => {
				statusInfo.innerText = '';
			}, 0)

		})

		return
	}

	func()

}
function setDelimiterString() {
	const el = _getById('delimiter-string') as HTMLInputElement
	defaultCsvReadOptions.delimiter = el.value
}

function setCommentString() {
	const el = _getById('comment-string') as HTMLInputElement
	defaultCsvReadOptions.comments = el.value === '' ? false : el.value
}

function setQuoteCharString() {
	const el = _getById('quote-char-string') as HTMLInputElement
	defaultCsvReadOptions.quoteChar = el.value
}

function setEscapeCharString() {
	const el = _getById('escape-char-string') as HTMLInputElement
	defaultCsvReadOptions.escapeChar = el.value
}

/**
 * @deprecated not longer supported
 */
function setSkipEmptyLines() {
	// const el = _getById('skip-empty-lines')
	// if (el) {
	// 	//currently disabled...
	// 	csvReadOptions.skipEmptyLines = el.checked
	// }
}

/**
 * sets the read delimiter programmatically
 * @param {string} delimiter 
 */
function setReadDelimiter(delimiter: string) {
	const el = _getById('delimiter-string') as HTMLInputElement
	el.value = delimiter
	defaultCsvReadOptions.delimiter = delimiter
}

/* --- write options --- */


function setHasHeaderWrite() {
	const el = _getById('has-header-write') as HTMLInputElement
	defaultCsvWriteOptions.header = el.checked
}

function setDelimiterStringWrite() {
	const el = _getById('delimiter-string-write') as HTMLInputElement
	defaultCsvWriteOptions.delimiter = el.value
}

function setCommentStringWrite() {
	const el = _getById('comment-string-write') as HTMLInputElement
	defaultCsvWriteOptions.comments = el.value === '' ? false : el.value
}

function setQuoteCharStringWrite() {
	const el = _getById('quote-char-string-write') as HTMLInputElement
	defaultCsvWriteOptions.quoteChar = el.value
}

function setEscapeCharStringWrite() {
	const el = _getById('escape-char-string-write') as HTMLInputElement
	defaultCsvWriteOptions.escapeChar = el.value
}

function setQuoteAllFieldsWrite() {
	const el = _getById('quote-all-fields-write') as HTMLInputElement
	defaultCsvWriteOptions.quoteAllFields = el.checked
}

/**
 * NOT USED CURRENTLY (ui is hidden)
 */
function setNewLineWrite() {
	const el = _getById('newline-select-write') as HTMLInputElement

	if (el.value === '') {
		defaultCsvWriteOptions.newline = newLineFromInput
	}
	else if (el.value === 'lf') {
		defaultCsvWriteOptions.newline = '\n'
	}
	else if (el.value === 'lf') {
		defaultCsvWriteOptions.newline = '\r\n'
	}
}

/**
 * sets the write delimiter programmatically
 * @param {string} delimiter 
 */
function setWriteDelimiter(delimiter: string) {
	const el = _getById('delimiter-string-write') as HTMLInputElement
	el.value = delimiter
	defaultCsvWriteOptions.delimiter = delimiter
}


/* --- preview --- */

/**
 * updates the preview
 */
function generateCsvPreview() {
	const value = getDataAsCsv(defaultCsvReadOptions, defaultCsvWriteOptions)

	const el = _getById('csv-preview') as HTMLTextAreaElement
	el.value = value

	//open preview
	togglePreview(false)
}

function copyPreviewToClipboard() {

	generateCsvPreview()

	const el = _getById('csv-preview') as HTMLTextAreaElement

	postCopyToClipboard(el.value)

}


/* --- other --- */


/**
 * display the given data in the handson table
 * if we have rows this sets the 
 * @see headerRow and enables the has header option
 * if we have data we convert it to match a rectangle (every row must have the same number of columns / cells)
 * @param {string[][]} data array with the rows or null to just destroy the old table
 */
function displayData(data: string[][] | null, csvReadConfig: CsvReadOptions) {

	if (data === null) {
		if (hot) {
			hot.getInstance().destroy()
			hot = null
		}
		return
	}

	//this will also expand comment rows but we only use the first column value...
	_normalizeDataArray(data, csvReadConfig)

	//reset header row
	headerRowWithIndex = null
	
	// if (data.length > 0) {
	// 	headerRowWithIndex = getFirstRowWithIndexByData(data)
	// }

	const container = csvEditorDiv

	if (hot) {
		hot.destroy()
		hot = null
	}

	const initiallyHideComments = initialConfig ? initialConfig.initiallyHideComments : false

	if (initiallyHideComments && typeof csvReadConfig.comments === 'string') {
		hiddenPhysicalRowIndices = _getCommentIndices(data, csvReadConfig)
	}

		//enable all find connected stuff
		//we need to setup this first so we get the events before handsontable... e.g. document keydown
		setupFind()

	//@ts-ignore
	hot = new Handsontable(container, {
		data,
		trimWhitespace: false,
		rowHeaderWidth: getRowHeaderWidth(data.length),
		//false to enable virtual rendering
		renderAllRows: false, //use false and small table size for fast initial render, see https://handsontable.com/docs/7.0.2/Options.html#renderAllRows
		rowHeaders: function (row: number) { //the visual row index
			let text = (row + 1).toString()

			if (data.length === 1) {
				return `${text} <span class="remove-row clickable" onclick="removeRow(${row})" style="visibility: hidden"><i class="fas fa-trash"></i></span>`
			}

			return `${text} <span class="remove-row clickable" onclick="removeRow(${row})"><i class="fas fa-trash"></i></span>`
			//why we would always disallow to remove first row?
			// return row !== 0
			// 	? `${text} <span class="remove-row clickable" onclick="removeRow(${row})"><i class="fas fa-trash"></i></span>`
			// 	: `${text} <span class="remove-row clickable" onclick="removeRow(${row})" style="visibility: hidden"><i class="fas fa-trash"></i></span>`
		} as any,
		afterChange: onAnyChange, //only called when cell value changed (e.g. not when col/row removed)
		fillHandle: false,
		colHeaders: defaultColHeaderFunc as any,
		currentColClassName: 'foo', //actually used to overwrite highlighting
		currentRowClassName: 'foo', //actually used to overwrite highlighting
		//plugins
		comments: false,
		search: {
			queryMethod: customSearchMethod,
			searchResultClass: 'search-result-cell',
		} as any, //typing is wrong, see https://handsontable.com/docs/6.2.2/demo-searching.html
		wordWrap: enableWrapping,
		autoColumnSize: initialColumnWidth > 0 ? {
			maxColumnWidth: initialColumnWidth
		} : true,
		//keep this undefined/disabled because else performance is very very very bad for large files 
		//(for every row the height is calculated even if not rendered, on plugin startup and when a col is resized?)
		//i also don't understand the benefit of it... maybe for non text content?
		// autoRowSize: true, 
		manualRowMove: true,
		manualRowResize: true,
		manualColumnMove: true,
		manualColumnResize: true,
		columnSorting: true,
		//see https://handsontable.com/docs/7.1.0/demo-context-menu.html
		contextMenu: {
			callback: function (key: string, ...others) {
			},
			items: {
				'row_above': {},
				'row_below': {},
				'---------': {
					name: '---------'
				},
				'col_left': {},
				'col_right': {},
				'---------2': {
					name: '---------'
				},
				'remove_row': {
					disabled: function () {

						const selection = hot!.getSelected()
						let allRowsAreSelected = false
						if (selection) {
							const selectedRowsCount = Math.abs(selection[0][0] - selection[0][2]) //starts at 0 --> +1
							allRowsAreSelected = hot!.countRows() === selectedRowsCount + 1
						}

						return hot!.countRows() === 1 || allRowsAreSelected
					}
				},
				'remove_col': {
					disabled: function () {

						const selection = hot!.getSelected()
						let allColsAreSelected = false
						if (selection) {
							const selectedColsCount = Math.abs(selection[0][1] - selection[0][3]) //starts at 0 --> +1
							allColsAreSelected = hot!.countCols() === selectedColsCount + 1
						}

						return hot!.countCols() === 1 || allColsAreSelected
					}
				},
				'---------3': {
					name: '---------'
				},
				'alignment': {},
			}
		} as ContextMenuSettings,

		outsideClickDeselects: false, //keep selection

		cells: highlightCsvComments
			? function (row, col) {
				var cellProperties: GridSettings = {};
				cellProperties.renderer = 'commentValueRenderer' //is registered in util
				// cellProperties.renderer = 'invisiblesCellValueRenderer' //is registered in util

				// if (row === undefined || row === null) return cellProperties
				// if (col === undefined || col === null) return cellProperties

				//@ts-ignore
				// const _hot = this.instance as Handsontable
				// const tableData = _hot.getData() //this is slooooooow, getDataAtCell is much faster

				//we should always have 1 col
				// const visualRowIndex = _hot.toVisualRow(row); //this is toooooo slow for e.g. 100.000 rows (takes ~3.3 mins vs 12s with just cell renderer)
				// const firstCellVal = _hot.getDataAtCell(row, 0) //tableData[row][0]

				// if (firstCellVal === null) return cellProperties

				// if (typeof csvReadConfig.comments === 'string' && firstCellVal.trim().startsWith(csvReadConfig.comments)) {
				// 	//@ts-ignore
				// 	cellProperties._isComment = true
				// } else {
				// 	//@ts-ignore
				// 	cellProperties._isComment = false
				// }

				return cellProperties
			}
			: undefined,

		//not fully working... we would handle already comment cells
		// beforeChange: function (changes) {

		// 	if (!changes || changes.length !== 1) return

		// 	console.log(changes)

		// 	const rowIndex = changes[0][0]
		// 	const colIndex = changes[0][1] as number
		// 	const oldVal = changes[0][2]
		// 	const newVal = changes[0][3]

		// 	if (oldVal === newVal) return //user only started editing then canceled

		// 	if (typeof csvReadConfig.comments === 'string' && colIndex === 0 && newVal.trim().startsWith(csvReadConfig.comments)) {
		// 		//this is now a merged comment row
		// 		const _tmp = transformIntoCommentRow(rowIndex, csvReadConfig)
		// 		changes[0][3] =  _tmp
		// 		console.log(_tmp)
		// 	}

		// },

		//TODO see https://github.com/handsontable/handsontable/issues/3328
		//only working because first argument is actually the old size, which is a bug
		beforeColumnResize: function (oldSize, newSize, isDoubleClick) { //after change but before render

			//allColSizes is not always up to date... only set on window resize... when the bug is fixed we need to change this...

			// if (allColSizes.length > 0 && isDoubleClick) {
			// const oldSize = allColSizes[currentColumn]

			if (oldSize === newSize) {
				//e.g. we have a large column and the auto size is too large...
				if (initialConfig) {
					return initialConfig.doubleClickColumnHandleForcedWith
				} else {
					console.log(`initialConfig is falsy`)
				}
			}
			// }
		},
		enterMoves: function (event: KeyboardEvent) {

			if (!hot) throw new Error('table was null')

			lastHandsonMoveWas = 'enter'

			const selection = hot.getSelected()
			const _default = {
				row: 1,
				col: 0
			}

			if (!initialConfig || initialConfig.lastRowEnterBehavior !== 'createRow') return _default

			if (!selection || selection.length === 0) return _default

			if (selection.length > 1) return _default

			const rowCount = hot.countRows()

			//see https://handsontable.com/docs/3.0.0/Core.html#getSelected
			//[startRow, startCol, endRow, endCol].
			const selected = selection[0]
			if (selected[0] !== selected[2] || selected[0] !== rowCount - 1) return _default

			if (event.key.toLowerCase() === 'enter' && event.shiftKey === false) {
				addRow(false)
			}
			return _default
		},
		tabMoves: function (event: KeyboardEvent) {

			if (!hot) throw new Error('table was null')

			lastHandsonMoveWas = 'tab'

			const selection = hot.getSelected()
			const _default = {
				row: 0,
				col: 1
			}

			// console.log(initialConfig.lastColumnTabBehavior);

			if (!initialConfig || initialConfig.lastColumnTabBehavior !== 'createColumn') return _default

			if (!selection || selection.length === 0) return _default

			if (selection.length > 1) return _default

			const colCount = hot.countCols()

			//see https://handsontable.com/docs/3.0.0/Core.html#getSelected
			//[startRow, startCol, endRow, endCol]
			const selected = selection[0]
			if (selected[1] !== selected[3] || selected[1] !== colCount - 1) return _default

			if (event.key.toLowerCase() === 'tab' && event.shiftKey === false) {
				addColumn(false)
			}
			return _default
		},

		afterBeginEditing: function () {

			if (!initialConfig || !initialConfig.selectTextAfterBeginEditCell) return

			const textarea = document.getElementsByClassName("handsontableInput")
			if (!textarea || textarea.length === 0 || textarea.length > 1) return

			const el = textarea.item(0) as HTMLTextAreaElement | null
			if (!el) return

			el.setSelectionRange(0, el.value.length)
		},
		// data -> [[1, 2, 3], [4, 5, 6]]
		//coords -> [{startRow: 0, startCol: 0, endRow: 1, endCol: 2}]
		beforeCopy: function (data, coords) {
			//we could change data to 1 element array containing the finished data? log to console then step until we get to SheetClip.stringify
			// console.log('data');
		},
		afterUndo: function (action: any) {

			if (headerRowWithIndex && action.actionType === 'remove_row' && action.index === headerRowWithIndex.physicalIndex) {
				//remove header row
				defaultCsvReadOptions._hasHeader = false
				const el = _getById('has-header') as HTMLInputElement
				const elWrite = _getById('has-header-write') as HTMLInputElement
				el.checked = false
				elWrite.checked = false

				applyHasHeader(true, true)
			}

		},
		beforeRedo: function (action: any) {
			if (headerRowWithIndex && action.actionType === 'remove_row' && action.index === headerRowWithIndex.physicalIndex) { //first row cannot be removed normally so it must be the header row option
				//we re insert header row

				defaultCsvReadOptions._hasHeader = false
				const el = _getById('has-header') as HTMLInputElement
				const elWrite = _getById('has-header-write') as HTMLInputElement
				el.checked = true
				elWrite.checked = true

				applyHasHeader(true, true)
			}
		},

		afterColumnMove: function (startCol: number, endCol: number) {

			if (!hot) throw new Error('table was null')

			//TODO NOT WORKING??
			// hot.updateSettings({
			// 	colHeaders: defaultColHeaderFunc as any
			// }, false)
			onAnyChange()
		},
		afterRowMove: function(startRow: number, endRow: number) {
			if (!hot) throw new Error('table was null')
			onAnyChange()
		},
		afterGetRowHeader: function (visualRowIndex: number, th: any) {
			const tr = th.parentNode as HTMLTableRowElement

			if (!tr || !hot) return

			//is row hidden?
			let physicalIndex = hot.toPhysicalRow(visualRowIndex)

			if (hiddenPhysicalRowIndices.indexOf(physicalIndex) === -1) {
				tr.classList.remove('hidden-row')

				if (tr.previousElementSibling) {
					tr.previousElementSibling.classList.remove('hidden-row-previous-row')
				}

			} else {
				tr.classList.add('hidden-row')

				//css cannot select previous elements...add a separate class
				if (tr.previousElementSibling) {
					tr.previousElementSibling.classList.add('hidden-row-previous-row')
				}
			}
		},
		afterCreateCol: function (visualColIndex, amount) {

			if (!hot) return

			if (headerRowWithIndex) {
				const physicalIndex = hot.toPhysicalColumn(visualColIndex)
				//@ts-ignore
				headerRowWithIndex.row.splice(physicalIndex, 0, ...Array(amount).fill(null))
				//hot automatically re-renders after this
			}
			onAnyChange()
		},
		afterRemoveCol: function (visualColIndex, amount) {

			if (!hot) return

			if (headerRowWithIndex) {
				const physicalIndex = hot.toPhysicalColumn(visualColIndex)
				headerRowWithIndex.row.splice(physicalIndex, amount)
				//hot automatically re-renders after this
			}

			const sortConfigs = hot.getPlugin('columnSorting').getSortConfig()

			const sortedColumnIds = sortConfigs.map(p => hot!.toPhysicalColumn(p.column))

			let removedColIds: number[] = []
			for (let i = 0; i < amount; i++) {
				removedColIds.push(hot.toPhysicalColumn(visualColIndex + i))
			}

			//if we removed some col that was sorted then clear sorting...
			if (sortedColumnIds.some(p => removedColIds.includes(p))) {
				hot.getPlugin('columnSorting').clearSort()
			}

			onAnyChange()
		},
		//inspired by https://github.com/handsontable/handsontable/blob/master/src/plugins/hiddenRows/hiddenRows.js
		//i absolutely don't understand how handsontable implementation is working... 
		//their this.hiddenRows should be physical indices (see https://github.com/handsontable/handsontable/blob/master/src/plugins/hiddenRows/hiddenRows.js#L254)
		//but in onAfterCreateRow & onAfterRemoveRow they check against `visualRow` which is actually the physical row (see above)
		//and then they increment the physical row via the amount
		//however, it works somehow...
		afterCreateRow: function (visualRowIndex, amount) {
			//we need to modify some or all hiddenPhysicalRowIndices...

			for (let i = 0; i < hiddenPhysicalRowIndices.length; i++) {
				const hiddenPhysicalRowIndex = hiddenPhysicalRowIndices[i];

				if (hiddenPhysicalRowIndex >= visualRowIndex) {
					hiddenPhysicalRowIndices[i] += amount
				}
			}
			onAnyChange()
		},
		afterRemoveRow: function (visualRowIndex, amount) {
			//we need to modify some or all hiddenPhysicalRowIndices...
			if (!hot) return

			for (let i = 0; i < hiddenPhysicalRowIndices.length; i++) {
				const hiddenPhysicalRowIndex = hiddenPhysicalRowIndices[i];

				if (hiddenPhysicalRowIndex >= visualRowIndex) {
					hiddenPhysicalRowIndices[i] -= amount
				}
			}

			//when we have a header row and the original index was 10 and now we have only 5 rows... change index to be the last row
			//so that when we disable has header we insert it correctly
			// const physicalIndex = hot.toPhysicalRow(visualRowIndex)
			if (headerRowWithIndex) {
				const lastValidIndex = hot.countRows()
				if (headerRowWithIndex.physicalIndex > lastValidIndex) {
					headerRowWithIndex.physicalIndex = lastValidIndex
				}
			}

			onAnyChange()
		},
		//called when we select a row via row header
		beforeSetRangeStartOnly: function (coords) {
		},
		beforeSetRangeStart: function (coords) {

			if (!hot) return

			if (hiddenPhysicalRowIndices.length === 0) return

			const lastPossibleRowIndex = hot.countRows() - 1
			const lastPossibleColIndex = hot.countCols() - 1
			const actualSelection = hot.getSelectedLast()
			let columnIndexModifier = 0
			const isLastOrFirstRowHidden = hiddenPhysicalRowIndices.indexOf(lastPossibleRowIndex) !== -1
				|| hiddenPhysicalRowIndices.indexOf(0) !== -1

			let direction = 1 // or -1

			if (actualSelection) {
				const actualPhysicalIndex = hot.toPhysicalRow(actualSelection[0])
				direction = actualPhysicalIndex < coords.row ? 1 : -1

				//direction is invalid if actualPhysicalIndex === 0 && coords.row === lastPossibleRowIndex 
				//this is because the last row is hidden...

				//move up but last row is hidden
				if (isLastOrFirstRowHidden && coords.row === lastPossibleRowIndex && actualPhysicalIndex === 0) { //
					direction = -1
				}
				//move down on last row but first row is hidden
				else if (isLastOrFirstRowHidden && coords.row === 0 && actualPhysicalIndex === lastPossibleRowIndex) {
					direction = 1
				}
			}

			const getNextRow: (a: number) => number = (visualRowIndex: number) => {

				let visualRow = visualRowIndex;
				//@ts-ignore
				let physicalIndex = hot.toPhysicalRow(visualRowIndex)

				if (visualRow > lastPossibleRowIndex) { //moved under the last row
					columnIndexModifier = 1
					return getNextRow(0)
				}

				if (visualRow < 0) { //we moved above row 0
					columnIndexModifier = -1
					return getNextRow(lastPossibleRowIndex)
				}

				if (hiddenPhysicalRowIndices.indexOf(physicalIndex) !== -1) {
					//row is hidden
					return getNextRow(visualRow + direction)
				}

				return visualRow
			}


			coords.row = getNextRow(coords.row)

			if (lastHandsonMoveWas !== 'tab') {
				coords.col = coords.col + (isLastOrFirstRowHidden ? columnIndexModifier : 0)
			}

			if (coords.col > lastPossibleColIndex) {
				coords.col = 0
			}
			else if (coords.col < 0) {
				coords.col = lastPossibleColIndex
			}

			lastHandsonMoveWas = null
		},
		//called multiple times when we move mouse while selecting...
		beforeSetRangeEnd: function () {
		},

		rowHeights: function (visualRowIndex: number) {

			//see https://handsontable.com/docs/6.2.2/Options.html#rowHeights
			let defaultHeight = 23

			if (!hot) return defaultHeight

			const actualPhysicalIndex = hot.toPhysicalRow(visualRowIndex)

			//some hack so that the renderer still respects the row... (also see http://embed.plnkr.co/lBmuxU/)
			//this is needed else we render all hidden rows as blank spaces (we see a scrollbar but not rows/cells)
			//but this means we will lose performance because hidden rows are still managed and rendered (even if not visible)
			if (hiddenPhysicalRowIndices.includes(actualPhysicalIndex)) {
				//sub 1 height is treated by the virtual renderer as height 0??
				//we better add some more zeros
				return 0.000001
			}

			return defaultHeight
		} as any,

	})

	//@ts-ignore
	Handsontable.dom.addEvent(window as any, 'resize', throttle(onResizeGrid, 200))


	const settingsApplied = checkIfHasHeaderReadOptionIsAvailable(true)

	//if we have only 1 row and header is enabled by default...this would be an error (we cannot display something)

	if (settingsApplied === true && defaultCsvReadOptions._hasHeader === true) { //this must be applied else we get duplicate first row
		applyHasHeader(true, false)
	}

	//make sure we see something (right size)...
	onResizeGrid()

	//select first cell by default so we have always a context
	hot.selectCell(0, 0)
}

/**
 * should be called if anything was changes
 * then we set the editor to has changes
 */
function onAnyChange(changes?: CellChanges[] | null, reason?: string) {

	//this is the case on init (because initial data set)
	//also when we reset data (button)
	//when we trim all cells (because this sets the data value via hot.updateSettings)
	if (changes === null && reason && reason.toLowerCase() === 'loaddata') {
		return
	}

	if (reason && reason === 'edit' && changes && changes.length > 0) {

		//handsontable even emits an event if the value stayed the same...
		const hasChanges = changes.some(p => p[2] !== p[3])
		if (!hasChanges) return
	}

	showOrHideOutdatedSearch(true)

	postSetEditorHasChanges(true)
}

//not needed really now because of bug in handson table, see https://github.com/handsontable/handsontable/issues/3328
//just used to check if we have columns
var allColSizes = []

/**
 * updates the handson table to fill available space (will trigger scrollbars)
 */
function onResizeGrid() {

	if (!hot) return

	const widthString = getComputedStyle(csvEditorWrapper).width

	if (!widthString) {
		_error(`could not resize table, width string was null`)
		return
	}

	const width = parseInt(widthString.substring(0, widthString.length - 2))

	const heightString = getComputedStyle(csvEditorWrapper).height

	if (!heightString) {
		_error(`could not resize table, height string was null`)
		return
	}

	const height = parseInt(heightString.substring(0, heightString.length - 2))

	hot.updateSettings({
		width: width,
		height: height,
	}, false)

	//get all col sizes
	allColSizes = []
	for (let i = 0; i < hot.countCols(); i++) {
		allColSizes.push(hot.getColWidth(i))
	}

}

/**
 * generates the default html wrapper code for the given column name
 * we add a delete icon
 * @param {number} colIndex the physical column index (user could have moved cols so visual  first col is not the physical second) use https://handsontable.com/docs/6.2.2/RecordTranslator.html to translate
 * 	call like hot.toVisualColumn(colIndex)
 * @param {string | undefined | null} colName 
 */
function defaultColHeaderFunc(colIndex: number, colName: string | undefined | null) {

	let text = getSpreadsheetColumnLabel(colIndex)

	if (headerRowWithIndex !== null && colIndex < headerRowWithIndex.row.length) {
		let visualIndex = colIndex
		if (hot)
			visualIndex = hot!.toVisualColumn(colIndex)
		const data = headerRowWithIndex.row[visualIndex]
		if (data !== null) {
			text = data
		}
	}

	//null can also happen if we enable header, add column, disable header, enable header (then the new column have null values)
	if (colName !== undefined && colName !== null) {
		//@ts-ignore
		text = colName
	}

	let visualIndex = colIndex

	if (hot) {
		visualIndex = hot.toVisualColumn(colIndex)

		if (hot.countCols() === 1) {
			return `${text} <span class="remove-col clickable" onclick="removeColumn(${visualIndex})" style="visibility: hidden"><i class="fas fa-trash"></i></span>`
		}

		return `${text} <span class="remove-col clickable" onclick="removeColumn(${visualIndex})"><i class="fas fa-trash"></i></span>`
	}

	return visualIndex !== 0
		? `${text} <span class="remove-col clickable" onclick="removeColumn(${visualIndex})"><i class="fas fa-trash"></i></span>`
		: `${text} <span class="remove-col clickable" onclick="removeColumn(${visualIndex})" style="visibility: hidden"><i class="fas fa-trash"></i></span>`
}

/**
 * displays or hides the help modal
 * @param isVisible 
 */
function toggleHelpModal(isVisible: boolean) {

	if (isVisible) {
		helModalDiv.classList.add('is-active')
		return
	}

	helModalDiv.classList.remove('is-active')
}

/**
 * displays or hides the ask read again modal
 * @param isVisible 
 */
function toggleAskReadAgainModal(isVisible: boolean) {

	if (isVisible) {
		askReadAgainModalDiv.classList.add('is-active')
		return
	}

	askReadAgainModalDiv.classList.remove('is-active')
}



/**
 * parses and displays the given data (csv)
 * @param {string} content 
 */
function resetData(content: string, csvReadOptions: CsvReadOptions) {
	const _data = parseCsv(content, csvReadOptions)
	// console.log(`_data`, _data)
	displayData(_data, csvReadOptions)

	//might be bigger than the current view
	onResizeGrid()
	toggleAskReadAgainModal(false)
}

/**
 * a wrapper for resetData to display status text when rendering
 */
function resetDataFromResetDialog() {

	toggleAskReadAgainModal(false)

	startRenderData()
}

function startReceiveCsvProgBar() {
	receivedCsvProgBar.value = 0
	receivedCsvProgBarWrapper.style.display = "block"
}

function intermediateReceiveCsvProgBar() {
	receivedCsvProgBar.attributes.removeNamedItem('value')
}

function stopReceiveCsvProgBar() {
	receivedCsvProgBarWrapper.style.display = "none"
}


/**
 * called from ui
 * @param saveSourceFile 
 */
function postApplyContent(saveSourceFile: boolean) {
	const csvContent = getDataAsCsv(defaultCsvReadOptions, defaultCsvWriteOptions)

	//used to clear focus... else styles are not properly applied
	//@ts-ignore
	if (document.activeElement !== document.body) document.activeElement.blur();

	_postApplyContent(csvContent, saveSourceFile)
}


/**
 * the height for the th element
 * @param rows total number of rows
 */
function getRowHeaderWidth(rows: number) {
	const parentPadding = 5 * 2 //th has 1 border + 4 padding on both sides
	const widthMultiplyFactor = 10 //0-9 are all <10px width (with the current font)
	const iconPadding = 4
	const binIcon = 14
	const hiddenRowIcon = 10
	const len = rows.toString().length * widthMultiplyFactor + binIcon + iconPadding + parentPadding + hiddenRowIcon
	return len
	//or Math.ceil(Math.log10(num + 1)) from https://stackoverflow.com/questions/10952615/length-of-number-in-javascript
}

function trimAllCells() {

	if (!hot) throw new Error('table was null')

	const numRows = hot.countRows()
	const numCols = hot.countCols()
	const allData = getData()
	let data: string = ''

	for (let row = 0; row < numRows; row++) {
		for (let col = 0; col < numCols; col++) {
			data = allData[row][col]

			if (typeof data !== "string") {
				// console.log(`${row}, ${col} no string`)
				continue
			}

			allData[row][col] = data.trim()
			//tooo slow for large tables
			// hot.setDataAtCell(row, col, data.trim())
		}
	}

	if (headerRowWithIndex) {
		for (let col = 0; col < headerRowWithIndex.row.length; col++) {
			const data = headerRowWithIndex.row[col]

			if (typeof data !== "string") {
				continue
			}

			headerRowWithIndex.row[col] = data.trim();
		}
	}

	hot.updateSettings({
		data: allData
	}, false)

	//hot.updateSettings reloads data and thus afterChange hook is triggered
	//BUT the change reason is loadData and thus we ignore it...
	onAnyChange()

	// const afterData = getData()

	// for (let row = 0; row < numRows; row++) {
	// 	for (let col = 0; col < numCols; col++) {

	// 		if (afterData[row][col] !== allData[row][col]) {
	// 			console.log(`${row}, ${col}`)
	// 		}
	// 	}
	// }

}

function showOrHideAllComments(show: boolean) {

	if (show) {
		showCommentsBtn.style.display = 'none'
		hideCommentsBtn.style.display = 'initial'

		hiddenPhysicalRowIndices = []
	}
	else {
		showCommentsBtn.style.display = 'initial'
		hideCommentsBtn.style.display = 'none'

		if (hot) {
			hiddenPhysicalRowIndices = _getCommentIndices(getData(), defaultCsvReadOptions)
			hiddenPhysicalRowIndices = hiddenPhysicalRowIndices.map(p => hot!.toPhysicalRow(p))
		}
	}

	if (!hot) return

	hot.render()
}

function _setHasUnsavedChangesUiIndicator(hasUnsavedChanges: boolean) {
	if (hasUnsavedChanges) {
		unsavedChangesIndicator.classList.remove('op-hidden')
	} else {
		unsavedChangesIndicator.classList.add('op-hidden')
	}
}

//--- find widget

function setupFind() {

	Mousetrap.unbind('meta+f')
	Mousetrap.bindGlobal('meta+f', (e) => {
		e.preventDefault()
		showOrHideFindWidget(true)
	})

	findWidgetInput.removeEventListener('keyup', onSearchInputPreDebounced)
	findWidgetInput.addEventListener('keyup', onSearchInputPreDebounced)

	document.documentElement.removeEventListener('keydown', onDocumentRootKeyDown)
	document.documentElement.addEventListener('keydown', onDocumentRootKeyDown)

	Mousetrap.unbind('esc')
	Mousetrap.bindGlobal('esc', (e) => {
		showOrHideFindWidget(false)
	})


	Mousetrap.bindGlobal('f3', (e) => {
		if (isFindWidgetDisplayed() === false && lastFindResults.length === 0) return
		gotoNextFindMatch()
	})

	Mousetrap.unbind('shift+f3')
	Mousetrap.bindGlobal('shift+f3', (e) => {
		if (isFindWidgetDisplayed() === false && lastFindResults.length === 0) return
		gotoPreviousFindMatch()
	})

	window.removeEventListener('resize', onWindowResizeThrottled)
	window.addEventListener('resize', onWindowResizeThrottled)
}

function onDocumentRootKeyDown(e: ExtendedKeyboardEvent) {

	if (isFindWidgetDisplayed() && document.activeElement === findWidgetInput) {

		//when the find widget is displayed AND has focus do not pass the event to handsontable
		//else we would input into the cell editor...
		//see editorManager.js > init (`instance.runHooks('afterDocumentKeyDown', event);`) > _baseEditor.js > beginEditing (`this.focus();`) > textEditor.js > focus
		e.stopImmediatePropagation()

		//but we need to be able to close the find...
		if (e.key === 'Escape') {
			Mousetrap.trigger('esc')
		}
	}

}

function onSearchInputPre(e: KeyboardEvent | null) {

	let forceSearch = false

	if (e) {
		//allow to quickly refresh search
		if (e.key === 'Enter') {
			forceSearch = true
		} else {
		//don't trigger on meta/super and escape but this should already be caught by value changed check below
		if (
			e.key.indexOf('Meta') !== -1 || e.key.indexOf('Escape') !== -1
		) return
		}
	} 

	//because we debounced the input we sometimes get an input "f" here when we repeatedly open and close the find widget
	//so only fire when the input value really changed
	if (findWidgetInput.value === findWidgetInputValueCache && forceSearch === false) return

	findWidgetInputValueCache = findWidgetInput.value

	onSearchInput(false, true, null)
}

/**
 * 
 * @param e 
 * @param isOpeningFindWidget 
 * @param jumpToResult 
 * @param pretendedText if this is a string we search synchronous!
 */
async function onSearchInput(isOpeningFindWidget: boolean, jumpToResult: boolean, pretendedText: string | null) {

	if (!hot ) return

	//when we open the find widget and input is empty then didn't do anything
	if (isOpeningFindWidget === true && findWidgetInput.value === "") {
		findWidgetInput.focus()
		return
	}

	showOrHideOutdatedSearch(false)

	if (findOptionUseRegexCase) {
		let regexIsValid = refreshFindWidgetRegex(false)

		if (!regexIsValid) {
			findWidgetInput.focus()
			return
		}
	}

	let searchPlugin = hot.getPlugin('search')

	if (pretendedText === null) {
		//use real value
		//@ts-ignore
		// lastFindResults = searchPlugin.query(findWidgetInput.value)

		findWidgetProgressbar.setValue(0)
		findWidgetProgressbar.show()

		console.time('query')

		findWidgetQueryCancellationToken.isCancellationRequested = false
		showOrHideSearchCancel(true)

		//when we increment to e.g. only update after 10% then the time will improve!
		//@ts-ignore
		lastFindResults = await searchPlugin.queryAsync(findWidgetInput.value, _onSearchProgress, 5, findWidgetQueryCancellationToken)

	} else {
			//@ts-ignore
		lastFindResults = searchPlugin.query(pretendedText)
	}

	findWidgetQueryCancellationToken.isCancellationRequested = false

	if (jumpToResult) {
		//jump to the first found match
		gotoFindMatchByIndex(0)
	}

	//to render highlighting
	hot.render()

	//render will auto focus the editor (hot input textarea)
	//see copyPaste.js > onAfterSelectionEnd > `this.focusableElement.focus();`
	//and
	//see selection.js > setRangeEnd(coords) > `this.runLocalHooks('afterSetRangeEnd', coords);` > ... > textEditor.js > focus > `this.TEXTAREA.select();`

	//this should run after all handsontable hooks... and the search input should keep focus
	setTimeout(() => {
		findWidgetInput.focus()
	},0)
	console.log(`finished`)
}

function _onSearchProgress(index: number, maxIndex: number, percentage: number) {

		findWidgetProgressbar.setValue(percentage)
		console.log(`per`, percentage)
		if (index >= maxIndex) {
			_onSearchFinished()
		}
}

function _onSearchFinished() {
	showOrHideSearchCancel(false)
	//small delay so we see the 100% finished progress bar
	setTimeout(() => {
		findWidgetProgressbar.hide()
	}, 100)
}

function onCancelSearch() {
	findWidgetQueryCancellationToken.isCancellationRequested = true
	_onSearchFinished()
	console.log(`cancelled`)
}

function showOrHideSearchCancel(show: boolean) {
	findWidgetCancelSearch.style.display = show ? 'block' : 'none'
	findWidgetInfo.style.display = show ? 'none' : 'block'
}

/**
 * refreshes the {@link findWidgetCurrRegex} from the {@link findWidgetInput}
 * @returns true: the find widget regex is valid (!= null), false: regex is invalid
 */
function refreshFindWidgetRegex(forceReset: boolean): boolean {

	if (forceReset) {
		findWidgetCurrRegex = null
		findWWidgetErrorMessage.innerText = ''
		findWidgetInput.classList.remove('error-input')
		return false
	}

	try {
		findWidgetCurrRegex = new RegExp(findWidgetInput.value, 'g')
		findWWidgetErrorMessage.innerText = ''
		findWidgetInput.classList.remove('error-input')

		return true

	} catch (error) {
		console.log(`error:`, error.message)
		findWidgetCurrRegex = null
		findWWidgetErrorMessage.innerText = error.message
		findWidgetInput.classList.add('error-input')

		return false
	}
}

/**
 * shows or hides the find widget 
 * @param show 
 */
function showOrHideFindWidget(show: boolean) {
	
	if (!hot) return

	let currIsSown = isFindWidgetDisplayed()

	if (currIsSown === show) return

	findWidget.style.display = show ? 'flex' : 'none'

	if (show) {
		hot.updateSettings({
			search: {
				isSuspended: false
			}
		} as any, false)

		//handsontable probably tries to grab the focus...
		setTimeout(() => {
			findWidgetInput.focus()
		}, 0);

	} else {
		hot.updateSettings({
			search: {
				isSuspended: true
			}
		} as any, false)
	}

}

function isFindWidgetDisplayed(): boolean {
	return findWidget.style.display  !== 'none'
}

/**
 * toggles the find widget visibility
 */
function toggleFindWidgetVisibility() {
	showOrHideFindWidget(findWidget.style.display  === 'none')
}


//--- find widget options

function toggleFindWindowOptionMatchCase() {
	setFindWindowOptionMatchCase(findWidgetOptionMatchCase.classList.contains(`active`) ? false : true)
}

function setFindWindowOptionMatchCase(enabled: boolean) {

	if (enabled) {
		findWidgetOptionMatchCase.classList.add(`active`)
	} else {
		findWidgetOptionMatchCase.classList.remove(`active`)
	}

	findOptionMatchCaseCache = enabled

	//empty content should not trigger new search
	if (findWidgetInputValueCache === '') return

	onSearchInput(false, true, null)
}

function toggleFindWindowOptionWholeCell() {
	setFindWindowOptionWholeCell(findWidgetOptionWholeCell.classList.contains(`active`) ? false : true)
}

function setFindWindowOptionWholeCell(enabled: boolean) {

	if (enabled) {
		findWidgetOptionWholeCell.classList.add(`active`)
	} else {
		findWidgetOptionWholeCell.classList.remove(`active`)
	}

	findOptionMatchWholeCellCache = enabled

	//empty content should not trigger new search
	if (findWidgetInputValueCache === '') return

	onSearchInput(false, true, null)
}

function toggleFindWindowOptionMatchTrimmedCell() {
	setFindWindowOptionMatchTrimmedCell(findWidgetOptionWholeCellTrimmed.classList.contains(`active`) ? false : true)
}

function setFindWindowOptionMatchTrimmedCell(enabled: boolean) {

	if (enabled) {
		findWidgetOptionWholeCellTrimmed.classList.add(`active`)
	} else {
		findWidgetOptionWholeCellTrimmed.classList.remove(`active`)
	}

	findOptionTrimCellCache = enabled

	//empty content should not trigger new search
	if (findWidgetInputValueCache === '') return

	onSearchInput(false, true, null)
}

function toggleFindWindowOptionRegex() {
	setFindWindowOptionRegex(findWidgetOptionRegex.classList.contains(`active`) ? false : true)
}

/**
 * also refreshes the {@link findWidgetCurrRegex} when enabled (in {@link onSearchInput})
 * @param enabled 
 */
function setFindWindowOptionRegex(enabled: boolean) {

	if (enabled) {
		findWidgetOptionRegex.classList.add(`active`)
		refreshFindWidgetRegex(false)
	} else {
		findWidgetOptionRegex.classList.remove(`active`)
		refreshFindWidgetRegex(true)
	}

	findOptionUseRegexCase = enabled

	//empty content should not trigger new search
	if (findWidgetInputValueCache === '') return

	onSearchInput(false, true, null)
}

//--- find matches

function gotoPreviousFindMatch() {
	gotoFindMatchByIndex(currentFindIndex-1)
}

function gotoNextFindMatch() {
	gotoFindMatchByIndex(currentFindIndex+1)
}

/**
 * moves the table to the given find match by index
 * also sets the {@link currentFindIndex}
 * @param matchIndex if the index is invalid we cycle
 */
function gotoFindMatchByIndex(matchIndex: number) {

	if (!hot) return

	if (lastFindResults.length === 0) {
		findWidgetInfo.innerText = `No results`
		return
	}

	if (matchIndex >= lastFindResults.length) {
		gotoFindMatchByIndex(0)
		return
	}

	if (matchIndex < 0) {
		gotoFindMatchByIndex(lastFindResults.length - 1)
		return
	}

	let match = lastFindResults[matchIndex]
	
	hot.selectCell(match.row, match.col)
	hot.scrollViewportTo(match.row)
	findWidgetInfo.innerText = `${matchIndex+1}/${lastFindResults.length}`
	currentFindIndex = matchIndex
	findWidgetInput.focus()
}

function onFindWidgetGripperMouseDown(e: MouseEvent) {
	e.preventDefault()
	findWidgetGripperIsMouseDown = true
	let xFromRight = document.body.clientWidth - e.clientX 

	if (findWidget.style.right === null || findWidget.style.right === "") {
		return
	}

	let rightString = findWidget.style.right.substr(0, findWidget.style.right.length-2)
	findWidgetDownPointOffsetInPx = xFromRight - parseInt(rightString)

	document.addEventListener('mouseup', onFindWidgetDragEnd)
	document.addEventListener('mousemove', onFindWidgetDrag)
}

function onFindWidgetDrag(e: MouseEvent) {
	e.preventDefault()

	let xFromRight = document.body.clientWidth - e.clientX 
	let newRight = xFromRight- findWidgetDownPointOffsetInPx
	
	//keep the find widget in window bounds
	newRight = Math.max(newRight, 0)
	newRight = Math.min(newRight, document.body.clientWidth - findWidget.clientWidth)

	findWidget.style.right = `${newRight}px`
}

function onFindWidgetDragEnd(e: MouseEvent) {
	findWidgetGripperIsMouseDown = false
	document.removeEventListener('mousemove', onFindWidgetDrag)
	document.removeEventListener('mouseup', onFindWidgetDragEnd)
}

function onWindowResize(e: UIEvent) {

	//ensure the find widget is in bounds...
	if (findWidget.style.right === null || findWidget.style.right === "") {
		return
	}
	let rightString = findWidget.style.right.substr(0, findWidget.style.right.length-2)
	let currRight = parseInt(rightString)

	currRight = Math.max(currRight, 0)
	currRight = Math.min(currRight, document.body.clientWidth - findWidget.clientWidth)
	findWidget.style.right = `${currRight}px`
}

function showOrHideOutdatedSearch(isOutdated: boolean) {
	findWidgetOutdatedSearch.style.display = isOutdated ? 'block' : 'none'
}

function refreshCurrentSearch() {
	onSearchInput(false, true, null)
}