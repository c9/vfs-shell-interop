"use strict";

var net = require("net");

// listen on port
// connect as sender


module.exports = function (vfs, register) {
    
    var ID=1;
    var connections = {};
    
    function listen(socket, options, callback) {

        var server = net.createServer(function(socket) {
            var id = ID++;
            connections[id] = socket;
            vfs.emit("shell-interop.connect", id);
            
            var received = "";
            socket.vfs_connected = false;
            socket.setEncoding("utf8");
            socket.on("data", function(data) {
                received += data;
                var lines = data.split("\n\n");
                data = lines.pop();
                
                if (!socket.vfs_connected) {
                    if (lines[0]) {
                        var line = lines.shift();
                        if (line !== "HANDSHAKE" + id) {
                            socket.close();
                        } else {
                            socket.vfs_connected = true;
                            vfs.emit("shell-interop.handshake." + id);
                        }
                    }
                }
                
                if (socket.vfs_connected) {
                    lines.forEach(function(line) {
                        var json;
                        try {
                            json = JSON.parse(line);
                        } catch(e) {
                            console.error(new Error("Could not parse command: " + line));
                        }
                        
                        if (json)
                            vfs.emit("shell-interop.command." + id, json);
                    });
                }
            });
        });
        
        server.listen(socket, function() {
            console.log("server listening to", socket);
            callback(null, {});
        });
    }
    
    function handshake(id, options, callback) {
        var socket = connections[id];
        if (!socket)
            return callback(new Error("Unknown connection: " + id));
            
        if (socket.vfs_connected)
            return callback();
            
        socket.write("HANDSHAKE" + id + "\n\n");
        vfs.on("shell-interop.handshake." + id, function listener() {
            vfs.off(listener);
            callback();
        });
    }
    
    function reply(id, options, callback) {
        handshake(id, {}, function(err) {
            if (err) return callback(err);
            
            var socket = connections[id];
            socket.write(JSON.stringify(options).replace(/\n+/g, "\n") + "\n\n");
            callback && callback();
        });
    }
    
    register(null, {
        listen: listen,
        handshake: handshake,
        reply: reply
	});
};