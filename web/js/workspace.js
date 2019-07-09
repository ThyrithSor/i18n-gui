eel.expose(my_javascript_function);
function my_javascript_function(a, b) {
  alert(a + b)
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

// localeInputs:
//		path:
//			node:
// 			value:
var localeInputs = {}
var alertHandler
var key = ''

async function bindUI() {
	let paths = await new Promise(eel.get_locale_path())
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
}

async function checkAvailable(value) {
	key = value
	let statuses = await new Promise(eel.check_key_status(key))
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
		console.log(path)
		textarea.disabled = false
		switch (statuses[path].code) {
			case 1:
				{
					let suggestButton = localeInputs[path].node.children[2].children[1]
					suggestButton.style.display = "inline"
					suggestButton.addEventListener("click", (path => 
						e => {
							let textarea = localeInputs[path].node.children[1].children[0]
							let lastWord = key.split('.')[key.split('.').length - 1]
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
}

async function applyAll() {
	try {
		let paths = Object.keys(localeInputs)
		let values = paths.map(path => localeInputs[path].node.children[1].children[0].value)
		await new Promise(eel.apply(paths, key, values))
		checkAvailable(key)
		alertFeedback('Updated ' + key, true)
	} catch (e) {
		alertFeedback('Something went wrong', false)
	}
}

async function applyEdited() {
	try	{
		let paths = Object.keys(localeInputs).filter(path => localeInputs[path].value)
		let values = paths.map(path => localeInputs[path].value)
		console.log(paths)
		await new Promise(eel.apply(paths, key, values))
		checkAvailable(key)
		alertFeedback('Updated ' + key, true)
	} catch (e) {
		alertFeedback('Something went wrong', false)
	}
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

function clearValues() {
	Object.keys(localeInputs).forEach(path => {
		let textarea = localeInputs[path].node.children[1].children[0]
		textarea.value = ""
	})
}

function backHistory() {
	// window.history.back()
	location.replace('/main.html')
}

async function setProjectName() {
	let projectNameNode = document.getElementById('project-name')
	let projectName = await new Promise(eel.get_project_name())
	projectNameNode.innerHTML = projectName
}

window.onload = () => {
	setProjectName()
	bindUI()
	checkAvailable(key)
}