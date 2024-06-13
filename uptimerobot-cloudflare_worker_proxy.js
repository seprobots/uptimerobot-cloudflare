const uptimerobot_id = 'your uptimerobot_id'


const upstream = 'stats.uptimerobot.com'
const upstream_path = '/' + uptimerobot_id



const replace_dict = {
    '$upstream': '$custom_domain',
    'counter.innerText = "59";': 'counter.innerText = "10";',
    [uptimerobot_id]: '-h-',
    '<span class="counter">59</span>': '<span class="counter">10</span>'
}

addEventListener('fetch', event => {
    event.respondWith(fetchAndApply(event.request));
})

async function fetchAndApply(request) {

    const region = request.headers.get('cf-ipcountry').toUpperCase();
    const ip_address = request.headers.get('cf-connecting-ip');

    let response = null;
    let url = new URL(request.url);
    let url_hostname = url.hostname;
    url.protocol = 'https:';
    let upstream_domain = upstream
    url.host = upstream_domain;
    if (url.pathname == '/') {
        url.pathname = upstream_path
    } else if (!isNaN(parseInt(url.pathname.split('/')[1]))) {
        url.pathname = upstream_path + url.pathname;
    } else {

    }
    url.pathname = url.pathname.replace('-h-',uptimerobot_id)
    let method = request.method;
    let request_headers = request.headers;
    let new_request_headers = new Headers(request_headers);

    new_request_headers.set('Host', upstream_domain);
    new_request_headers.set('Referer', url.protocol + '//' + url_hostname);

    let original_response = await fetch(url.href, {
        method: method,
        headers: new_request_headers
    })

    let original_response_clone = original_response.clone();
    let original_text = null;
    let response_headers = original_response.headers;
    let new_response_headers = new Headers(response_headers);
    let status = original_response.status;

    // new_response_headers.delete('access-control-allow-origin', '*');
    // new_response_headers.delete('access-control-allow-credentials', true);
    new_response_headers.delete('content-security-policy');
    new_response_headers.delete('content-security-policy-report-only');
    new_response_headers.delete('clear-site-data');

    const content_type = new_response_headers.get('content-type');
    if (content_type != null && content_type.includes('text/html') && content_type.includes('UTF-8')) {
        original_text = await replace_response_text(original_response_clone, upstream_domain, url_hostname);
    } else {
        original_text = original_response_clone.body
    }

    response = new Response(original_text, {
        status,
        headers: new_response_headers
    })
    return response;
}

async function replace_response_text(response, upstream_domain, host_name) {
    let text = await response.text()
    var i, j;
    for (i in replace_dict) {
        j = replace_dict[i]
        if (i == '$upstream') {
            i = upstream_domain
        } else if (i == '$custom_domain') {
            i = host_name
        }

        if (j == '$upstream') {
            j = upstream_domain
        } else if (j == '$custom_domain') {
            j = host_name
        }

        let re = new RegExp(i, 'g')
        text = text.replace(re, j);
    }
    // remove tracker
    text =  text.replace(text.substr(text.indexOf('var _rollbarConfig')).split('</head>')[0], '</script>')
    // remove cookie consent
    text = text.split('\n').filter(x=>{
        return !x.includes('cookie-consent')
    }).join('\n')
    return text.replaceAll('/-h-"','"')
}
