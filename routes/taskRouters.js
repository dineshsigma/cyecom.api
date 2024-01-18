const express = require('express');
const router = express.Router();

let tasks = require('../controllers/taskscontrollers')
// let advancedReports = require('../reportshari')

router.post('/taskNotification', tasks.taskNotification);
router.post('/TaskProgresscalculation', tasks.TaskProgresscalculation);
router.post('/taskEmailNotification', tasks.taskEmailNotification);
router.post('/taskLogs', tasks.taskLogs);
router.post('/taskTemplateLogs', tasks.taskTemplateLogs);
router.post('/ticketLogs', tasks.ticketLogs);
router.post('/locationLogs', tasks.locationLogs);
router.post('/departmentLogs', tasks.departmentLogs);
router.post('/designationLogs', tasks.designationLogs);
router.post('/commentLogs', tasks.commentLogs);
router.post('/checklistLogs', tasks.checklistLogs);
router.post('/groupLogs', tasks.groupLogs);
router.post('/attachmentLogs', tasks.attachmentLogs);
router.post('/announcmentLogs', tasks.announcmentLogs);
router.post('/taskPushNotification', tasks.taskPushNotification);
router.post('/statusCountFilter', tasks.statusCountFilter);
router.post('/dueDateFilter', tasks.dueDateFilter);
// router.post('/advancedReports', advancedReports.advancedReports);
router.post('/assigneeTransfer', tasks.assigneeTaskTransfer);
router.post('/taskApproval', tasks.taskApproval);
router.post('/taskFilter', tasks.taskFilter);
// router.post('/taskTemplateFilter',tasks.taskTemplateFilter);
router.post('/getAllTeamIds', tasks.getAllTeamIds);
router.post('/getGroupTaskCountFilter', tasks.getGroupTaskCountFilter);
router.post('/locDeleteCheck', tasks.locDeleteCheck);
router.post('/depDeleteCheck', tasks.depDeleteCheck);
router.post('/desigDeleteCheck', tasks.desigDeleteCheck);
router.post('/roleDeleteCheck', tasks.roleDeleteCheck);
router.post('/userDeleteCheck', tasks.userDeleteCheck);
router.post('/teamTasksClosedFilter', tasks.teamTasksClosedFilter);
router.post('/deleteAttachment', tasks.deleteAttachment);
router.post('/pastWeekStatusCounts', tasks.pastWeekStatusCounts);
router.post('/task_codeGenerator', tasks.task_codeGenerator);
router.post('/approvalInsert', tasks.approvalInsert);
router.post('/getApproveUsers', tasks.getApproveUsers);
router.post('/taskStatusUpdate', tasks.taskStatusUpdate);
router.post('/getApproverList', tasks.getApproverList);
router.post('/needtoApproveList', tasks.needtoApproveList);
router.post('/acceptTask', tasks.acceptTask);
router.post('/myApprovedList', tasks.myApprovedList);
router.post('/myRejectedList', tasks.myRejectedList);
router.post('/getDepTaskCountFilter', tasks.getDepTaskCountFilter);
router.post('/rewardPointsCalcTrigger', tasks.rewardPointsCalcTrigger);
router.post('/statusPriorityDelCheck', tasks.statusPriorityDelCheck);
router.post('/statusGraph', tasks.statusGraph);
router.post('/userBoardView', tasks.userBoardView);
router.post('/userTotalRewards', tasks.userTotalRewards);
router.post('/reportsFilter', tasks.reportsFilter);
router.post('/getAccesBasedUserData', tasks.getAccesBasedUserData);
router.post('/getAccesBasedLocationData', tasks.getAccesBasedLocationData);
router.post('/getHighPriorityTasks', tasks.getHighPriorityTasks);
router.post('/getGroupsDropdown', tasks.getGroupsDropdown);
router.post('/getAllTeamIds2',tasks.getAllTeamIds2);
// router.get('/commentDeleteCheck',tasks.commentDeleteCheck);
// router.post('/statusCounts',tasks.statusCounts)

module.exports = router;