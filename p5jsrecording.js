let buffers;
let slicedur;

let verb;
let userAudio;
let startArray = [];
let zip = [];
let patternArray = [];
let start_note = 60;
let grainSelect = 0;

const audio = document.querySelector('audio');
const actx  = Tone.context;
const recDest  = actx.createMediaStreamDestination();
const recorder = new MediaRecorder(recDest.stream);

Nexus.context = actx._context;

const baseURL = "https://storage.googleapis.com/audioassets/";
let buf_list = {0: "Vessel1.wav", 1: "Bowl1.wav", 2: "Bowl2.wav", 3: "BattabangBell.wav", 4: "DianBell.wav", 5: "Frogs.wav", 6: "SolarSounder1.wav", 7: "WindWaves.wav"};
let grain_list = ["grain1", "grain2", "grain3", "grain4", "grain5", "grain6", "grain7", "grain8"];
let pitchShiftList = ["pitchShift1", "pitchShift2", "pitchShift3", "pitchShift4", "pitchShift5", "pitchShift6", "pitchShift7", "pitchShift8"];
let gVolumeList = ["gVolume1","gVolume2","gVolume3","gVolume4","gVolume5","gVolume6","gVolume7","gVolume8"]
let sVolumeList = ["sVolume1","sVolume2","sVolume3","sVolume4","sVolume5","sVolume6","sVolume7","sVolume8", "droneVol"]
let states_array = [];
let patternList = ["pattern1", "pattern2", "pattern3", "pattern4", "pattern5", "pattern6", "pattern7", "pattern8"]
let synthList = ["synth1", "synth2", "synth3", "synth4", "synth5", "synth6", "synth7", "synth8"]
let chorusList = ["chorus1", "chorus2", "chorus3", "chorus4", "chorus5", "chorus6", "chorus7", "chorus8"]
let filterList = ["filter1", "filter2", "filter3", "filter4", "filter5", "filter6", "filter7", "filter8"]

//
buffers = new Tone.ToneAudioBuffers({
           urls: buf_list,
           baseUrl: baseURL
        });

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
      sVolumeList[volume] = new Tone.Volume(-18);
    }

for (pattern in patternList) {
      patternList[pattern] = new Tone.Part();
    }

for (chorus in chorusList) {
      chorusList[chorus] = new Tone.Chorus ( Math.random() * 3, Math.random() * 5 , Math.random() ) //randomized rate, delay time & depth
    }

for (filt in filterList) {
      let cutoff = Math.random() * 3000 + 500;
      filterList[filt] = new Tone.AutoFilter(Math.random(), cutoff, 2);
    }


  //  synthList[synth] = new Tone.PolySynth(Tone.FMSynth);

//some variety of synths
synthList[0] = new Tone.DuoSynth();
synthList[1] = new Tone.FMSynth();
synthList[2] = new Tone.AMSynth();
synthList[3] = new Tone.Synth();
//synthList[3] = new Tone.PluckSynth(); //causes an error message re: audioworklet on load
synthList[4] = new Tone.DuoSynth();
synthList[5] = new Tone.FMSynth();
synthList[6] = new Tone.AMSynth();
synthList[7] = new Tone.MetalSynth();

for (synth in synthList) {
     synthList[synth].set({
	      envelope: {
		        attack: Math.random() * 0.2,
            decay: Math.random() * 0.25,
            sustain: Math.random() * 0.7 + 0.3,
            release: Math.random() * 0.5,
	         }
         })
     synthList[synth].sync();
}



let randomSeed = randomMIDIpitch(36, 48); //range, offset
let randomInterval1 = randomMIDIpitch(4, 3);
let randomInterval2 = randomMIDIpitch(4, 3);
let seedChordMIDI = [randomSeed, randomSeed + randomInterval1, randomSeed + randomInterval1 + randomInterval2]
let seedChordFreq = [Tone.Frequency(seedChordMIDI[0], "midi"), Tone.Frequency(seedChordMIDI[1], "midi"), Tone.Frequency(seedChordMIDI[2], "midi")];
let rhythmSeed = [randomMIDIpitch(2, 1), randomMIDIpitch(3, 1),randomMIDIpitch(2, 1)]
console.log(seedChordMIDI, rhythmSeed)

verb = new Tone.Reverb(4).toDestination();
const pingPong = new Tone.PingPongDelay("4n", 0.5);

const filter = new Tone.Filter(1500, "lowpass");

// const grainBusGain = new Tone.Gain(0).toDestination();
// const synthBusGain = new Tone.Gain(0).toDestination(); not working
verb.connect(recDest)
const autoFilter = new Tone.AutoFilter(0.1).start();

for (let i = 0; i < grain_list.length; i++) { //handle grain and synth routing together
    //grain_list[i].chain(pitchShiftList[i], gVolumeList[i], pingPong, filter, verb);
    grain_list[i].chain(pitchShiftList[i], gVolumeList[i], filter, verb);
    grain_list[i].sync();
    synthList[i].chain(sVolumeList[i], chorusList[i], filterList[i], verb);
    synthList[i].sync();
  }

let synth_drone = new Tone.PolySynth();

synth_drone.chain(sVolumeList[8], autoFilter, verb);
sVolumeList[8].volume.value = -48;

function setup() {
//noCanvas();
  let cnv = createCanvas(200, 200);
  background(220);
  // textAlign(CENTER, CENTER);
  cnv.parent('sketch-holder');
}

const cnvHeight = 200;
const cnvWidth = 200;

function drawBuffer() {
  clear();
  background(220);
  const buffer = grain_list[grainSelect].buffer.getChannelData();
  const bandSize = cnvHeight / buffer.length;
  const step = 16;
//  console.log(buffer.length)
  stroke('black');

  beginShape();
  for (let i = 0; i < buffer.length; i += 4) { // a bit less detail
    curveVertex(bandSize * i, map(buffer[i], -1, 1, cnvHeight, 0));
  }
  endShape();
}

function drawLoop() {
  clear();
  background(220);
  drawBuffer();
  loopStart = (grain_list[grainSelect].loopStart / grain_list[grainSelect].buffer.duration) * cnvWidth;
  loopEnd = (grain_list[grainSelect].loopEnd / grain_list[grainSelect].buffer.duration) * cnvWidth;
  // console.log(loopStart + " " + loopEnd);
  stroke('rgba(34,139,34,0.8)');
  fill('rgba(34,139,34,0.25)');
  beginShape();
  vertex(loopStart, cnvHeight);
  vertex(loopStart, 0);
  vertex(loopEnd, 0);
  vertex(loopEnd, cnvHeight);
  endShape();
}

function draw() {
  if (newBuf == false) {}
  else {
    drawLoop();
    newBuf = false;
  }
}


//HELPER FUNCTIONS
function loopsize(x, y) {
  slicedur = grain_list[grainSelect].buffer.duration;
	let start = slicedur * x;
	let end = (start + (slicedur * (1-y)+0.001)) % slicedur;
  console.log(start, end);
  return [start, end];
}

function randomMIDIpitch(range, offset) { //random MIDI in acceptable range
  let randompitch = Math.floor(Math.random() * range + offset);
  return randompitch;
}

let newBuf = false;

function record() {
  const chunks = [];
  recorder.start();
  recorder.ondataavailable = evt => chunks.push(evt.data);
  recorder.onstop = evt => {
  let blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
  audio.src = URL.createObjectURL(blob);
  //let blobURL = URL.createObjectURL(blob);
  console.log(audio.src);
  recordToBuf(audio.src);
  }
}

function recordToBuf (blob) {
  // var reader = new FileReader();
  // var result = await reader.readAsDataURL(blob);
    console.log(blob)// + " " + reader.readAsDataURL(blob));
    buf_list[8] = "User Sound"; //should grab file name, and separate from live input
    dropdown.defineOptions(Object.values(buf_list));
    userAudio = new Tone.ToneAudioBuffer(blob); //works with both recorded output and input
    console.log(userAudio);
    dropdown.selectedIndex = 8;

  }

//LOADS SOUND
load.onchange = function() {
  var sound = document.getElementById("sound");
  var reader = new FileReader();
  reader.onloadend = function(e) {
    actx.decodeAudioData(this.result).then(function(buffer) {
    console.log(buffer);
    buf_list[8] = "User Sound"; //should grab file name
    dropdown.defineOptions(Object.values(buf_list));
    userAudio = new Tone.ToneAudioBuffer(buffer); //Created new buffer, because
    dropdown.selectedIndex = 8;               //accessing the added buffer to buffers
  //buffers.get("[object HTMLAudioElement]").key = "8";  //by dictionary was tricky
  });
  };
  reader.readAsArrayBuffer(this.files[0]);
};

//AI
let melodyRnn = new music_rnn.MusicRNN( 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn');
let melodyRnnLoaded = melodyRnn.initialize();


async function generateMelody() {
  let seed = {
    notes: [
      {pitch: seedChordMIDI[0], quantizedStartStep: 0, quantizedEndStep: rhythmSeed[0]}, {pitch: seedChordMIDI[1], quantizedStartStep: rhythmSeed[0], quantizedEndStep: rhythmSeed[1]},
      {pitch: seedChordMIDI[2], quantizedStartStep: rhythmSeed[1], quantizedEndStep: rhythmSeed[2]},
    ],
    totalQuantizedSteps: rhythmSeed.reduce(function(a, b){return a + b;}, 0),
    quantizationInfo: { stepsPerQuarter: 4}, //speeds up, adds a bit of funkiness
  };
  let steps = randomMIDIpitch(36, 24);
  let temperature = 0.9;

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
  rhythmSeed = [randomMIDIpitch(2, 1), randomMIDIpitch(3, 1),randomMIDIpitch(2, 1)]
  synth_drone.triggerAttack(seedChordFreq);
  console.log(zip);
}

//UI Elements

let startButton = new Nexus.Button('#start',{
  'size': [80,80],
  'mode': 'toggle',
  'state': false
})

startButton.on('change',async function(v) {
  if (v == true) {
  await Tone.start();
  Tone.Transport.start();
  drawBuffer();
  console.log(Tone.Transport.bpm.value)

  synth_drone.triggerAttack(seedChordFreq, 0);
  //could use TextButton from NexusUI instead and alter shape of it potentially
  if (document.getElementById("startText").innerHTML == "Stop") {
    document.getElementById("startText").innerHTML == "Start";
  }
}
else {
  Tone.Transport.stop();
  document.getElementById("startText").innerHTML = "Stop";
  synth_drone.triggerRelease(seedChordFreq);
  for (grain in grain_list) {
    if (grain_list[grain].state == "started") {	grain_list[grain].stop(); grain_list[grain].state = "stopped";}
  }
  if (recorder.state == "active") {recorder.stop();}
}
})

let recordButton = new Nexus.TextButton('#record', {
    'size': [150,50],
    'state': false,
    'text': 'Record',
    'alternateText': 'Stop Recording'
})

recordButton.on('change',async function(v) {
  if (v == true) {
    await Tone.start();
    "Record Started"
    record();
  } else {
    recorder.stop();
    "Record Stopped"
  }
})

let grainLoop = new Nexus.TextButton('#loopGrain', {
    'size': [150,50],
    'state': false,
    'text': 'Stop Looping Grains',
    'alternateText': 'Start Looping Grains'
})

let grainLooping = true;

grainLoop.on('change',async function(v) {
  if (v == false) {
    await Tone.start();
    grainLooping = true;
    grain_list[grainSelect].loop = true;
    if (grain_list[grainSelect] == "stopped") {grain_list[grainSelect].start();}
  //  if (grain_list[grainSelect].state == "stopped") {grain_list[grainSelect].start()};
  } else {
    for (grain in grain_list) {grain_list[grain].loop = false; grain_list[grain].stop();}
    grainLooping = false;
  }
})

let recordMic = new Nexus.TextButton('#recordmic', {
    'size': [150,50],
    'state': false,
    'text': 'Record Input',
    'alternateText': 'Stop Recording'
})

const meter = new Tone.Meter();
const mic = new Tone.UserMedia().connect(meter);
mic.connect(recDest);

recordMic.on('change', async function(v) {
  await Tone.start();
  if (v == true) {
    mic.open().then(() => {
    	// promise resolves when input is available
    console.log("start recording mic");
    record();
    	// print the incoming mic levels in decibels
    //setInterval(() => console.log(meter.getValue()), 100);
    }).catch(e => {
    	// promise is rejected when the user doesn't have or allow mic access
    alert("mic not available - please try accessing from https connection");
    });
  } else {
    recorder.stop();
    console.log("stop recording mic")
    mic.close();
  }
})

//GET blob:https://www.gebrauchsmusik.com/ed782395-f93e-45c1-a76d-21dba9c8967d net::ERR_REQUEST_RANGE_NOT_SATISFIABLE

let generateParts = new Nexus.RadioButton('#generateParts',{
  'size': [200,50],
  'mode': 'impulse',
  'numberOfButtons': 8,
})

let grainSelectButton = new Nexus.RadioButton('#grainSelect',{
  'size': [200,50],
  'mode': 'impulse',
  'numberOfButtons': 8,
})

let dropdown = new Nexus.Select('#dropdown',{
  'size': [150,35],
  'options': Object.values(buf_list)
});

dropdown.on('change',async function(v) {
  await Tone.start();
  if (v.index == 8) { // clunky manual override if user loads sound
      grain_list[grainSelect].buffer = userAudio;
      grainSelectButton.select(grainSelect);
      console.log(grain_list[grainSelect])
      newBuf = true; //doesn't draw correctly after record
    }
  else { for (key in buf_list) {
    if (v.index == key)
    {
      grain_list[grainSelect].buffer = buffers.get(key);
      grainSelectButton.select(grainSelect);
      newBuf = true; //doesn't draw correctly after record
      }
    }
  }
});

generateParts.on('change', async function(v) {
  if (v > -1) {
  await Tone.start();
  if (Tone.Transport.state = "stopped" || "paused") {Tone.Transport.start();}
    console.log(" grain " + v + " started!");
    generateMelody().then((e)=> {
    //  const lfo = new Tone.LFO(3, 0.5, 3).start();
      patternList[v] = new Tone.Part(((time, note) => {
        pitchShiftList[v].pitch = (note - start_note);
      //  let overtones = [Tone.Frequency(note, "midi"), Tone.Frequency(note, "midi") * 2, Tone.Frequency(note, "midi") * 3]
        synthList[v].triggerAttackRelease(Tone.Frequency(note, "midi"), "1n", time);
        if (grain_list[v].state != "started") {grain_list[v].start(time);}//
        //lfo.connect(synth.harmonicity);
    }), zip);
      patternList[v].loop = true;
      patternList[v].loopEnd = startArray[startArray.length-1];
      patternList[v].start(Tone.now());
      Tone.Transport.schedule((time) => {
  	  patternList[v].stop(time);
      patternList[v].dispose();
      synthList[v].triggerRelease();
      console.log("patttern " + v + " ended!")
   }, 30);
      //patternList[pattern].clear(Tone.now() + 30);
      states_array.push(v);
    })
  }
  else if (v==-1){
    patternList[states_array[states_array.length-1]].stop();  //patternList[pattern].clear();
    grain_list[states_array[states_array.length-1]].stop();
    console.log("stop " + patternList[states_array[states_array.length-1]]);
    states_array.pop();
    }
})

grainSelectButton.on('change', function(v) {
  if (v > -1) {
   //would prefer an always on reaction like bang in max/msp
  if (grainLooping == true) {
    // grain_list[grainSelect].loop = false; allow multiple loops to accumulate
    grainSelect = v;
    //console.log(grain_list[grainSelect]);
    grain_list[grainSelect].loop = true;
  } else {grainSelect = v}
  newBuf = true;
  if (grain_list[grainSelect].state == "stopped") {grain_list[grainSelect].start()};
} else {
  {grain_list[grainSelect].loop = false;}
}
})

let grainsControl = new Nexus.Rack("#grains");
let grainsControl2 = new Nexus.Rack("#grains2");

//TO DO: CREATE ARRAY FOR GRAIN CONTROLS - FIRST ATTEMT DIDN'T WORK WITH NEXUS, SO CLUNKY RIGHT NOW

//LENGTH AND LOOP SIZE
grainsControl.graincontrol1.colorize("fill","#333")
grainsControl.graincontrol1.stepX = 0.0001;
grainsControl.graincontrol1.stepY = 0.0001;
grainsControl.graincontrol1.y = 0.0;
grainsControl.graincontrol1.x = 0.0;

//PLAYBACK RATE AND DETUNE
grainsControl.graincontrol2.colorize("fill","#666")
grainsControl.graincontrol2.stepX = 0.01;
grainsControl.graincontrol2.stepY = 0.01;
grainsControl.graincontrol2.y = 0; //detune
grainsControl.graincontrol2.x = 1.0; //playback
grainsControl.graincontrol2.minY = -100;
grainsControl.graincontrol2.maxY = 100;
grainsControl.graincontrol2.minX = 0.1;
grainsControl.graincontrol2.maxX = 10;

//GRAIN SIZE & OVERLAP
grainsControl2.graincontrol3.colorize("fill","#333")
grainsControl2.graincontrol3.x = 0.2;
grainsControl2.graincontrol3.maxX = 0.4;
grainsControl2.graincontrol3.stepX = 0.0001;
grainsControl2.graincontrol3.stepY = 0.0001;
grainsControl2.graincontrol3.y = 0.1;
grainsControl2.graincontrol3.minY = 0.0001;
grainsControl2.graincontrol3.minX = 0.0001;
grainsControl2.graincontrol3.maxY = 0.8;

//FILTER CONTROL
grainsControl2.graincontrol4.colorize("fill","#333")
grainsControl2.graincontrol4.stepX = 0.0001;
grainsControl2.graincontrol4.stepY = 0.0001;
grainsControl2.graincontrol4.y = 0.0;
grainsControl2.graincontrol4.x = 0.0;



let volumes = new Nexus.Rack("#volumes");
//for (volume in volumeList) { //AUTOMATIC ASSIGNMENT DOESN'T WORK WITH NEXUSUI
let minVol = -100; let maxVol = 24; let defVol = -6; let sDefVol = -18; let sMaxVol = 12;

volumes.gVolume1.resize(150, 25);
volumes.gVolume1.min = minVol;
volumes.gVolume1.max = maxVol;
volumes.gVolume1.value = defVol;

volumes.gVolume2.resize(150, 25);
volumes.gVolume2.min = minVol;
volumes.gVolume2.max = maxVol;
volumes.gVolume2.value = defVol;

volumes.gVolume3.resize(150, 25);
volumes.gVolume3.min = minVol;
volumes.gVolume3.max = maxVol;
volumes.gVolume3.value = defVol;

volumes.gVolume4.resize(150, 25);
volumes.gVolume4.min = minVol;
volumes.gVolume4.max = maxVol;
volumes.gVolume4.value = defVol;

volumes.gVolume5.resize(150, 25);
volumes.gVolume5.min = minVol;
volumes.gVolume5.max = maxVol;
volumes.gVolume5.value = defVol;

volumes.gVolume6.resize(150, 25);
volumes.gVolume6.min = minVol;
volumes.gVolume6.max = maxVol;
volumes.gVolume6.value = defVol;

volumes.gVolume7.resize(150, 25);
volumes.gVolume7.min =  minVol;
volumes.gVolume7.max = maxVol;
volumes.gVolume7.value = defVol;

volumes.gVolume8.resize(150, 25);
volumes.gVolume8.min = minVol;
volumes.gVolume8.max = maxVol;
volumes.gVolume8.value = defVol;

//synth sliders
volumes.sVolume1.resize(150, 25);
volumes.sVolume1.min = minVol;
volumes.sVolume1.max = sMaxVol;
volumes.sVolume1.value = sDefVol;

volumes.sVolume2.resize(150, 25);
volumes.sVolume2.min = minVol;
volumes.sVolume2.max = sMaxVol;
volumes.sVolume2.value = sDefVol;

volumes.sVolume3.resize(150, 25);
volumes.sVolume3.min = minVol;
volumes.sVolume3.max = sMaxVol;
volumes.sVolume3.value = sDefVol;

volumes.sVolume4.resize(150, 25);
volumes.sVolume4.min = minVol;
volumes.sVolume4.max = sMaxVol;
volumes.sVolume4.value = sDefVol;

volumes.sVolume5.resize(150, 25);
volumes.sVolume5.min = minVol;
volumes.sVolume5.max = sMaxVol;
volumes.sVolume5.value = sDefVol;

volumes.sVolume6.resize(150, 25);
volumes.sVolume6.min = minVol;
volumes.sVolume6.max = sMaxVol;
volumes.sVolume6.value = sDefVol;

volumes.sVolume7.resize(150, 25);
volumes.sVolume7.min =  minVol;
volumes.sVolume7.max = sMaxVol;
volumes.sVolume7.value = sDefVol;

volumes.sVolume8.resize(150, 25);
volumes.sVolume8.min = minVol;
volumes.sVolume8.max = sMaxVol;
volumes.sVolume8.value = sDefVol;

volumes.droneVol.min = minVol;
volumes.droneVol.max = sMaxVol;
volumes.droneVol.value = -48;

volumes.grainVol.min = minVol;
volumes.grainVol.max = maxVol;
volumes.grainVol.value = defVol;

volumes.synthVol.min = minVol;
volumes.synthVol.max = maxVol;
volumes.synthVol.value = sDefVol;

let bpm = new Nexus.Slider("#bpm", {
  "min": 40,
  "max": 200,
  "value": 120
});

bpm.on('change', function(v){console.log(v); Tone.Transport.bpm.value = v;});

let gMeter1 = new Nexus.Meter("#gMeter1", {size: [15, 100]});
let gMeter2 = new Nexus.Meter("#gMeter2", {size: [15, 100]});
let gMeter3 = new Nexus.Meter("#gMeter3", {size: [15, 100]});
let gMeter4 = new Nexus.Meter("#gMeter4", {size: [15, 100]});
let gMeter5 = new Nexus.Meter("#gMeter5", {size: [15, 100]});
let gMeter6 = new Nexus.Meter("#gMeter6", {size: [15, 100]});
let gMeter7 = new Nexus.Meter("#gMeter7", {size: [15, 100]});
let gMeter8 = new Nexus.Meter("#gMeter8", {size: [15, 100]});

gMeter1.connect(gVolumeList[0], 1); // for metering
gMeter2.connect(gVolumeList[1], 1);
gMeter3.connect(gVolumeList[2], 1);
gMeter4.connect(gVolumeList[3], 1);
gMeter5.connect(gVolumeList[4], 1);
gMeter6.connect(gVolumeList[5], 1);
gMeter7.connect(gVolumeList[6], 1);
gMeter8.connect(gVolumeList[7], 1);


grainsControl.graincontrol1.on('change', function(v) //AS ABOVE - MANUALLY SETTING FOR EACH BECAUSE OF NEXUS ASSIGNMENT ISSUE
        {let startend = loopsize(v.x, v.y); grain_list[grainSelect].loopStart = startend[0]; grain_list[grainSelect].loopEnd = startend[1];
         if (startend[0] > startend[1]) {grain_list[grainSelect].reverse = true;} else {grain_list[grainSelect].reverse = false;}
       drawLoop();
     });
grainsControl.graincontrol2.on('change', function(v)
        {grain_list[grainSelect].playbackRate = v.x; grain_list[grainSelect].detune = v.y;});
grainsControl2.graincontrol3.on('change', function(v)
        {	grain_list[grainSelect].grainSize = v.x; grain_list[grainSelect].overlap = v.y;});
grainsControl2.graincontrol4.on('change', function(v) //to add filter control
        {grain_list[grainSelect].playbackRate = v.x; grain_list[grainSelect].detune = v.y;});

// for (let index = 0; index < volumeList.length; index++) { NOT WORKING WITH ASSIGNMENT TO NEXUSUI

// }
volumes.gVolume1.on('change', function(v) {gVolumeList[0].volume.rampTo(v,.1)});
volumes.gVolume2.on('change', function(v) {gVolumeList[1].volume.rampTo(v,.1)});
volumes.gVolume3.on('change', function(v) {gVolumeList[2].volume.rampTo(v,.1)});
volumes.gVolume4.on('change', function(v) {gVolumeList[3].volume.rampTo(v,.1)});
volumes.gVolume5.on('change', function(v) {gVolumeList[4].volume.rampTo(v,.1)});
volumes.gVolume6.on('change', function(v) {gVolumeList[5].volume.rampTo(v,.1)});
volumes.gVolume7.on('change', function(v) {gVolumeList[6].volume.rampTo(v,.1)});
volumes.gVolume8.on('change', function(v) {gVolumeList[7].volume.rampTo(v,.1)});

volumes.sVolume1.on('change', function(v) {sVolumeList[0].volume.rampTo(v,.1)});
volumes.sVolume2.on('change', function(v) {sVolumeList[1].volume.rampTo(v,.1)});
volumes.sVolume3.on('change', function(v) {sVolumeList[2].volume.rampTo(v,.1)});
volumes.sVolume4.on('change', function(v) {sVolumeList[3].volume.rampTo(v,.1)});
volumes.sVolume5.on('change', function(v) {sVolumeList[4].volume.rampTo(v,.1)});
volumes.sVolume6.on('change', function(v) {sVolumeList[5].volume.rampTo(v,.1)});
volumes.sVolume7.on('change', function(v) {sVolumeList[6].volume.rampTo(v,.1)});
volumes.sVolume8.on('change', function(v) {sVolumeList[7].volume.rampTo(v,.1)});

volumes.droneVol.on('change', function(v) {sVolumeList[8].volume.rampTo(v,.1)});
volumes.synthVol.on('change', function(v) { //bleed was coming through synthBusVol bus, so just creating a control link to individual volumes - not ideal
  for (volume in sVolumeList) {
      sVolumeList[volume].volume.rampTo(v,.1)}
    });
volumes.grainVol.on('change', function(v) {
  for (volume in gVolumeList) {
    gVolumeList[volume].volume.rampTo(v,.1)}
    });
