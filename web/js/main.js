const CONFIG_FILE_NAME = 'config.translate'

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

function download(fileName, text) {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', fileName);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function exitProgram() {
    close()
    new Promise(eel.exit_program())
}

function getContent(file) {
    return new Promise(function(resolve, reject) {
        let reader = new FileReader();
        reader.onload = function({
            target: {
                result
            }
        }) {
            try {
                resolve(result)
            } catch (error) {
                reject(error)
            }
        }.bind(this);
        reader.readAsText(file);
    })
}

function saveConfig() {
    let projectName = $("#project-name-input").val()
    let localePath = $("#locale-path-input").val()
    let configs = [
        ["PROJECT_NAME", projectName],
        ["TRANSLATION_JSON_PATH", localePath]
    ]
    platform = window.navigator.platform
    windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE']
    let configOutput = configs.map(config => config.join("=")).join("\n")
    if (windowsPlatforms.indexOf(platform) !== -1) {
        configOutput = configs.map(config => config.join("=")).join("\r\n")
    }
    download(CONFIG_FILE_NAME, configOutput)
    $("#project-name-input").val("")
    $("#locale-path-input").val("")
    $('#generateConfigModal').modal('hide')
    return false
}

function submitConfigForm() {
    $("#config-form").submit()
}

function parseConfig(fileContent) {
    let configs = fileContent.split(/\r?\n/g).map(line => line.split("#")[0]).filter(config => config.trim() !== '' && !config.trim().startsWith("#")).map(config => config.split("=")).filter(config => config.length >= 2).reduce((cfg1, cfg2) => {
        if (!cfg1.config) {
            cfg1.config = {}
            cfg1.config[cfg1[0].trim()] = cfg1.slice(1).join("=").trim()
        }
        cfg1.config[cfg2[0].trim()] = cfg2.slice(1).join("=").trim()
        return cfg1
    }).config
    return configs
}
async function loadConfig(configs) {
    try {
        let result = await EelPromise(eel.load_config(configs))
        if (result === true) {
            location.replace("/workspace.html")
        } else {
            alertFeedback(result, false)
        }
    } catch (exception) {
        alertFeedback(exception, false)
    }
}
async function receiveFile(file) {
    let fileContent = await getContent(file)
    let configs = parseConfig(fileContent)
    await loadConfig(configs)
}
async function bindCacheUI(configCache) {
    let cacheConfigNode = $("#cache-config")
    cacheConfigNode.html("")
    if (configCache.length > 0) {
        let title = $(`<h5>Recent Projects</h5>`)
        let list = $(`<ul class="list-group mb-3"></div>`)
        list.append(configCache.map(config => {
            let listItem = $(`<li class="list-group-item list-group-item-action">
                <div><strong>${config.PROJECT_NAME}</strong></div>
                <div class='text-truncate text-lightgrey'>${config.TRANSLATION_JSON_PATH}</div>
            </li>`)
            let closeButton = $(`<button type="button" class="close" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>`)
            // Action when click on list item
            listItem.click((config => e => {
                loadConfig(config)
            })(config))
            // Remove config
            closeButton.click((config => async e => {
                try {
                    e.preventDefault()
                    e.stopPropagation()
                    let updatedCache = await EelPromise(eel.remove_cache(config.TRANSLATION_JSON_PATH))
                    // Update UI list item
                    bindCacheUI(updatedCache)
                } catch (exception) {
                    alertFeedback(exception, false)
                }
            })(config))
            listItem.prepend(closeButton)
            return listItem
        }))
        cacheConfigNode.append(title)
        cacheConfigNode.append(list)
    }
}
async function loadCaches() {
    try {
        let configCache = await EelPromise(eel.cache_config())
        bindCacheUI(configCache)
    } catch (exception) {
        alertFeedback(exception, false)
    }
}
window.onload = () => {
    let dropzone = $("div#dropzone").dropzone({
        autoProcessQueue: false,
        acceptedFiles: CONFIG_FILE_NAME,
        url: "/file/post",
        init: function() {
            this.on("addedfile", function() {
                for (let i = 0; i < this.files.length; i++) {
                    if (this.files[i].name === CONFIG_FILE_NAME) {
                        receiveFile(this.files[i])
                        break
                    }
                }
                this.removeAllFiles(true)
            });
        }
    })
    loadCaches()
    $('#generateConfigModal').on('shown.bs.modal', function() {
        $('#project-name-input').trigger('focus')
    })
}