const express = require("express");
const app = express();
const https = require("https");
// Very bad joke
const key = "CorgiGoesHere";
const limit = 4001;

// Allow cors
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

function API(subject, count = 1, dateupload = 0) {
	return new Promise((resolve, reject) => {
        https.get("https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key="+key+"&format=json&per_page=1&extras=owner_name,url_o,date_upload&min_upload_date="+dateupload+"&page="+count+"&text="+subject+"&license=9&nojsoncallback=1", (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
				try {
					var photos = JSON.parse(data);
				} catch {
					reject();
				}
                resolve(photos);
            });
        }).on("error", (err) => {
            reject();
        });
    });
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.all('/:subject/:count', async (req, res) => {
    if(isNaN(req.params.count) && req.params.count !== "embed" || req.params.subject > 100) return res.status(400).send("Invalid request");
    var count = 1;
    if (req.params.count === "embed") {
		try {
			var result = await API(req.params.subject, count);
			if(result.stat !== "ok") res.status(400).send("API Error 1");
			var pages = result.photos.pages;
			if(pages < 1) res.status(404).send("Subject not found.");
		} catch {
			return res.status(400).send("API Error 2");
		}
        count = Math.floor(getRandomInt(1, pages));
    } else if (req.params.count > 0) {
        count = req.params.count;
    }
	var result = await getPhoto(req.params.subject, count);
    if (req.params.count === "embed") {
		res.header('Cache-Control', 'no-cache, no-store');
        res.redirect(307, result.photos.photo[0].url_o);
    } else {
		res.header('Cache-Control', 'public, smax-age=600, max-age=600');
		res.status(200).send(result);
    }
})

async function getPhoto(subject, count = 1) {
	var requests = Math.floor(count/limit);
	// Flickr API limit workaround.
    var index = count - limit * requests;
	var dateupload = 0;
	for (requests < 0; requests--;) {
		let result = await API(subject, limit, dateupload);
		if(result.stat !== "ok") continue
		dateupload = result.photos.photo[0].dateupload;
	}
	return await API(subject, index + 1, dateupload);
}

app.get('/', function(req, res) {
    res.header('Cache-Control', 'public, smax-age=86400, max-age=86400');
    res.send('<h1>Wellcome!</h1><p1>GET /subject/index</p1><br><p2>GET /subject/embed</p2>');
});

app.get('*', function(req, res) {
    res.status(404).send('<h1>What ya doin???</h1>');
});

module.exports = app;
