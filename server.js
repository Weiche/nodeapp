var PORT = 443;
var SSL_KEY = '/root/server.key';
var SSL_CERT = '/root/server.crt';

var fs = require('fs');
var http = require('http');
var https = require('https');
var exec = require('child_process').exec;
var url = require("url");

var options = {
    key: fs.readFileSync(SSL_KEY),
    cert: fs.readFileSync(SSL_CERT)
};
var page = [];
var Cache = [];
Cache['chatroom.html'] = fs.readFileSync('chatroom.html');
Cache['socket.io.js'] = fs.readFileSync('/home/nodeapp/node_modules/socket.io/node_modules/socket.io-client/dist/socket.io.min.js');
page['/socketiojs'] = function (request, response) {
    response.writeHead(200, {
        "Content-Type": "text/javascript"
    });
    response.end(Cache['socket.io.js']);

}
page['/page1'] = function (request, response) {
    response.writeHead(200, {
        "Content-Type": "text/plain"
    });
    response.write("This is page 1");
    response.end();

}
page['/page2'] = function (request, response) {
    response.writeHead(200, {
        "Content-Type": "text/plain"
    });
    response.write("This is page 2");
    response.end();

}
page['404'] = function (request, response) {
    response.writeHead(404, {
        "Content-Type": "text/plain"
    });
    response.write("404 Page Not Found");
    response.end();

}
page['/chat'] = function (request, response) {
    response.writeHead(200);
    response.end(Cache['chatroom.html']);

}
page['/'] = function (req, res) {
    res.writeHead(200);
    var output = fs.readFileSync('./index.html', 'utf8');
    res.end(output);
}
page['/GPIO'] = function (req, res) {
    res.writeHead(200);
    res.end(fs.readFileSync('./gpio_controll.html'));
}

function start() {
    function onRequest(request, response) {
        var pathname = url.parse(request.url).pathname;
        console.log("Request for " + pathname + " received.");
        if (typeof page[pathname] === 'function') {
            page[pathname](request, response);
        } else {
            console.log("404 for " + pathname);
            page['404'](request, response);
        }

    }

    http.createServer(onRequest).listen(8888);
    console.log("Server has started.");
}

start();

var server = https.createServer(options, function onRequest(request, response) {
    var pathname = url.parse(request.url).pathname;
    console.log("Request for " + pathname + " received.");
    if (typeof page[pathname] === 'function') {
        page[pathname](request, response);
    } else {
        console.log("404 for " + pathname);
        page['404'](request, response);
    }

}).listen(443);

var io = require('socket.io').listen(server);

io.enable('browser client minification');
io.set('log level', 3);
var Chat_User_List = new Object();
var Count = 0;
Chat_User_List.Members = [];
Chat_User_List.Num = 1;

io.sockets.on('connection', function (socket) {

    socket.broadcast.emit('message', 'Broadcast.emit is for everyone eccept himself');
    socket.emit('message', 'Emit is for everyone');
    socket.on('disconnect', function () {
        socket.broadcast.emit('message', 'disconnected');
    });
    socket.on('private message', function (from, msg) {
        console.log('I received a private message by ', from, ' saying ', msg);
        io.sockets.socket(socket.id).emit('message', 'You send me ' + msg);

    });

    function Chat_Member(socket, name) {
        this.socket = socket;
        this.name = name;
    }

    socket.on('Chat_New', function (username) {
        if (!username) {
            Chat_User_List.Num++;
            username = 'Guest' + (Chat_User_List.Num);

        }
        Chat_User_List.Members[username] = new Chat_Member(io.sockets.socket(socket.id), username);
        io.sockets.emit('Chat_Public', username + " Enter the room");
    });
    socket.on('Chat_Public', function (user, text) {
        io.sockets.emit('Chat_Public', user + ': ' + text);
    });
    socket.on('Chat_Private', function (user, target, text) {
        io.sockets.socket(target).emit('Chat_Public', user + ' wisp to you:' + text);
    });
    socket.on('Chat_User_List', function () {

    });
    socket.on('Req_GPIO_Readall', function () {
        console.log('GPIO_Info requested');
        exec("gpio readall", function (err, stdout, stderr) {
            io.sockets.socket(socket.id).emit('Res_GPIO_Readall', stdout);

        });

    });
    socket.on("Req_Fan_fullspeed", function () {
        console.log('GPIO_Info requested ');
        exec("gpio pwm 1 1023", function (err, stdout, stderr) {


        });

    })
    socket.on("Req_Fan_off", function () {
        console.log('GPIO_Info requested ');
        exec("gpio pwm 1 0", function (err, stdout, stderr) {


        });

    })
});

var Counter = 0;
setInterval(function () {
    exec("uptime", function (err, stdout, stderr) {
        io.sockets.emit('system info', stdout);

    });
}, 50000);