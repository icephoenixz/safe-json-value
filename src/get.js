import normalizeException from 'normalize-exception'

// Same as `safeGetProp()` but without any `changes`
export const safeGetChangeProp = function ({ parent, key }) {
  try {
    return parent[key]
  } catch {}
}

// `parent[key]` might be a getter or proxy hook. This resolves it.
// If it throws, the property is omitted.
// It is not possible to detect that a proxy is being used, except when it
// throws, so we cannot add this to the `changes`.
export const safeGetProp = function ({ parent, key, changes, path }) {
  try {
    const prop = getProp({ parent, key, changes, path })
    return { prop, safe: true }
  } catch (error) {
    changes.push({
      path,
      oldValue: undefined,
      newValue: undefined,
      reason: 'unsafeGetter',
      error: normalizeException(error),
    })
    return { prop: undefined, safe: false }
  }
}

// The descriptor is retrieved first in case there is a getter or proxy hook
// that modifies `parent[key]`
const getProp = function ({ parent, key, changes, path }) {
  const descriptor = Object.getOwnPropertyDescriptor(parent, key)
  const prop = parent[key]
  addGetterChange({ changes, path, prop, descriptor })
  addDescriptorChange({ changes, path, prop, descriptor })
  return prop
}

// When `parent[key]` was a getter and|or setter
const addGetterChange = function ({
  changes,
  path,
  prop,
  descriptor: { get, set },
}) {
  if (get !== undefined || set !== undefined) {
    changes.push({
      path,
      oldValue: get,
      newValue: prop,
      reason: 'unresolvedGetter',
    })
  }
}

// We convert non-writable|configurable properties to writable|configurable
const addDescriptorChange = function ({
  changes,
  path,
  prop,
  descriptor: { writable, configurable },
}) {
  if (writable === false) {
    changes.push({
      path,
      oldValue: prop,
      newValue: prop,
      reason: 'descriptorNotWritable',
    })
  }

  if (configurable === false) {
    changes.push({
      path,
      oldValue: prop,
      newValue: prop,
      reason: 'descriptorNotConfigurable',
    })
  }
}
