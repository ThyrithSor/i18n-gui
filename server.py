TRANSLATION_JSON_PATH = "./examples/*.json"
PROJECT_NAME = "My Translate"

import eel, json, sys, glob, os
# from tkinter import filedialog, Tk

@eel.expose
def get_locale_path():
	paths = glob.glob(TRANSLATION_JSON_PATH)
	return paths

def try_parse_json(jsonText):
	try:
		return json.loads(jsonText)
	except Exception as e:
		jsonText = eel.fixJson(jsonText)()
		if jsonText is None:
			return None
		else:
			return json.loads(jsonText)

def key_status(keys, dictionary):
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
					return key_status(keys[1:], dictionary[keys[0]])
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
				return key_status(keys[1:], dictionary[keys[0]])
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
		body = json_file.read()
		data = try_parse_json(body)
		# try:
		# 	data = json.load(json_file)
		# except Exception as e:
		# 	# Need json help
		# 	print(json_file)

		if data is None:
			return None

		keys = keys.split('.')
		set_value(keys, data, value)
		return data

@eel.expose
def apply(paths, key, values):
	for i in range(0, len(paths)):
		result = add_to(key, values[i], paths[i])
		if result is None:
			print("Skip " + paths[i] + " because it is invalid JSON file.")
			continue
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
			body = json_file.read()
			data = try_parse_json(body)
		if data is None:
			statuses[path] = {
				'code': 4,
				'text': 'Not valid json',
				'symbol': '👻'
			}
			continue
		keys = textpath.split('.')
		status = key_status(keys, data)
		statuses[path] = status
	return statuses

@eel.expose
def load_config(configs):
	global PROJECT_NAME
	global TRANSLATION_JSON_PATH
	if ("PROJECT_NAME" in configs):
		PROJECT_NAME = configs["PROJECT_NAME"]
	if ("TRANSLATION_JSON_PATH" in configs):
		TRANSLATION_JSON_PATH = configs["TRANSLATION_JSON_PATH"]
		paths = glob.glob(TRANSLATION_JSON_PATH)
		if len(paths) == 0:
			return False
		return True
	return False

@eel.expose
def get_project_name():
	return PROJECT_NAME

@eel.expose
def exit_program():
	print("GOOD BYE!!!")
	sys.exit()

eel.init('web')

eel.start('main.html', size=(700, 700), options={'port': 2019})
