//@ts-check
var request = require('superagent');
var Mustache = require('mustache');
var templateHelper = require('../template-helper');
var HttpStatus = require('http-status-codes');
var resumeToText = require('resume-to-text');
const { join, dirname } = require('path')
var resumeToMarkdown = require('resume-to-markdown');
var themeHelper = require('./themeHelper');

/**
 * Send the resume as json
 */
const sendAsJson = function (resume, res) {
    const content = JSON.stringify(resume, undefined, 4);
    res.set({
        'Content-Type': 'application/json',
        // TODO - This is a hack to try get the right content length
        'Content-Length': Buffer.byteLength(content, 'utf8')
    });
    res.send(content || '');
}

/**
 * Send the resume as text
 */
const sendAsText = function (resume, res) {
    resumeToText(resume, function (plainText) {
        res.set({
            'Content-Type': 'text/plain',
            'Content-Length': plainText.length
        });
        res.status(200).send(plainText) || '';
    });
}

/**
 * Send the resume as markdown
 * @param {any} resume
 * @param {{ set: (arg0: { 'Content-Type': string; 'Content-Length': any; }) => void; send: (arg0: string) => void; }} res
 */
const sendAsMarkdown = (resume, res) => {
    resumeToMarkdown(resume, (markdown, errs) => {
        console.log(markdown)
        // TODO fix resumeToMarkdown validation errors
        if (markdown) {
            res.set({
                'Content-Type': 'text/plain',
                'Content-Length': markdown.length
            });
            res.send(markdown);
        } else if (errs.valid) {
            res.send("")
        } else {
            res.send(errs)
        }

    })
}

/**
 * Send the resume as Pdf
 * 
 * this code is used for web-based pdf export such as 
 * http://registry.jsonresume.org/thomasdavis.pdf 
 * - see line ~310 for resume-cli export
 */
const sendAsPdf = function (resume, theme, res) {
    // Should not post but use internal function!
    request
        .post('./theme/' + theme)
        .send({
            resume: resume
        })
        .set('Content-Type', 'application/json')
        .end(function (err, response) {
            if (err) {
                res.send(err)
            } else {
                try {
                    var pdf = require('pdfcrowd');
                    var client = new pdf.HtmlToPdfClient(
                        process.env.PDFCROWD_USER || 'thomasdavis',
                        process.env.PDFCROWD_KEY || '7d2352eade77858f102032829a2ac64e'
                    )
                    const uuid = require('uuid');
                    var root = dirname(require.main.filename);
                    client.setUsePrintMedia(true);
                    client.convertStringToFile(
                        response.text,
                        join(root, '/tmp'),
                        (err, result) => {
                            pdf.sendPdfInHttpResponse(result, uuid.v4() + ".pdf"),
                                'attachment'
                        }
                    )
                } catch (err) {
                    res.send(err)
                }
            }
        });
}

/**
 * Send the resume as HTML
 */
const sendAsHtml = (resume, theme, res) => {
    themeHelper.getTheme(theme, (err, theme) => {
        if (err) {
            res.send(err)
        } else {
            if (theme) {
                const result = theme.render(resume)
                res.send(result)
            } else {
                res.status(404).send("Failed to get theme")
            }
        }
    })
}

/**
 * Process a resume
 */
const processResume = function (resume, res, themeName, format) {
    var DEFAULT_THEME = 'modern';
    if (!resume) {
        var page = Mustache.render(templateHelper.get('noresume'), {});
        res.status(HttpStatus.NOT_FOUND).send(page);
        return;
    }

    var theme = themeName || resume.meta.theme || DEFAULT_THEME;

    if (/json/.test(format)) {
        sendAsJson(resume, res)

    } else if (/txt/.test(format)) {
        sendAsText(resume, res)

    } else if (/md/.test(format)) {
        sendAsMarkdown(resume, res)

    } else if (/pdf/.test(format)) {
        sendAsPdf(resume, theme, res)

    } else {
        sendAsHtml(resume, theme, res)

    }
}

module.exports = {
    'sendAsHtml': sendAsHtml,
    'sendAsText': sendAsText,
    'sendAsMarkdown': sendAsMarkdown,
    'sendAsJson': sendAsJson,
    'sendAsPdf': sendAsPdf,
    'processResume': processResume
}