$( document ).ready(function () {
    var socket = io.connect('http://localhost:3000');
    var me;
    var players_list = [];
    var players_data = {};

    // when receive username from server, the game can be started
    socket.on('playerCreated', function(myName){
        me = myName;
        startGame();
    });


	var canvas_width = $('#gameCanvas').get(0).width;
	var canvas_height = $('#gameCanvas').get(0).height;
	var canvas = $('#gameCanvas').get(0).getContext("2d");
	var FPS = 40;
	
	var map = {
		color 		: 'white',
		x 			: 100,
		y			: 400,
		width		: 800,
		height		: 3,
		draw		: function(){
			canvas.fillStyle = this.color;
			canvas.fillRect(this.x, this.y, this.width, this.height);
		}
	};
	

	// Player constructor
	var Player = function( x, y ){
		this.color 		= 'green',
		this.x 			= x,
		this.y			= y,
		this.growthRate	= 0.2,
		this.width		= 50,
		this.height		= 50,
		this.health		= 100,
		this.maxHealth	= 100,
		this.barWidth 	= 50,
		this.barHeight 	= 5,
		this.isEnemy = function(player_name){
			return (player_name != me);
		},
		this.touchesEnemy = function(enemy){
			var distance = this.x - (enemy.x + enemy.width); // my left x - enemy's right x
			return ((distance >= -1 * (this.width + enemy.width)) && (distance <= 0))
		},
		this.attack = function(){
			for (var i = 0; i < players_list.length; i++){
				player_name = players_list[i];
				player_data = players_data[player_name];
				if (this.isEnemy(player_name) && this.touchesEnemy(player_data)){
					player_data.health -= 4;
					socket.emit('update', {'name': player_name, 'data': player_data});
				}
			}
		},
		this.absorb = function(){
			for (var i = 0; i < players_list.length; i++){
				player_name = players_list[i];
				player_data = players_data[player_name];
				if (this.isEnemy(player_name) && this.touchesEnemy(player_data)){
					// decrease enemy size & health
					player_data.health -= 1;
					player_data.width -= this.growthRate;
					player_data.height -= this.growthRate;
					player_data.y += this.growthRate;
					player_data.barWidth -= this.growthRate;
					socket.emit('update', {'name': player_name, 'data': player_data});

					// increase my size
					this.width += this.growthRate;
					this.height += this.growthRate;
					this.y -= this.growthRate;
					this.barWidth += this.growthRate;
					socket.emit('update', {'name': me, 'data': myPlayer});
					
				}
			}
		}
	};
	
	// initiate myself
	var myPlayer = new Player( 150, 350 );

	var detectKeys = function(){
		var speed = 7;
		$(document).keydown(function(e){
			if (e.which == 37){
				myPlayer.x -= speed;
			}
			if (e.which == 39){
				myPlayer.x += speed;
			}
			if (e.which == 88){ // press "x" to attack
				myPlayer.attack();
			}
			if (e.which == 67){ // press "c" to absorb
				myPlayer.absorb();
			}
			socket.emit('update', {'name': me, 'data': myPlayer});
		});
	};
	detectKeys();
	
	
	var drawEnvironment = function(){
		canvas.clearRect(0, 0, canvas_width, canvas_height);
		map.draw();
	};

	var drawPlayers = function(){
		$.each(players_data, function(player_name, player_data) {

			var percentageHealth = player_data.health / player_data.maxHealth; // percentage health
			percentageHealth = (percentageHealth >= 0) ? percentageHealth : 0; // minimum hp caps at 0
			// draw player
			canvas.fillStyle = player_data.color;
			canvas.fillRect(player_data.x, player_data.y, player_data.width, player_data.height);
			// draw hp text
			var hpText = Math.round(100 * percentageHealth).toString() + '%';
			canvas.font = '16pt Myriad Pro';
			canvas.fillStyle = 'white';
			var hpTextWidth = canvas.measureText(hpText).width;
			var hpText_x = player_data.x - (hpTextWidth - player_data.width) / 2;
			canvas.fillText(hpText, hpText_x, map.y + 44);
			// draw name
			canvas.fillStyle = 'white';
			canvas.font = '12pt Myriad Pro';
			var textWidth = canvas.measureText(player_name).width;
			var text_x = player_data.x - (textWidth - player_data.width) / 2;
			canvas.fillText(player_name, text_x, map.y + 22);
			// draw hp bar
			var barWidth = this.barWidth; // bar max width
			var barHeight = this.barHeight;
			var greenBarWidth = percentageHealth * barWidth; // green bar width
			canvas.fillStyle = '#FF0000'; // red
			canvas.fillRect(player_data.x, player_data.y - 10, barWidth, barHeight);
			canvas.fillStyle = '#00FF00'; // green
			canvas.fillRect(player_data.x, player_data.y - 10, greenBarWidth, barHeight);

		});
	};

	// when any player perform an action, updates will be pushed to the server,
	// which in turn will fetch these updated data to us, then we update our local 
	// data accordingly
	socket.on('fetchUpdate', function(gameData){
		players_list = gameData.players_list;
		players_data = gameData.players_data;

		myData = gameData.players_data[me];
		if (typeof myData !== 'undefined'){
			$.each(myData, function(key, value){
				myPlayer[key] = value;
			});
		}
	});

	// when game is ready, we first send our player object to the server,
	// then we draw players according to local data
	var startGame = function(){
		socket.emit('update', {'name': me, 'data': myPlayer});
		setInterval(function(){
		    drawEnvironment();
		    drawPlayers();
		}, 1000/FPS);
	};



});