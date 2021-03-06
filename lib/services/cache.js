
const getItems = require('./get-items');

const defaultMakeCacheKey = key => key;

module.exports = function (cacheMap, keyFieldName, options = {}) {
  const clone = options.clone || defaultClone;
  const makeCacheKey = options.makeCacheKey || defaultMakeCacheKey;

  return context => {
    keyFieldName = keyFieldName || (context.service || {}).id; // Will be undefined on client

    let items = getItems(context);
    items = Array.isArray(items) ? items : [items];

    if (context.type === 'after') {
      if (context.method === 'remove') return;

      const $select = (context.params.query || {}).$select;
      if (context.method === 'find' && $select) return;

      items.forEach(item => {
        const idName = getIdName(keyFieldName, item);
        const key = makeCacheKey(item[idName]);
        cacheMap.set(key, clone(item));
      });

      return;
    }

    switch (context.method) {
      case 'find': // fall through
      case 'create':
        return;
      case 'get': {
        const key = makeCacheKey(context.id);
        const value = cacheMap.get(key);

        if (value) context.result = value;
        return context;
      } default: // update, patch, remove
        if (context.id) {
          cacheMap.delete(context.id);
          return;
        }

        items.forEach(item => {
          const idName = getIdName(keyFieldName, item);
          const key = makeCacheKey(item[idName]);
          cacheMap.delete(key);
        });
    }
  };
};

function getIdName (keyFieldName, item) {
  if (keyFieldName) return keyFieldName;
  return ('_id' in item) ? '_id' : 'id';
}

function defaultClone (obj) {
  return JSON.parse(JSON.stringify(obj));
}
