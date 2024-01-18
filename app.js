const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cors = require('cors')
require('dotenv').config()
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const app = express();
app.options('*', cors())
app.use(cors());


let uploadcsvRouter = require('./routes/uploadcsvRouters');
let usersRouter = require('./routes/userRouters');
let authRouter = require('./routes/authRouters')
let taskRouters = require('./routes/taskRouters')
let organizationRouter = require('./routes/organizationRouters')
let escalationJobsRouter = require('./routes/escalationJobsRouter')
let downloadcsvRouters = require('./routes/downloadcsvRouters')
let configRouter = require('./routes/configurationRouter')
let billingJobRouter = require('./routes/billingJobsRouter')
let { recursivejob, scheduleLaterCronJob, remaindercronjob, announcmentNotificationJob } = require('./jobs/cronjobs')
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/api/user', usersRouter);
app.use('/api/uploadCsv', uploadcsvRouter);
app.use('/api/auth', authRouter);
app.use('/api/tasks', taskRouters);
app.use('/api/v1', organizationRouter);
app.use('/api/download', downloadcsvRouters);
app.use('/api/configuration', configRouter);
app.use('/api/recurrssiveJob', recursivejob);
app.use('/api/scheduleLaterCronJob', scheduleLaterCronJob);
app.use('/api/remaindercronjob', remaindercronjob);
app.use('/api/announcmentNotifiJob', announcmentNotificationJob);
app.use('/api/billing', billingJobRouter);
app.use('/api/escalationJobs', escalationJobsRouter);

app.use('/', (req, res) => {
  res.send('Cyecom graphql server working')
});
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
