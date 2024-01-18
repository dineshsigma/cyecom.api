const natural = require('natural');
var config = require('./config.js').config;
const Pool = require('pg-pool');
const moment = require('moment');
var Recognizers = require('@microsoft/recognizers-text-date-time');
var isWord = require('is-word');
var englishWords = isWord('british-english');
 



var DateTimeRecognizers = require('@microsoft/recognizers-text-date-time');
var reportwords=["status","task","open","closed","priority","high","low","medium","today","this month","this week",""];


async function advancedReports(req,res){

    var classifier = new natural.BayesClassifier();
    // priority
    classifier.addDocument('Show me high priority tasks', 'priorty');
    classifier.addDocument('high priority tasks', 'priorty');
    classifier.addDocument('What are the high priority tasks', 'priorty');
    classifier.addDocument('My high priority task', 'priorty');
    classifier.addDocument('I need priority wise report', 'priorty');
    classifier.addDocument('I need high priority tasks', 'priorty');
    classifier.addDocument('I need medium or low priority tasks', 'priorty');
    classifier.addDocument('I need priority wise report', 'priorty');
    classifier.addDocument('medium priority tasks', 'priorty');
    classifier.addDocument('low priority tasks', 'priorty');
    
    // status 
    classifier.addDocument('work status graph', 'status');
    classifier.addDocument('Pending work status graph', 'status');
    classifier.addDocument('pending tasks status graph', 'status');
    classifier.addDocument('monthly work status graph', 'status');
    classifier.addDocument('weekly work status graph', 'status');
    classifier.addDocument('Overdue tasks status graph', 'status');
    classifier.addDocument('Work status report graph', 'status');
    
    // orverdue 
    classifier.addDocument('What are my overdue tasks', 'overdue');
    classifier.addDocument('I need overdue date tasks', 'overdue');
    classifier.addDocument('show me overdue tasks', 'overdue');
    classifier.addDocument('overdue tasks', 'overdue');
    classifier.addDocument('overdue tasks report', 'overdue');
    classifier.addDocument('open overdue tasks', 'overdue');
    
    
    
    
    //date
    classifier.addDocument('yesterday\'s work report', 'date');
    classifier.addDocument('yesterday task report', 'date');
    classifier.addDocument('this months work report', 'date');
    classifier.addDocument('this week work report', 'date');
    classifier.addDocument('this week task report', 'date');
    classifier.addDocument('this month task report', 'date');
    classifier.addDocument('today\'s pending tasks', 'date');
    //classifier.addDocument('what was my tasks yesterday?', 'date');
    
    classifier.train();
    

let basequery = ` from public.tasks `,groupbytext='',wheretext='',selecttext='';
let result_type='';
// console.log("input string.............",req.body.text)

let inputstring=req.body.text;
// console.log(inputstring!=undefined ,inputstring!='undefined', inputstring!='', englishWords.check(inputstring.split(' ')[0])); 
if(inputstring!=undefined && inputstring!='undefined' &&  inputstring!='' )
{
    try{
var words=natural.PorterStemmer.tokenizeAndStem(inputstring,);
let category=classifier.classify(inputstring)
// console.log("words........",words)
//graph,report
// console.log(category);

if(category=='priorty')
{
    let prioritylist=[]
    // console.log("stsdsdfsdf...........",words.indexOf('high')!=-1);
    if(words.indexOf('high')!=-1)
    {
     prioritylist.push('high');   
    }
    if(words.indexOf('medium')!=-1)
    {
     prioritylist.push('medium');   
    }
    if(words.indexOf('low')!=-1)
    {
     prioritylist.push('low');   
    }
    if(prioritylist.length>0)
    wheretext=`where priority in (${await getarray(prioritylist)})`

if(words.indexOf('graph')!=-1 ||prioritylist.length==0)
{
    result_type='graph';
    groupbytext='group by priority';

    selecttext='count(*),priority';

   
}else if(words.indexOf('report')!=-1 ||prioritylist.length>0){
   
    result_type='list';
    selecttext='*';


}
}else if(category=='status')
{
    let statuslist=[]
    // console.log("stsdsdfsdf...........",words.indexOf('high')!=-1);
    if(words.indexOf('open')!=-1)
    {
        statuslist.push('open');   
    }
    if(words.indexOf('closed')!=-1)
    {
        statuslist.push('closed');   
    }
    if(words.indexOf('inprogress')!=-1)
    {
        statuslist.push('in-progress');   
    }
    if(statuslist.length>0)
    wheretext=`where status in (${await getarray(statuslist)})`

if(words.indexOf('graph')!=-1 ||statuslist.length==0)
{
    result_type='graph';

    groupbytext='group by status';
    selecttext='count(*),status';


}else if(words.indexOf('report')!=-1 || statuslist.length>0){

    result_type='list';
    selecttext='*';
}

}else if(category=='overdue')
{
    result_type='list';
    var currentdate=new Date();


    wheretext=`where due_date>'${currentdate.toISOString()}'`;
}
else if(category=='date')
{
    result_type='list';
    var currentdate=new Date();
    var model = new DateTimeRecognizers.DateTimeRecognizer(Recognizers.Culture.English).getDateTimeModel()
        let result = model.parse(inputstring);
        // console.log('result...',result[0].resolution.values[0]);
        if(result[0].resolution.values[0].type=='date')
        {
            let date=new Date(result[0].resolution.values[0].value);
            // console.log("date.............",date);
            var startdate=new Date(result[0].resolution.values[0].value);
            startdate.setHours(5);
            startdate.setMinutes(30);
            startdate.setSeconds(0);
            var enddate=new Date(result[0].resolution.values[0].value);
            enddate.setHours(5);
            enddate.setMinutes(30);
            enddate.setSeconds(0);
            enddate.setDate(enddate.getDate() + 1);
            
// console.log('startdate------------enddate',startdate,enddate,date);

            wheretext=`where start_date BETWEEN '${startdate.toISOString()}' AND '${enddate.toISOString()}'`;

        }else{
            wheretext=`where start_date BETWEEN '${new Date(result[0].resolution.values[0].start).toISOString()}' AND '${new Date(result[0].resolution.values[0].end).toISOString()}'`;
 
        }
        selecttext='*';
           // wheretext=''

    

}else{
    result_type='invalid'
    res.json({rowCount:0,answer:'Sorry, I am still learning. Hope I can answer this soon',result_type:result_type});
}



var finalquery ='Select '+selecttext+' '+basequery+' '+wheretext+' '+groupbytext;
// console.log('finalquery.............',finalquery);
const pool = new Pool(config.dbconnection)
const client = await pool.connect();
var taskresult = await client.query(finalquery);
client.release();
// console.log('taskresult.......',taskresult.rowCount);
var result_data=[];
if(result_type=='graph')
{
    
    // console.log("taskresult.rows[0].priority!=undefined,,,,,",taskresult.rows[0].priority!=undefined)
    if(taskresult.rows[0].priority!=undefined)
    {
    for(let i=0;i<taskresult.rows.length;i++)
    {
        result_data.push({"y":taskresult.rows[i].count , "x": taskresult.rows[i].priority})
    }
}else{
   
    for(let i=0;i<taskresult.rows.length;i++)
    {
        // console.log("taskresult.rows[i]d,,,,,",i,taskresult.rows[i])
        result_data.push({"y":taskresult.rows[i].count , "x": taskresult.rows[i].status})
    }
}
}else{
     result_data=taskresult.rows
}
res.json({rows:result_data,rowCount:taskresult.rowCount,result_type:result_type});
    }catch(e)
    {
        result_type='invalid'
    res.json({rowCount:0,answer:'Sorry, I am still learning. Hope I can answer this soon',result_type:result_type});  
    }
}else{
    result_type='invalid'
    res.json({rowCount:0,answer:'Sorry, I am still learning. Hope I can answer this soon',result_type:result_type}); 
}

}
async function getarray(data) {
    var data1 = `'`;
    for (var i = 0; i < data.length; i++) {
        data1 += data[i] + `','`
  
    }
  
    //console.log(data1.substring(0, data1.length - 2));
    return data1.substring(0, data1.length - 2);
}
module.exports.advancedReports = advancedReports;
//advancedReports();
// if(words.indexOf('graph')!=0)
// {
// if(words.indexOf('priority')!=0)
// {
//     groupbytext='group by priority';

//     selecttext='count(*),priority';

// }else if(words.indexOf('status')!=0)
// {
//     groupbytext='group by status';
//     selecttext='count(*),status';

// }else if(words.indexOf('this month')!=0)
// {    
//     var model = new DateTimeRecognizers(Recognizers.Culture.English).getDateTimeModel()
//     var result = model.parse('this month');
//         wheretext=''
// }
// }else if(words.indexOf('report')!=0){
//     if(words.indexOf('priority')!=0)
// {
    

//     selecttext='*';

// }else if(words.indexOf('status')!=0)
// {
    
//     selecttext='*';

// }
// }