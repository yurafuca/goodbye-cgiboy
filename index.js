var fs = require("fs");
var server = require("http").createServer(function(req, res) {
     res.writeHead(200, {"Content-Type":"text/html"});
     var output = fs.readFileSync("./index.html", "utf-8");
     res.end(output);
}).listen(8080);
var io = require("socket.io").listen(server);

var userHash = {};

io.sockets.on("connection", function (socket) {

  socket.on("connected", function (name) {
    var message = name + " が入室しました";
    userHash[socket.id] = name;
    io.sockets.emit("publish", { message: message });
  });

  socket.on("publish", function (data) {
    io.sockets.emit("publish", { message: data.message, name: data.name, size: data.size });
  });

  socket.on("disconnect", function () {
    if (userHash[socket.id]) {
      var message = userHash[socket.id] + " さんが退出しました";
      delete userHash[socket.id];
      io.sockets.emit("publish", { message: message });
    }
  });
});
