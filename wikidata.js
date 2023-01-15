//Create a new object to interact with the server
function searchWiki(name, surname) {
    let xhr = new XMLHttpRequest();
    let url = makeURL(name, surname);
    xhr.open('GET', url, true);

    // Once request has loaded...
    xhr.onload = function() {
        // Parse the request into JSON
        
        var data = JSON.parse(this.response);


        // Log the data object
        console.log(data);

        // Log the page objects
        console.log(data.query.pages)

        // Loop through the data object
        // Pulling out the titles of each page
        for (var i in data.query.pages) {
            console.log(data.query.pages[i].title);
        }
    }

    xhr.send();
}

function makeURL(name, surname){
    let endpoint = 'https://query.wikidata.org/sparql?&query=';
    let query = '';

    let url = endpoint+query+'&format=json';
    url = url.trim().replace(/\s/g, '%20');
    return url
}

