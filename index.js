'use strict';

var googleapis = require('googleapis');
var fs = require('fs');
var walk = require('walk');
var mime = require('mime');

var drive = googleapis.drive('v2');

var SERVICE_ACCOUNT_EMAIL = '525918832864-8om6ltm23s2ep4l5qlqorsnm8cu7l16q@developer.gserviceaccount.com';
var SERVICE_ACCOUNT_KEY_FILE = './key.pem';
var SCOPE = ['https://www.googleapis.com/auth/drive'];

var folderName = 'test';
var folderPath = '/Users/butuzgol/Downloads/html5-boilerplate_v5.1.0';

var jwt = new googleapis.auth.JWT(
  SERVICE_ACCOUNT_EMAIL,
  SERVICE_ACCOUNT_KEY_FILE,
  null,
  SCOPE
);

var authorize = function() {
  return new Promise(function(resolve, reject) {
    jwt.authorize(function(err, tokens) {
      if (err) return reject(err);

      jwt.credentials = tokens;

      resolve();
    });
  });
};

var deleteFolder = function(id) {
  return new Promise(function(resolve, reject) {
    drive.files.delete({ auth: jwt, fileId: id }, function(err) {
      if (err) return reject(err);

      resolve();
    });
  });
};

var checkIfFolderExists = function() {
  return new Promise(function(resolve, reject) {

    drive.files.list({
      auth: jwt,
      q: 'title = "' + folderName + '"' +
         ' and mimeType = "application/vnd.google-apps.folder"',
      fields: 'items/id',
    }, function(err, res) {
      if (err) return reject(err);

      if (res.items.length)
        return deleteFolder(res.items[0].id).then(resolve, reject);

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

      resolve(res.id);
    });
  });
};

var uploadFolder = function(id) {
  return new Promise(function(resolve, reject) {
    var folderMapper = {};
    var walker = walk.walk(folderPath);

    folderMapper[folderPath] = id;

    walker.on("directory", function(root, folderStat, next) {
      drive.files.insert({
        auth: jwt,
        resource: {
          mimeType: 'application/vnd.google-apps.folder',
          title: folderStat.name,
          parents: [ { id: folderMapper[root] } ]
        }
      }, function(err, res) {
        if (err) return reject(err);

        folderMapper[root + '/' + folderStat.name] = res.id;

        next();
      });
    });

    walker.on("file", function(root, fileStat, next) {
      var fullPath = root + '/' + fileStat.name;
      var mimeType = mime.lookup(fullPath);

      drive.files.insert({
        auth: jwt,
        resource: {
          title: fileStat.name,
          mimeType: mimeType,
          parents: [ { id: folderMapper[root] } ]
        },
        media: {
          mimeType: mimeType,
          body: fs.createReadStream(fullPath)
        },
      }, function(err, resp) {
        if (err) return reject(err);

        next();
      });
    });

    walker.on("end", function () {
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

      resolve(id);
    });
  });
};

authorize()
  .then(checkIfFolderExists)
  .then(createFolder)
  .then(uploadFolder)
  .then(share)
  .then(function(id) {
    console.log('Your link: https://www.googledrive.com/host/' + id);
  })
  .catch(function(err) {
    console.log(err);
  });
