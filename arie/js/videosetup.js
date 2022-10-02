function errorHandler() {
  console.log("Ooops, that didnt work");
}

navigator.getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia;

function initialize() {
  video = document.getElementById("video");
  width = video.width;
  height = video.height;

  canvas = document.getElementById("videoCanvas");
  //    console.log(videoCanvas);
  context = canvas.getContext("2d");

  video.addEventListener(
    "playing",
    function () {
      console.log("Started");
      copyVideo = true;
    },
    true
  );

  if (typeof navigator.mediaDevices.getUserMedia === "undefined") {
    navigator.getUserMedia({ video: true }, streamHandler, errorHandler);
  } else {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(streamHandler)
      .catch(errorHandler);
  }
}

function streamHandler(stream) {
  try {
    video.srcObject = stream;
  } catch (error) {
    video.src = URL.createObjectURL(stream);
  }
  video.play();
  console.log("In startStream");
  requestAnimationFrame(render);
}

addEventListener("DOMContentLoaded", initialize);

function calcFPS() {
  delta = (Date.now() - lastCalledTime) / 1000;
  lastCalledTime = Date.now();
  fps = 1 / delta;
  fpsNumber.innerHTML = fps.toFixed(0);
}
