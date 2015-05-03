# Google Drive Pages [![Build Status](https://travis-ci.org/ButuzGOL/gd-pages.svg?branch=master)](https://travis-ci.org/ButuzGOL/gd-pages) [![Join the chat at https://gitter.im/ButuzGOL/gd-pages](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ButuzGOL/gd-pages?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)


Publish your static files to Google Drive server and share  
Inspired by [Host webpages with Drive](https://support.google.com/drive/answer/2881970?hl=en)
## Install

```sh
$ sudo npm install -g gd-pages
```

## Creating a Service Account using the Google Developers Console

1. From the [Google Developers Console](https://cloud.google.com/console), select your project or create a new one.

2. Under "APIs & auth", click "Credentials".

3. Under "OAuth", click the "Create new client ID" button.

4. Select "Service account" as the application type, key type "P12 Key" and click "Create Client ID".

5. The key for your new service account should prompt for download automatically.

6. Go to "APIs" than enable "Drive API" and "Drive SDK"

> Notice: was taken from https://github.com/extrabacon/google-oauth-jwt

## Usage

It waits for 4 parameters:  
1. Service account -> Email address  
2. Path to pem file  
3. Path to folder for upload  
4. Folder name
5. Sub folder (optional) can be useful for example: project-name/dev

```sh
$ gd-pages 525-8om6ltm23s2ep4@developer.gserviceaccount.com ./Test-39c6f.p12 ./dist project
```

```js
var gdPages = require('gd-pages');

gdPages('525-8om6ltm23s2ep4@developer.gserviceaccount.com', './Test-39c6f.p12', './dist', 'project');
```

## License

MIT © [ButuzGOL](https://butuzgol.github.io)
