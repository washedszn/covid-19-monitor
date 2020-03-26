const superagent = require('superagent');
const cheerio = require('cheerio');
const suffix = require('add-number-suffix');

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
                    let country = $($(element).find('td')[0]).text().trim();
                    let cases = $($(element).find('td')[1]).text().trim();
                    let deaths = $($(element).find('td')[3]).text().trim();
                    let newCases = $($(element).find('td')[2]).text().trim();
                    let newDeaths = $($(element).find('td')[4]).text().trim();
                    
                    this.newData[index] = {
                        country: country,
                        cases: cases == '' ? '0' : cases,
                        deaths: deaths == '' ? '0' : deaths,
                        newCases: newCases == '' ? '0' : newCases,
                        newDeaths: newDeaths == '' ? '0' : newDeaths
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
        let deathsRank = this.newData.concat().sort((a, b) => {
            return parseFloat(b.deaths.replace(/,/g, '')) - parseFloat(a.deaths.replace(/,/g, ''))
        })

        this.newData.forEach((obj, index) => {
            if (this.data[index].newCases != obj.newCases) {
                this.sendWebhook('CASES', obj, index + 1, deathsRank.indexOf(obj) + 1);
            }
            if (this.data[index].newDeaths != obj.newDeaths) {
                this.sendWebhook('DEATHS', obj, index + 1, deathsRank.indexOf(obj) + 1);
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
                    value: object.newCases
                }
                break;
            case 'DEATHS':
                field = {
                    name: 'New Deaths (Today):',
                    value: object.newDeaths
                }
                break;
        }

        return field;
    }

    sendWebhook(type, object, casesRank, deathsRank) {

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
                            name: `Total Cases (${suffix.addSuffix(casesRank)}):`,
                            value: object.cases,
                            inline: true
                        },
                        {
                            name: `Total Deaths (${suffix.addSuffix(deathsRank)}):`,
                            value: object.deaths,
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

