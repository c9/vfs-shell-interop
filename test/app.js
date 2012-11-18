"use strict";

var net = require("net");
var path = require("path");
var localfs = require("vfs-local");
var Consumer = require('vfs-socket/consumer').Consumer;
var Worker = require('vfs-socket/worker').Worker;
var Transport = require('vfs-socket/worker').smith.Transport;

var interop = require("../interop");

function main(vfs) {
    var server = interop.createServer(vfs, function(req, res) {
        console.log("GOT", req);
        res.send({
            antwort: "ist toll\n\n\n123süper"
        });
    });
    server.listen(path.join(process.env.HOME, "/tmp/vfs.sock"));
}

var consumer = new Consumer();
var worker = new Worker(localfs({
    root: "/"
}));

var server = net.createServer(function (socket) {
    worker.connect(new Transport(socket, socket, process.env.TRACE && "worker"), function (err, remote) {
        if (err) throw err;
    });
    worker.on("disconnect", function (err) {
        if (err) throw err;
    });
});

server.listen(function () {
    var port = server.address().port;
    var socket = net.connect(port, function () {
        consumer.connect(new Transport(socket, socket, process.env.TRACE && "consumer"), function (err, remote) {
            if (err) throw err;
            var vfs = remote;
            main(vfs);
        });
        consumer.on("disconnect", function (err) {
            if (err) throw err;
        });
    });
});
