import eel, json, sys, glob, os

TRANSLATION_JSON_PATH = "./examples/*.json"
PROJECT_NAME = "My Translate"

CACHE_PATH = os.path.expanduser("~") + "/.gui-i18n-cache"

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
							'symbol': u'⚠️❌',
							'data': dictionary[keys[0]]
						}
					return key_status(keys[1:], dictionary[keys[0]])
				else:
					if (len(keys) == 1):
						return {
							'code': 2,
							'text': 'Exist',
							'symbol': u'⚠️',
							'data': dictionary[keys[0]]
						}
					else:
						return {
							'code': 3,
							'text': keys[0] + ' is already a string',
							'symbol': u'⚠️❌',
							'data': dictionary[keys[0]]
						}

			else:
				dictionary[keys[0]] = {}
				return key_status(keys[1:], dictionary[keys[0]])
		else:
			return {
				'code': 0,
				'text': 'Invalid',
				'symbol': u'❌'
			}
	else:
		return {
			'code': 1,
			'text': 'Valid',
			'symbol': u'✅'
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
	with open(path, 'rb') as json_file:
		body = json_file.read().decode('utf-8')
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
		f = open(paths[i], "wb")
		f.write(res.encode('utf-8'))
		f.close()
	return "Updated " + key

@eel.expose
def check_key_status(textpath):
	statuses = {}
	paths = get_locale_path()
	for path in paths:
		try:
			with open(path, 'rb') as json_file:
				body = json_file.read().decode('utf-8')
				data = try_parse_json(body)
			if data is None:
				statuses[path] = {
					'code': 4,
					'text': 'Not valid json',
					'symbol': u'👻'
				}
				continue
			keys = textpath.split('.')
			status = key_status(keys, data)
			statuses[path] = status
		except Exception as e:
			statuses[path] = {
				'code': 5,
				'text': 'Throw Exception',
				'symbol': u'💔',
				'data': str(e)
			}
		
	return statuses

@eel.expose
def cache_config():
	try:
		with open(CACHE_PATH, "r") as cache_json_file:
			try:
				return json.load(cache_json_file)
			except Exception as e:
				return []
	except Exception as e:
		return []

@eel.expose
def remove_cache(path_to_remove):
	old_configs = cache_config()
	new_configs = [cfg for cfg in old_configs if cfg["TRANSLATION_JSON_PATH"] != path_to_remove]
	with open(CACHE_PATH, "w") as f:
		f.write(json.dumps(new_configs))
	return new_configs

@eel.expose
def load_config(configs):
	try:
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

			try:
				with open(CACHE_PATH, "w+") as f:
					f.write(json.dumps(new_configs))
			except Exception as e:
				print(str(e))

			return True
		return "Invalid config file"
	except Exception as e:
		return str(e)

@eel.expose
def get_suggestions(key):
	paths = get_locale_path()
	keyChain = key.split(".")
	suggestions = []
	for path in paths:
		with open(path, 'rb') as json_file:
			body = json_file.read().decode('utf-8')
			data = try_parse_json(body)
		if data is None:
			continue
		dataPointer = data
		countMatch = 0
		for i in range(0, len(keyChain)):
			if (i == len(keyChain) - 1):
				checkKey = list(filter(lambda x: x.lower().startswith(keyChain[i].lower()), dataPointer.keys()))
				if (len(checkKey) > 0):
					suggestions.extend(checkKey)
			else:
				if keyChain[i] not in dataPointer:
					break
				else:
					dataPointer = data[keyChain[i]]
					countMatch = countMatch + 1

	return list(set(suggestions))

@eel.expose
def get_project_name():
	return PROJECT_NAME

@eel.expose
def exit_program():
	print("GOOD BYE!!!")
	sys.exit()

eel.init('web')

eel.start('main.html', size=(700, 700), options={'port': 2019})
