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

function parseConfig(fileContent) {
    let configs = fileContent.split(/\r?\n/g).filter(config => config.trim() !== '').map(config => config.split("=")).filter(config => config.length >= 2).reduce((cfg1, cfg2) => {
        if (!cfg1.config) {
            cfg1.config = {}
            cfg1.config[cfg1[0].trim()] = cfg1.slice(1).join("=").trim()
        }
        cfg1.config[cfg2[0].trim()] = cfg2.slice(1).join("=").trim()
        return cfg1
    }).config
    return configs
}
async function receiveFile(file) {
    let fileContent = await getContent(file)
    let configs = parseConfig(fileContent)
    let result = await new Promise(eel.load_config(configs))
    if (result === true) {
        location.replace("/workspace.html")
    } else {
        console.log('Has error')
    }
}
window.onload = () => {
    let dropzone = $("div#dropzone").dropzone({
        autoProcessQueue: false,
        acceptedFiles: "*.translate",
        url: "/file/post",
        init: function() {
            this.on("addedfile", function() {
            	for (let i = 0; i < this.files.length; i++) {
            		if (this.files[i].name === 'config.translate') {
            			receiveFile(this.files[i])
            			break
            		}
            	}
            	this.removeAllFiles(true)
            });
        }
    })
}