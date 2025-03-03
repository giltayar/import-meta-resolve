/**
 * @typedef {import('../index.js').ErrnoException} ErrnoException
 */

import assert from 'node:assert/strict'
import {promises as fs, renameSync} from 'node:fs'
import process from 'node:process'
import {URL, pathToFileURL} from 'node:url'
import test from 'node:test'
import semver from 'semver'
import {resolve} from '../index.js'

const windows = process.platform === 'win32'
const veryOldNode = semver.lt(process.versions.node, '16.0.0')
const oldNode = semver.lt(process.versions.node, '18.0.0')

process.on('exit', async () => {
  // Has to be sync.
  renameSync('package.json.bak', 'package.json')
})

test('resolve(specifier, base?, conditions?)', async function () {
  assert(resolve, 'expected `resolve` to exist (needed for TS in baseline)')

  await fs.rename('package.json', 'package.json.bak')

  try {
    await resolve('', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(exception.code, 'ERR_MODULE_NOT_FOUND', 'empty string')
  }

  try {
    await resolve('abc', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_MODULE_NOT_FOUND',
      'unfound bare specifier'
    )
  }

  try {
    await resolve('/abc', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_MODULE_NOT_FOUND',
      'unfound absolute path'
    )
  }

  try {
    await resolve('./abc', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_MODULE_NOT_FOUND',
      'unfound relative path'
    )
  }

  try {
    await resolve('../abc', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_MODULE_NOT_FOUND',
      'unfound relative parental path'
    )
  }

  try {
    await resolve('#', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_INVALID_MODULE_SPECIFIER',
      'empty import specifier'
    )
  }

  try {
    await resolve('#/', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_INVALID_MODULE_SPECIFIER',
      'empty absolute import specifier'
    )
  }

  assert.equal(
    await resolve('../tsconfig.json', import.meta.url),
    pathToFileURL('tsconfig.json').href,
    'should resolve a json file'
  )

  assert.equal(
    await resolve('./index.js', import.meta.url),
    pathToFileURL('test/index.js').href,
    'should resolve a js file'
  )

  assert.equal(
    await resolve('..', import.meta.url),
    pathToFileURL('../import-meta-resolve/').href,
    'should resolve a directory (1)'
  )

  assert.equal(
    await resolve('../lib', import.meta.url),
    pathToFileURL('../import-meta-resolve/lib').href,
    'should resolve a directory (2)'
  )

  assert.equal(
    await resolve('../lib/', import.meta.url),
    pathToFileURL('../import-meta-resolve/lib/').href,
    'should resolve a directory (3)'
  )

  assert.equal(
    await resolve('micromark', import.meta.url),
    new URL('../node_modules/micromark/index.js', import.meta.url).href,
    'should resolve a bare specifier to a package'
  )

  assert.equal(
    await resolve('mdast-util-to-string/index.js', import.meta.url),
    new URL('../node_modules/mdast-util-to-string/index.js', import.meta.url)
      .href,
    'should resolve a bare specifier plus path'
  )

  assert.equal(
    await resolve('@bcoe/v8-coverage', import.meta.url),
    new URL(
      '../node_modules/@bcoe/v8-coverage/dist/lib/index.js',
      import.meta.url
    ).href,
    'should resolve a bare specifier w/ scope to a package'
  )

  try {
    await resolve('xxx-missing', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_MODULE_NOT_FOUND',
      'missing bare specifier'
    )
  }

  try {
    await resolve('@a/b', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_MODULE_NOT_FOUND',
      'missing scoped bare specifier'
    )
  }

  try {
    await resolve('@scope-only', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_INVALID_MODULE_SPECIFIER',
      'invalid scoped specifier'
    )
  }

  try {
    await resolve('%20', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_INVALID_MODULE_SPECIFIER',
      'invalid package name as specifier'
    )
  }

  try {
    await resolve('micromark/index.js', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_PACKAGE_PATH_NOT_EXPORTED',
      'bare specifier w/ path that’s not exported'
    )
  }

  assert.equal(
    await resolve('micromark/stream', import.meta.url),
    new URL('../node_modules/micromark/stream.js', import.meta.url).href,
    'should resolve a bare specifier + path which is exported'
  )

  assert.equal(
    await resolve('micromark', import.meta.url),
    new URL('../node_modules/micromark/index.js', import.meta.url).href,
    'should cache results'
  )

  assert.equal(
    await resolve('fs', import.meta.url),
    'node:fs',
    'should support internal node modules'
  )

  assert.equal(
    await resolve('node:fs', import.meta.url),
    'node:fs',
    'should support `node:` protocols'
  )

  assert.equal(
    await resolve('data:1', import.meta.url),
    'data:1',
    'should support `data:` protocols'
  )

  try {
    await resolve('xss:1', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_UNSUPPORTED_ESM_URL_SCHEME',
      'should not support other protocols'
    )
  }

  if (!oldNode) {
    try {
      await resolve('node:fs', 'https://example.com/file.html')
      assert.fail()
    } catch (error) {
      const exception = /** @type {ErrnoException} */ (error)
      assert.equal(
        exception.code,
        'ERR_NETWORK_IMPORT_DISALLOWED',
        'should not support loading builtins from http'
      )
    }
  }

  assert.equal(
    await resolve('./index.js?1', import.meta.url),
    new URL('index.js?1', import.meta.url).href,
    'should support a `search` in specifiers'
  )

  assert.equal(
    await resolve('./index.js#1', import.meta.url),
    new URL('index.js#1', import.meta.url).href,
    'should support a `hash` in specifiers'
  )

  try {
    await resolve('./example.js', 'data:1')
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    if (!oldNode) {
      assert.equal(
        exception.code,
        oldNode ? 'ERR_INVALID_URL_SCHEME' : 'ERR_INVALID_URL',
        'should not be able to resolve relative to a `data:` parent url'
      )
    }
  }

  assert.equal(
    await resolve('./index.js', import.meta.url),
    new URL('index.js', import.meta.url).href,
    'should be able to find files w/o `package.json`'
  )

  assert.equal(
    await resolve('micromark', import.meta.url),
    new URL('../node_modules/micromark/index.js', import.meta.url).href,
    'should be able to find packages w/o `package.json`'
  )

  try {
    await resolve('xxx-missing', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_MODULE_NOT_FOUND',
      'missing packages w/o `package.json`'
    )
  }

  try {
    await resolve('#local', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_PACKAGE_IMPORT_NOT_DEFINED',
      'missing import map w/o `package.json`'
    )
  }

  try {
    await resolve('no-package-json', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_MODULE_NOT_FOUND',
      'should not be able to import packages that themselves don’t have `package.json`s (1)'
    )
  }

  try {
    await resolve('package-no-main', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_MODULE_NOT_FOUND',
      'should not be able to import packages w/o index files'
    )
  }

  assert.equal(
    await resolve('package-no-main-2', import.meta.url),
    new URL('node_modules/package-no-main-2/index.js', import.meta.url).href,
    'should be able to import CJS packages w/o `main`'
  )

  await (async () => {
    assert(resolve, 'expected `resolve` to exist (needed for TS in baseline)')

    const oldEmitWarning = process.emitWarning
    /** @type {string|undefined} */
    let deprecation

    // @ts-expect-error hush
    process.emitWarning =
      /**
       * @param {unknown} _1
       * @param {unknown} _2
       * @param {string} code
       */
      (_1, _2, code) => {
        deprecation = code
      }

    assert.equal(
      await resolve('package-no-main-3', import.meta.url),
      new URL('node_modules/package-no-main-3/index.js', import.meta.url).href,
      'should be able to import ESM packages w/o `main`, but warn (1)'
    )

    if (oldNode) {
      // Empty.
    } else {
      assert.equal(
        deprecation,
        'DEP0151',
        'should be able to import ESM packages w/o `main`, but warn (2)'
      )
    }

    process.emitWarning = oldEmitWarning
  })()

  await (async () => {
    assert(resolve, 'expected `resolve` to exist (needed for TS in baseline)')

    const oldEmitWarning = process.emitWarning
    /** @type {string|undefined} */
    let deprecation

    // @ts-expect-error hush
    process.emitWarning =
      /**
       * @param {unknown} _1
       * @param {unknown} _2
       * @param {string} code
       */
      (_1, _2, code) => {
        deprecation = code
      }

    assert.equal(
      await resolve('package-no-main-4', import.meta.url),
      new URL('node_modules/package-no-main-4/index.js', import.meta.url).href,
      'should be able to import ESM packages w/ non-full `main`, but warn (1)'
    )

    if (oldNode) {
      // Empty.
    } else {
      assert.equal(
        deprecation,
        'DEP0151',
        'should be able to import ESM packages w/ non-full `main`, but warn (2)'
      )
    }

    process.emitWarning = oldEmitWarning
  })()

  try {
    await resolve('package-invalid-json', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_INVALID_PACKAGE_CONFIG',
      'should not be able to import packages w/ broken `package.json`s'
    )
  }

  assert.equal(
    await resolve('package-export-map-1/a', import.meta.url),
    new URL('node_modules/package-export-map-1/b.js', import.meta.url).href,
    'should be able to resolve to something from an export map (1)'
  )

  assert.equal(
    await resolve('package-export-map-1/lib/c', import.meta.url),
    new URL('node_modules/package-export-map-1/lib/c.js', import.meta.url).href,
    'should be able to resolve to something from an export map (2)'
  )

  assert.equal(
    await resolve('package-export-map-2', import.meta.url),
    new URL('node_modules/package-export-map-2/main.js', import.meta.url).href,
    'should be able to resolve to something from a main export map'
  )

  try {
    await resolve('package-export-map-2/missing', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_PACKAGE_PATH_NOT_EXPORTED',
      'should not be able to import things not in an export map'
    )
  }

  try {
    await resolve('package-export-map-4', import.meta.url)
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_PACKAGE_PATH_NOT_EXPORTED',
      'should not be able to import things from an empty export map'
    )
  }

  await (async () => {
    assert(resolve, 'expected `resolve` to exist (needed for TS in baseline)')

    const oldEmitWarning = process.emitWarning
    /** @type {string} */
    let deprecation

    // Windows doesn’t like `/` as a final path separator here.
    if (windows) return

    // @ts-expect-error hush
    process.emitWarning =
      /**
       * @param {unknown} _1
       * @param {unknown} _2
       * @param {string} code
       */
      (_1, _2, code) => {
        if (deprecation) assert.fail()
        deprecation = code
      }

    assert.equal(
      await resolve(
        './a/',
        new URL('node_modules/package-export-map-5/', import.meta.url).href
      ),
      new URL('node_modules/package-export-map-5/a/', import.meta.url).href
    )

    try {
      // Twice for coverage: deprecation should fire only once.
      await resolve(
        './a/b.js',
        new URL('node_modules/package-export-map-5/', import.meta.url).href
      )
      assert.fail()
    } catch {}

    process.emitWarning = oldEmitWarning
  })()

  assert.equal(
    await resolve(
      '#a',
      new URL('node_modules/package-import-map-1/', import.meta.url).href
    ),
    new URL('node_modules/package-import-map-1/index.js', import.meta.url).href,
    'should be able to resolve to something from a main export map w/ package name'
  )

  try {
    await resolve(
      '#b',
      new URL('node_modules/package-import-map-1/', import.meta.url).href
    )
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_PACKAGE_IMPORT_NOT_DEFINED',
      'should not be able to import things not in an import map'
    )
  }

  try {
    await resolve(
      '#a',
      new URL('node_modules/package-import-map-2/', import.meta.url).href
    )
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    assert.equal(
      exception.code,
      'ERR_PACKAGE_IMPORT_NOT_DEFINED',
      'should not be able to import things not in an import map incorrectly defined w/o `#`'
    )
  }

  assert.equal(
    await resolve(
      '#a/b.js',
      new URL('node_modules/package-import-map-3/', import.meta.url).href
    ),
    new URL('node_modules/package-import-map-3/index.js', import.meta.url).href,
    'should be able to resolve to something to import map splats'
  )

  try {
    await resolve(
      '#a/b.js',
      new URL('node_modules/package-import-map-4/', import.meta.url).href
    )
    assert.fail()
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error)
    if (!oldNode) {
      assert.equal(
        exception.code,
        'ERR_PACKAGE_IMPORT_NOT_DEFINED',
        'should not be able to import an invalid import package target'
      )
    }
  }

  await (async () => {
    assert(resolve, 'expected `resolve` to exist (needed for TS in baseline)')

    const oldEmitWarning = process.emitWarning
    /** @type {string|undefined} */
    let deprecation

    // @ts-expect-error hush
    process.emitWarning =
      /**
       * @param {unknown} _1
       * @param {unknown} _2
       * @param {string} code
       */
      (_1, _2, code) => {
        if (deprecation) assert.fail()
        deprecation = code
      }

    try {
      await resolve(
        '#a/b.js',
        new URL('node_modules/package-import-map-5/', import.meta.url).href
      )
      assert.fail()
    } catch (error) {
      const exception = /** @type {ErrnoException} */ (error)
      if (!oldNode) {
        assert.equal(
          exception.code,
          'ERR_PACKAGE_IMPORT_NOT_DEFINED',
          'should support legacy folders in import maps (1)'
        )
      }
    }

    process.emitWarning = oldEmitWarning
  })()

  if (!veryOldNode) {
    assert.equal(
      await resolve(
        '#a',
        new URL('node_modules/package-import-map-6/', import.meta.url).href
      ),
      new URL('node:net').href,
      'should be able to resolve to a built-in node module'
    )
  }

  assert.equal(
    await resolve(
      'package-self-import-1',
      new URL('node_modules/package-self-import-1/', import.meta.url).href
    ),
    new URL('node_modules/package-self-import-1/index.js', import.meta.url)
      .href,
    'should be able to resolve a self-import'
  )

  assert.equal(
    await resolve(
      'package-self-import-1',
      new URL(
        'node_modules/package-self-import-1/test/index.js',
        import.meta.url
      ).href
    ),
    new URL('node_modules/package-self-import-1/index.js', import.meta.url)
      .href,
    'should be able to resolve a self-import from a sub-file'
  )

  assert.equal(
    await resolve('package-custom-extensions', import.meta.url),
    new URL('node_modules/package-custom-extensions/b.ts', import.meta.url)
      .href,
    'should be able to resolve a custom `.ts` extension'
  )

  assert.equal(
    await resolve('package-custom-extensions/c', import.meta.url),
    new URL('node_modules/package-custom-extensions/d.wasm', import.meta.url)
      .href,
    'should be able to resolve a custom `.wasm` extension'
  )
})
