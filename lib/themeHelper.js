//@ts-check
const mkdirp = require('mkdirp')
const request = require('superagent')
const { readdir, lstatSync } = require('fs');
const { readFile } = require('fs').promises
const { exec } = require('child_process')
const { join, dirname } = require('path')
const { maxSatisfying } = require('semver')
const { extractTarballDownload } = require('tarball-extract')
const glob = require('glob');

/**
 * Simple controller to return the information about the currently installed themes
 * Replaces the static themes.json
 * @param {*} req 
 * @param {*} res 
 */
const controllerThemeInfo = async (req, res) => {
    getThemeInfo(async (err, files) => {
        if (err) {
            res.status(400).send(err)
        }
        res.send(await constructResponse(files))
    })
}

/**
 * Loop a list of package.json files and construct a json response
 * @param {string[]} files 
 */
const constructResponse = async (files) => {
    const response = {
        themes: {}
    }

    for await (const f of files) {
        const data = await readFile(f, 'utf-8')
        const theme = JSON.parse(data);
        const name = theme.name.replace('jsonresume-theme-', '');
        response.themes[name] = response.themes[name] || {
            author: "",
            versions: []
        };
        response.themes[name].author = theme.author || "";
        response.themes[name].versions.push(theme.version);
        response.themes[name].versions.sort();
    }
    return response
}

/**
 * Traverse the Theme directory and read info from the files
 * 
 * @param {{ (err: any, files: any): void; (arg0: Error, arg1?: string[]): void; }} callback
 */
const getThemeInfo = (callback) => {
    var root = dirname(require.main.filename)
    const source = join(root, 'themes')
    glob(source + "/jsonresume-theme-*/*/package.json", (err, result) => {
        if (err) {
            callback(err)
        }
        callback(null, result)
    })
}

/**
 * Provides the Theme renderer that can render a resume when provided
 * @param {string} theme
 * @param {string | import("semver/classes/range")} version
 * @param {{ (err: any, renderer: any): void; (arg0: NodeJS.ErrnoException, arg1?: undefined): void; }} callback
 */
const getRenderer = (theme, version, callback) => {
    var themeFolder = 'themes'
    var directory = join(themeFolder, theme)
    var root = dirname(require.main.filename)
    const source = join(root, directory)
    try {
        const isDirectory = lstatSync(source).isDirectory()
        if (isDirectory) {
            readdir(source, (err, files) => {
                if (err) {
                    callback(err)
                }
                var match = maxSatisfying(files, version)
                try {
                    const localRenderer = require(join(root, directory, match));
                    if (localRenderer) {
                        callback(null, localRenderer)
                    } else {
                        downloadRenderer(theme, (err, downloadedRenderer) => {
                            console.info("Starting download")
                            if (err) {
                                callback(err)
                            }
                            callback(null, downloadedRenderer)
                        })
                    }
                } catch (err) {
                    console.info('Theme renderer is invalid, probing npm registry')
                    downloadRenderer(theme, (err, downloadedRenderer) => {
                        console.info("Starting download")
                        if (err) {
                            callback(err)
                        }
                        callback(null, downloadedRenderer)
                    })
                }
            })
        }
    } catch (err) {
        console.warn('Theme renderer not found locally, probing npm registry')
        downloadRenderer(theme, (err, downloadedRenderer) => {
            if (err) {
                callback(err)
            }
            callback(null, downloadedRenderer)
        })
    }
}

/**
 * Extract the renderer in the themes folder
 */
const extractRenderer = (tarballuri, theme, version, callback) => {
    console.info(`Extracting from ${tarballuri}`)
    var themeFolder = 'themes'
    var root = dirname(require.main.filename)
    var extractFolder = join(themeFolder, theme, version)
    var tempFolder = join(root, '/tmp/', extractFolder)
    // @ts-ignore
    mkdirp(extractFolder, (err) => {
        if (err) {
            callback(err)
        }
        // @ts-ignore
        mkdirp(tempFolder, (err) => {
            // handle err
            if (err)
                callback(new Error('cannot create temporary folder to store downloaded theme'))
        });
        console.info('Downloading Theme tarball')
        extractTarballDownload(
            tarballuri, tempFolder + '/theme.tar.gz', extractFolder, {}, (err, result) => {
                if (err) {
                    callback(err)
                }
                console.info('installing theme to ' + extractFolder);
                const child = exec('cd ' + extractFolder + ' && mv package/* . && npm install',
                    (err, stdout, stderr) => {
                        if (err) {
                            console.warn(err)
                        }
                        if (stderr) {
                            console.info(stderr)
                        }
                        if (stdout) {
                            console.warn(stdout)
                        }
                    }
                )
                child.on('exit', (code, signal) => {
                    console.info(`child process exited with code ${code} and signal ${signal}`)
                    const localRenderer = require(join(root, extractFolder))
                    if (localRenderer) {
                        callback(null, localRenderer)
                    } else {
                        callback("I don't know anymore. Giving up")
                    }
                })
            }
        )
    })
}

/**
 * Try to download a renderer from npm, if this succeeds, extract it
 */
const downloadRenderer = (theme, callback) => {
    request.get('https://registry.npmjs.org/' + theme).end((err, response) => {
        if (err) {
            callback(err, null)
        }
        var lib = response.body
        if (!lib || Object.keys(lib).length === 0 || lib.error) {
            callback(new Error('Theme could not be found in the npm registry.'))
        }

        const version = lib['dist-tags'].latest

        try {
            var author = lib['versions'][version].author.name
        } catch (err) {
            // ..
        }

        var tarballuri = lib.versions[version].dist.tarball

        // Let's extract the renderer
        extractRenderer(tarballuri, theme, version, (err, renderer) => {
            if (err) {
                callback(err)
            } else {
                // Now we can get the renderer
                callback(err, renderer)
            }

        })
    })
}

/**
 * Get the renderer required to create the resume
 */
const getTheme = (name, callback) => {
    var theme = 'jsonresume-theme-' + name.toLowerCase();
    var version = '0';
    var versionCheck = theme.split('@');
    if (versionCheck.length > 1) {
        theme = versionCheck[0];
        version = versionCheck[1];
    }
    //Try to get the renderer
    getRenderer(theme, version, (err, renderer) => {
        if (err) {
            callback(err)
        } else {
            callback(null, renderer)
        }
    })

}

module.exports = {
    'getTheme': getTheme,
    'getThemeInfo': getThemeInfo,
    'controllers': {
        'info': controllerThemeInfo
    }
}