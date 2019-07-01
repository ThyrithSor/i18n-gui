import eel
import json
import sys
import glob


@eel.expose
def get_locale_path():
	paths = glob.glob("../assets/flutter_i18n/*.json")
	return paths

def keyStatus(keys, dictionary):
	if len(keys) > 0:
		if keys[0].strip():
			if keys[0] in dictionary:
				if isinstance(dictionary[keys[0]], dict):
					if (len(keys) == 1):
						return {
							'code': 3,
							'text': keys[0] + ' is already a parent',
							'symbol': '⚠️❌',
							'data': dictionary[keys[0]]
						}
					return keyStatus(keys[1:], dictionary[keys[0]])
				else:
					if (len(keys) == 1):
						return {
							'code': 2,
							'text': 'Exist',
							'symbol': '⚠️',
							'data': dictionary[keys[0]]
						}
					else:
						return {
							'code': 3,
							'text': keys[0] + ' is already a string',
							'symbol': '⚠️❌',
							'data': dictionary[keys[0]]
						}

			else:
				dictionary[keys[0]] = {}
				return keyStatus(keys[1:], dictionary[keys[0]])
		else:
			return {
				'code': 0,
				'text': 'Invalid',
				'symbol': '❌'
			}
	else:
		return {
			'code': 1,
			'text': 'Valid',
			'symbol': '✅'
		}

def set_value(keys, dictionary, value):
	if (len(keys) == 1):
		dictionary[keys[0]] = value
	else:
		if keys[0] not in dictionary or isinstance(dictionary[keys[0]], str):
			dictionary[keys[0]] = {}
		set_value(keys[1:], dictionary[keys[0]], value)

def add_to(keys: str, value: str, path: str):
	with open(path) as json_file:
		data = json.load(json_file)
		keys = keys.split('.')
		set_value(keys, data, value)
		return data

@eel.expose
def apply(paths, key, values):
	for i in range(0, len(paths)):
		result = add_to(key, values[i], paths[i])
		res = json.dumps(result, sort_keys=True, indent=4, ensure_ascii=False)
		f = open(paths[i], "w+")
		f.write(res)
		f.close()

@eel.expose
def check_key_status(textpath):
	statuses = {}
	paths = get_locale_path()
	for path in paths:
		with open(path) as json_file:
			data = json.load(json_file)
		keys = textpath.split('.')
		status = keyStatus(keys, data)
		statuses[path] = status
	return statuses

@eel.expose
def exit_program():
	print("GOOD BYE!!!")
	sys.exit()

eel.init('web')

eel.start('main.html', size=(700, 700), options={'port': 2019})
