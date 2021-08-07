window.connections = [];
window.channel = {
  id: null,
  setChannel: {},
  setLocalId: function (id) {
    this.id = id;
  },
  send: function (data) {
    if (Object.values(this).length <= 1) {
      console.log("no channel has created yet...");
    }
    const sendData = JSON.stringify(data);
    for (let [key, channel] of Object.entries(this.setChannel)) {
      if (key !== "send" && key !== this.id && channel.readyState === "open")
        channel.send(sendData);
    }
  },
  onReceiveMessage: function (event) {
    return event;
  },
  onSendChannelStateChange: function (event, id, callback) {
    console.log("onSendChannelStateChange", event, "  ", id);
  },
};

const mediaStreamConstraints = {
  video: true,
  iceServers: [
    {
      urls: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun.because-why-not.com:443" },
        { url: "stun:stun01.sipphone.com" },
        { url: "stun:stun.ekiga.net" },
        { url: "stun:stun.fwdnet.net" },
        { url: "stun:stun.ideasip.com" },
        { url: "stun:stun.iptel.org" },
        { url: "stun:stun.rixtelecom.se" },
        { url: "stun:stun.schlund.de" },
        { url: "stun:stun.l.google.com:19302" },
        { url: "stun:stun1.l.google.com:19302" },
        { url: "stun:stun2.l.google.com:19302" },
        { url: "stun:stun3.l.google.com:19302" },
        { url: "stun:stun4.l.google.com:19302" },
        { url: "stun:stunserver.org" },
        { url: "stun:stunserver.org:3478" },
        { url: "stun:stun.softjoys.com" },
        { url: "stun:stun.voiparound.com" },
        { url: "stun:stun.voipbuster.com" },
        { url: "stun:stun.voipstunt.com" },
        { url: "stun:stun.voxgratia.org" },
        { url: "stun:stun.xten.com" },
      ],
    },
  ],
};
const offerOptions = {
  offerToReceiveVideo: 1,
};
const localVideo = document.getElementById("localVideo");
let receiveChannel;
let sendChannel;
let localStream;
let localUserId;

function startLocalStream() {
  navigator.mediaDevices
    .getUserMedia(mediaStreamConstraints)
    .then(getUserMediaSuccess)
    .then(connectSocketToSignaling)
    .catch(handleError);
}

function connectSocketToSignaling() {
  // const socket = io.connect("http://localhost:3000", { secure: true });
  const socket = io.connect("https://phaserwebrtc.herokuapp.com/", {
    secure: true,
  });
  socket.on("connect", () => {
    localUserId = socket.id;
    window.channel.setLocalId(localUserId);
    console.log("localUser", localUserId);
    socket.on("player-joined", (data) => {
      const clients = data.clients;
      const joinedUserId = data.joinedUserId;
      console.log(joinedUserId, " joined");
      if (Array.isArray(clients) && clients.length > 0) {
        clients.forEach((userId) => {
          if (!window.connections[userId]) {
            window.connections[userId] = new RTCPeerConnection(
              mediaStreamConstraints
            );
            window.channel.setChannel[userId] =
              window.connections[userId].createDataChannel("sendDataChannel");
            window.channel.setChannel[userId].onopen = (e) =>
              window.channel.onSendChannelStateChange(e, userId);
            window.channel.setChannel[userId].onclose = (e) =>
              window.channel.onSendChannelStateChange(e, userId);
            window.connections[userId].ondatachannel = (e) =>
              receiveChannelCallback(e, userId);
            window.connections[userId].onicecandidate = () => {
              if (event.candidate) {
                console.log(socket.id, " Send candidate to ", userId);
                socket.emit("signaling", {
                  type: "candidate",
                  candidate: event.candidate,
                  toId: userId,
                });
              }
            };
            window.connections[userId].onaddstream = () => {
              gotRemoteStream(event, userId);
            };
            window.connections[userId].addStream(localStream);
          }
        });

        if (data.count >= 2) {
          window.connections[joinedUserId]
            .createOffer(offerOptions)
            .then((description) => {
              window.connections[joinedUserId]
                .setLocalDescription(description)
                .then(() => {
                  console.log(socket.id, " Send offer to ", joinedUserId);
                  socket.emit("signaling", {
                    toId: joinedUserId,
                    description:
                      window.connections[joinedUserId].localDescription,
                    type: "sdp",
                  });
                });
            });
        }
      }
    });

    socket.on("player-left", (userId) => {
      let video = document.querySelector('[data-socket="' + userId + '"]');
      video.parentNode.removeChild(video);
      if (window.channel.setChannel[userId]) {
        window.channel.setChannel[userId].send(
          JSON.stringify({
            type: "onLeave",
            from: userId,
          })
        );
      }
    });

    socket.on("signaling", (data) => {
      gotMessageFromSignaling(socket, data);
    });
  });
}

function gotMessageFromSignaling(socket, data) {
  const fromId = data.fromId;
  if (fromId !== localUserId) {
    switch (data.type) {
      case "candidate":
        console.log(socket.id, " Receive Candidate from ", fromId);
        if (data.candidate) {
          gotIceCandidate(fromId, data.candidate);
        }
        break;

      case "sdp":
        if (data.description) {
          console.log(socket.id, " Receive sdp from ", fromId);
          window.connections[fromId]
            .setRemoteDescription(new RTCSessionDescription(data.description))
            .then(() => {
              if (data.description.type === "offer") {
                window.connections[fromId]
                  .createAnswer()
                  .then((description) => {
                    window.connections[fromId]
                      .setLocalDescription(description)
                      .then(() => {
                        console.log(socket.id, " Send answer to ", fromId);
                        socket.emit("signaling", {
                          type: "sdp",
                          toId: fromId,
                          description:
                            window.connections[fromId].localDescription,
                        });
                      });
                  })
                  .catch(handleError);
              }
            })
            .catch(handleError);
        }
        break;
    }
  }
}

function gotRemoteStream(event, userId) {
  let remoteVideo = document.createElement("video");
  remoteVideo.setAttribute("class", "videoStyle");
  remoteVideo.setAttribute("data-socket", userId);
  remoteVideo.srcObject = event.stream;
  remoteVideo.autoplay = true;
  remoteVideo.muted = true;
  remoteVideo.playsinline = true;
  document.querySelector(".videos").appendChild(remoteVideo);
}

function gotIceCandidate(fromId, candidate) {
  connections[fromId]
    .addIceCandidate(new RTCIceCandidate(candidate))
    .catch(handleError);
}

function receiveChannelCallback(event, fromId) {
  console.log("Receive Channel Callback");
  receiveChannel = event.channel;
  receiveChannel.onmessage = window.channel.onReceiveMessage;
}

function handleError(e) {
  console.log(e);
  alert("Something went wrong");
}

function onSendChannelStateChange(event, id) {
  window.channel.onSendChannelStateChange(event, id);
}

function getUserMediaSuccess(mediaStream) {
  localStream = mediaStream;
  localVideo.srcObject = mediaStream;
}

startLocalStream();
