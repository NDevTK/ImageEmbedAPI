addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const key = ":)";
const limit = 4001;

async function handleRequest(request) {
    let { searchParams } = new URL(request.url);
    if (!searchParams.has("subject")) {
        return Response.redirect("https://github.com/NDevTK/ImageEmbedAPI");
    }
    let subject = searchParams.get("subject");
    if (subject === null || typeof subject !== 'string' || subject.length > 1337) {
        return new Response("Subject is not valid", {
            status: 400
        })
    }
    return getURL(subject);
}

async function API(subject, count = 1, dateupload = 0) {
    let data = await fetch("https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=" + encodeURIComponent(key) + "&format=json&in_gallery=1&media=photos&per_page=500&extras=url_o,date_upload&license=9&nojsoncallback=1&max_upload_date=" + encodeURIComponent(dateupload) + "&page=" + encodeURIComponent(count) + "&text=" + encodeURIComponent(subject), {
        cf: {
            cacheTtlByStatus: {
                "200-299": 86400,
                "500-599": 0
            }
        },
        headers: {
            "User-Agent": "ImageEmbedAPI"
        }
    });
    return await data.json();
}

function getRandomInt(min, max) {
  const range = max - min;
  const maxGeneratedValue = 0xFFFFFFFF;
  const possibleResultValues = range + 1;
  const possibleGeneratedValues = maxGeneratedValue + 1;
  const remainder = possibleGeneratedValues % possibleResultValues;
  const maxUnbiased = maxGeneratedValue - remainder;

  if (!Number.isInteger(min) || !Number.isInteger(max) ||
       max > Number.MAX_SAFE_INTEGER || min < Number.MIN_SAFE_INTEGER) {
    throw new Error('Arguments must be safe integers.');
  } else if (range > maxGeneratedValue) {
    throw new Error(`Range of ${range} (from ${min} to ${max}) > ${maxGeneratedValue}.`);
  } else if (max < min) {
    throw new Error(`max (${max}) must be >= min (${min}).`);
  } else if (min === max) {
    return min;
  } 

  let generated;
  do {
    generated = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (generated > maxUnbiased);

  return min + (generated % possibleResultValues);
};

async function getURL(subject) {
    var count = 1;
    try {
        var result = await API(subject, count);
        if (result.stat !== "ok") return new Response("Remote error", {
            status: 502
        });
        var pages = result.photos.pages;
        if (pages < 1) return new Response("Subject not found", {
            status: 404
        });
    } catch {
        return new Response("API error 1", {
            status: 400
        });
    }

    try {
        count = getRandomInt(1, pages);
        var result = await getPhoto(subject, count);
    } catch {
        return new Response("API error 2", {
            status: 400
        });
    }

    if (!result || result.url_o === null || typeof result.url_o !== 'string' || !result.url_o.startsWith("https://")) {
        return new Response("Unsafe redirect", {
            status: 502
        });
    }

    return new Response("", {
        status: 307,
        headers: {
            "Location": result.url_o,
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "max-age=1",
            "Cross-Origin-Resource-Policy": "cross-origin",
            "Content-Security-Policy": "sandbox"
        }
    });
}

async function getPhoto(subject, count = 1) {
    var requests = Math.floor(count / limit);
    // Flickr API limit workaround.
    var index = (requests > 0) ? (count - limit * requests) + 1 : count;
    var dateupload = 0;
    for (requests < 0; requests--;) {
        let result = await API(subject, limit, dateupload);
        if (result.stat !== "ok") continue
        try {
            dateupload = result.photos.photo[0].dateupload;
        } catch {
            continue
        }
    }
    var result = await API(subject, index, dateupload);
    var count2 = getRandomInt(1, result.photos.photo.length);
    return result.photos.photo[count2 - 1];
}
