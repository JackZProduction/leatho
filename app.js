var express = require("express");
var app = express();
var port = 3000;
var io = require('socket.io').listen(app.listen(port));

// remove debug mode
io.set('log level', 1);

// statically fetching public files
app.use (express.static ('./public'));

// routing
app.get('/', function(request, response){
    response.sendfile('public/game.html');
});

clients = {}; // match socket id for each connected client to his username
players_data = {}; // global variable for players' data
players_list = []; // list of players' names

// possible usernames
dictionary = ['Jacob', 'Jack', 'Peter', 'William', 'Christian', 'Bill', 'Obama', 'Shakespears', 'adfads', 'MrAmerica']; 


var getRandomName = function(){
    return (dictionary.pop());
};

var removeFromArray = function(arr, element){
    var index = arr.indexOf(element);
    if (index > -1) {
        arr.splice(index, 1);
    }
};

// socket connection
io.sockets.on('connection', function(socket){
    console.log('someone just got connected to our server');
    
    // upon launching the page, give connected client an username
    username = getRandomName();
    players_list.push(username);    // store this username into an array
    clients[socket.id] = username;  // pair client id with his username
    socket.emit('playerCreated', username);
    console.log('current users: ', players_list);

    // and when client responses back with 'gameReady', we fetch game data to all clients
    io.sockets.emit('fetchUpdate', {'players_list': players_list, 'players_data': players_data});


    // when a player perform an action
    socket.on('update', function(playerObj){

        // update server data for each player
        players_data[playerObj.name] = playerObj.data; 
        
        // then fetch updates to everyone
        io.sockets.emit('fetchUpdate', {'players_list': players_list, 'players_data': players_data});
        
    });


    // when a player disconnects
    socket.on('disconnect', function(){
        player_name = clients[socket.id];
        removeFromArray(players_list, player_name);
        delete players_data[player_name];
        console.log('--------------- deleted: ', player_name, '------ now:', players_data);
        io.sockets.emit('fetchUpdate', {'players_list': players_list, 'players_data': players_data});
    });
    
    
    
});