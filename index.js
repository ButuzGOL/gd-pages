'use strict';

var googleapis = require('googleapis');
var drive = googleapis.drive('v2');

var folderName = 'test';

var SERVICE_ACCOUNT_EMAIL = '525918832864-8om6ltm23s2ep4l5qlqorsnm8cu7l16q@developer.gserviceaccount.com';
var SERVICE_ACCOUNT_KEY_FILE = './key.pem';
var SCOPE = ['https://www.googleapis.com/auth/drive'];

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

var uploadFiles = function(id) {
  return new Promise(function(resolve, reject) {

    drive.files.insert({
      auth: jwt,
      resource: {
        title: 'index.html',
        mimeType: 'text/html',
        parents: [ { id: id } ]
      },
      media: {
        mimeType: 'text/html',
        body: "<b>Hello World!</b>"
      },
    }, function(err, resp) {
      if (err) return reject(err);

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
  .then(uploadFiles)
  .then(share)
  .then(function(id) {
    console.log('Your link: https://www.googledrive.com/host/' + id);
  })
  .catch(function(err) {
    console.log(err);
  });
