'use strict';

var googleapis = require('googleapis');
var fs = require('fs');
var walk = require('walk');
var mime = require('mime');

var chalk = require('chalk');
var figures = require('figures');
var spinner = require('char-spinner');

module.exports = function(serviceAccountEmail, pathToKeyFile,
  folderPath, folderName, subFolderName) {

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

  var projectFolderExists = function() {
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
      drive.files.delete({
        auth: jwt,
        fileId: id
      }, function(err) {
        if (err) return reject(err);

        logSuccess('Folder deleted ' + id);

        resolve();
      });
    });
  };

  var createFolder = function(name, parentId) {
    return new Promise(function(resolve, reject) {
      drive.files.insert({
        auth: jwt,
        resource: {
          mimeType: 'application/vnd.google-apps.folder',
          title: name,
          parents: (parentId) ? [ { id: parentId } ] : null
        }
      }, function(err, res) {
        if (err) return reject(err);

        logSuccess('Folder created ' + name + ' ' + res.id);

        resolve(res.id);
      });
    });
  };

  var folderExists = function(name, parentId) {
    return new Promise(function(resolve, reject) {
      var q = 'title = "' + name + '"' +
        ' and "' + ((parentId) ? parentId : 'root') + '" in parents' +
        ' and mimeType = "application/vnd.google-apps.folder"';

      drive.files.list({
        auth: jwt,
        q: q,
        fields: 'items/id'
      }, function(err, res) {
        if (err) return reject(err);

        if (res.items.length) {
          console.log('Folder exists %s', name);
          resolve(res.items[0].id);
        } else {
          console.log('Folder not exists %s', name);
          resolve(null);
        }
      });
    });
  };

  var handleFolder = function() {
    return new Promise(function(resolve, reject) {
      folderExists(folderName)
        .then(function(id) {
          if (id) {
            if (!subFolderName) return deleteFolder(id);
            else return id;
          }

          return null;
        })
        .then(function(id) {
          if (id) return id;

          return createFolder(folderName);
        })
        .then(function(id) {
          if (!subFolderName) return resolve(id);

          return folderExists(subFolderName, id)
            .then(function(id) {
              if (id) return deleteFolder(id);
            })
            .then(function() {
              return createFolder(subFolderName, id);
            })
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
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

  projectFolderExists()
    .then(authorize)
    .then(handleFolder)
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
