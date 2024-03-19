const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, { pingInterval: 2000, pingTimeout: 600000, cors: { origins: ["https://shoot-yb.netlify.app", "http://127.0.0.1:5500"] } })
const port = 3005
const cors = {
  origin: ["https://shoot-yb.netlify.app", "http://127.0.0.1:5500"],
  default: "https://shoot-yb.netlify.app"
}
app. get('/', (req, res) => {
	res.redirect("https://shoot-yb.netlify.app");
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/live', (req, res) => {  
  const origin = "https://keepbackendalive.onrender.com/";
  res.header("Access-Control-Allow-Origin", origin); res.setHeader("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
 res.end("hi, i'm live: " + req.body.time);  
})  

setInterval(async () => {
	try {
		const url = 'https://keepbackendalive.onrender.com';
		const response = await fetch(url);
		const body = await response.text();
		console.log(body);
	} catch (error) {
		console.log('Error fetching: ', error);
	}
}, 60000);


app.get('/auth', (req, res) => {
  const origin = cors.origin.includes(req.header('origin').toLowerCase()) ? req.headers.origin : cors.default;
  res.header("Access-Control-Allow-Origin", origin); res.setHeader("Access-Control-Allow-Methods", "GET");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(imagekit.getAuthenticationParameters()));
})

var uniqueRoom = 1000 + Math.round(Math.random() * 1000);
var uniqueUserID = 0;

var timeLimit = 120 * 1000;

const serverSidePlayers = {}
const serverSideGulis = {}
const runningRooms = {}
const roomStartTime = {}
const roomInitTime = {}
const maxH = {}
const maxW = {}
const userMap = {}
const roomUserIDs = {}
const dummyPlayers = {}
const botRooms = {}
const bot1 = {}
const bot2 = {}
const roomCreator = {}

const RADIUS = 30
const GuliId = {}

io.on('connection', (socket) => {

  console.log("new connection: ", socket.id);
  uniqueUserID += Math.random()*100 + 1;
  socket.emit ("setUserID", uniqueUserID);
  var userID=uniqueUserID;
  var room = 0;
  var gotStartRequest = false;
  var toldToRequest = false;
  var botMode = false;

  socket.on("requestView", ({ roomName, width, height, ratio }) => {

    console.log("request to view: ", roomName);
    if (!runningRooms[roomName] || room!=0) {
      socket.emit('invalidRoom');
      return;
    }
    room = roomName;
    socket.join(roomName);
    socket.emit('roomJoinSuccess');
    if (maxW[room]) maxW[room] = Math.max(maxW[room], width / ratio);
    if (maxH[room]) maxH[room] = Math.max(maxH[room], height / ratio);

    if (roomStartTime[room]) {
      socket.emit('initGame');
    }

  })

  socket.on("changeImage", (imageURL) => {

    if (room != 0 && serverSidePlayers[room] && serverSidePlayers[room][socket.id]) {
      serverSidePlayers[room][socket.id].imageURL = imageURL;
    }
  })

  socket.on("requestRoomCode", ({ username, width, height, ratio, imageURL}) => {
    if (room!=0) return;
    uniqueRoom += Math.round(Math.random() * 100) + 1;
    room = String(uniqueRoom);
    socket.join(room);
    roomUserIDs[room] = {};
    dummyPlayers[room] = {};
    roomUserIDs[room][userID] = true;
    userMap[userID] = socket.id;
    runningRooms[room] = 2;
    roomInitTime[room] = Date.now();
    serverSidePlayers[room] = {}
    roomCreator[room] = userID;
    maxW[room] = width / ratio;
    maxH[room] = height / ratio;
    var randomColorHue = 360 * Math.random();
  if (randomColorHue<=300 && randomColorHue>=200) randomColorHue=300+Math.random()*60;
    serverSidePlayers[room][socket.id] = {
      x: width / ratio * Math.random(),
      y: height / ratio * Math.random(),
      color: `hsl(${randomColorHue}, 100%, 60%)`,
      sequenceNumber: 0,
      score: 0,
      username,
      imageURL
    }

    serverSidePlayers[room][socket.id].canvas = {
      width: width / ratio,
      height: height / ratio
    }

    serverSidePlayers[room][socket.id].radius = RADIUS
    socket.emit('playerColor', serverSidePlayers[room][socket.id].color);
    socket.emit('recieveRoomCode', room);
    console.log("room created: ", room);
  })

  socket.on("startRoom", () => {
    if (room == 0 || !serverSidePlayers[room] || !serverSidePlayers[room][socket.id] || gotStartRequest == true || roomCreator[room]!=userID) return;
    gotStartRequest = true;
    GuliId[room] = 0;
    serverSideGulis[room] = {}

    if (runningRooms[room] == 2) {

      async function botconf(botID) {
        var botName = nameList[Math.floor(Math.random() * nameList.length)].toLowerCase() + "BOT";
        var botImage = await uploadForAvatar();
        var randomColorHue = 360 * Math.random();
      if (randomColorHue<=300 && randomColorHue>=200) randomColorHue=300+Math.random()*60;
        serverSidePlayers[room][botID] = {
          x: serverSidePlayers[room][socket.id].canvas.width * Math.random(),
          y: serverSidePlayers[room][socket.id].canvas.height * Math.random(),
          canvas: serverSidePlayers[room][socket.id].canvas,
          color: `hsl(${randomColorHue}, 100%, 60%)`,
          sequenceNumber: 0,
          score: 0,
          username: botName,
          imageURL: botImage,
          radius: RADIUS
        }

        if (!roomStartTime[room]) {
          roomStartTime[room] = Date.now();
          io.to(room).emit('initGame');
        }


        if (serverSidePlayers[room]["bot1"] && serverSidePlayers[room]["bot2"]) { botMode = true; botRooms[room] = userID; }
      }
      sleep(Math.random()*50).then(()=>{botconf("bot1");})
      sleep(Math.random()*50).then(()=>{botconf("bot2");})

    }
    else {
      if (!roomStartTime[room]) {
        roomStartTime[room] = Date.now();
        io.to(room).emit('initGame');
      }

    }
  })

  socket.on("joinRoom", ({ roomName, username, width, height, ratio, imageURL }) => {
    console.log("request to join: ", roomName);
    if (!runningRooms[roomName] || botRooms[roomName] || room!=0) {
      socket.emit('invalidRoom');
      return;
    }

    socket.join(roomName);
    runningRooms[roomName]++;
    room = roomName;
    if (roomUserIDs[room]) roomUserIDs[room][userID] = true;
    userMap[userID] = socket.id;
    if (maxW[room]) maxW[room] = Math.max(maxW[room], width / ratio);
    if (maxH[room]) maxH[room] = Math.max(maxH[room], height / ratio);
    var randomColorHue = 360 * Math.random();
  if (randomColorHue<=300 && randomColorHue>=200) randomColorHue=300+Math.random()*60;
    serverSidePlayers[room][socket.id] = {
      x: width / ratio * Math.random(),
      y: height / ratio * Math.random(),
      color: `hsl(${randomColorHue}, 100%, 60%)`,
      sequenceNumber: 0,
      score: 0,
      username,
      imageURL

    }

    serverSidePlayers[room][socket.id].canvas = {
      width: width / ratio,
      height: height / ratio
    }

    serverSidePlayers[room][socket.id].radius = RADIUS
    socket.emit('playerColor', serverSidePlayers[room][socket.id].color);
    socket.emit('roomJoinSuccess');

    if (roomStartTime[room]) {
      socket.emit('initGame');
    }

  })

  socket.on("rejoinRoom", ({ roomName, width, height, ratio, prevSocketID, prevUserID }) => {
    console.log("request to rejoin: ", roomName);
    if (!runningRooms[roomName] || !userMap[prevUserID] || room!=0 || userMap[prevUserID]!=prevSocketID || !roomUserIDs[roomName] || roomUserIDs[roomName][prevUserID]!=true) {
      socket.emit('invalidRoom');
      return;
    }


    if (serverSidePlayers[roomName][prevSocketID]) {
      serverSidePlayers[roomName][socket.id] = serverSidePlayers[roomName][prevSocketID];
      delete serverSidePlayers[roomName][prevSocketID];
    }
    else if (dummyPlayers[roomName][prevSocketID]) {
      serverSidePlayers[roomName][socket.id] = dummyPlayers[roomName][prevSocketID];
      delete dummyPlayers[roomName][prevSocketID];
    }

    else {
      socket.emit('invalidRoom');
      return;
    }

    if (userMap[userID])delete userMap[userID];
    userMap[prevUserID] = socket.id;
    userID = prevUserID;
    socket.emit ("rejoinSuccess");

    socket.join(roomName);
    room = roomName;
    runningRooms[room]++;
    if (maxW[room]) maxW[room] = Math.max(maxW[room], width / ratio);
    if (maxH[room]) maxH[room] = Math.max(maxH[room], height / ratio);
    serverSidePlayers[room][socket.id].canvas = {
      width: width / ratio,
      height: height / ratio
    }
    socket.emit('playerColor', serverSidePlayers[room][socket.id].color);
    if (roomStartTime[room]) {
      socket.emit('initGame');
    }

  })

  socket.on('shoot', ({ x, y, angle }) => {
    if (room === 0 || !serverSideGulis[room]) return;

    shootFunction(room, socket.id, x, y, angle);

  })

  socket.on('changeFrame', ({ width, height, ratio }) => {
    console.log("frame changed for ", socket.id);
    if (room === 0 || !serverSidePlayers[room]) return;
    if (serverSidePlayers[room][socket.id]) {
      serverSidePlayers[room][socket.id].x = width / ratio * Math.random();
      serverSidePlayers[room][socket.id].y = height / ratio * Math.random();

      serverSidePlayers[room][socket.id].canvas = {
        width: width / ratio,
        height: height / ratio
      }

      if (botMode == true || botRooms[room]) {
        serverSidePlayers[room]["bot1"].x = width / ratio * Math.random();
        serverSidePlayers[room]["bot1"].y = height / ratio * Math.random();
        serverSidePlayers[room]["bot2"].x = width / ratio * Math.random();
        serverSidePlayers[room]["bot2"].y = height / ratio * Math.random();
        serverSidePlayers[room]["bot1"].canvas = serverSidePlayers[room][socket.id].canvas;
        serverSidePlayers[room]["bot2"].canvas = serverSidePlayers[room][socket.id].canvas;
      }
    }
    if (maxW[room]) maxW[room] = Math.max(maxW[room], width / ratio);
    if (maxH[room]) maxH[room] = Math.max(maxH[room], height / ratio);

  })

  socket.on("ping", (sendTimeID) => {
    socket.emit("pong", sendTimeID);
  })

  socket.on('disconnect', (reason) => {
    if (room != 0 && serverSidePlayers[room] && serverSidePlayers[room][socket.id]) {
      runningRooms[room]--;
      if (serverSidePlayers[room][socket.id].score == 0 && !botRooms[room]) {
        dummyPlayers[room][socket.id] = serverSidePlayers[room][socket.id];
        delete serverSidePlayers[room][socket.id];
      }
    }

    console.log(socket.id, reason);
    room = 0;
  })

  socket.on('move', ({ angle, sequenceNumber }) => {
    if (room == 0 || !serverSidePlayers[room] || !serverSidePlayers[room][socket.id]) return
    const serverSidePlayer = serverSidePlayers[room][socket.id]

    serverSidePlayers[room][socket.id].sequenceNumber = sequenceNumber
    moveFunction(angle, room, socket.id);
  })

})

setInterval(() => {

  for (const room in runningRooms) {

    if ((roomStartTime[room] && Date.now() - roomStartTime[room] - 1500 >= timeLimit) || (Date.now() - roomInitTime[room] >= 3600000 && !roomStartTime[room])) {
      io.to(room).emit('closeGame');
      delete serverSidePlayers[room];
      delete serverSideGulis[room];
      delete roomStartTime[room];
      delete runningRooms[room];
      delete maxW[room];
      delete maxH[room];
      delete roomInitTime[room];
      for (const userID in roomUserIDs[room]) {
        delete userMap[userID];
      }
      delete roomUserIDs[room];
      delete dummyPlayers[room];
      delete botRooms[room];
      delete roomCreator[room];

    }

  }

  for (const room in botRooms) {
    moveFunction(bot1["mv"], room, "bot1");
    moveFunction(bot2["mv"], room, "bot2");
  }

  for (const room in runningRooms) {

    for (const id in serverSideGulis[room]) {
      serverSideGulis[room][id].x += serverSideGulis[room][id].velocity.x
      serverSideGulis[room][id].y += serverSideGulis[room][id].velocity.y

      const Guli_RADIUS = 5
      if (
        serverSideGulis[room][id].x - Guli_RADIUS >=
        maxW[room] ||
        serverSideGulis[room][id].x + Guli_RADIUS <= 0 ||
        serverSideGulis[room][id].y - Guli_RADIUS >=
        maxH[room] ||
        serverSideGulis[room][id].y + Guli_RADIUS <= 0
      ) {
        delete serverSideGulis[room][id]
        continue
      }

      for (const playerId in serverSidePlayers[room]) {
        const serverSidePlayer = serverSidePlayers[room][playerId]

        const DISTANCE = Math.hypot(
          serverSideGulis[room][id].x - serverSidePlayer.x,
          serverSideGulis[room][id].y - serverSidePlayer.y
        )

        // collision detection
        if (
          DISTANCE < Guli_RADIUS + serverSidePlayer.radius &&
          serverSideGulis[room][id].playerId !== playerId
        ) {
          if (serverSidePlayers[room][serverSideGulis[room][id].playerId])
            serverSidePlayers[room][serverSideGulis[room][id].playerId].score++

          delete serverSideGulis[room][id]
          break
        }
      }
    }

    io.to(room).emit('updateGulis', serverSideGulis[room])
    io.to(room).emit('updatePlayers', serverSidePlayers[room])
  }
}, 15)

setInterval(() => {

  for (const room in runningRooms) {
    if (!roomStartTime[room] || (Date.now() - roomStartTime[room] - 1500) >= timeLimit) {
      continue;
    }

    var elapsed = Date.now() - roomStartTime[room] - 1500;
    var rem = Math.max(timeLimit - elapsed, 0);

    var second = Math.floor(rem / 1000);
    var min = Math.floor(second / 60);
    second -= min * 60;

    io.to(room).emit('remainingTime', { min, second });

  }
}, 500)

server.listen(port, () => {
  console.log(`App listening on port ${port}`)
})

console.log('server did load')

require('dotenv').config();
const ImageKit = require("imagekit");
var imagekit = new ImageKit({
  publicKey: "public_wqJSbY8kM/koZvHg41fLVl40LqY=",
  privateKey: `${process.env.PRIV_KEY}`,
  urlEndpoint: "https://ik.imagekit.io/shootyourbuddy/"
});

const child_process = require('child_process');


function initBOT() {
  if (`${process.env.BOT_ENV}` == "CPP") {
    run_script("./a", ["1000", "200", "45"], function (exit_code) {
      console.log('bot program exit code: ' + exit_code);
    });
  }
else{
  const moveFrames = Math.floor(1000 / 15);
  const angleDilemma = 45;
  var cntMove = 0;
  var moveAngle1 = (Math.random() * 360);
  var moveAngle2 = (Math.random() * 360);
  var moveAngleNext1 = (Math.random() * 360);
  var moveAngleNext2 = (Math.random() * 360);
  setInterval(() => {
    cntMove++;
    if (cntMove == moveFrames) {
      cntMove = 0;
      moveAngle1 = moveAngleNext1;
      moveAngleNext1 = (Math.random() * 360) + (45 * (Math.random() * 8));
      moveAngle2 = moveAngleNext2;
      moveAngleNext2 = (Math.random() * 360) + (45 * (Math.random() * 8));
    }
    bot1["mv"] = Math.floor(moveAngle1);
    bot2["mv"] = Math.floor(moveAngle2);
  }, 15)
  setInterval(() => {
    bot1["sh"] = Math.floor(Math.random() * angleDilemma * (Math.floor(Math.random() * 10) % 2 == 1 ? 1 : -1));
    bot2["sh"] = Math.floor(Math.random() * angleDilemma * (Math.floor(Math.random() * 10) % 2 == 1 ? 1 : -1));
  }, 200)
}
}

function run_script(command, args, callback) {

  var child = child_process.spawn(command, args);

  // child.stdout.setEncoding('utf8');
  child.stdout.on('data', function (output) {

    var datas = output.toString().split("\n");
    for (const data of datas) {
      if (data == "") continue;
      if (data.startsWith('mv')) {
        miniDatas = data.slice(2).split(' ');
        bot1["mv"] = parseInt(miniDatas[0]);
        bot2["mv"] = parseInt(miniDatas[1]);
      }
      else {
        miniDatas = data.slice(2).split(' ');
        bot1["sh"] = parseInt(miniDatas[0]);
        bot2["sh"] = parseInt(miniDatas[1]);
      }
    }

  });

  child.on('close', function (code) {
    callback(code);
  });
}


var nameList = ["TANVIR",
  "UDAY",
  "ARIF",
  "DELWAR",
  "SAKIB",
  "TANZIM",
  "ASHIK",
  "SAKIN",
  "LIMON",
  "DIPU",
  "ABID",
  "SAMIN",
  "PARTHA",
  "ANKON",
  "MEHEDI",
  "FAIYAZ",
  "ADIL",
  "TASIN",
  "RAKIB",
  "SOCCHO",
  "TANIM",
  "SUMON",
  "EBRATUL",
  "HUDA",
  "AKASH",
  "SHAFI",
  "MEHRAB",
  "GALIB",
  "JOY",
  "PRITOM",
  "KAMRUL",
  "THOWFIQ",
  "PRANTO",
  "SAYEED",
  "SAIF",
  "SIYAM",
  "FARDIN",
  "ZIHAN",
  "NAYEM",
  "MASUM",
  "HASAN",
  "HASHEM",
  "SHIMANTO",
  "SHANTO",
  "OMI",
  "ALVE",
  "FORHAD",
  "SHUVO",
  "SHAMIM",
  "RUPAK",
  "FAHIM",
  "RASEL",
  "RAZ",
  "AIAS",
  "TUHIN",
  "SHARIF",
  "SAYEM",
  "NILOY",
  "SHOUROV",
  "MAMUN",
  "IFTI",
  "MOSTAKIM",
  "TOWHED",
  "MAHDI",
  "SANTOSH",
  "IFTEKHER",
  "SOUROV",
  "AJOY",
  "JAWAD",
  "HRIDOY",
  "MILON",
  "SAGOR",
  "AKIF",
  "TAWKIR",
  "RANA",
  "TOIYOB",
  "FAHMID"]



function moveFunction(angle, room, id) {
  if (!serverSidePlayers[room] || !serverSidePlayers[room][id]) return;

  serverSidePlayers[room][id].x += 1.5 * Math.cos(angle * Math.PI / 180);
  serverSidePlayers[room][id].y += 1.5 * Math.sin(angle * Math.PI / 180);
  const serverSidePlayer = serverSidePlayers[room][id];
  const playerSides = {
    left: serverSidePlayer.x - serverSidePlayer.radius,
    right: serverSidePlayer.x + serverSidePlayer.radius,
    top: serverSidePlayer.y - serverSidePlayer.radius,
    bottom: serverSidePlayer.y + serverSidePlayer.radius
  }

  if (playerSides.left < 0) serverSidePlayers[room][id].x = serverSidePlayer.radius;

  if (playerSides.right > serverSidePlayers[room][id].canvas.width)
    serverSidePlayers[room][id].x = serverSidePlayers[room][id].canvas.width - serverSidePlayer.radius;

  if (playerSides.top < 0) serverSidePlayers[room][id].y = serverSidePlayer.radius;

  if (playerSides.bottom > serverSidePlayers[room][id].canvas.height)
    serverSidePlayers[room][id].y = serverSidePlayers[room][id].canvas.height - serverSidePlayer.radius;

}



function shootFunction(room, ID, x, y, angle) {
  GuliId[room]++;
  const velocity = {
    x: Math.cos(angle * Math.PI / 180) * 5,
    y: Math.sin(angle * Math.PI / 180) * 5
  }

  serverSideGulis[room][GuliId[room]] = {
    x,
    y,
    velocity,
    playerId: ID
  }
}


function uploadForAvatar() {
  return new Promise((resolve) => {
    imagekit.upload({
      file: "https://avatar.iran.liara.run/public/boy",
      fileName: "bot"
    }, function (error, result) {
      if (error) resolve("avatar");
      else resolve(result.name);
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


setInterval(() => {
  for (const room in botRooms) {
    if (!botRooms[room]) continue;
    var socketID = userMap[botRooms[room]];
    if (!serverSidePlayers[room][socketID]) {return;}

    for (const botID of ["bot1", "bot2"]) {
      var dy = (serverSidePlayers[room][socketID].y - serverSidePlayers[room][botID].y);
      var dx = (serverSidePlayers[room][socketID].x - serverSidePlayers[room][botID].x);
      var angle = Math.atan(dy / dx);
      angle *= 180 / Math.PI;
      if (dx < 0) angle += 180;
      else if (dy < 0) angle += 360;
      angle = Math.floor(angle);
      var add = (botID == "bot1" ? bot1["sh"] : bot2["sh"]);
      shootFunction(room, botID, serverSidePlayers[room][botID].x, serverSidePlayers[room][botID].y, angle + add);
    }
  }
}, 200)
initBOT();
