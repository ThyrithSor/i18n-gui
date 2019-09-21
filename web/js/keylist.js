function distinct(arr){
    let unique_array = Array.from(new Set(arr))
    return unique_array
}

function getTree (allKeys, prefix = "") {
  let keyKeys = Object.keys(allKeys)
  let objectKeyNodes = keyKeys.filter(key => !key.includes('..')).map(key => {
    let fullKey = prefix ? [prefix, key].join('.') : key
    return {
      type: "object",
      text: key,
      href: "#node-1",
      tags: [distinct(Object.keys(allKeys[key]).map(key => key.split('..')[0])).length],
      nodes: getTree(allKeys[key], fullKey),
      selectable: false,
      key: fullKey
    }
  })
  let valueKeys = {}
  keyKeys.filter(key => key.includes('..')).forEach(key => {
    let keyBreak = key.split('..')
    if (valueKeys[keyBreak[0]] === undefined) {
      valueKeys[keyBreak[0]] = {}
    }
    valueKeys[keyBreak[0]][keyBreak[1]] = allKeys[key]
  })

  Object.keys(valueKeys).forEach(key => {
    let fullKey = prefix ? [prefix, key].join('.') : key
    objectKeyNodes.push({
      type: "value",
      text: key,
      href: "#key-1",
      tags: [Object.keys(valueKeys[key]).length],
      data: valueKeys[key],
      key: fullKey
    })
  })
  return objectKeyNodes;
}

let debounce = null;
function searchKey (keyword) {
  if (debounce !== null) {
    clearTimeout(debounce)
  }
  debounce = setTimeout(() => {
    if (keyword.trim() === ""){
      $('#tree').treeview('clearSearch');
    } else {
      $('#tree').treeview('search', [ keyword, {
        ignoreCase: true,     // case insensitive
        exactMatch: false,    // like or equals
        revealResults: true,  // reveal matching nodes
      }]);
    }
  }, 500);
}

async function retrieveKeys () {
  let translationKeys = await new Promise(eel.get_translation_keys())
  let langs = translationKeys['..']
  delete translationKeys['..']
  $('#tree').treeview({
    data: getTree(translationKeys),
    expandIcon: "fa fa-plus",
    collapseIcon: "fa fa-minus",
    showTags: true,
    highlightSearchResults: false,
    onNodeSelected: function(event, data) {
      // Your logic goes here
      window.trigger('load-key', data.key)
    },
    onSearchComplete: function(event, result) {
      $("#tree").removeClass("d-block")
      $("#tree").addClass("d-none")
      $("#tree-search").removeClass("d-none")
      $("#tree-search").removeClass("d-block")

      // show search
      $('#tree-search').treeview({
        data: result,
        expandIcon: "fa fa-plus",
        collapseIcon: "fa fa-minus",
        showTags: true,
        highlightSearchResults: false,
        onNodeSelected: function(event, data) {
          // Your logic goes here
          window.trigger('load-key', data.key)
        },
      })
      $('#tree-search').treeview('collapseAll', { silent: true });
    },
    onSearchCleared: function(event, result) {
      $("#tree").removeClass("d-none")
      $("#tree").addClass("d-block")
      $("#tree-search").removeClass("d-block")
      $("#tree-search").removeClass("d-none")
    }
  })
  $('#tree').treeview('collapseAll', { silent: true });
}

window.onload = () => {
  if (window.trigger === undefined) {
    window.trigger = (type, data) => {
      console.log("Trigger event is not available, try closing program.")
    }
  }

  retrieveKeys()
}

window.onbeforeunload = function () {
  return 'If you reload, the window will not work correctly. If you exit, it is okay.'
}
