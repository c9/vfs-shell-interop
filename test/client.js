#!/usr/bin/env node

"use strict";

var path = require("path");
var Client = require("../interop").Client;

var client = new Client(path.join(process.env.HOME, "/tmp/vfs.sock"));
client.command({"juhu": 1}, function(err, res) {
    console.log("RES", res);
    client.command({"kinners": "123\n\n\n\ndüper"}, function(err, res) {
        console.log("RES2", res);
    });
});