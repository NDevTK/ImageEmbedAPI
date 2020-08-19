const express = require("express");
const app = express();
const https = require("https");
// Very bad joke
const key = "CorgiGoesHere";
var perpage = 1;

// Allow cors
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

function API(count, subject) {
    return "https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key="+key+"&format=json&per_page="+perpage+"&extras=owner_name,url_o&sort=relevance&page="+count+"&text="+subject+"&license=9&nojsoncallback=1";
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.all('/:subject/:count', async (req, res) => {
    if(isNaN(req.params.count) && req.params.count !== "embed" || req.params.subject > 100) res.send("Invalid request");
    var count = 0;
    var pages = await getCount(req.params.subject);
    // API limit of flickr
    if(pages > 4000) {
        perpage = Math.ceil(pages/4000);
    }
    if (req.params.count === "embed") {
        var pages = await getCount(req.params.subject);
        count = Math.floor(getRandomInt(1, pages));
    } else if (req.params.count > 0) {
        count = req.params.count;
    }
    https.get(API(count, req.params.subject), (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
            data += chunk;
        });
        resp.on('end', () => {
            if (req.params.count === "embed") {
                res.header('Cache-Control', 'no-cache, no-store');
                var photos = JSON.parse(data).photos.photo;
                res.redirect(307, photos[getRandomInt(1, photos.length) - 1].url_o);
            } else {
                res.header('Cache-Control', 'public, smax-age=600, max-age=600');
                res.status(200).send(data);
            }
        });
    }).on("error", (err) => {
        res.send("ERROR");
    });
})

// Get count of images for a subject
function getCount(subject) {
    return new Promise(resolve => {
        https.get(API(1, subject), (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                var pages = JSON.parse(data).photos.pages;
                resolve(pages);
            });
        }).on("error", (err) => {
            res.send("ERROR");
        });
    });
}

app.get('/', function(req, res) {
    res.header('Cache-Control', 'public, smax-age=86400, max-age=86400');
    res.send('<h1>Wellcome!</h1><p1>GET /subject/index</p1><br><p2>GET /subject/embed</p2>');
});

app.get('*', function(req, res) {
    res.status(404).send('<h1>What ya doin???</h1>');
});

module.exports = app;
