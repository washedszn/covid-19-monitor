const superagent = require('superagent');
const cheerio = require('cheerio');

class Corona {
    constructor(options) {
        this.users = options

        this.data = [];
        this.newData = [];

        this.first = true;
    }

    start() {
        console.log('Monitor Active!')
        this.test = setInterval(() => {
            this.worldometer();
        }, 10000)
    }

    worldometer() {
        superagent
            .get('https://www.worldometers.info/coronavirus/')
            .then(res => {
                let $ = cheerio.load(res.text);

                this.newData = [];

                $('#main_table_countries_today > tbody:nth-child(2) > tr').each((index, element) => {
                    this.newData[index] = {
                        country: $($(element).find('td')[0]).text().trim(),
                        cases: $($(element).find('td')[1]).text().trim(),
                        deaths: $($(element).find('td')[3]).text().trim(),
                        newCases: $($(element).find('td')[2]).text().trim(),
                        newDeaths: $($(element).find('td')[4]).text().trim()
                    }
                })

                if (this.first) {
                    this.data = this.newData;
                    this.first = false;
                } else {
                    this.check();
                }
            })
            .catch(err => {
                console.log(err)
            })
    }

    check() {
        this.newData.forEach((obj, index) => {
            if (this.data[index].newCases != obj.newCases) {
                this.sendWebhook('CASES', obj);
            }
            if (this.data[index].newDeaths != obj.newDeaths) {
                this.sendWebhook('DEATHS', obj);
            }
            this.data[index] = obj;
        })
    }

    fieldTest(type, object) {
        let field;

        switch (type) {
            case 'CASES':
                field = {
                    name: 'New Cases (Today):',
                    value: object.newCases == '' ? '0' : object.newCases
                }
                break;
            case 'DEATHS':
                field = {
                    name: 'New Deaths (Today):',
                    value: object.newDeaths == '' ? '0' : object.newDeaths
                }
                break;
        }

        return field;
    }

    sendWebhook(type, object) {

        let people = this.users[object.country] || [];

        let embed = {
            embeds: [
                {
                    title: `${object.country} update!`,
                    color: type == 'DEATHS' ? 16711680 : 16772778,
                    timestamp: new Date(),
                    footer: {
                        text: "@ Washed"
                    },
                    fields: [
                        {
                            name: 'Total Cases:',
                            value: object.cases == '' ? '0' : object.cases,
                            inline: true
                        },
                        {
                            name: 'Total Deaths:',
                            value: object.deaths == '' ? '0' : object.deaths,
                            inline: true
                        },
                        this.fieldTest(type, object)
                    ]
                }
            ]
        }

        if (people.length > 0) {
            Object.assign(embed, { content: `${people.join(', ')} update in your country!` })
        }

        if (embed.embeds[0].fields[2].value == '0') {
            return;
        }

        superagent
            .post('<webhook>')
            .send(embed)
            .then(res => {
                console.log(`${object.country} Updated!`)
            })
            .catch(err => {
                console.log(`${object.country} Error`)
            })
    }
}

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