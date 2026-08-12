api.controller = function ($scope, $window) {
    var c = this

    if (c.data && c.data.sessionToken) {
        try {
            $window.g_ck = c.data.sessionToken
        } catch (e) {
            window.g_ck = c.data.sessionToken
        }
    }

    if (!c.data) {
        return
    }

    var existing = document.querySelector('script[data-x-peekl-salesfor-0-bundle="true"]')
    if (existing) {
        return
    }

    var loadBundle = function (bundleUrl) {
        if (!bundleUrl) {
            return
        }
        var script = document.createElement('script')
        script.type = 'module'
        script.src = bundleUrl
        script.crossOrigin = 'anonymous'
        script.setAttribute('data-x-peekl-salesfor-0-bundle', 'true')
        document.body.appendChild(script)
    }

    var deriveBundleUrlFromIndex = function (indexHtml) {
        if (!indexHtml) {
            return ''
        }
        var match = indexHtml.match(/src\s*=\s*["']([^"']*\/main\.jsdbx[^"']*)["']/i)
        if (!match || !match[1]) {
            return ''
        }
        var url = match[1]
        var q = url.indexOf('?')
        return q >= 0 ? url.substring(0, q) : url
    }

    fetch(c.data.bundleIndexUrl, { credentials: 'same-origin' })
        .then(function (res) {
            if (!res.ok) {
                throw new Error('Failed to load bundle index: ' + res.status)
            }
            return res.text()
        })
        .then(function (html) {
            var dynamicUrl = deriveBundleUrlFromIndex(html)
            loadBundle(dynamicUrl || c.data.bundleUrlFallback)
        })
        .catch(function () {
            loadBundle(c.data.bundleUrlFallback)
        })
}
