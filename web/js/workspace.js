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

function alertFeedback(message, isSuccess) {
	let alertNode = document.getElementById('alert')
	alertNode.innerHTML = message

	if (isSuccess) {
		alertNode.setAttribute('class', 'alert alert-success')
	} else {
		alertNode.setAttribute('class', 'alert alert-danger')
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
				sample.children[0].children[0].innerHTML = localeFileName[localeFileName.length - 1].split('.')[0].toUpperCase()
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
		alertFeedback(exception)
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
			let label = localeInputs[path].node.children[0].children[1]
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
		alertFeedback(exception)
	}
}

async function applyAll() {
	try {
		let paths = Object.keys(localeInputs)
		let values = paths.map(path => localeInputs[path].node.children[1].children[0].value)
		let result = await EelPromise(eel.apply(paths, key, values))
		checkAvailable(key)
		alertFeedback(result, true)
	} catch (exception) {
		alertFeedback(exception, false)
	}
}

async function applyEdited() {
	try	{
		let paths = Object.keys(localeInputs).filter(path => localeInputs[path].value)
		let values = paths.map(path => localeInputs[path].value)
		let result = await EelPromise(eel.apply(paths, key, values))
		checkAvailable(key)
		alertFeedback(result, true)
	} catch (exception) {
		alertFeedback(exception, false)
	}
}

function clearValues() {
	Object.keys(localeInputs).forEach(path => {
		let textarea = localeInputs[path].node.children[1].children[0]
		textarea.value = ""
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
		alertFeedback(exception)
	}
}

Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};

let suggestionChoice = -1
let shouldRequestSuggest = true
let suggestions = []
let inputKey = ''
let lastChoiceSuggestion = null

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
					suggestions = await EelPromise(eel.get_suggestions(inputKey))
					shouldRequestSuggest = false
				}
				let inputKeyChain = inputKey.split(".")
				if (suggestions.length > 0) {
					if (e.shiftKey) {
						if (suggestionChoice < 0) {
							suggestionChoice = suggestions.length - 1
						} else {
							suggestionChoice = (suggestionChoice - 1).mod(suggestions.length)
						}
					} else {
						if (suggestionChoice < 0) {
							suggestionChoice = 0
						} else {
							suggestionChoice = (suggestionChoice + 1).mod(suggestions.length)
						}
					}
					lastChoiceSuggestion = inputKeyChain.map((key, index) => index === inputKeyChain.length - 1 ? suggestions[suggestionChoice] : key).join(".")
					$(this).val(lastChoiceSuggestion)
					checkAvailable(lastChoiceSuggestion)
				}
			} catch (exception) {
				alertFeedback(exception)
			}
		} else if (e.key !== "Shift") {
			suggestionChoice = -1
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