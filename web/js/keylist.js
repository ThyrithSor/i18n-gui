async function warnBoss(event) {
    let translationKeys = await new Promise(eel.get_translation_keys())
    window.trigger('warn', translationKeys)
}

window.onload = () => {
	if (window.trigger === undefined) {
		window.trigger = (type, data) => {
			// Do nothing
		}
	}

	warnBoss()
}

window.onbeforeunload = function () {
    return "If you reload, the window will not work correctly. If you exit, it is okay.";
};