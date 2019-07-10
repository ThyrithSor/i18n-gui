import eel
from googletrans import Translator
from sys import exit 
from os import path
from glob import glob
from json import loads, load, dumps

TRANSLATION_JSON_PATH = "./examples/*.json"
PROJECT_NAME = "My Translate"
BASE_LANGUAGE = "en"
LOCALE_CODE_MAPPING = "" # format kh=km,eng=en

# After build, the current directory will be root
# It won't allow to create file, so use home instead
CACHE_PATH = path.expanduser("~") + "/.gui-i18n-cache"

translator = Translator()

def get_locale_code_mapping():
	mapper = {}
	separate = list(map(lambda mapping: mapping.strip().split('='), LOCALE_CODE_MAPPING.split(',')))
	filtered = list(filter(lambda mapping: len(mapping) == 2, separate))
	for filt in filtered:
		mapper[filt[0].lower()] = filt[1]
	return mapper

def correct_locale_code(locale_code_by_path):
	mapping = get_locale_code_mapping()
	if locale_code_by_path.lower() in mapping:
		return mapping[locale_code_by_path].lower()
	else:
		return locale_code_by_path.lower()

@eel.expose
def suggestion_translate(word, src, dest):
	try:
		result = translator.translate(word, src=src, dest=dest)
		return result.text
	except Exception as e:
		return word

@eel.expose
def get_locale_path():
	try:
		paths = glob(TRANSLATION_JSON_PATH)
		return paths
	except Exception as e:
		return {
			"error": str(e)
		}

# Clever parse JSON
def try_parse_json(jsonText):
	try:
		# Try parse json by ownself
		return loads(jsonText)
	except Exception as e:
		# Ask for JS help
		jsonText = eel.fixJson(jsonText)()
		if jsonText is None:
			# JS also cannot solve
			return None
		else:
			# JS did it
			return loads(jsonText)

# Check the status of the key
def key_status(keys, dictionary):
	try:
		if len(keys) > 0:
			if keys[0].strip():
				if keys[0] in dictionary:
					if isinstance(dictionary[keys[0]], dict):
						if (len(keys) == 1):
							return {
								'code': 3,
								'text': 'Key "' + keys[0] + '" is already a parent',
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
								'text': 'Key "' + keys[0] + '" is already a string',
								'symbol': u'⚠️❌',
								'data': dictionary[keys[0]]
							}

				else:
					dictionary[keys[0]] = {}
					return key_status(keys[1:], dictionary[keys[0]])
			else:
				return {
					'code': 0,
					'text': 'Invalid Key',
					'symbol': u'❌'
				}
		else:
			return {
				'code': 1,
				'text': 'Valid Key',
				'symbol': u'✅'
			}
	except Exception as e:
		return {
			'error': str(e)
		}

# Recursively update dictionary
def set_value(keys, dictionary, value):
	try:
		if (len(keys) == 1):
			dictionary[keys[0]] = value
		else:
			if keys[0] not in dictionary or isinstance(dictionary[keys[0]], str):
				dictionary[keys[0]] = {}
			set_value(keys[1:], dictionary[keys[0]], value)
	except Exception as e:
		return {
			'error': str(e)
		}

# Attempt to add a key-value to JSON file at path
# Return the updated dictionary
def add_to(keys: str, value: str, path: str):
	try:
		with open(path, 'rb') as json_file:
			body = json_file.read().decode('utf-8')
			data = try_parse_json(body)

			if data is None:
				return None

			keys = keys.split('.')
			set_value(keys, data, value)
			return data
	except Exception as e:
		return {
			'error': str(e)
		}

@eel.expose
def apply(paths, key, values):
	try:
		for i in range(0, len(paths)):
			result = add_to(key, values[i], paths[i])
			if result is None:
				print("Skip " + paths[i] + " because it is invalid JSON file.")
				continue
			res = dumps(result, sort_keys=True, indent=4, ensure_ascii=False)
			f = open(paths[i], "wb")
			f.write(res.encode('utf-8'))
			f.close()
		return "Updated " + key
	except Exception as e:
		return {
			'error': str(e)
		}

@eel.expose
def check_key_status(textpath):
	try:
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
					'text': str(e),
					'symbol': u'💔'
				}
			
		return statuses
	except Exception as e:
		return {
			'error': str(e)
		}

@eel.expose
def cache_config():
	try:
		with open(CACHE_PATH, "r") as cache_json_file:
			try:
				return load(cache_json_file)
			except Exception as e:
				return []
	except Exception as e:
		return []

@eel.expose
def remove_cache(path_to_remove):
	try:
		old_configs = cache_config()
		new_configs = [cfg for cfg in old_configs if cfg["TRANSLATION_JSON_PATH"] != path_to_remove]
		with open(CACHE_PATH, "w") as f:
			f.write(dumps(new_configs))
		return new_configs
	except Exception as e:
		return {
			'error': str(e)
		}

@eel.expose
def load_config(configs):
	try:
		global PROJECT_NAME
		global TRANSLATION_JSON_PATH
		global BASE_LANGUAGE
		global LOCALE_CODE_MAPPING
		if ("BASE_LANGUAGE" in configs):
			BASE_LANGUAGE = configs["BASE_LANGUAGE"]
		if ("LOCALE_CODE_MAPPING" in configs):
			LOCALE_CODE_MAPPING = configs["LOCALE_CODE_MAPPING"]
		if ("PROJECT_NAME" in configs):
			PROJECT_NAME = configs["PROJECT_NAME"]
		if ("TRANSLATION_JSON_PATH" in configs):
			TRANSLATION_JSON_PATH = configs["TRANSLATION_JSON_PATH"]
			paths = glob(TRANSLATION_JSON_PATH)
			if len(paths) == 0:
				return "Path does not exist"
			# Cache Opened Project
			old_configs = cache_config()

			new_configs = [cfg for cfg in old_configs if cfg["TRANSLATION_JSON_PATH"] != configs["TRANSLATION_JSON_PATH"]]
			new_configs.insert(0, configs)

			try:
				with open(CACHE_PATH, "w+") as f:
					f.write(dumps(new_configs))
			except Exception as e:
				return {
					'error': str(e)
				}

			return True
		return "Invalid config file"
	except Exception as e:
		return {
			'error': str(e)
		}

@eel.expose
def get_suggestions(key):
	try:
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
						dataPointer = dataPointer[keyChain[i]]
						if type(dataPointer) is str:
							break
						countMatch = countMatch + 1

		return list(set(suggestions))
	except Exception as e:
		return {
			'error': 'error with ' + str(e)
		}

@eel.expose
def get_base_language():
	return BASE_LANGUAGE

@eel.expose
def get_project_name():
	return PROJECT_NAME

@eel.expose
def exit_program():
	print("GOOD BYE!!!")
	exit()

eel.init('web')

eel.start('main.html', size=(700, 700), options={'port': 2019})
