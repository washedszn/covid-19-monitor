const Corona = require('./src/corona');

// If you want to be pinged for each update
// add an object that has the same name as the country
// then add discord ID's inside the objects array.
// Example below...

let options = {
    'UK': ['<@194492138195344898>'],
    'Netherlands': ['<@194492138195344898>']
}

let run = new Corona(options)
run.start();
