const mkdirp = require('mkdirp')
const request = require('superagent')
const { readdir, readFile, writeFile, lstatSync } = require('fs')
const { exec } = require('child_process')
const { join, dirname } = require('path')
const { maxSatisfying } = require('semver')
const { extractTarballDownload } = require('tarball-extract')

/**
 * Update the themes.json file
 */
updateThemeJson = (theme, callback) => {
    var root = dirname(require.main.filename);
    readFile(join(root, '/themes.json'), 'utf-8', (err, data) => {
        if (err) {
            callback(err)
        }
        var name = theme.replace('jsonresume-theme-', '')
        var themes = {
            themes: {}
        };
        try {
            themes = JSON.parse(data);
        } catch (err) {
            callback(err)
        }

        themes['themes'][name] = themes['themes'][name] || {
            author: "",
            versions: []
        };
        themes['themes'][name].author = author || "";
        themes['themes'][name].versions.push(version);
        themes['themes'][name].versions.sort();
        var json = JSON.stringify(themes, null, '  ');
        writeFile(path.join(root, '/themes.json'), json, function (err) {
            if (!err) {
                console.log('Updated themes.json');
            }
        });
    });
}


/**
 * Provides the Theme renderer that can render a resume when provided
 */
getRenderer = (theme, version, callback) => {
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
                    localRenderer = require(join(root, directory, match));
                    if (localRenderer) {
                        callback(null, localRenderer)
                    } else {
                        downloadRenderer(theme, (err, downloadedRenderer) => {
                            console.log("Starting download")
                            if (err) {
                                callback(err)
                            }
                            callback(null, downloadedRenderer)
                        })
                    }
                } catch (err) {
                    console.log('Theme renderer is invalid, probing npm registry');
                    downloadRenderer(theme, (err, downloadedRenderer) => {
                        console.log("Starting download")
                        if (err) {
                            callback(err)
                        }
                        callback(null, downloadedRenderer)
                    })
                }
            })
        }
    } catch (err) {
        console.log('Theme renderer not found locally, probing npm registry');
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
extractRenderer = (tarballuri, theme, version, callback) => {
    console.log(tarballuri)
    var themeFolder = 'themes'
    var root = dirname(require.main.filename)
    var extractFolder = join(themeFolder, theme, version)
    var tempFolder = join(root, '/tmp/', extractFolder)
    mkdirp(extractFolder, (err) => {
        if (err) {
            callback(err)
        }
        mkdirp(tempFolder, (err) => {
            // handle err
            if (err)
                callback(new Error('cannot create temporary folder to store downloaded theme'))
        });
        console.log('Downloading Theme tarball')
        extractTarballDownload(
            tarballuri, tempFolder + '/theme.tar.gz', extractFolder, {}, (err, result) => {
                if (err) {
                    callback(err)
                }
                console.log(result)
                console.log('installing theme to ' + extractFolder);
                const child = exec('cd ' + extractFolder + ' && mv package/* . && npm install',
                    (err, stdout, stderr) => {
                        if (err) {
                            console.log(err)
                        }
                        if (stderr) {
                            console.log(stderr)
                        }
                        if (stdout) {
                            console.log(stdout)
                        }
                    }
                )
                child.on('exit', (code, signal) => {
                    console.log(`child process exited with code ${code} and signal ${signal}`);
                    localRenderer = require(join(root, extractFolder));
                    if (localRenderer) {
                        callback(null, localRenderer)
                    } else{
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
downloadRenderer = (theme, callback) => {
    request.get('https://registry.npmjs.org/' + theme).end((err, response) => {
        if (err) {
            callback(err, null)
        }
        var lib = response.body
        if (!lib || Object.keys(lib).length === 0 || lib.error) {
            callback(new Error('Theme could not be found in the npm registry.'))
        }

        version = lib['dist-tags'].latest

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
getTheme = (name, callback) => {
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
    'getTheme': getTheme
}