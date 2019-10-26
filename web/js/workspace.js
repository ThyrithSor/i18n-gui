// localeInputs:
//		path:
//			node:
// 			value:
var localeInputs = {}
var alertHandler
var key = {
  _: "",
  set value(str) {
    this._ = str
    if (this._.includes('_')) {
      // console.log("is snake")
      $("#case-switcher").html("🐫")
    } else {
      // console.log("is camel")
      $("#case-switcher").html("🐍")
    }
    $('#key-input').val(this._)
    checkAvailable(this._).then(statuses => {
      if (statuses) {
        toggleKeyModificationButtons(statuses)
      }
    })
  },
  get value() {
    return this._
  }
}
var currentStatus = {}
let listKeyWindow = null

String.prototype.capitalize = function () {
  if (this.length > 0) {
    return this[0].toUpperCase() + this.substring(1)
  }
  return this
}
function toCamel (s) {
  return s.replace(/([-_][a-z]?)/gi, $1 => {
    return $1
      .toUpperCase()
      .replace('-', '')
      .replace('_', '')
  })
}
function toSnake (s) {
  return s.replace(/[A-Z]/g, $1 => '_' + $1.toLowerCase()).replace(/(^_)|(\._)/g, $1 => $1.replace('_', ''))
}
function changeCase () {
  if (key.value.includes('_')) {
    key.value = toCamel(key.value)
  } else {
		key.value = toSnake(key.value)
  }
}
function copyKey () {
  let keyNode = document.getElementById('key-input')
  keyNode.select()
  document.execCommand('copy')
  alertFeedback('Copied : ' + keyNode.value, 'success')
}
async function EelPromise (task) {
  let result = await new Promise(task)
  if (result.error !== undefined && Object.keys(result).length === 1) {
    throw result.error
  }
  return result
}

function updateKey() {
  $('#old-key').html(key.value)
  $('#change-key-modal').modal({
    keyboard: true
  })
  setTimeout(() => {
    const newKey = $('#new-key-modify')
    newKey.focus()
    newKey.off()
    newKey.on('input', async key => {
      let statuses = await EelPromise(eel.check_key_status(key.target.value))
      if (Object.keys(statuses).every(path => statuses[path].code === 1)) {
        $(key.target).removeClass('is-invalid')
        $('#save-key-modification').attr('disabled', false)
      } else {
        $(key.target).addClass('is-invalid')
        $('#save-key-modification').attr('disabled', true)
      }
    })
  }, 500);
}

async function deleteKey() {
  if (confirm("Are you sure to delete " + key.value + "?")) {
    try {
      const success = await EelPromise(eel.delete_key(key.value))
      if (success) {
        alertFeedback(key.value + " is deleted", 'info')
        checkAvailable(key.value)
      }
    } catch (exception) {
      alertFeedback(exception, 'danger')
    }
  }
}

async function modifyKey() {
  const oldKey = key.value
  const newKey = $('#new-key-modify').val()
  try {
    const success = await EelPromise(eel.modify_key(oldKey, newKey))
    if (success) {
      console.log("Modified");
      $('#change-key-modal').modal('hide');
      alertFeedback("Key is modified", 'success')
      checkAvailable(key.value)
    }
  } catch (exception) {
    alertFeedback(exception, 'danger')
  }
}

function alertFeedback (message, type) {
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

function getLanguageFromPath (path) {
  let localeFileName = path.split(/[\\/]/g)
  return localeFileName[localeFileName.length - 1].split('.')[0].toUpperCase()
}

eel.expose(fixJson)
function fixJson (maybeValidJson) {
  try {
    let result = new Function('return JSON.stringify(' + maybeValidJson + ')')()
    return result
  } catch (e) {
    return null
  }
}
async function bindUI () {
  try {
    let paths = await EelPromise(eel.get_locale_path())
    let inputs = document.getElementById('inputs')
    let sample = document.getElementById('input-sample').children[0]
    for (path of paths) {
      ;(path => {
        sample.children[0].children[0].children[0].innerHTML = getLanguageFromPath(path)
        let inputNode = sample.cloneNode(true)
        localeInputs[path] = {
          node: inputNode,
          v: '',
          get value () {
            return this.v
          },
          set value (v) {
            this.v = v
            // new Promise(async (resolve, reject) => {
            // 	let localeCode = await EelPromise(eel.correct_locale_code(getLanguageFromPath(path)))
            // 	if (localeCode === 'en') {
            // 		let correctButton = $(localeInputs[path].node).find('.activity-buttons > button:nth-child(3)')
            // 		if (v.trim() !== "") {
            // 			correctButton.css('display', 'inline')
            // 			correctButton.off()
            // 			correctButton.click((path => async e => {
            // 				$("*").css('cursor', 'wait')
            // 				let result = await EelPromise(eel.correct_sentence(v))
            // 				$("*").css('cursor', 'auto')
            // 				this.v = result
            // 				$(localeInputs[path].node).find(".translation-text > textarea").val(this.v)
            // 			})(path))
            // 		} else {
            // 			correctButton.css('display', 'none')
            // 		}
            // 	}
            // })
          }
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

function keyInputHandler (event) {
  event.preventDefault()
  event.stopPropagation()
  key.value = event.target.value.replace(/\ +/g, '_')
}

function generateTranslateFromKey (keyTranslate) {
  let lastWord = keyTranslate.split('.')[keyTranslate.split('.').length - 1]
  let suggestion = lastWord
    .replace(/(_+.)/g, matched => {
      return matched.replace(/_+/, ' ').toLowerCase()
    })
    .replace(/[A-Z]/g, matched => {
      return ' ' + matched.toLowerCase()
    })
  return suggestion.trim()
}
async function checkAvailable (value) {
  try {
    let statuses = await EelPromise(eel.check_key_status(value))
    $('.btn-apply-all').prop('disabled', false)
    currentStatus = statuses
    for (path in statuses) {
      let status = $(localeInputs[path].node).find('.status')
      $(localeInputs[path].node)
        .find('.description')
        .html(statuses[path].text)
      status.html(statuses[path].symbol)
      status.prop('title', statuses[path].text)
      $(localeInputs[path].node)
        .find('.activity-buttons > button:not(.correct-sentence)')
        .css('display', 'none')
      /**
       *  0: Invalid
       *  1: Valid
       *  2: Exist
       *  3: Parent
       *  4: Invalid JSON file
       */
      let textarea = $(localeInputs[path].node).find('.translation-text > textarea')
      textarea.attr('placeholder', 'Your translation...')

      textarea.prop('disabled', false)
      switch (statuses[path].code) {
        case 2: {
          textarea.attr(
            'placeholder',
            statuses[path].data.length > 30 ? statuses[path].data.substring(0, 27) + '...' : statuses[path].data
          )
          let editButton = $(localeInputs[path].node).find('.activity-buttons > button:first-child')
          editButton.css('display', 'inline')
          editButton.off()
          editButton.click(
            (path => e => {
              let textarea = $(localeInputs[path].node).find('.translation-text > textarea')
              textarea.val(statuses[path].data)
              localeInputs[path].value = textarea.val()
            })(path)
          )
        }
        case 1: {
          let suggestButton = $(localeInputs[path].node).find('.activity-buttons > button:nth-child(2)')
          suggestButton.css('display', 'inline')
          suggestButton.off()
          suggestButton.click(
            (path => async e => {
              let textarea = $(localeInputs[path].node).find('.translation-text > textarea')
              let baseLanguage = await EelPromise(eel.get_base_language())
              let baseLanguageModelKey = Object.keys(localeInputs).find(
                modelKey => getLanguageFromPath(modelKey).toLowerCase() === baseLanguage.toLowerCase()
              )
              let requestSuggestTranslate
              if (
                getLanguageFromPath(path).toLowerCase() !== baseLanguage.toLowerCase() &&
                baseLanguageModelKey !== undefined &&
                (localeInputs[baseLanguageModelKey].value.trim() !== '' ||
                  (currentStatus[baseLanguageModelKey].code === 2 &&
                    currentStatus[baseLanguageModelKey].data.trim() !== ''))
              ) {
                $('*').css('cursor', 'wait')
                if (localeInputs[baseLanguageModelKey].value.trim() !== '') {
                  requestSuggestTranslate = await EelPromise(
                    eel.suggestion_translate(
                      localeInputs[baseLanguageModelKey].value,
                      baseLanguage,
                      getLanguageFromPath(path).toLowerCase()
                    )
                  )
                } else {
                  requestSuggestTranslate = await EelPromise(
                    eel.suggestion_translate(
                      currentStatus[baseLanguageModelKey].data,
                      baseLanguage,
                      getLanguageFromPath(path).toLowerCase()
                    )
                  )
                }
                $('*').css('cursor', 'auto')
              } else {
                if (getLanguageFromPath(path).toLowerCase() === 'en') {
                  $('*').css('cursor', 'wait')
                  requestSuggestTranslate = await EelPromise(eel.correct_sentence(generateTranslateFromKey(value)))
                  $('*').css('cursor', 'auto')
                } else {
                  $('*').css('cursor', 'wait')
                  requestSuggestTranslate = await EelPromise(
                    eel.suggestion_translate(
                      generateTranslateFromKey(value),
                      'en',
                      getLanguageFromPath(path).toLowerCase()
                    )
                  )
                  $('*').css('cursor', 'auto')
                }
              }
              textarea.val(requestSuggestTranslate.capitalize())
              localeInputs[path].value = textarea.val()
            })(path)
          )
          break
        }
        case 0:
        case 4: {
          textarea.prop('disabled', true)
          $('.btn-apply-all').prop('disabled', true)
          textarea.val('')
          break
        }
      }
    }

    return statuses
  } catch (exception) {
    alertFeedback(exception, 'danger')
  }
}
async function toggleKeyModificationButtons(statuses) {
  // Hide or show key modification buttons
  const hasExistKey = Object.keys(statuses).some(path => statuses[path].code === 2 || statuses[path].code === 3)
  const hasErrorKey = Object.keys(statuses).some(path => statuses[path].code === 0 || statuses[path].code === 4)
  const keyModificationButton = $('#key-modification')
  if (hasExistKey && !hasErrorKey) {
    keyModificationButton.removeClass('hidden')
  } else {
    keyModificationButton.addClass('hidden')
  }
}
async function applyAll () {
  try {
    let isValidAll = Object.keys(currentStatus).filter(keyPath => currentStatus[keyPath].code !== 1).length === 0
    let userConfirm = true
    if (!isValidAll) {
      userConfirm = confirm('The currently seems to exist already, Are you sure to write anyway?')
    }
    if (userConfirm) {
      let paths = Object.keys(localeInputs)
      let values = paths.map(path =>
        $(localeInputs[path].node)
          .find('.translation-text > textarea')
          .val()
      )
      let result = await EelPromise(eel.apply(paths, key.value, values))
      checkAvailable(key.value)
      alertFeedback(result, 'success')
    } else {
      alertFeedback('Action cancelled', 'info')
    }
  } catch (exception) {
    alertFeedback(exception, 'danger')
  }
}
async function applyFilled () {
  try {
    let paths = Object.keys(localeInputs).filter(path =>
      $(localeInputs[path].node)
        .find('.translation-text > textarea')
        .val()
    )
    let isValidAll = paths.filter(keyPath => currentStatus[keyPath].code !== 1).length === 0
    let userConfirm = true
    if (!isValidAll) {
      userConfirm = confirm('The currently seems to exist already, Are you sure to write anyway?')
    }
    if (userConfirm) {
      if (paths.length === 0) {
        alertFeedback('Nothing to apply', 'info')
        return
      }
      let values = paths
        .map(path =>
          $(localeInputs[path].node)
            .find('.translation-text > textarea')
            .val()
        )
        .filter(value => value)
      let result = await EelPromise(eel.apply(paths, key.value, values))
      checkAvailable(key.value)
      alertFeedback(result, 'success')
    } else {
      alertFeedback('Action cancelled', 'info')
    }
  } catch (exception) {
    alertFeedback(exception, 'danger')
  }
}

function clearValues () {
  Object.keys(localeInputs).forEach(path => {
    let textarea = $(localeInputs[path].node).find('.translation-text > textarea')
    textarea.val('')
    localeInputs[path].value = ''
  })
}

function backHistory () {
  if (listKeyWindow !== null) {
    listKeyWindow.close()
  }
  location.replace('/main.html')
}
async function setProjectName () {
  try {
    let projectNameNode = document.getElementById('project-name')
    let projectName = await EelPromise(eel.get_project_name())
    projectNameNode.innerHTML = projectName
  } catch (exception) {
    alertFeedback(exception, 'danger')
  }
}
Number.prototype.mod = function (n) {
  return ((this % n) + n) % n
}
let shouldRequestSuggest = true
let inputKey = ''
let lastChoiceSuggestion = null
let observableState = {
  suggestionList: [],
  choice: -1,
  get suggestions () {
    return this.suggestionList
  },
  set suggestions (listOfSuggestions) {
    this.suggestionList = listOfSuggestions
    let suggestionNode = $('#suggestion-container')
    suggestionNode.html('')
    this.suggestionList.forEach((suggestion, index) => {
      let suggestionBadge = $(`<div class="badge badge-light cursor-pointer mx-1">${suggestion}</div>`)
      suggestionBadge.click(
        (index => e => {
          this.suggestionChoice = index
          $('#key-input').focus()
        })(index)
      )
      suggestionNode.append(suggestionBadge)
    })
  },
  get suggestionChoice () {
    return this.choice
  },
  set suggestionChoice (choiceNumber) {
    if (this.choice !== choiceNumber) {
      this.choice = choiceNumber
      if (choiceNumber !== -1) {
        let suggestionNodes = $('#suggestion-container > div')
        for (let i = 0; i < suggestionNodes.length; i++) {
          if (i === choiceNumber) {
            $(suggestionNodes[i]).attr('class', 'badge badge-info cursor-pointer mx-1')
          } else {
            $(suggestionNodes[i]).attr('class', 'badge badge-light cursor-pointer mx-1')
          }
        }
        let keyInput = $('#key-input')
        let inputKeyChain = keyInput.val().split('.')
        lastChoiceSuggestion = inputKeyChain
          .map((key, index) => (index === inputKeyChain.length - 1 ? this.suggestions[this.suggestionChoice] : key))
          .join('.')
        keyInput.val(lastChoiceSuggestion)
        checkAvailable(lastChoiceSuggestion).then(statuses => {
          if (statuses) {
            toggleKeyModificationButtons(statuses)
          }
        })
      }
    }
  }
}

function listKey (event) {
  if (listKeyWindow === null || listKeyWindow.closed) {
    listKeyWindow = window.open('/keylist.html', '', 'width=350, height=700')
    listKeyWindow.eel = eel
    listKeyWindow.trigger = function (type, data) {
      switch (type) {
        case 'warn':
          console.log(data)
				case 'load-key':
					key.value = data
      }
    }
  }
}
window.onload = () => {
  setProjectName()
  bindUI()
  checkAvailable(key.value)
  $('#key-input').keydown(async function (e) {
    if (e.key === 'Tab') {
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
              observableState.suggestionChoice = (observableState.suggestionChoice - 1).mod(
                observableState.suggestions.length
              )
            }
          } else {
            if (observableState.suggestionChoice < 0) {
              observableState.suggestionChoice = 0
            } else {
              observableState.suggestionChoice = (observableState.suggestionChoice + 1).mod(
                observableState.suggestions.length
              )
            }
          }
        }
      } catch (exception) {
        alertFeedback(exception, 'danger')
      }
    } else if (e.key !== 'Shift') {
      observableState.suggestions = []
      observableState.suggestionChoice = -1
      shouldRequestSuggest = true
      lastChoiceSuggestion = null
    }
  })
  $('#key-input').blur(function (e) {
    if (lastChoiceSuggestion != null) {
      key.value = lastChoiceSuggestion
      lastChoiceSuggestion = null
    }
  })
}

window.onbeforeunload = function () {
  if (listKeyWindow !== null && !listKeyWindow.closed) {
    listKeyWindow.close()
  }
  return null
}
