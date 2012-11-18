var net = require("net");
var util = require("util");
var EventEmitter = require("events").EventEmitter;

exports.createServer = function(vfs, socket, handler) {
    
    var server = new Server(vfs);
    server.on("command", function(command) {
        var res = {
            send: function(json) {
                server.reply(command, json);
            }
        };
        handler(command.json, res);
    });
    
    return server;
};
function Server(vfs) {
    this.vfs = vfs;
}

util.inherits(Server, EventEmitter);

(function() {
    
    this.listen = function(socket, callback) {
        var self = this;
        var vfs = this.vfs;
        vfs.extend("shell-interop", {file: __dirname + "/server-extend.js"}, function(err, meta) {
            if (err) return self.emit(err);
            
            self.api = meta.api;
            self.api.listen(socket, { }, function(err, meta) {
                callback && callback();
            });

            vfs.on("shell-interop.connect", function(id) {
                vfs.once("shell-interop.command." + id, function(command) {
                    self.emit("command", {
                        id: id,
                        json: command
                    });
                });
                
                self.api.handshake(id, {}, function() {});
            });
        });
    };
    
    this.respond = function(req, res) {
        this.api.reply(req.id, res);
    };
    
}).call(Server.prototype);


    
exports.Client = function Client(socket) {
    this.socket = socket;
    
    this.command = function(json, callback) {
        var req = new Request(this.socket);
        req.once("connect", function() {
            req.send(json);
            req.on("error", function(err) {
                callback(err);
            });
            req.once("response", function(data) {
                callback(null, data);
            });
        });
    };
}

function Request(socket) {
    var self = this;
    
    var client = this.client = net.createConnection(socket);
    
    var received = "";
    var connected = false;
    client.setEncoding("utf8");
    client.on("data", function(data) {
        received += data;
        var lines = data.split("\n\n");
        data = lines.pop();
        if (!connected) {
            if (lines[0]) {
                var line = lines.shift();
                client.write(line + "\n\n");
                self.emit("connect");
            }
            connected = true;
        }
        
        if (connected) {
            lines.forEach(function(line) {
                var json;
                try {
                    json = JSON.parse(line);
                } catch(e) {
                    return self.emit("error", new Error("Could not parse response: " + line));
                }
                self.emit("response", json);
                client.end();
            });
        }
    });
    
}

util.inherits(Request, EventEmitter);

(function() {
    
    this.send = function(command) {
        this.client.write(JSON.stringify(command).replace(/\n+/g, "\n") + "\n\n");
    };
    
}).call(Request.prototype);