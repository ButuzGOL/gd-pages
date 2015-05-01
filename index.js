'use strict';

var googleapis = require('googleapis');
var fs = require('fs');
var walk = require('walk');
var mime = require('mime');

var chalk = require('chalk');
var figures = require('figures');
var spinner = require('char-spinner');

module.exports = function(serviceAccountEmail, pathToKeyFile, folderPath,
  folderName) {

  var drive = googleapis.drive('v2');
  var scope = ['https://www.googleapis.com/auth/drive'];

  var jwt = new googleapis.auth.JWT(
    serviceAccountEmail,
    pathToKeyFile,
    null,
    scope
  );

  var time = new Date().getTime();

  var log = function() {
    var args = Array.prototype.slice.call(arguments);
    var newTime = new Date().getTime();
    args.push(chalk.bgBlue('+' + (newTime - time) + 'ms'));

    time = newTime;

    console.log.apply(console, args);
  };

  var logSuccess = function(text) {
    log(text, figures.tick);
  };

  var logError = function(text) {
    log(chalk.red(text, figures.cross));
  };

  var folderExists = function() {
    return new Promise(function(resolve, reject) {
      fs.exists(folderPath, function(exists) {
        if (!exists) reject('Folder not exists');

        resolve();
      });
    });
  };

  var authorize = function() {
    return new Promise(function(resolve, reject) {
      jwt.authorize(function(err, tokens) {
        if (err) return reject(err);

        jwt.credentials = tokens;

        logSuccess('Authorized');

        resolve();
      });
    });
  };

  var deleteFolder = function(id) {
    return new Promise(function(resolve, reject) {
      drive.files.delete({ auth: jwt, fileId: id }, function(err) {
        if (err) return reject(err);

        logSuccess('Folder deleted');

        resolve();
      });
    });
  };

  var folderExistsOnGD = function() {
    return new Promise(function(resolve, reject) {

      drive.files.list({
        auth: jwt,
        q: 'title = "' + folderName + '"' +
           ' and mimeType = "application/vnd.google-apps.folder"',
        fields: 'items/id',
      }, function(err, res) {
        if (err) return reject(err);

        if (res.items.length) {
          console.log('Folder exists');
          return deleteFolder(res.items[0].id).then(resolve, reject);
        }

        resolve();
      });
    });
  };

  var createFolder = function() {
    return new Promise(function(resolve, reject) {
      drive.files.insert({
        auth: jwt,
        resource: {
          mimeType: 'application/vnd.google-apps.folder',
          title: folderName
        }
      }, function(err, res) {
        if (err) return reject(err);

        logSuccess('Folder created');

        resolve(res.id);
      });
    });
  };

  var uploadFolder = function(id) {
    return new Promise(function(resolve, reject) {
      var folderMapper = {};
      var walker = walk.walk(folderPath);

      console.log(chalk.yellow.bold('Start uploading folder', figures.ellipsis));

      folderMapper[folderPath] = id;

      walker.on('directory', function(root, stat, next) {
        drive.files.insert({
          auth: jwt,
          resource: {
            mimeType: 'application/vnd.google-apps.folder',
            title: stat.name,
            parents: [ { id: folderMapper[root] } ]
          }
        }, function(err, res) {
          if (err) return reject(err);

          folderMapper[root + '/' + stat.name] = res.id;

          var prefix = root.replace(folderPath, '');
          console.log('Empty folder created',
            ((prefix) ? (prefix + '/') : '') + stat.name);

          next();
        });
      });

      walker.on('file', function(root, stat, next) {
        var fullPath = root + '/' + stat.name;
        var mimeType = mime.lookup(fullPath);

        drive.files.insert({
          auth: jwt,
          resource: {
            title: stat.name,
            mimeType: mimeType,
            parents: [ { id: folderMapper[root] } ]
          },
          media: {
            mimeType: mimeType,
            body: fs.createReadStream(fullPath)
          },
        }, function(err, resp) {
          if (err) return reject(err);

          var prefix = root.replace(folderPath, '');
          console.log('File uploaded',
            ((prefix) ? (prefix + '/') : '') + stat.name);

          next();
        });
      });

      walker.on('end', function() {

        logSuccess('Uploading done');

        resolve(id);
      });
    });
  };

  var share = function(id) {
    return new Promise(function(resolve, reject) {
      drive.permissions.insert({
        auth: jwt,
        fileId: id,
        resource: {
          type: 'anyone',
          role: 'reader'
        }
      }, function(err, res) {
        if (err) return reject(err);

        logSuccess('Shared');

        resolve(id);
      });
    });
  };

  var spinnerInterval = spinner();

  folderExists()
    .then(authorize)
    .then(folderExistsOnGD)
    .then(createFolder)
    .then(uploadFolder)
    .then(share)
    .then(function(id) {
      clearInterval(spinnerInterval);

      console.log('Your link:',
        chalk.underline('https://www.googledrive.com/host/' + id));
    })
    .catch(function(err) {
      clearInterval(spinnerInterval);

      logError(err);

      process.exit(1);
    });
};
