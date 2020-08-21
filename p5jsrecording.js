let buffers;
let slicedur;
let grainLooping = true;
let newBuf = false;
let userAudio;
let startArray = [];
let zip = [];
let patternArray = [];
let start_note = 60;
let grainSelect = 0;
let melLength = 30;
let fRate = 30;

const audio = document.querySelector('audio');
const actx  = Tone.context;
const recDest  = actx.createMediaStreamDestination();
const recorder = new MediaRecorder(recDest.stream);

const meter = new Tone.Meter();
const mic = new Tone.UserMedia().connect(meter);
mic.connect(recDest);

Nexus.context = actx._context;

const baseURL = "https://storage.googleapis.com/audioassets/";
let buf_list = {0: "Vessel1.wav", 1: "Bowl1.wav", 2: "Bowl2.wav", 3: "BattabangBell.wav", 4: "DianBell.wav", 5: "Frogs.wav", 6: "SolarSounder1.wav", 7: "WindWaves.wav"};
let bufListLength = Object.keys(buf_list).length; // 8
let grain_list = ["grain1", "grain2", "grain3", "grain4", "grain5", "grain6", "grain7", "grain8"];
let pitchShiftList = ["pitchShift1", "pitchShift2", "pitchShift3", "pitchShift4", "pitchShift5", "pitchShift6", "pitchShift7", "pitchShift8"];
let gVolumeList = ["gVolume1","gVolume2","gVolume3","gVolume4","gVolume5","gVolume6","gVolume7","gVolume8"]
let sVolumeList = ["sVolume1","sVolume2","sVolume3","sVolume4","sVolume5","sVolume6","sVolume7","sVolume8", "droneVol"]
let states_array = [];
let patternList = ["pattern1", "pattern2", "pattern3", "pattern4", "pattern5", "pattern6", "pattern7", "pattern8"]
let synthList = ["synth1", "synth2", "synth3", "synth4", "synth5", "synth6", "synth7", "synth8"]
let chorusList = ["chorus1", "chorus2", "chorus3", "chorus4", "chorus5", "chorus6", "chorus7", "chorus8"]
let sFilterList = ["filter1", "filter2", "filter3", "filter4", "filter5", "filter6", "filter7", "filter8"]
let delayList = ["delay1", "delay2", "delay3", "delay4", "delay5", "delay6", "delay7", "delay8"]
let gFilterList = ["filter1", "filter2", "filter3", "filter4", "filter5", "filter6", "filter7", "filter8"]

let delayWet = 0.1;
let delayFeedback = 0.5;
let filterCutoff = 3000;

//CREATE OUR BUFFERS
buffers = new Tone.ToneAudioBuffers({
           urls: buf_list,
           baseUrl: baseURL
        });

//CREATE OUR PLAYERS & PROCESSING NODES
for (grainNum in grain_list) {
        grain_list[grainNum] = new Tone.GrainPlayer(buffers.get(grainNum));
    }

for (pitchShift in pitchShiftList) {
    pitchShiftList[pitchShift] = new Tone.PitchShift();
  }

for (volume in gVolumeList) {
      gVolumeList[volume] = new Tone.Volume(-6);
    }
for (volume in sVolumeList) {
      sVolumeList[volume] = new Tone.Volume(-12);
    }

for (pattern in patternList) {
      patternList[pattern] = new Tone.Part();
    }

for (chorus in chorusList) {
      chorusList[chorus] = new Tone.Chorus ( Math.random() * 3, Math.random() * 5 , Math.random() ) //randomized rate, delay time & depth
    }

for (filt in sFilterList) {
      let cutoff = randomMIDIpitch(800, 3200);
      let octaves = randomMIDIpitch(1, 3);
      sFilterList[filt] = new Tone.AutoFilter(Math.random(), cutoff, 2);
    }

for (filt in gFilterList) {
  gFilterList[filt] = new Tone.Filter(filterCutoff, "lowpass");
}

let delayLengths = ["1n", "2n", "4n", "8n"]

for (delay in delayList) {
  let delayChoice = randomMIDIpitch(0, 3);
  delayLength = delayLengths[delayChoice];
  delayList[delay] = new Tone.PingPongDelay({"delayTime": delayLength, "feedback": delayFeedback, "wet": delayWet});
}
//let verb = new Tone.Reverb(4);
const ir = "".concat(baseURL, "SSet4N.wav"); //San Sabino Cathedral
const verb = new Tone.Convolver(ir);

//some variety of synths
synthList[0] = new Tone.AMSynth();
synthList[1] = new Tone.FMSynth();
synthList[2] = new Tone.DuoSynth(); synthList[2].harmonicity.value = 0.5; synthList[2].volume.value = -12;
synthList[3] = new Tone.Synth();
synthList[4] = new Tone.AMSynth(); synthList[4].modulation = "triangle";
synthList[5] = new Tone.FMSynth(); synthList[5].modulationIndex = 5; synthList[5].harmonicity = 2;
synthList[6] = new Tone.DuoSynth(); synthList[6].volume.value = -12;
synthList[7] = new Tone.Synth(); synthList[7].oscillator = "sine8";

for (synth in synthList) {
     synthList[synth].set({
	      envelope: {
		        attack: Math.random() * 0.1,
            decay: Math.random() * 0.3,
            sustain: Math.random() * 0.7 + 0.3,
            release: Math.random() * 0.5,
	         }
         })
     synthList[synth].sync();
     if (synth == 0 || synth == 1 || synth ==  4 || synth ==  5) { //AM & FM Synths
       synthList[synth].set({
         modulationEnvelope : {
            attack : Math.random() * 0.1,
            decay : 0,
            sustain : 1,
            release : Math.random() * 0.5,
            }
          })
        }
}
//CREATE SYNTH DRONE IN BACKGROUND
const autoFilter = new Tone.AutoFilter(0.1).start();
let synth_drone = new Tone.PolySynth();
sVolumeList[8].volume.value = -48;

//VARIABLES FOR AI GENERATION SEEDS - USED TO RANDOMIZE SYNTH DRONE AS WELL
let randomSeed = randomMIDIpitch(45, 76); //A2 - E5 for initial seed
let randomInterval1 = randomMIDIpitch(3, 7);
let randomInterval2 = randomMIDIpitch(3, 7);
let seedChordMIDI = [randomSeed, randomSeed + randomInterval1, randomSeed + randomInterval1 + randomInterval2]
let seedChordFreq = [Tone.Frequency(seedChordMIDI[0], "midi"), Tone.Frequency(seedChordMIDI[1], "midi"), Tone.Frequency(seedChordMIDI[2], "midi")];
let rhythmSeed = [randomMIDIpitch(1, 2), randomMIDIpitch(1, 3),randomMIDIpitch(1, 2)]
console.log(seedChordMIDI, rhythmSeed)

//CONNECT EVERYTHING UP
let grainBusGain = new Tone.Gain(1).toDestination();
const synthBusGain = new Tone.Gain(1).toDestination(); //not working
grainBusGain.connect(recDest);
synthBusGain.connect(recDest);
synth_drone.chain(sVolumeList[8], autoFilter, verb, synthBusGain);

for (let i = 0; i < grain_list.length; i++) { //handle grain and synth routing together
    grain_list[i].chain(pitchShiftList[i], delayList[i], gFilterList[i], gVolumeList[i], verb, grainBusGain);
    grain_list[i].sync();
    synthList[i].chain(chorusList[i], sFilterList[i], sVolumeList[i], verb, synthBusGain);
    synthList[i].sync();
  }

//BUFFER VISUALIZATION - PROCESSING
const cnvHeight = 200;
const cnvWidth = 300;

const s = ( sketch ) => {
  sketch.setup = () => {
    let cnv = sketch.createCanvas(cnvWidth, cnvHeight);
    sketch.frameRate(fRate);
    sketch.background(220);
    sketch.stroke("#11249c");
    sketch.strokeWeight(2);
    sketch.fill('rgba(220,220,220, 0)')
    sketch.rect(0, 0, cnvWidth, cnvHeight);
  };

  sketch.draw = () => {
      if (newBuf == false) {}
      else {
        drawLoop();
        newBuf = false;
      }
  };
};
let p = new p5(s, document.getElementById('sketch-holder'));

function drawBuffer() {
  p.clear();
  p.background(220);
  p.stroke("#11249c");
  p.strokeWeight(2);
  p.fill('rgba(220,220,220, 0)');
  p.rect(0, 0, cnvWidth, cnvHeight);
  const buffer = grain_list[grainSelect].buffer.getChannelData();
  const bandSize = cnvWidth / buffer.length;
  p.stroke("#11249c");
  p.beginShape();
  for (let i = 0; i < buffer.length; i += 4) { // a bit less detail
    p.curveVertex(bandSize * i, p.map(buffer[i], -1, 1, cnvHeight, 0));
  }
  p.endShape();
}
function drawLoop() { //redrawing buffer on every call slows down audio when redrawing loop using position dial.
                      //What's the solution without multiple threads? I've tried slightly slowing frame rate, but don't want drawing to look laggy
                      //Even a 1fps rate doesn't solve problem w/r/t audio. Not drawing buffer as often helps, but setting the loop needs to feel responsive.
  drawBuffer();
  loopStart = (grain_list[grainSelect].loopStart / grain_list[grainSelect].buffer.duration) * cnvWidth;
  loopEnd = (grain_list[grainSelect].loopEnd / grain_list[grainSelect].buffer.duration) * cnvWidth;
  // console.log(loopStart + " " + loopEnd);
  p.stroke('rgba(34,139,34,0.8)');
  p.fill('rgba(34,139,34,0.25)');
  p.beginShape();
  p.vertex(loopStart, cnvHeight);
  p.vertex(loopStart, 0);
  p.vertex(loopEnd, 0);
  p.vertex(loopEnd, cnvHeight);
  p.endShape();
}

//HELPER FUNCTIONS
function loopsize(x, y) {
  slicedur = grain_list[grainSelect].buffer.duration;
	let start = slicedur * x;
	let end = (start + (slicedur * (1-y)+0.001)) % slicedur;
  return [start, end];
}

function randomMIDIpitch(start, stop) { //random MIDI in acceptable range
  let range = stop - start;
  let randompitch = Math.floor(Math.random() * range + start);
  return randompitch;
}

function record() {
  const chunks = [];
  recorder.start();
  recorder.ondataavailable = evt => chunks.push(evt.data);
  recorder.onstop = evt => {
  let blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
  audio.src = URL.createObjectURL(blob);
  recordToBuf(audio.src);
  }
}

let userBufs = [];

async function recordToBuf (blob) {
    userAudio = await new Tone.ToneAudioBuffer(blob); //works with both recorded output and input
    console.log(grain_list[grainSelect]);
    buf_list[bufListLength] = "User Sound " + (bufListLength - 7); //should grab file name, and separate from live input
    dropdown.defineOptions(Object.values(buf_list)); //add to dropdown list
    userBufs.push(userAudio);
    dropdown.selectedIndex = bufListLength; //triggers newGrainBuf
    bufListLength++;
  }

async function newGrainBuf(userAudio) { //set buffer
    Tone.Transport.schedule((time) => { //double-check to draw buffer, since it's failing ~20% of the time
      newBuf = true}, Tone.now() + 0.1);
    grain_list[grainSelect].buffer = await userAudio;
    newBuf = true; //draw new buffer
  }
//LOADS SOUND
load.onchange = function() {
  var sound = document.getElementById("sound");
  var reader = new FileReader();
  reader.onloadend = function(e) {
    actx.decodeAudioData(this.result).then(function(buffer) {
    userAudio = new Tone.ToneAudioBuffer(buffer); //Created new buffer, because
    newGrainBuf(userAudio); //accessing adding the buffer to buffersList by dictionary was tricky
  });
  };
  reader.readAsArrayBuffer(this.files[0]);
};

//AI GENERATION
let melodyRnn = new music_rnn.MusicRNN( 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn');
let melodyRnnLoaded = melodyRnn.initialize();

async function generateMelody() {
  let seed = {
    notes: [
      {pitch: seedChordMIDI[0], quantizedStartStep: 0, quantizedEndStep: rhythmSeed[0]}, {pitch: seedChordMIDI[1], quantizedStartStep: rhythmSeed[0], quantizedEndStep: rhythmSeed[1]},
      {pitch: seedChordMIDI[2], quantizedStartStep: rhythmSeed[1], quantizedEndStep: rhythmSeed[2]},
    ],
    totalQuantizedSteps: rhythmSeed.reduce(function(a, b){return a + b;}),
    quantizationInfo: { stepsPerQuarter: 4}, //speeds up, adds a bit of funkiness
  };
  let steps = randomMIDIpitch(24, 60);
  let temperature = 1.1;
  let result = await melodyRnn.continueSequence(seed, steps, temperature);
  let combined = core.sequences.concatenate([seed, result]);
  start_note = combined.notes[0].pitch;
  console.log("start note: " +  start_note);
  patternArray = []; startArray = []; //clear arrays
  for (let note of combined.notes) {
  patternArray.push(note.pitch); //STRAIGHTFORWARD NOTE GENERATION
  startArray.push(note.quantizedStartStep / 6); //reasonable speed - could do with transport instead
  }
  zip = startArray.map(function(e,i){return [e,patternArray[i]];}); //no zip function in js!
  //SET NEW SEED
  synth_drone.triggerRelease(seedChordFreq);
  seedChordMIDI = patternArray.slice((patternArray.length - 3), patternArray.length);
  for (let i = 0; i < 3; i++) {
    seedChordFreq[i] = Tone.Frequency(seedChordMIDI[i], "midi");
  }
  rhythmSeed = [randomMIDIpitch(1, 2), randomMIDIpitch(1, 3),randomMIDIpitch(1, 2)]
  synth_drone.triggerAttack(seedChordFreq);
  console.log(zip);
}
//UI Elements
let startButton = new Nexus.TextButton('#start',{
  'size': [80, 80],
  'state': false,
  'text': 'Start',
  'alternateText': 'Stop'
});

startButton.element.style.class = "circle"; //make this circular
startButton.colorize("accent", "#12161c")

let recordButton = new Nexus.TextButton('#record', {
    'size': [150,50],
    'state': false,
    'text': 'Overdub Output',
    'alternateText': 'Stop Recording'
})
recordButton.textElement.style.cssText = 'padding: 15px 0px 15px 0px; text-align: center; font-family: Palatino; font-size: 16px; font-style: normal; font-variant: small-caps; font-weight: 400; line-height: 12px; '
recordButton.colorize("accent", "#12161c")

let grainLoop = new Nexus.TextButton('#loopGrain', {
    'size': [150,50],
    'state': false,
    'text': 'Stop Looping Grains',
    'alternateText': 'Start Looping Grains'
})
grainLoop.colorize("accent", "#12161c")
grainLoop.textElement.style.cssText = 'padding: 15px 0px 15px 0px; text-align: center; font-family: Palatino; font-size: 16px; font-style: normal; font-variant: small-caps; font-weight: 400; line-height: 12px; '

let recordMic = new Nexus.TextButton('#recordmic', {
    'size': [150,50],
    'state': false,
    'text': 'Record Input',
    'alternateText': 'Stop Recording'
})
recordMic.textElement.style.cssText = 'padding: 15px 0px 15px 0px; text-align: center; font-family: Palatino; font-size: 16px; font-style: normal; font-variant: small-caps; font-weight: 400; line-height: 12px; '
recordMic.colorize("accent", "#12161c")

let generateParts = new Nexus.RadioButton('#generateParts',{
  'size': [200,20],
  'mode': 'impulse',
  'numberOfButtons': 8,
})
generateParts.colorize("accent", "#12161c")

let grainSelectButton = new Nexus.RadioButton('#grainSelect',{
  'size': [200,20],
  'mode': 'impulse',
  'numberOfButtons': 8,
})
grainSelectButton.colorize("accent", "#12161c")

let dropdown = new Nexus.Select('#dropdown',{
  'size': [150,35],
  'options': Object.values(buf_list)
});

let spectrogram = new Nexus.Spectrogram('#spectrogram',{
  'size': [200, 200],
});
spectrogram.colorize("fill", "#DCDCDC");
spectrogram.colorize("accent", "#c93c20");

let oscilloscope = new Nexus.Oscilloscope('#oscilloscope',{
  'size': [200, 200],
})
oscilloscope.colorize("fill", "#DCDCDC");
oscilloscope.colorize("accent", "#c93c20");
//GRAIN X/Y CONTROLS
let grainsControl = new Nexus.Rack("#grains");
let grainsControl2 = new Nexus.Rack("#grains2");
//LENGTH AND LOOP SIZE
grainsControl.graincontrol1.colorize("fill","#DCDCDC");
grainsControl.graincontrol1.colorize("accent", "#11249c");
grainsControl.graincontrol1.stepX = 0.001;
grainsControl.graincontrol1.stepY = 0.001;
grainsControl.graincontrol1.y = 0.0;
grainsControl.graincontrol1.x = 0.0;
//PLAYBACK RATE AND DETUNE
grainsControl.graincontrol2.colorize("fill","#DCDCDC");
grainsControl.graincontrol2.colorize("accent", "#11249c");
grainsControl.graincontrol2.stepX = 0.01;
grainsControl.graincontrol2.stepY = 1;
grainsControl.graincontrol2.y = 0; //detune
grainsControl.graincontrol2.x = 1.0; //playback
grainsControl.graincontrol2.minY = -100;
grainsControl.graincontrol2.maxY = 100;
grainsControl.graincontrol2.minX = 0.1;
grainsControl.graincontrol2.maxX = 10;
//GRAIN SIZE & OVERLAP
grainsControl2.graincontrol3.colorize("fill","#DCDCDC");
grainsControl2.graincontrol3.colorize("accent", "#11249c");
grainsControl2.graincontrol3.x = 0.2;
grainsControl2.graincontrol3.maxX = 0.5;
grainsControl2.graincontrol3.stepX = 0.001;
grainsControl2.graincontrol3.stepY = 0.001;
grainsControl2.graincontrol3.y = 0.1;
grainsControl2.graincontrol3.minY = 0.01;
grainsControl2.graincontrol3.minX = 0.01;
grainsControl2.graincontrol3.maxY = 1.0;
//FILTER CONTROL
grainsControl2.graincontrol4.colorize("fill","#DCDCDC");
grainsControl2.graincontrol4.colorize("accent", "#11249c");
grainsControl2.graincontrol4.stepX = 10;
grainsControl2.graincontrol4.stepY = 0.01;
grainsControl2.graincontrol4.y = 0.1;
grainsControl2.graincontrol4.x = 3000; //not sure why this control appears all the way to the left
grainsControl2.graincontrol4.minX = 1000;
grainsControl2.graincontrol4.maxX = 16000;
//VOLUME SLIDERS
let volumes = new Nexus.Rack("#volumes");
let minVol = -100; let maxVol = 24; let defVol = -6; let sDefVol = -12; let sMaxVol = 12;
let volumesUI = [volumes.gVolume1, volumes.gVolume2, volumes.gVolume3, volumes.gVolume4, volumes.gVolume5, volumes.gVolume6, volumes.gVolume7, volumes.gVolume8,
                volumes.sVolume1, volumes.sVolume2, volumes.sVolume3, volumes.sVolume4, volumes.sVolume5, volumes.sVolume6, volumes.sVolume7, volumes.sVolume8];

for (let volSlider = 0; volSlider < volumesUI.length; volSlider++) {
  volumesUI[volSlider].resize(200, 20);
  volumesUI[volSlider].min = minVol;
  volumesUI[volSlider].colorize("fill", "#DCDCDC");
  volumesUI[volSlider].colorize("accent", "#DCDCDC");
  if (volSlider < 8) { //different controls for two sets of volumes
    volumesUI[volSlider].max = maxVol;
    volumesUI[volSlider].value = defVol;
  }
  else if (volSlider >= 8)
  {
    volumesUI[volSlider].max = sMaxVol;
    volumesUI[volSlider].value = sDefVol;
  }
}

volumes.grainVol.resize(200, 30);
volumes.grainVol.min = 0;
volumes.grainVol.max = 2;
volumes.grainVol.value = 1;
volumes.grainVol.colorize("fill", "#DCDCDC");
volumes.grainVol.colorize("accent", "#12161c");

volumes.synthVol.resize(200, 30);
volumes.synthVol.min = 0;
volumes.synthVol.max = 2;
volumes.synthVol.value = 1;
volumes.synthVol.colorize("fill", "#DCDCDC");
volumes.synthVol.colorize("accent", "#12161c");

volumes.droneVol.resize(200, 20);
volumes.droneVol.min = minVol;
volumes.droneVol.max = sMaxVol;
volumes.droneVol.value = -48;
volumes.droneVol.colorize("fill", "#DCDCDC");
volumes.droneVol.colorize("accent", "#12161c");
//Should rename rack
volumes.bpmSlider.min = 40;
volumes.bpmSlider.max = 200;
volumes.bpmSlider.value = 120;
volumes.bpmSlider.step = 1;
volumes.bpmSlider.colorize("fill", "#DCDCDC");
volumes.bpmSlider.colorize("accent", "#12161c");
volumes.bpmSlider.resize(200, 20);

volumes.melLengthSlider.min = 15;
volumes.melLengthSlider.max = 90;
volumes.melLengthSlider.value = 30;
volumes.melLengthSlider.step = 1;
volumes.melLengthSlider.colorize("fill", "#DCDCDC");
volumes.melLengthSlider.colorize("accent", "#12161c");
volumes.melLengthSlider.resize(200, 20);
//LINK NUMBERS TO BPM & VOLUME SLIDERS
var numBPM = new Nexus.Number('#numBPM');
var numLen = new Nexus.Number('#numLen');
// numBPM.resize(40, 20); //manual override with additional styling below
numBPM.element.style.cssText = 'width: 40px; height: 20px; text-align: center; font-family: Palatino; font-size: 14px; font-style: bold; font-variant: small-caps; font-weight: 400; line-height: 14px; background-color: transparent; '
numLen.element.style.cssText = 'width: 40px; height: 20px; text-align: center; font-family: Palatino; font-size: 14px; font-style: bold; font-variant: small-caps; font-weight: 400; line-height: 14px; background-color: transparent;'
numBPM.link(volumes.bpmSlider);
numLen.link(volumes.melLengthSlider);

let meterList = ["gMeter1", "gMeter2", "gMeter3", "gMeter4", "gMeter5", "gMeter6", "gMeter7", "gMeter8",
                "sMeter1", "sMeter2", "sMeter3", "sMeter4", "sMeter5", "sMeter6", "sMeter7", "sMeter8"];
//CONNECT AUDIO TO METERS
for (m in meterList) {
  let name = "".concat("#", meterList[m])
  meterList[m] = new Nexus.Meter(name, {size: [15, 125]});
  meterList[m].colorize("fill", "#DCDCDC");
  meterList[m].colorize("accent", "#11249c");
  if (m < 8) {
   meterList[m].connect(gVolumeList[m], 1);
 } else if (m >= 8) {
   meterList[m].connect(sVolumeList[m-8], 1);
 }
}

//UI ELEMENTS - INTERACTION
startButton.on('change',async function(v) {
  if (v == true) {
  await Tone.start();
  Tone.Transport.start();
  drawBuffer();
  synth_drone.triggerAttack(seedChordFreq, 0);
  grainSelectButton.select(grainSelect);
  }
else {
  Tone.Transport.stop();
  synth_drone.triggerRelease(seedChordFreq);
  for (grain in grain_list) {
    if (grain_list[grain].state == "started") {	grain_list[grain].stop(); grain_list[grain].state = "stopped";}
  }
  if (recorder.state == "active") {recorder.stop();}
}
})
//RECORD COMPUTER OUTPUT INTO BUFFER
recordButton.on('change',async function(v) {
  if (v == true) {
    await Tone.start();
    "Record Started"
    record();
  } else {
    recorder.stop();
    "Record Stopped"
    newBuf = true;
  }
})
//TURN LOOPING ON/OFF
grainLoop.on('change',async function(v) {
  if (v == false) {
    await Tone.start();
    grainLooping = true;
    grain_list[grainSelect].loop = true;
    grain_list[grainSelect].start();
  //  if (grain_list[grainSelect].state == "stopped") {grain_list[grainSelect].start()};
  } else {
    for (grain in grain_list) {grain_list[grain].loop = false; grain_list[grain].stop();}
    grainLooping = false;
  }
})
//RECORD INPUT
recordMic.on('change', async function(v) {
  await Tone.start();
  if (v == true) {
    mic.open().then(() => { // promise resolves when input is available
    console.log("start recording mic");
    record();
    }).catch(e => {	// promise is rejected when the user doesn't have or allow mic access
    alert("mic not available - please try accessing from https connection");
    });
  } else {
    recorder.stop();
    console.log("stop recording mic");
    mic.close();
  }
})
//CREATE AI PARTS WITH SYNTHESIS RADIOBUTTON
generateParts.on('change', async function(v) {
  if (v > -1) {
  await Tone.start();
  if (Tone.Transport.state = "stopped" || "paused") {Tone.Transport.start();}
    console.log(" grain " + v + " started!");
    generateMelody().then((e)=> { //create AI Melody for set amount of time
      //console.log("melody generated!")
      patternList[v] = new Tone.Part(((time, note) => {
        pitchShiftList[v].pitch = (note - start_note);
        synthList[v].triggerAttackRelease(Tone.Frequency(note, "midi"), "2n", time);
        if (grain_list[v].state != "started") {grain_list[v].start(time);}//
    }), zip);
      patternList[v].loop = true;
      patternList[v].loopEnd = startArray[startArray.length-1];
      patternList[v].start(Tone.now());
      volumesUI[v].colorize("accent","#12161c"); //Indicate relevant volume sliders
      volumesUI[v+8].colorize("accent","#12161c");
      grainSelectButton.select(v);
      //End melody automatically after time to record
      Tone.Transport.schedule((time) => {
  	  patternList[v].stop(time);
      patternList[v].dispose();
      grain_list[v].stop();
      console.log("patttern " + v + " ended!");
      volumesUI[v].colorize("accent","#DCDCDC"); //Recolor volume to off position
      volumesUI[v+8].colorize("accent","#DCDCDC");
   }, Tone.now() + melLength);
      states_array.push(v); //Tracker for which melodies are playing
    })
  }
  else if (v==-1){ //Turn off melody earlier manually
    let lastPlayed = states_array[states_array.length-1];
    patternList[lastPlayed].stop();  //patternList[pattern].clear();
    grain_list[lastPlayed].stop();
    console.log("stop " + patternList[lastPlayed]);
    volumesUI[lastPlayed].colorize("accent","#DCDCDC");
    volumesUI[lastPlayed+8].colorize("accent","#DCDCDC");
    states_array.pop();
    }
})

grainSelectButton.on('change', function(v) {
  if (v > -1) { //would prefer an always on reaction like bang in max/msp
  grainSelect = v;
  newBuf = true;
  spectrogram.connect(gVolumeList[v]);
  oscilloscope.connect(gVolumeList[v]);
  volumesUI[grainSelect].colorize("accent","#12161c");
  dropdown.selectedIndex = v;
    if (grainLooping == true) {
      grain_list[grainSelect].loop = true;
    };
    if (grain_list[grainSelect].state == "stopped") {grain_list[grainSelect].start()}
  }
  else {
    grain_list[grainSelect].loop = false;
    volumesUI[grainSelect].colorize("accent","#DCDCDC");
  }
})

dropdown.on('change',async function(v) {
  await Tone.start();
  let keys = Object.keys(buf_list);
  if (v.index >= 8) {
    newGrainBuf(userBufs[v.index-8]);
  }
  if (v.index < 8) {
  grain_list[grainSelect].buffer = buffers.get(keys[v.index]);
  newBuf = true; //doesn't draw correctly after record
}
});

for (let i = 0; i < 8; i++) {
    volumesUI[i].on('change', function(v) {gVolumeList[i].volume.rampTo(v,.1)});
    volumesUI[i+8].on('change', function(v) {sVolumeList[i].volume.rampTo(v,.1)});
  }

volumes.droneVol.on('change', function(v) {sVolumeList[8].volume.rampTo(v,.1)});
volumes.synthVol.on('change', function(v) { synthBusGain.gain.rampTo(v, .1)});
volumes.grainVol.on('change', function(v) {grainBusGain.gain.rampTo(v, 0.1)});
volumes.bpmSlider.on('change', function(v){Tone.Transport.bpm.value = v;});
volumes.melLengthSlider.on('change', function(v){melLength = v;});

grainsControl.graincontrol1.on('change', function(v) //AS ABOVE - MANUALLY SETTING FOR EACH BECAUSE OF NEXUS ASSIGNMENT ISSUE
        {let startend = loopsize(v.x, v.y); grain_list[grainSelect].loopStart = startend[0]; grain_list[grainSelect].loopEnd = startend[1];
         if (startend[0] > startend[1]) {grain_list[grainSelect].reverse = true;} else {grain_list[grainSelect].reverse = false;}
         if (grainLooping = true) {//smoothing attempt so that audio won't glitch constantly
                      //while redrawing buffer & loop constraints. This is better, but still not smooth.
         let oldX = v.x;
         let oldY = v.y;
         Tone.Transport.schedule((time) => {
         if (oldX == v.x && oldY == v.y) {
              newBuf = true;
           }
         }, Tone.now() + 0.1);
       } else {newBuf = true;} //all good when no looping!
     });
grainsControl.graincontrol2.on('change', function(v)
        {grain_list[grainSelect].playbackRate = v.x; grain_list[grainSelect].detune = v.y;});
grainsControl2.graincontrol3.on('change', function(v)
        {	grain_list[grainSelect].grainSize = v.x; grain_list[grainSelect].overlap = v.y;});
grainsControl2.graincontrol4.on('change', function(v) //Filter and Delay Controls
        {filterCutoff = v.x;  gFilterList[grainSelect].frequency.value = filterCutoff;
          //use Y coordinates to set delay wet level up to a point, and then add additional feedback
          if (v.y >= 0.8) {delayWet = 1; delayFeedback = (v.y * 0.4 + 0.5);}
          if (v.y < 0.8) {delayWet = v.y;}
          delayList[grainSelect].wet.value = delayWet; delayList[grainSelect].feedback.value = delayFeedback;
        });
