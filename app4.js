var express = require('express');
//var routes = require('./routes');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser')
var app = express();
app.use(bodyParser.urlencoded({ extended: false}))
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

var httpServer = http.createServer(app).listen(3000, function(req,res){
    console.log('Socket IO server has been started');
});

var io = require('socket.io').listen(httpServer);

var count = 0;
var rooms = [];

app.get('/:room', function(req, res) {
  console.log('room name is :'+req.params.room);
  res.render('index', {room:req.params.room});
});

io.sockets.on('connection', function(socket) {
  socket.on('joinroom', function(data){
    socket.join(data.room);
    var room = data.room;
    var nickname = '손님-'+count;
    socket.room = room; // socket.set
    socket.nickname = nickname;
    socket.emit('changename', {nickname: nickname});

    if(rooms[room] == undefined) {
      console.log('room create : ' + room);
      rooms[room] = new Object();
      rooms[room].socket_ids = new Object();
    }
    rooms[room].socket_ids[nickname] = socket.id;

    data = {msg: nickname + ' 님이 입장하셨습니다.'};
    io.sockets.in(room).emit('broadcast_msg', data);

    io. sockets.in(room).emit('userlist',
      {users: Object.keys(rooms[room].socket_ids)});
    count++;

  });

  socket.on('changename', function(data) {
    var nickname = data.nickname;
    var room = socket.room;
    if(socket.nickname != undefined) {
      delete rooms[room].socket_ids[socket.nickname];
    }
    rooms[room].socket_ids[nickname] = socket.id;
    socket.nickname = nickname;
    data = {msg: nickname + ' 님이 ' + socket.nickname + '으로'
              +' 대화명을 변경 하셨습니다.'}
    io.sockets.in(room).emit('broadcast_msg', data);

    io.sockets.in(room).emit('userlist',
      {users: Object.keys(rooms[room].socket_ids)});
  });

  socket.on('disconnect', function(data) {
    var room = socket.room;
    if(room != undefined && rooms[room] != undefined) {
      var nickname = socket.nickname;
      console.log('nickname ' + nickname + ' has been disconnected');

      if(nickname != undefined) {
        if(rooms[room].socket_ids != undefined
            && rooms[room].socket_ids[nickname] != undefined ){
              delete rooms[room].socket_ids[nickname];
            }
      }
      data = {msg: nickname + ' 님이 나가셨습니다.'};

      io.sockets.in(room).emit('broadcast_msg', data);
      io.sockets.in(room).emit('userlist',
        {users: Object.keys(rooms[room].socket_ids)});
    }
  });

  socket.on('send_msg', function(data) {
    var room = socket.room;
    var nickname = socket.nickname;
    console.log('in send msg room is ' + room);
    data.msg = nickname + ' : ' + data.msg;
    if(data.to == 'ALL') {
      socket.broadcast.to(room).emit('broadcast_msg', data);
    }
    else {
      var socket_id = rooms[room].socket_ids[data.to];
      if(socket_id != undefined) {
        data.msg = '귓속말 :'+ data.msg;
        io.sockets.connected[socket_id].emit('broadcast_msg', data);
      }
    }
    socket.emit('broadcast_msg', data);
  })
})
