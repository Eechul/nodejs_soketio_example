var express = require('express');
//var routes = require('./routes');
var http = require('http');
var path = require('path');

var app  = express();
app.use(express.static(path.join(__dirname, 'public')));

var httpServer =http.createServer(app).listen(3000, function(req,res){
    console.log('Socket IO server has been started');
});

var io = require('socket.io').listen(httpServer);

var socket_ids = [];
var count = 0;

function registerUser(socket, nickname) {
  if(socket.nickname != undefined) delete socket_ids[socket.nickname];
  socket_ids[nickname] = socket.id
  socket.nickname = nickname;
  io.sockets.emit('userlist', {users:Object.keys(socket_ids)});
}

io.sockets.on('connection', function(socket) {
  socket.emit('new', {nickname:'GUEST-'+count,
    msg:'<span style=color:Blue >GUEST-'+count+'</span>님이  입장하셨습니다.'});
  registerUser(socket,'GUEST-'+count);
  count++;

  socket.on('changename', function(data) {
    registerUser(socket, data.nickname);
  });
  socket.on('disconnect', function(data) {
    if(socket.nickname != undefined) {
      delete socket_ids[socket.nickname];
      io.sockets.emit('userlist',{users:Object.keys(socket_ids)});
    }
  });
  socket.on('send_msg', function(data){
    data.msg = socket.nickname +' : '+ data.msg;
    if(data.to == 'ALL') socket.broadcast.emit('broadcast_msg',data);
    else {
      socket_id = socket_ids[data.to];
      if(socket_id != undefined) {
        io.sockets.connected[socket_id].emit('broadcast_msg', data);
      }
    }

    data.msg = `<span style=color:Blue >`+data.msg+`</span>`;
    socket.emit('broadcast_msg', data);
  });
});
