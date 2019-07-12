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