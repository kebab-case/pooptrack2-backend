/*
 * Main file for pooptrack2-backend services.
 */

/* Dependencies */
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const chalk = require('chalk');
const expressStatusMonitor = require('express-status-monitor');
const expressValidator = require('express-validator');
const lusca = require('lusca');
const errorHandler = require('errorhandler');
const passport = require('passport');

/* Load environment variables */
dotenv.load({ path: '.env' });

/* Controllers (RouteHandlers) Main */
const mainController = require('./app/main');

/* Controllers (RouteHandlers) API */
const baseController = require('./app/api/base');

/* API keys and Passport configuration */
const passportConfig = require('./config/passport');

/* Express Application */
const app = express();

/* Mongoose/MongoDB connection */
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI, {
  keepAlive: true,
  reconnectTries: Number.MAX_VALUE,
  useMongoClient: true
});
mongoose.connection.on('error', (err) => {
  console.log(err);
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});

/* Express config */
app.set('host', process.env.NODEIP || '0.0.0.0');
app.set('port', process.env.PORT || 3000);
app.use(expressStatusMonitor());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({
    url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
    autoReconnect: true,
    clear_interval: 3600
  })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
/* app.use((req, res, next) => {
  if (req.path === '/api/upload') {
    next();
  } else {
    lusca.csrf()(req, res, next);
  }
});
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
*/
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user &&
    req.path !== '/login' &&
    req.path !== '/signup' &&
    !req.path.match(/^\/auth/) &&
    !req.path.match(/\./)) {
    req.session.returnTo = req.path;
  } else if (req.user &&
    req.path === '/account') {
    req.session.returnTo = req.path;
  }
  next();
});
app.use(express.static(path.join(__dirname, 'static'), { maxAge: 31557600000 }));

/* Splash, login and sign up routes */
app.get('/', mainController.index);
app.get('/login', mainController.getLogin);
app.post('/login', mainController.postLogin);
app.get('/logout', mainController.logout);
app.get('/signup', mainController.getSignup);
app.post('/signup', mainController.postSignup);

/* API Routes */
app.get('/api/v1', passportConfig.isAuthenticated, baseController.index);

/* Wildcard route for invalid API calls */
app.get('/api/v1*', (req, res) => {
  res.redirect('/api/v1/');
});

/* Wildcard route for invalid URLs */
app.get('*', (req, res) => {
  res.redirect('/');
});

/* Error Handler */
app.use(errorHandler());

/* Start the Express server */
app.listen(app.get('port'), () => {
  console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
  console.log('  Press CTRL-C to stop\n');
});
