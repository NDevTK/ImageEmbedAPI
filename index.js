addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const key = "CorgiGoesHere";
const limit = 4001;

async function handleRequest(request) {
  let { searchParams } = new URL(request.url);
  let subject = searchParams.get("subject");
  if(subject === null || typeof subject !== 'string' || subject.length > 10) {
      return new Response("Subject is not valid", {status: 400})
  }
  return getURL(subject);
}

async function API(subject, count = 1, dateupload = 0) {
  let data = await fetch("https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key="+key+"&format=json&in_gallery=1&per_page=1&extras=owner_name,url_o,date_upload&max_upload_date="+dateupload+"&page="+count+"&text="+subject+"&license=9&nojsoncallback=1");
  return await data.json()
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getURL(subject) {
    var count = 1;
	try {
        var result = await API(subject, count);
		if(result.stat !== "ok") return new Response("Remote error", {status: 502});
		var pages = result.photos.pages;
		if(pages < 1) return new Response("Subject not found", {status: 404});
    } catch {
        return new Response("API error", {status: 400});
    }

    count = Math.floor(getRandomInt(1, pages));
    var result = await getPhoto(subject, count);
    return new Response("", {
        status: "307",
        headers: {
            "Location": result.photos.photo[0].url_o,
            "Access-Control-Allow-Origin": "*"
        }
    });
}

async function getPhoto(subject, count = 1) {
    var requests = Math.floor(count/limit);
    // Flickr API limit workaround.
    var index = (requests > 0) ? (count - limit * requests) + 1 : count;
	var dateupload = 0;
	for (requests < 0; requests--;) {
		let result = await API(subject, limit, dateupload);
		if(result.stat !== "ok") continue
		try {
			dateupload = result.photos.photo[0].dateupload;
		} catch {
			continue
		}
	}
	return await API(subject, index, dateupload);
}
