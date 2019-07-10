// localeInputs:
//		path:
//			node:
// 			value:
var localeInputs = {}
var alertHandler
var key = ''

async function EelPromise(task) {
    let result = await new Promise(task)
    if (result.error !== undefined) {
        throw result.error
    }
    return result
}

function alertFeedback(message, type) {
	let alertNode = document.getElementById('alert')
	alertNode.innerHTML = message

	if (['success', 'danger', 'info', 'warning'].includes(type)) {
		alertNode.setAttribute('class', 'alert alert-' + type)
	} else {
		alertNode.setAttribute('class', 'alert alert-info')
	}

	if (alertNode.style.display !== 'none') {
		clearTimeout(alertHandler)
	} else {
		alertNode.style.display = 'block'
	}

	setTimeout(() => {
		alertNode.style.display = 'none'
	}, 2000)
}

eel.expose(fixJson);
function fixJson(maybeValidJson) {
	try {
		let result = (new Function('return JSON.stringify(' + maybeValidJson + ')'))()
		return result
	} catch (e) {
		return null
	}
}

async function bindUI() {
	try {
		let paths = await EelPromise(eel.get_locale_path())
		let inputs = document.getElementById('inputs')
		let sample = document.getElementById('input-sample').children[0]
		for (path of paths) {
			((path) =>{
				let localeFileName = path.split('/')
				sample.children[0].children[0].children[0].innerHTML = localeFileName[localeFileName.length - 1].split('.')[0].toUpperCase()
				let inputNode = sample.cloneNode(true)
				localeInputs[path] = {
					node: inputNode,
					value: ''
				}
				inputNode.children[1].addEventListener('input', e => {
					localeInputs[path].value = e.target.value
				})
				inputs.appendChild(inputNode)
			})(path)
		}
	} catch (exception) {
		alertFeedback(exception, 'danger')
	}
}

function keyInputHandler(value) {
	key = value
	checkAvailable(key)
}

async function checkAvailable(value) {
	try {
		let statuses = await EelPromise(eel.check_key_status(value))
		for (path in statuses) {
			let label = localeInputs[path].node.children[0].children[0].children[1]
			localeInputs[path].node.children[0].children[1].innerHTML = statuses[path].text
			label.innerHTML = statuses[path].symbol
			label.setAttribute("title", statuses[path].text);

			for (let i = 0; i < localeInputs[path].node.children[2].children.length; i++) {
				localeInputs[path].node.children[2].children[i].style.display = "none"
			}
			
			/**
			 *  0: Invalid
			 *  1: Valid
			 *  2: Exist
			 *  3: Parent
			 *  4: Invalid JSON file
			 */
			let textarea = localeInputs[path].node.children[1].children[0]
			textarea.disabled = false
			switch (statuses[path].code) {
				case 1:
					{
						let suggestButton = localeInputs[path].node.children[2].children[1]
						suggestButton.style.display = "inline"
						suggestButton.addEventListener("click", (path => 
							e => {
								let textarea = localeInputs[path].node.children[1].children[0]
								let lastWord = value.split('.')[value.split('.').length - 1]
								let suggestion = lastWord
									.replace(/(_+.)/g, matched => {
										return matched.replace(/_+/, ' ').toLowerCase()
									})
									.replace(/[A-Z]/g, matched => {
										return ' ' + matched.toLowerCase()
									})
								textarea.value = suggestion.trim()
								localeInputs[path].value = textarea.value
							}
						)(path))
						break
					}
				case 2:
					{
						let editButton = localeInputs[path].node.children[2].children[0]
						editButton.style.display = "inline"
						editButton.addEventListener("click", (path => 
							e => {
								let textarea = localeInputs[path].node.children[1].children[0]
								textarea.value = statuses[path].data
								// localeInputs[path].value = textarea.value
							}
						)(path))
						break
					}
				case 4:
					{
						textarea.disabled = true
						break
					}
			}
		}
	} catch (exception) {
		alertFeedback(exception, 'danger')
	}
}

async function applyAll() {
	try {
		let paths = Object.keys(localeInputs)
		let values = paths.map(path => localeInputs[path].node.children[1].children[0].value)
		let result = await EelPromise(eel.apply(paths, key, values))
		checkAvailable(key)
		alertFeedback(result, 'success')
	} catch (exception) {
		alertFeedback(exception, 'danger')
	}
}

async function applyFilled() {
	try	{
		let paths = Object.keys(localeInputs).filter(path => localeInputs[path].node.children[1].children[0].value)
		if (paths.length === 0) {
			alertFeedback("Nothing to apply", 'info')
			return
		}
		let values = paths.map(path => localeInputs[path].node.children[1].children[0].value).filter(value => value)
		let result = await EelPromise(eel.apply(paths, key, values))
		checkAvailable(key)
		alertFeedback(result, 'success')
	} catch (exception) {
		alertFeedback(exception, 'danger')
	}
}

function clearValues() {
	Object.keys(localeInputs).forEach(path => {
		let textarea = localeInputs[path].node.children[1].children[0]
		textarea.value = ""
		localeInputs[path].value = ""
	})
}

function backHistory() {
	location.replace('/main.html')
}

async function setProjectName() {
	try {
		let projectNameNode = document.getElementById('project-name')
		let projectName = await EelPromise(eel.get_project_name())
		projectNameNode.innerHTML = projectName
	} catch (exception) {
		alertFeedback(exception, 'danger')
	}
}

Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};

let shouldRequestSuggest = true
let inputKey = ''
let lastChoiceSuggestion = null

let observableState = {
	suggestionList: [],
	choice: -1,
	get suggestions() {
		return this.suggestionList
	},
	set suggestions(listOfSuggestions) {
		this.suggestionList = listOfSuggestions
		let suggestionNode = $("#suggestion-container")
		suggestionNode.html("")
		this.suggestionList.forEach((suggestion, index) => {
			let suggestionBadge = $(`<div class="badge badge-light cursor-pointer mx-1">${suggestion}</div>`)
			suggestionBadge.click((index => e => {
				this.suggestionChoice = index
				$("#key-input").focus()
			})(index))
			suggestionNode.append(suggestionBadge)
		})
	},
	get suggestionChoice() {
		return this.choice
	},
	set suggestionChoice(choiceNumber) {
		if (this.choice !== choiceNumber) {
			this.choice = choiceNumber
			if (choiceNumber !== -1) {
				let suggestionNodes = $("#suggestion-container > div")
				for (let i = 0; i < suggestionNodes.length; i++) {
					if (i === choiceNumber) {
						$(suggestionNodes[i]).attr("class", "badge badge-info cursor-pointer mx-1")
					} else {
						$(suggestionNodes[i]).attr("class", "badge badge-light cursor-pointer mx-1")
					}
				}
				let keyInput = $("#key-input")
				let inputKeyChain = keyInput.val().split(".")

				lastChoiceSuggestion = inputKeyChain.map((key, index) => index === inputKeyChain.length - 1 ? this.suggestions[this.suggestionChoice] : key).join(".")
				keyInput.val(lastChoiceSuggestion)

				checkAvailable(lastChoiceSuggestion)
			}
		}
	}
}

window.onload = () => {
	setProjectName()
	bindUI()
	checkAvailable(key)
	$("#key-input").keydown(async function (e) {
		if (e.key === "Tab") {
			e.preventDefault()
			try {
				if (shouldRequestSuggest) {
					inputKey = $(this).val()
					observableState.suggestions = await EelPromise(eel.get_suggestions(inputKey))
					shouldRequestSuggest = false
				}
				// let inputKeyChain = inputKey.split(".")
				if (observableState.suggestions.length > 0) {
					if (e.shiftKey) {
						if (observableState.suggestionChoice < 0) {
							observableState.suggestionChoice = observableState.suggestions.length - 1
						} else {
							observableState.suggestionChoice = (observableState.suggestionChoice - 1).mod(observableState.suggestions.length)
						}
					} else {
						if (observableState.suggestionChoice < 0) {
							observableState.suggestionChoice = 0
						} else {
							observableState.suggestionChoice = (observableState.suggestionChoice + 1).mod(observableState.suggestions.length)
						}
					}
				}
			} catch (exception) {
				alertFeedback(exception, 'danger')
			}
		} else if (e.key !== "Shift") {
			observableState.suggestions = []
			observableState.suggestionChoice = -1
			shouldRequestSuggest = true
			lastChoiceSuggestion = null
		}
	})
	$("#key-input").blur(function (e) {
		if (lastChoiceSuggestion != null) {
			keyInputHandler(lastChoiceSuggestion)
			lastChoiceSuggestion = null
		}
	})
}