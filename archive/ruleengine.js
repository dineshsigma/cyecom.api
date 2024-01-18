const { Engine } = require('json-rules-engine');
let engine = new Engine()

async function workflow() {

    let microsoftRule = {
        conditions: {
          all: [{
            fact: 'account-information',
            operator: 'equal',
            value: 'microsoft',
            path: '$.company'
          }, {
            fact: 'account-information',
            operator: 'in',
            value: ['active', 'paid-leave'],
            path: '$.status'
          }, {
            fact: 'account-information',
            operator: 'contains',
            value: '2016-12-25',
            path: '$.ptoDaysTaken'
          }]
        },
        event: {
          type: 'microsoft-christmas-pto',
          params: {
            message: 'current microsoft employee taking christmas day off'
          }
        }
      }
    // let Rule2 = {
    //   conditions: {
    //     all: [{
    //       fact: 'account-information',
    //       operator: 'equal',
    //       value: 'microsoft',
    //       path: '$.company' // access the 'company' property of "account-information"
    //     }, {
    //       fact: 'account-information',
    //       operator: 'in',
    //       value: ['active', 'paid-leave'], // 'status' can be active or paid-leave
    //       path: '$.status' // access the 'status' property of "account-information"
    //     }, {
    //       fact: 'account-information',
    //       operator: 'contains', // the 'ptoDaysTaken' property (an array) must contain '2016-12-25'
    //       value: '2016-12-25',
    //       path: '$.ptoDaysTaken' // access the 'ptoDaysTaken' property of "account-information"
    //     }]
    //   },
    //   event: {
    //     type: 'microsoft-christmas-pto-2',
    //     params: {
    //       message: 'current microsoft employee taking christmas day on'
    //     }
    //   }
    // }
  
    engine.addRule(microsoftRule)
    // engine.addRule(Rule2)
    let facts = { "account-information": { company: 'microsoft', status: 'active', ptoDaysTaken: ['2016-12-25', 'YYYY-MM-DD'] } }
  
   
  
    engine
      .run(facts)
      .then(({ events }) => {
        console.log("events.........", events);
        events.map(event => console.log(event.params.message))
      })
  
  }





  workflow()