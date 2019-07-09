TRANSLATION_JSON_PATH = "./examples/*.json"
PROJECT_NAME = "My Translate"

CACHE_PATH = "./cache.json"

import eel, json, sys, glob, os

@eel.expose
def get_locale_path():
	paths = glob.glob(TRANSLATION_JSON_PATH)
	return paths

# Clever parse JSON
def try_parse_json(jsonText):
	try:
		# Try parse json by ownself
		return json.loads(jsonText)
	except Exception as e:
		# Ask for JS help
		jsonText = eel.fixJson(jsonText)()
		if jsonText is None:
			# JS also cannot solve
			return None
		else:
			# JS did it
			return json.loads(jsonText)

# Check the status of the key
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

# Recursively update dictionary
def set_value(keys, dictionary, value):
	if (len(keys) == 1):
		dictionary[keys[0]] = value
	else:
		if keys[0] not in dictionary or isinstance(dictionary[keys[0]], str):
			dictionary[keys[0]] = {}
		set_value(keys[1:], dictionary[keys[0]], value)

# Attempt to add a key-value to JSON file at path
# Return the updated dictionary
def add_to(keys: str, value: str, path: str):
	with open(path) as json_file:
		body = json_file.read()
		data = try_parse_json(body)

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
def cache_config():
	with open(CACHE_PATH) as cache_json_file:
		try:
			return json.load(cache_json_file)
		except Exception as e:
			return []

@eel.expose
def remove_cache(path_to_remove):
	old_configs = cache_config()
	new_configs = [cfg for cfg in old_configs if cfg["TRANSLATION_JSON_PATH"] != path_to_remove]
	f = open(CACHE_PATH, "w+")
	f.write(json.dumps(new_configs))
	f.close()

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
			return "Path does not exist"
		# Cache Opened Project
		old_configs = cache_config()

		new_configs = [cfg for cfg in old_configs if cfg["TRANSLATION_JSON_PATH"] != configs["TRANSLATION_JSON_PATH"]]
		new_configs.insert(0, configs)
		f = open(CACHE_PATH, "w+")
		f.write(json.dumps(new_configs))
		f.close()
		return True
	return "Invalid config file"

@eel.expose
def get_project_name():
	return PROJECT_NAME

@eel.expose
def exit_program():
	print("GOOD BYE!!!")
	sys.exit()

eel.init('web')

eel.start('main.html', size=(700, 700), options={'port': 2019})
