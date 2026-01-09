/*
*  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

// This code is adapted from
// https://rawgit.com/Miguelao/demos/master/mediarecorder.html

'use strict';

/* globals MediaRecorder */

let mediaRecorder;
let recordedBlobs;
let currentMicId = 'default';
let echoCancellationEnabled = false;

const COUNTDOWN_SECONDS = 5;
let countdownIntervalId = null;
let countdownTimeoutId = null;
let isCountingDown = false;

const codecPreferences = document.querySelector('#codecPreferences');

const errorMsgElement = document.querySelector('span#errorMsg');
const setErrorMessage = message => {
  if (errorMsgElement) {
    errorMsgElement.textContent = message;
  }
};
const recordedVideo = document.querySelector('video#recorded');
const recordButton = document.querySelector('button#record');
const desktopCard = document.querySelector('#desktopCard');
const startButton = document.querySelector('button#start');

const playButton = document.querySelector('button#play');
playButton.addEventListener('click', () => {
  if (!recordedBlobs || !recordedBlobs.length) {
    return;
  }
  const mimeType = codecPreferences.options[codecPreferences.selectedIndex].value.split(';', 1)[0];
  const superBuffer = new Blob(recordedBlobs, {type: mimeType});
  recordedVideo.src = null;
  recordedVideo.srcObject = null;
  recordedVideo.src = window.URL.createObjectURL(superBuffer);
  recordedVideo.controls = true;
  recordedVideo.play();
});

const downloadButton = document.querySelector('button#download');
downloadButton.addEventListener('click', () => {
  if (!recordedBlobs || !recordedBlobs.length) {
    return;
  }
  const blob = new Blob(recordedBlobs, {type: 'video/webm'});
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'weplex-recording.webm';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
});

function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

function getSupportedMimeTypes() {
  const possibleTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/mp4;codecs=h264,aac',
  ];
  return possibleTypes.filter(mimeType => MediaRecorder.isTypeSupported(mimeType));
}

function startRecording() {
  cancelCountdown(false);

  if (!window.stream) {
    setErrorMessage('No media stream available. Start capture first.');
    recordButton.textContent = 'Start Recording';
    setDesktopState('idle');
    return;
  }

  recordedBlobs = [];
  const mimeType = codecPreferences.options[codecPreferences.selectedIndex].value;
  const options = {mimeType};

  try {
    mediaRecorder = new MediaRecorder(window.stream, options);
  } catch (e) {
    console.error('Exception while creating MediaRecorder:', e);
    setErrorMessage(`Exception while creating MediaRecorder: ${JSON.stringify(e)}`);
    recordButton.textContent = 'Start Recording';
    setDesktopState('idle');
    return;
  }

  mediaRecorder.onstop = () => {
    restoreRecordingUI();
  };
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start();
  enterRecordingUI();
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

function handleSuccess(stream) {
  recordButton.disabled = false;
  startButton.disabled = true;
  window.stream = stream;

  const gumVideo = document.querySelector('video#gum');
  gumVideo.srcObject = stream;

  codecPreferences.innerHTML = '';
  const supportedTypes = getSupportedMimeTypes();
  supportedTypes.forEach(mimeType => {
    const option = document.createElement('option');
    option.value = mimeType;
    option.innerText = option.value;
    codecPreferences.appendChild(option);
  });
  codecPreferences.disabled = false;
  if (supportedTypes.length > 0) {
    codecPreferences.selectedIndex = 0;
  }
  setDesktopState('idle');
}

function buildAudioConstraint() {
  if (!navigator.mediaDevices) {
    return true;
  }

  const constraint = {};

  if (currentMicId && currentMicId !== 'default') {
    constraint.deviceId = {exact: currentMicId};
  }
  if (echoCancellationEnabled) {
    constraint.echoCancellation = {exact: true};
  }

  return Object.keys(constraint).length ? constraint : true;
}

const micOptions = document.querySelector('#micOptions');
const micStatus = document.querySelector('#micStatus');
const refreshMicsBtn = document.querySelector('#refreshMicsBtn');

function setMicOptionsPlaceholder(message, disabled = true) {
  if (!micOptions) return;
  micOptions.dataset.state = disabled ? 'disabled' : 'enabled';
  micOptions.innerHTML = `<p class="hint">${message}</p>`;
}

async function populateMicSources(forcePrompt = false) {
  if (!micOptions || !micStatus) {
    return;
  }
  if (!navigator.mediaDevices?.enumerateDevices) {
    setMicOptionsPlaceholder('Device enumeration not supported in this browser.');
    micStatus.textContent = 'Device enumeration not supported in this browser.';
    if (refreshMicsBtn) {
      refreshMicsBtn.disabled = true;
    }
    return;
  }
  try {
    if (forcePrompt) {
      const tempStream = await navigator.mediaDevices.getUserMedia({audio: true});
      tempStream.getTracks().forEach(track => track.stop());
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter(device => device.kind === 'audioinput');
    if (!inputs.length) {
      setMicOptionsPlaceholder('No microphones detected.');
      micStatus.textContent = 'Connect an input device to proceed.';
      return;
    }
    micOptions.dataset.state = 'enabled';
    micOptions.innerHTML = '';

    const options = [
      {deviceId: 'default', label: 'System Default'},
      ...inputs.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Mic ${index + 1}`
      }))
    ];

    let hasMatch = false;
    options.forEach(option => {
      const label = document.createElement('label');
      label.className = 'mic-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'micSource';
      input.value = option.deviceId;
      if (option.deviceId === currentMicId) {
        input.checked = true;
        hasMatch = true;
      }
      const text = document.createElement('span');
      text.textContent = option.label;
      label.appendChild(input);
      label.appendChild(text);
      micOptions.appendChild(label);
    });

    if (!hasMatch) {
      currentMicId = 'default';
      const defaultRadio = micOptions.querySelector('input[value="default"]');
      if (defaultRadio) {
        defaultRadio.checked = true;
      }
    }
    micStatus.textContent = `${inputs.length} microphone${inputs.length > 1 ? 's' : ''} detected`;
  } catch (err) {
    micStatus.textContent = `Mic access blocked: ${err.message}`;
    setMicOptionsPlaceholder('Permission needed to enumerate devices.');
  }
}

if (micOptions) {
  micOptions.addEventListener('change', event => {
    if (event.target.name === 'micSource') {
      currentMicId = event.target.value;
    }
  });
}

if (refreshMicsBtn) {
  refreshMicsBtn.addEventListener('click', () => populateMicSources(true));
}

if (navigator.mediaDevices?.addEventListener) {
  navigator.mediaDevices.addEventListener('devicechange', () => populateMicSources());
} else if (navigator.mediaDevices) {
  navigator.mediaDevices.ondevicechange = () => populateMicSources();
}

async function init(constraints) {
  try {
    const displayStream = await navigator.mediaDevices.getDisplayMedia(constraints);
    const [videoTrack] = displayStream.getVideoTracks();

    const audioConstraints = buildAudioConstraint();
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints
    }).catch(e => { throw e; });
    const [audioTrack] = audioStream.getAudioTracks();

    const stream = new MediaStream([videoTrack, audioTrack]);
    handleSuccess(stream);
    populateMicSources();
  } catch (e) {
    console.error('navigator.getUserMedia error:', e);
    setErrorMessage(`navigator.getUserMedia error: ${e.toString()}`);
    startButton.disabled = false;
  }
}

startButton.addEventListener('click', async () => {
  startButton.disabled = true;
  echoCancellationEnabled = document.querySelector('#echoCancellation').checked;

  const constraints = {
    video: {
      cursor: 'always'
    }
  };
  await init(constraints);
});

populateMicSources();
function setDesktopState(state) {
  if (!desktopCard) return;
  desktopCard.classList.remove('glow-countdown', 'glow-recording');
  if (state === 'countdown') {
    desktopCard.classList.add('glow-countdown');
  } else if (state === 'recording') {
    desktopCard.classList.add('glow-recording');
  }
}

function cancelCountdown(resetButtonText = true) {
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
  if (countdownTimeoutId) {
    clearTimeout(countdownTimeoutId);
    countdownTimeoutId = null;
  }
  if (isCountingDown && resetButtonText) {
    recordButton.textContent = 'Start Recording';
  }
  isCountingDown = false;
  if (resetButtonText) {
    setDesktopState('idle');
  }
}

function beginRecordingCountdown() {
  if (isCountingDown) return;
  isCountingDown = true;
  let remaining = COUNTDOWN_SECONDS;
  recordButton.textContent = `Starting in ${remaining}...`;
  setDesktopState('countdown');

  countdownIntervalId = window.setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      recordButton.textContent = `Starting in ${remaining}...`;
    }
  }, 1000);

  countdownTimeoutId = window.setTimeout(() => {
    cancelCountdown(false);
    recordButton.textContent = 'Preparing...';
    startRecording();
  }, COUNTDOWN_SECONDS * 1000);
}

function enterRecordingUI() {
  recordButton.textContent = 'Stop Recording';
  playButton.disabled = true;
  downloadButton.disabled = true;
  codecPreferences.disabled = true;
  setDesktopState('recording');
}

function restoreRecordingUI() {
  recordButton.textContent = 'Start Recording';
  playButton.disabled = false;
  downloadButton.disabled = false;
  codecPreferences.disabled = false;
  setDesktopState('idle');
}

function stopActiveRecording() {
  stopRecording();
}

recordButton.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopActiveRecording();
    return;
  }

  if (isCountingDown) {
    cancelCountdown(true);
    return;
  }

  beginRecordingCountdown();
});
