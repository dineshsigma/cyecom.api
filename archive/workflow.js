// //when enginee

// //Open,Closed,Inprogress,Inreview
// // /High,Medium,Low

// //any to any

// [

//     {
//         "key": "STATUS_CHANGE",
//         "title": "Status change",
//         "fields": [
//             {
//                 "field_name": "from",
//                 "type": "dropdown",
//                 "values": ['Open', 'Closed', 'Inprogress', 'Inreview']

//             }, {
//                 "field_name": "to",
//                 "type": "dropdown",
//                 "values": ['Open', 'Closed', 'Inprogress', 'Inreview']
//             }
//         ]
//     },

//     {
//         "key": "ASSIGN_CHANGE",
//         "title": "Assign change",
//         "fields": [
//             {
//                 "field_name": "Names",
//                 "type": "usersDropdown"
//             }
//         ]

//     },
//     {
//         "key": "PRIORITY_CHANGE",
//         "title": "Priority change",
//         "fields": [
//             {
//                 "field_name": "from",
//                 "type": "dropdown",
//                 "values": ['High', 'Medium', "Low"]
//             },
//             {
//                 "field_name": "to",
//                 "type": "dropdown",
//                 "values": ['Low', 'Medium', "High"]
//             }
//         ]

//     },
//     {
//         "key": "START_DATE_CHANGES",
//         "title": "Start date changes",
//         "fields": []

//     },
//     {
//         "key": "DUE_DATE_CHANGES",
//         "title": "Due date changes",
//         "fields": []

//     },
//     // {
//     //     "key": "ASSIGNEE_REMOVED",
//     //     "title": "Assignee removed",
//     //     "fields": [
//     //         {
//     //             "field_name": "Names",
//     //             "type": "usersDropdown"
//     //         }
//     //     ]

//     // },
//     // {
//     //     "key": "EXISTING_TASK_IS_ADDED_TO_THIS_LOCATION",
//     //     "title": "Existing task is added to this location",
//     //     "fields": []
//     // },
//     // {
//     //     "key": "MOVED_TO_THIS_LOCATION",
//     //     "title": "Moved to this location",
//     //     "fields": []
//     // },
//     // {
//     //     "key": "TASK_LINKED",
//     //     "title": "Task linked",
//     //     "fields": []
//     // },
//     // {
//     //     "key": "TIME_TRACKED",
//     //     "title": "Time tracked",
//     //     "fields": []
//     // },
//     // {
//     //     "key": "ALL_SUBTASKS_RESOLVED",
//     //     "title": "All subTasks resolved",
//     //     "fields": []
//     // },
//     // {
//     //     "key": "ALL_CHECKLIST_RESOLVED",
//     //     "title": "All checklist resolved",
//     //     "fields": []
//     // },
//     // {
//     //     "key": "TASK_UNBLOCKED",
//     //     "title": "Task unblocked",
//     //     "fields": []
//     // },
//     {
//         "key": "DUE_DATE_ARRIVES",
//         "title": "Due date arrives",
//         "fields": []
//     },
//     {
//         "key": "START_DATE_ARRIVES",
//         "title": "Start date arrives",
//         "fields": []
//     }

// ]


// const { Engine } = require('json-rules-engine');
// let engine = new Engine()


// async function workflow() {

//     let TaskRule = {
//         conditions: {
//             all: [
//                 {
//                     fact: 'Tasks',
//                     operator: 'equal',
//                     value: 'In progress',
//                     path: '$.status'
//                 },
//                 {
//                     fact: 'Tasks',
//                     operator: 'equal',
//                     value: 'High',
//                     path: '$.priority'
//                 },

//             ]
//         },
//         event: {
//             type: 'Tasks',
//             params: {
//                 message: 'Change status'
//             }
//         }
//     }

//     let AssigneeRule = {
//         conditions: {
//             all: [
//                 {
//                     fact: 'Assignee',
//                     operator: 'equal',
//                     value: 'dinesh',
//                     path: '$.username'
//                 }


//             ]
//         },
//         event: {
//             type: 'Assignee',
//             params: {
//                 message: 'Change  Assignee'
//             }
//         }
//     }



//     engine.addRule(TaskRule)
//     engine.addRule(AssigneeRule)
//     let facts =
//     {
//         "Tasks": { status: 'In progress', "priority": "High" },
//         "Assignee": { username: 'dinesh' }
//     }



//     engine
//         .run(facts)
//         .then(({ events }) => {
//             console.log("events.........", events);
//             events.map(event => console.log(event.params.message))
//         })

// }


// workflow();



// let conditions=


// [
//     {
//         "conditions": {
//             "all": [
//                 {
//                     "fact": 'Tasks',
//                     "operator": 'equal',
//                     "value": 'In progress',
//                     "path": '$.status'
//                 },
//                 {
//                     "fact": 'Tasks',
//                     "operator": 'equal',
//                     "value": 'High',
//                     "path": '$.priority'
//                 },

//             ]
//         },
//         "event": {
//             "type": 'Tasks',
//             "params": {
//                 "message": 'Change status'
//             }
//         }
//     },
//     {
//         conditions: {
//             all: [
//                 {
//                     fact: 'Assignee',
//                     operator: 'equal',
//                     value: 'dinesh',
//                     path: '$.username'
//                 }


//             ]
//         },
//         event: {
//             type: 'Assignee',
//             params: {
//                 message: 'Change  Assignee'
//             }
//         }
//     }
// ]






// //"happensMoreConditions":
// [
//     {

//         "field_name": "Status",
//         "operators": ["is any of", "is not any of"],
//         "input_type": "dropdown",
//         "input_values": ["is any of", "is not any of"]
//     },
//     {

//         "field_name": "Priority",
//         "operators": ["Medium", "High", "Low"],
//         "input_type": "dropdown",
//         "input_values": ["Medium", "High", "Low"]
//     },
//     {

//         "field_name": "Due Date",
//         "operators": ["is equal to", "is not equal to", "is less than", "is greater than"],
//         "input_type": "calender",

//     },
//     {

//         "field_name": "Start Date",
//         "operators": ["is equal to", "is not equal to", "is less than", "is greater than"],
//         "input_type": "calender",

//     },
//     {

//         "field_name": "Assignee",
//         "operators": ["is any of", "is not any of"],
//         "input_type": "list of users dropdown",

//     },
//     {

//         "field_name": "Watcher",
//         "operators": ["is any of", "is all of", "is not any of", "is not all of", "is set", "is not set"],
//         "input_type": "list of users dropdown",

//     },
//     {

//         "field_name": "Tags",
//         "operators": ["is any of", "is all of", "is not any of", "is not all of", "is set", "is not set"],
//         "input_type": "dropdown",

//     },
//     {
//         "field_name": "Time Estimate",
//         "operators": ["is equal to", "is not equal to", "is less than", "is greater than"],
//         "input_type": "time",
//     }


// ]


// //create a task
// //create a subtask
// //duplicate
// //Move to List

// //change tags

// //-----------actions------------:

// ////Actions-----------
// [
//     {
//         "key": "CHANGE_ASSIGNEES",
//         "title": "Change assignees",
//         "fields": {
//             "field_name": "Names",
//             "type": "usersDropdown"

//         }
//     },
//     {
//         "key": "CHANGE_STATUS",
//         "title": "Change status",
//         "fields": {
//             "field_name": "status",
//             "type": "dropdown",
//             "values": ['Open', 'Closed', 'Inprogress', 'Inreview']

//         }
//     },
//     {
//         "key": "CHANGE_PRIORITY",
//         "title": "Change priority",
//         "fields": {
//             "field_name": "priority",
//             "type": "dropdown",
//             "values": ['Low', 'Medium', "High"]
//         }
//     },



//     {
//         "key": "DELETE_TASK",
//         "title": "Delete Task",
//         "fields": []

//     },
//     {
//         "key": "ARCHIVE_TASK",
//         "title": "Archive Task",
//         "fields": []

//     }
//     // {
//     //     "key": "TRACK_TIME",
//     //     "title": "Track time",
//     //     "fields": {
//     //         "inputtype": "time",
//     //         "tracker for": "usersDropdown"
//     //     }

//     // },
//     // {
//     //     "key": "ESTIMATE_TIME",
//     //     "title": "Estimate time",
//     //     "fields": {
//     //         "inputtype": "time"
//     //     }

//     // },
//     // {
//     //     "key": "CHANGE_WATCHERS",
//     //     "title": "Change watchers",
//     //     "fields": [
//     //         {
//     //             "inputtype": "Add watchers",
//     //             "type": "usersDropdown"
//     //         },
//     //         {
//     //             "inputtype": "Remove watchers",
//     //             "type": "usersDropdown"
//     //         }
//     //     ]


//     // }
//     // {
//     //     "key": "CHANGE_TAGS",
//     //     "title": "Change tags",
//     //     "fields": [
//     //         {
//     //             "inputtype": "Add tags",
//     //             "type": "tagsDropdown",
//     //             "value":["bugfixes","datamistake"]
//     //         },
//     //         {
//     //             "inputtype": "Remove tags",
//     //             "type": "tagsDropdown",
//     //             "value":["bugfixes","datamistake"]
//     //         }
//     //     ]


//     // }
// ]








// // {
// //     "key": "CHANGE_START_DATE",
// //     "title": "Change start date",
// //     "fields": {
// //         "field_name": "start date",
// //         "type": "dropdown",
// //         "values": ["Days after trigger date", "On trigger date", "Choose a date"],
// //         "subfield": {
// //             "Days after trigger date": {
// //                 "inputtype": "text",
// //                 // "value": ""
// //             },
// //             "On trigger date": {
// //                 "inputtype": ""
// //             },
// //             "Choose a date": {
// //                 "inputtype": "calender",
// //                 // "value": ""
// //             }
// //         }
// //     }
// // }



// // },
// // {
// //     "key": "CREATE_TASK",
// //     "title": "Create task",
// //     "fields": [
// //         {
// //             "field_name": "task name",
// //             "type": "array",
// //             "values": [""]
// //         },
// //         {
// //             "field_name": "list",
// //             "type": "Spaces array",
// //             "values": ["1", "2"],
// //             "subfield": {
// //                 "1": {
// //                     "values": []
// //                 },
// //                 "2": {
// //                     "values": []
// //                 }
// //             }
// //         },
// //         {
// //             "field_name": "Description",
// //             "type": "text",
// //             "values": ""
// //         },
// //         {
// //             "field_name": "status",
// //             "type": "array",
// //             "values": []
// //         },
// //         {
// //             "field_name": "priority",
// //             "type": "array",
// //             "values": []
// //         },
// //         {
// //             "field_name": "assignees",
// //             "type": "assigneesArray",
// //             "values": []
// //         },
// //         {
// //             "field_name": "start date",
// //             "type": "dropdown",
// //             "values": ["1", "2", "3"],
// //             "subfield": {
// //                 "1": {
// //                     "inputtype": "text",
// //                     "value": ""
// //                 },
// //                 "2": {
// //                     "inputtype": ""
// //                 },
// //                 "3": {
// //                     "inputtype": "calender",
// //                     "value": ""
// //                 }
// //             }
// //         },
// //         {
// //             "field_name": "due date",
// //             "type": "dropdown",
// //             "values": ["1", "2", "3"],
// //             "subfield": {
// //                 "1": {
// //                     "inputtype": "text",
// //                     "value": ""
// //                 },
// //                 "2": {
// //                     "inputtype": ""
// //                 },
// //                 "3": {
// //                     "inputtype": "calender",
// //                     "value": ""
// //                 }
// //             }
// //         }
// //     ]
// // },
// // {
// //     "key": "ADD_ACOMMENT",
// //     "title": "Add a Comment",
// //     "fields": {
// //         "inputtype": "text"
// //     }

// // },





// // {
// //     "key": "CHANGE_DUE_DATE",
// //     "title": "Change due date",
// //     "fields": {
// //         "field_name": "due date",
// //         "type": "dropdown",
// //         "values": ["Days after trigger date", "On trigger date", "Choose a date"],
// //         "subfield": {
// //             "Days after trigger date": {
// //                 "inputtype": "text"

// //             },
// //             "On trigger date": {
// //                 "inputtype": ""
// //             },
// //             "Choose a date": {
// //                 "inputtype": "calender"

// //             }
// //         }
// //     }
// // },





// // input Json {
// //     key: String!
// //     title: String!
// //     fields: String!
// //   }



// {
     
// }
// // key,title.syn,user_id



// //approval temples----id,synamr,how many levels,which level,---user_id-

