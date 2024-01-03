const host = "https://test001-2e33.onrender.com/"
// const host = "https://localhost:3005/"
const canvas = document.querySelector('#playground')
const c = canvas.getContext('2d')
var roomCode = 0;
var gameRunning = false;
var gameClosed = false;
var myFileName = "avatar";
var myUsername = "";
const socket = io(host,  { path: '/socket.io'});
var currSocketID = -1;
var currUserID = -1;
var redirected = false;
var prevSrc;
var devicePixelRatio = window.devicePixelRatio || 1
canvas.width = innerWidth * devicePixelRatio
canvas.height = innerHeight * devicePixelRatio * (viewer == true ? 1 : 0.65)

c.scale(devicePixelRatio, devicePixelRatio)

var urlPrefix = "https://ik.imagekit.io/shootyourbuddy/tr:w-" + String(devicePixelRatio * 300) + ",h-" + String(devicePixelRatio * 300) + ",fo-face,z-1/";
var urlPrefixSmall = "https://ik.imagekit.io/shootyourbuddy/tr:w-" + String(devicePixelRatio * 60) + ",h-" + String(devicePixelRatio * 60) + ",fo-face,z-1/";

const clientSidePlayers = {}
const clientSideGulis = {}

socket.on('updateGulis', (serverSideGulis) => {
  for (const id in serverSideGulis) {
    const serverSideGuli = serverSideGulis[id]

    if (!clientSideGulis[id]) {
      clientSideGulis[id] = new Guli({
        x: serverSideGuli.x,
        y: serverSideGuli.y,
        radius: 5,
        color: clientSidePlayers[serverSideGuli.playerId]?.color,
        velocity: serverSideGuli.velocity
      })
    } else {
      clientSideGulis[id].x += serverSideGulis[id].velocity.x
      clientSideGulis[id].y += serverSideGulis[id].velocity.y
    }
  }

  for (const clientSideGuliId in clientSideGulis) {
    if (!serverSideGulis[clientSideGuliId]) {
      delete clientSideGulis[clientSideGuliId]
    }
  }
})

socket.on('updatePlayers', (serverSidePlayers) => {


  for (const id in serverSidePlayers) {
    const serverSidePlayer = serverSidePlayers[id]
    if (!clientSidePlayers[id]) {
      clientSidePlayers[id] = new Player({
        x: serverSidePlayer.x,
        y: serverSidePlayer.y,
        imageURL: serverSidePlayer.imageURL,
        color: serverSidePlayer.color,
        username: serverSidePlayer.username,
        radius: serverSidePlayer.radius
      })

      document.querySelector(
        '#playerLabels'
      ).innerHTML += `<div data-id="${id}" data-score="${serverSidePlayer.score}">${serverSidePlayer.username}: ${serverSidePlayer.score}</div>`

      if (gameRunning ==false && id != socket.id) {
        document.querySelector('#whoJoined').innerHTML +=

          `<div player-id="${id}"><p>${serverSidePlayer.username} joined</p></div>`;
      }

    } else {
      if (serverSidePlayer.imageURL != clientSidePlayers[id].imageURL) {
        clientSidePlayers[id].imageURL = serverSidePlayer.imageURL;
        clientSidePlayers[id].image.src = urlPrefixSmall + clientSidePlayers[id].imageURL;
      }
      document.querySelector(
        `div[data-id="${id}"]`
      ).innerHTML = `${serverSidePlayer.username}: ${serverSidePlayer.score}`

      document
        .querySelector(`div[data-id="${id}"]`)
        .setAttribute('data-score', serverSidePlayer.score)

      const parentDiv = document.querySelector('#playerLabels')
      const childDivs = Array.from(parentDiv.querySelectorAll('div'))

      childDivs.sort((a, b) => {
        const scoreA = Number(a.getAttribute('data-score'))
        const scoreB = Number(b.getAttribute('data-score'))

        return scoreB - scoreA
      })

      childDivs.forEach((div) => {
        parentDiv.removeChild(div)
      })

      childDivs.forEach((div) => {
        parentDiv.appendChild(div)
      })

      clientSidePlayers[id].target = {
        x: serverSidePlayer.x,
        y: serverSidePlayer.y
      }

      if (id === socket.id) {
        const lastserverSideInputIndex = playerInputs.findIndex((input) => {
          return serverSidePlayer.sequenceNumber === input.sequenceNumber
        })

        if (lastserverSideInputIndex > -1)
          playerInputs.splice(0, lastserverSideInputIndex + 1)

        playerInputs.forEach((input) => {
          clientSidePlayers[id].target.x += input.dx
          clientSidePlayers[id].target.y += input.dy
        })
      }
    }
  }

  for (const id in clientSidePlayers) {
    if (!serverSidePlayers[id]) {

      if (gameRunning == false) {
        const divToDelete = document.querySelector(`div[player-id="${id}"]`)
        divToDelete.parentNode.removeChild(divToDelete)
      }

      const divToDelete = document.querySelector(`div[data-id="${id}"]`)
      divToDelete.parentNode.removeChild(divToDelete)

      delete clientSidePlayers[id]

    }
  }
})

socket.on('closeGame', () => {

  document.getElementById('playerLabels2').innerHTML = document.getElementById('playerLabels').innerHTML;
  gameRunning = false;
  gameClosed = true;
  document.querySelector('#gameScreen').style.display = 'block';
  document.querySelector('#rotate').style.display = 'none';
  document.querySelector('#latencyDiv').style.display = 'none';
  $('#gameScreen').slideToggle(100, "swing");
  $('#endScreen').slideToggle(100, "swing" ,() => {
    gameRunning = false;
    document.querySelector('#endScreenDiv').style.zIndex = 10;
    document.querySelector('#endScreenDiv').style.display = 'flex';
    document.querySelector('#userDiv').style.display = 'none';
    document.querySelector('#gameScreen').style.display = 'none';
    document.querySelector('#endScreen').style.display = 'flex';;
  })

})

function animate() {
  let animationId = requestAnimationFrame(animate)
  c.clearRect(0, 0, canvas.width, canvas.height)

  for (const id in clientSideGulis) {
    const clientSideGuli = clientSideGulis[id]
    clientSideGuli.draw()
  }

  for (const id in clientSidePlayers) {
    const clientSidePlayer = clientSidePlayers[id]

    if (clientSidePlayer.target) {
      clientSidePlayers[id].x +=
        (clientSidePlayers[id].target.x - clientSidePlayers[id].x) * 0.5
      clientSidePlayers[id].y +=
        (clientSidePlayers[id].target.y - clientSidePlayers[id].y) * 0.5
    }

    clientSidePlayer.draw()
  }

}

animate()

const joystickData = {
  movement: {
    angle: 0,
    moving: false
  },
  shoot: {
    angle: 0,
    moving: false
  }
}
const SPEED = 1.5
const playerInputs = []
let sequenceNumber = 0
setInterval(() => {

  if (joystickData.movement.moving === true) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: SPEED * Math.cos(joystickData.movement.angle * Math.PI / 180), dy: SPEED * Math.sin(joystickData.movement.angle * Math.PI / 180) })
    socket.emit('move', { angle: joystickData.movement.angle, sequenceNumber })
  }

}, 15)

setInterval(
  () => {
    if (joystickData.shoot.moving === true) {
      socket.emit('shoot', {
        x: clientSidePlayers[socket.id].x,
        y: clientSidePlayers[socket.id].y,
        angle: joystickData.shoot.angle
      })
    }

  }, 200
)

var sendTime; var sendTimeID = 0;
var pongRecieved = false;
var lastPingSent = Date.now();
var firstPongRecieved = false;
setInterval(() => {
  if (gameClosed == false) {
    if (pongRecieved == false) {
      document.querySelector("#latency").innerHTML = "Disconnected!";
      if (redirected == true && roomCode==0 && window.location.href!='https://legendarybeast.github.io/canvas-game/') {window.location.reload();}
    
    }
    pongRecieved = false;
    sendTime = Date.now();
    sendTimeID++;
    socket.emit("ping",sendTimeID);
    lastPingSent = Date.now();
  }
}, 500);

socket.on("pong", (responseID) => {
  if (firstPongRecieved == false){
    firstPongRecieved = true;
    document.querySelector('#connecting').style.display = 'none';
  }
  if (responseID != sendTimeID) {
    return;
  }
  pongRecieved = true;
 
  var delay = Date.now() - sendTime;
  document.querySelector("#latency").innerHTML = "Latency: " + delay + "ms";
})


function fullScreenResize()
{
  if (document.fullscreenElement || document.webkitIsFullScreen || document.mozFullScreen)
  {
    document.querySelector('#waitingScreenCreate').style.scale = '0.65';
    document.querySelector('#rotateIn').style.scale = '1';
    document.querySelector('#rotateText').style.scale = '0.5';
    document.querySelector('#rotateTextIn').style.scale = '1';
    document.querySelector('#rotateText').style.setProperty('margin-top', '5%');
    
  }
  else
  {
    document.querySelector('#waitingScreenCreate').style.scale = '1';
    document.querySelector('#rotateIn').style.scale = '2.5';
    document.querySelector('#rotateText').style.scale = '1';
    document.querySelector('#rotateTextIn').style.scale = '1.5';
    document.querySelector('#rotateText').style.setProperty('margin-top', '40%');
  }
}
window.addEventListener("resize", () => {
  var devicePixelRatio = window.devicePixelRatio || 1
  canvas.width = innerWidth * devicePixelRatio
  canvas.height = innerHeight * devicePixelRatio * (viewer == true ? 1 : 0.65)
  c.scale(devicePixelRatio, devicePixelRatio);

  resize();
  
  socket.emit('changeFrame', {
    width: canvas.width,
    height: canvas.height,
    ratio: devicePixelRatio,
  })



});

window.addEventListener("load", () => {
  redirected = false;
  roomCode = 0;
  gameRunning = false;
  gameClosed = false;
  currSocketID = -1;
  currUserID = -1;
  window.history.pushState({}, null, null);
  var randomColorHue = 360 * Math.random();
  if (randomColorHue<=300 && randomColorHue>=200) randomColorHue=300+Math.random()*60;
  document.querySelector('#createButton').style.setProperty('--clr-neon', `hsl(${randomColorHue}, 100%, 65%)`); 
  randomColorHue = 360 * Math.random();
  if (randomColorHue<=300 && randomColorHue>=200) randomColorHue=300+Math.random()*60;
  document.querySelector('#joinButton').style.setProperty('--clr-neon', `hsl(${randomColorHue}, 100%, 65%)`); 
  randomColorHue = 360 * Math.random();
  if (randomColorHue<=300 && randomColorHue>=200) randomColorHue=300+Math.random()*60;
  document.querySelector('#viewButton').style.setProperty('--clr-neon', `hsl(${randomColorHue}, 100%, 65%)`); 
  
  if (document.cookie) {
    cookie = JSON.parse(document.cookie)
    myUsername = cookie.username;
    myFileName = cookie.filename;
  }
  document.querySelector('#usernameInput').value = myUsername;
  if (myFileName != "avatar" && myFileName != "loading.gif") {
    fetch(urlPrefix + myFileName).then(response => {
      if (response.ok) {
        return response.blob();
      }
    }).then(blob => {
      if (!blob) { changeAvatar(); return; }
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64String = reader.result;
        document.getElementById("avatarImage").src = base64String;
      };
    })
      .catch(error => {
        changeAvatar();
      });

  }
  else changeAvatar();
  document.body.style.zoom = 1.0;
  document.body.style.transform = 'scale(1.0)';
  document.body.style['-o-transform'] = 'scale(1.0)';
  document.body.style['-webkit-transform'] = 'scale(1.0)';
  document.body.style['-moz-transform'] = 'scale(1.0)';
  resize();
  sleep(2000).then(()=>{
    $('#connectingText').slideToggle(500, "swing");
  })
});

function resize() {

  if (gameRunning === true) {

    if (innerWidth < innerHeight) {
      document.querySelector('#gameScreen').style.display = 'none';
      document.querySelector('#rotate').style.display = 'flex';
      document.querySelector('#latencyDiv').style.display = 'none';
      document.getElementById('latency').style.fontSize = '20px';
    }
    else {
      document.querySelector('#gameScreen').style.display = 'block';
      document.querySelector('#rotate').style.display = 'none';
      document.querySelector('#latencyDiv').style.display = 'block';
      document.getElementById('latency').style.fontSize = '14px';
    }
  }


  else{
  var ratio = innerWidth / innerHeight;
  if (ratio > 1) {
    document.getElementById('usernameForm').style.transform = 'scale(0.5)';
    document.getElementById('enterRoomCode').style.transform = 'scale(1)';
    document.getElementById('waitingScreenCreate').style.transform = 'scale(0.75)';
    document.getElementById('latency').style.fontSize = '14px';
  }
  else {
    document.getElementById('usernameForm').style.transform = 'scale(1)';
    document.getElementById('enterRoomCode').style.transform = 'scale(2)';
    document.getElementById('waitingScreenCreate').style.transform = 'scale(1.2)';
    document.getElementById('latency').style.fontSize = '18px';
  }
}
fullScreenResize();
}

function handleFileSelect(evt) {
  prevSrc = document.getElementById("avatarImage").src;
  document.getElementById("avatarImage").src = 'loading.gif';
  loadingImage = true;
  upload(evt.target.files[0]);
}

document.getElementById('file-input').addEventListener('change', handleFileSelect, false);

document.getElementById('createButton').addEventListener('click', () => {

  var v = document.querySelector('#usernameInput').value;
  if (v === "") {
    alert("Oops! Username is empty.");
    return;
  }
  myUsername = v;
  document.cookie = JSON.stringify({ username: myUsername, filename: myFileName });
  $('#waitingScreenCreate').slideToggle(900, "swing");

  $('#usernameForm').slideToggle(900, "swing" , () => {
    document.querySelector('#waitingScreenCreate').style.display = 'block';
    document.querySelector('#usernameForm').style.display = 'none';
  })

  socket.emit('requestRoomCode', {
    width: canvas.width,
    height: canvas.height,
    ratio: devicePixelRatio,
    username: document.querySelector('#usernameInput').value,
    imageURL: myFileName
  })

});

socket.on('recieveRoomCode', (code) => {
  roomCode = code;
  $('#roomCode').text(`Room Code: ${roomCode}`);

})



document.getElementById('startButton').addEventListener('click', () => {
  if (roomCode == 0) return;
  if (Object.keys(clientSidePlayers).length == 1) {  document.querySelector('#waitTitle').innerHTML = "Waiting for bot players to join!"; document.querySelector('#roomCode').innerHTML=`Room Code: ${roomCode}<br><br>You may ask others to watch this room!`;}
  socket.emit('startRoom');

})

function initFromStart() {
  $('#roomCode2').text(`Room Code: ${roomCode}`);
  if (viewer==true)show(false);
  else show(true);
 
  if (viewer==true)
  {
    document.querySelector('#LeaderBoardDiv').style.setProperty('bottom', '0px');
    document.querySelector('#latencyDiv').style.removeProperty('top');
    document.querySelector('#latencyDiv').style.setProperty('bottom', '25px');
    document.querySelector('#timeDiv').style.removeProperty('top');
    document.querySelector('#timeDiv').style.setProperty('bottom', '40px');
  }

  sleep(1000).then(() => {
    gameRunning = true;
    if (innerWidth < innerHeight) {
      document.querySelector('#gameScreen').style.display = 'none';
      document.querySelector('#rotate').style.display = 'flex';
      document.querySelector('#latencyDiv').style.display = 'none';
    }
    else {
      document.querySelector('#gameScreen').style.display = 'block';
      document.querySelector('#rotate').style.display = 'none';
      document.querySelector('#latencyDiv').style.display = 'block';
    }
    $('#userDiv').slideToggle(300, "linear", ()=>{
      document.querySelector('#userDiv').style.display = 'none';
    });

  });
}

socket.on('initGame', () => {
  if (gameRunning == false) initFromStart();
})

socket.on('remainingTime', ({ min, second }) => {
  min = (min < 10 ? "0" + String(min) : String(min));
  second = (second < 10 ? "0" + String(second) : String(second));
  timeString = min + ":" + second;
  document.querySelector('#time').innerHTML = timeString;
  if (min == 0 && second < 10) {
    if (document.querySelector('#time').style.color != 'rgb(255, 49, 49)') {
      document.querySelector('#time').style.color = 'rgb(255, 49, 49)';
    }
    else {
      document.querySelector('#time').style.color = 'white';
    }
  }

})

document.getElementById('joinButton').addEventListener('click', () => {

  var v = document.querySelector('#usernameInput').value;
  if (v === "") {
    alert("Oops! Username is empty.");
    return;
  }

  myUsername = v;
  document.cookie = JSON.stringify({ username: myUsername, filename: myFileName });

  $('#enterRoomCode').slideToggle(900, "swing");

  $('#usernameForm').slideToggle(900, "swing" ,() => {
    document.querySelector('#enterRoomCode').style.display = 'flex';
    document.querySelector('#usernameForm').style.display = 'none';
  })

});

function roomCodeButtonFunction(event) {
  event.preventDefault();
  var v = document.querySelector('#roomCodeInput').value;
  if (v === "") {
    alert("Oops! Room Code is empty.");
    return;
  }

  if (viewer==false)socket.emit('joinRoom', {
    roomName: v,
    width: canvas.width,
    height: canvas.height,
    ratio: devicePixelRatio,
    username: document.querySelector('#usernameInput').value,
    imageURL: myFileName
  })
  else socket.emit('requestView', {
    roomName: v,
    width: canvas.width,
    height: canvas.height,
    ratio: devicePixelRatio
  });
  
}
document.getElementById('roomCodeButton').addEventListener('click', roomCodeButtonFunction);

document.getElementById('roomCodeForm').addEventListener('submit', roomCodeButtonFunction);

socket.on('roomJoinSuccess', () => {

  document.querySelector('#startButton').style.display = 'none';
  document.querySelector('#waitTitle').innerHTML = "Waiting for your buddy to start the game!";
  roomCode = document.querySelector('#roomCodeInput').value;
  $('#roomCode').text(`Room Code: ${roomCode}`);
    
  if (gameRunning == false){


  $('#waitingScreenCreate').slideToggle(900, "swing");

  $('#enterRoomCode').slideToggle(900, "swing" , () => {
    if (document.querySelector('#waitingScreenCreate').style.display == 'none') document.querySelector('#waitingScreenCreate').style.display = 'block';
    if (document.querySelector('#enterRoomCode').style.display != 'none') document.querySelector('#enterRoomCode').style.display = 'none';
  })
}

})

socket.on('invalidRoom', () => {

  if (roomCode == 0) { if (viewer == false) alert("Maybe no such rooms running. If it's a Bot Room, try to watch the game"); else alert("Maybe no such rooms running."); }
  else if (gameClosed == false) { alert("Your room was expired!"); gameClosed = true; location.reload();}
})

socket.on("setUserID", (newUserID)=>
{
  if (currUserID != -1 && roomCode!=0) {

    if (viewer == false) socket.emit('rejoinRoom', {
      roomName: roomCode,
      width: canvas.width,
      height: canvas.height,
      ratio: devicePixelRatio,
      prevSocketID: currSocketID,
      prevUserID: currUserID

    });
    else {
      socket.emit('requestView', {
        roomName: roomCode,
        width: canvas.width,
        height: canvas.height,
        ratio: devicePixelRatio
      });
    }
  }
  else{
    currUserID = newUserID;
    currSocketID = socket.id;
  }
})

socket.on("rejoinSuccess", ()=>{
  currSocketID = socket.id;
})

function upload(f) {

  var formData = new FormData();
  formData.append("file", f);
  formData.append("fileName", "a");
  formData.append("publicKey", "public_wqJSbY8kM/koZvHg41fLVl40LqY=");

  $.ajax({
    url: host +"auth",
    method: "GET",
    dataType: "json",
    success: function (body) {
      formData.append("signature", body.signature || "");
      formData.append("expire", body.expire || 0);
      formData.append("token", body.token);

      $.ajax({
        url: "https://upload.imagekit.io/api/v1/files/upload",
        method: "POST",
        mimeType: "multipart/form-data",
        dataType: "json",
        data: formData,
        processData: false,
        contentType: false,
        error: function (jqxhr, text, error) {
          if (loadingImage == true) {
            document.getElementById("avatarImage").src = prevSrc;
            loadingImage = false;
          }
        },
        success: function (body) {
          if (body.height && body.width && body.height > 0 && body.width > 0) {
            myFileName = body.name;
            socket.emit("changeImage", myFileName);
            document.cookie = JSON.stringify({ username: myUsername, filename: myFileName });
            if (loadingImage == true) {
              document.getElementById("avatarImage").src = urlPrefix + body.name;
              loadingImage = false;
            }
          }
          else {
            if (loadingImage == true) {
              document.getElementById("avatarImage").src = prevSrc;
              loadingImage = false;
            }
          }

        }
      });

    },

    error: function (jqxhr, text, error) {
      if (loadingImage == true) {
        document.getElementById("avatarImage").src = prevSrc;
        loadingImage = false;

      }
    }
  });

}



function changeAvatar() {
  prevSrc = document.getElementById("avatarImage").src;
  document.getElementById("avatarImage").src = "loading.gif";
  loadingImage = true;

  fetch("https://avatar.iran.liara.run/public")
    .then(response => response.blob())
    .then(blob => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64String = reader.result;
        document.getElementById("avatarImage").src = base64String;
        loadingImage = false;
        upload(base64String);
      };
    }).catch(err=>{});
}


const hsl2rgb = (h, s, l) => {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [255 * f(0), 255 * f(8), 255 * f(4)];
}; 


const toHSLArray = (hslStr) => {
  const hslArr = hslStr.match(/\d+/g)?.map(Number)
  if (hslArr && hslArr.length >= 3) {
    return hsl2rgb(hslArr[0], hslArr[1], hslArr[2])
  }
}

function pickTextColorBasedOnBgColorAdvanced([r, g, b] ,lightColor, darkColor) {

  var uicolors = [r / 255, g / 255, b / 255];
  var c = uicolors.map((col) => {
    if (col <= 0.03928) {
      return col / 12.92;
    }
    return Math.pow((col + 0.055) / 1.055, 2.4);
  });
  var L = (0.2126 * c[0]) + (0.7152 * c[1]) + (0.0722 * c[2]);
  return (L > 0.179) ? darkColor : lightColor;
}


document.querySelector('#usernameInput').addEventListener("input", (event)=>{
  myUsername = document.querySelector('#usernameInput').value;
  document.cookie = JSON.stringify({ username: myUsername, filename: myFileName });

})


socket.on ("playerColor", (color)=>{
  document.getElementById('roomCode2').style.backgroundColor = color;
  document.getElementById('roomCode2').style.color =  pickTextColorBasedOnBgColorAdvanced(toHSLArray(color) , 'white' , 'black');
  // document.getElementById('joyArea').style.backgroundColor = color;
 
})



var viewer = false;

document.querySelector('#viewButton').addEventListener('click', ()=>{
  viewer = true;
  canvas.height = innerHeight * devicePixelRatio;
  c.scale(devicePixelRatio,devicePixelRatio);
  document.querySelector('#playground').style.height = '100%';
  document.querySelector('#joyArea').style.display = 'none';
  $('#enterRoomCode').slideToggle(900, "swing");
  $('#usernameForm').slideToggle(900, "swing" , () => {
    document.querySelector('#enterRoomCode').style.display = 'flex';
    document.querySelector('#usernameForm').style.display = 'none';
  })
})

document.querySelector('#backButton').addEventListener('click', ()=>{
  viewer = false;
  canvas.height = innerHeight * devicePixelRatio * 0.65;
  c.scale(devicePixelRatio,devicePixelRatio);
  document.querySelector('#playground').style.height = '65%';
  document.querySelector('#joyArea').style.display = 'block';
  $('#enterRoomCode').slideToggle(900, "swing");
  $('#usernameForm').slideToggle(900, "swing" , () => {
    document.querySelector('#enterRoomCode').style.display = 'none';
    document.querySelector('#usernameForm').style.display = 'flex';
  })
})


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
