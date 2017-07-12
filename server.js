var fs = require("fs");
var uuid = require('node-uuid');
var server = require("http").createServer(function (req, res) {
  res.writeHead(200, { "Content-Type": "text/html" });
  var output = fs.readFileSync("./index.html", "utf-8");
  res.end(output);
}).listen(3000);
var io = require("socket.io").listen(server);

var aws = require('aws-sdk');
aws.config.loadFromPath('credentials.json');

var dy = new aws.DynamoDB();

var viewerCount = 0;
var userHash = {};

io.sockets.on("connection", function (socket) {
  socket.on("visit", function () {
    viewerCount++;
    var params = {
      TableName: 'goodbye-cgiboy'
    };
    dy.scan(params, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
        io.to(socket.id).emit('visit', data.Items);
      }
    });
  });

  socket.on("connected", function (name, color, message) {
    var params = {
      name: name,
      message: message,
      color: color,
      isSystem: true,
      date: (new Date()).toString()
    };
    userHash[socket.id] = {
      name: name,
      color: color
    };
    io.sockets.emit("publish", params);
    save(params);
  });

  socket.on("publish", function (data) {
    var params = {
      message: data.message,
      name: data.name,
      size: data.size,
      color: data.color,
      date: data.date,
      isSystem: data.isSystem
    };
    io.sockets.emit("publish", params);
    save(params);
  });


  socket.on("leave", function () {
    leave(socket);
  });

  socket.on("disconnect", function () {
    if (viewerCount > 0) {
      viewerCount--;
    }
    leave(socket);
  });

  socket.on("pauling", function () {
    io.sockets.emit("pauling", {
      viewerCount: viewerCount,
      users: userHash
    });
  });
});

function leave(socket) {
  if (userHash[socket.id]) {
    var params = {
      name: userHash[socket.id].name,
      message: "bye．(退室)",
      color: userHash[socket.id].color,
      isSystem: true,
      date: (new Date()).toString()
    };
    delete userHash[socket.id];
    io.sockets.emit("publish", params);
    save(params);
  }
}

// Save the message to DynamoDB.
function save(params) {
  var item = {
    roomName: { S: 'kari' },
    unixTime: { N: (new Date().getTime()).toString() },
    name: { S: params.name },
    message: { S: params.message },
    date: { S: params.date },
    size: { S: params.size || 'normal' },
    color: { S: params.color || 'color1' },
    isSystem: { BOOL: params.isSystem }
  };
  var params = {
    TableName: 'goodbye-cgiboy',
    Item: item
  };
  dy.putItem(params, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log(data);
    }
  });
}
