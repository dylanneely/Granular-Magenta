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
let userBufs = [];

const audio = document.querySelector('audio');
const actx  = Tone.context;
const recDest  = actx.createMediaStreamDestination();
const recorder = new MediaRecorder(recDest.stream);

//const meter = new Tone.Meter();
const mic = new Tone.UserMedia();//.connect(meter);
mic.connect(recDest);

Nexus.context = actx._context;

const baseURL = "https://storage.googleapis.com/audioassets/";
let bufList = {0: "Vessel1.wav", 1: "Bowl1.wav", 2: "Bowl2.wav", 3: "BattabangBell.wav", 4: "DianBell.wav", 5: "Frogs.wav", 6: "SolarSounder1.wav", 7: "WindWaves.wav"};
let bufOrder = {...bufList};
let bufListLength = Object.keys(bufList).length; // 8
let grainList = ["grain1", "grain2", "grain3", "grain4", "grain5", "grain6", "grain7", "grain8"];
let pitchShiftList = ["pitchShift1", "pitchShift2", "pitchShift3", "pitchShift4", "pitchShift5", "pitchShift6", "pitchShift7", "pitchShift8"];
let gVolumeList = ["gVolume1","gVolume2","gVolume3","gVolume4","gVolume5","gVolume6","gVolume7","gVolume8"]
let sVolumeList = ["sVolume1","sVolume2","sVolume3","sVolume4","sVolume5","sVolume6","sVolume7","sVolume8", "droneVol"]
let statesArray = [];
let patternList = ["pattern1", "pattern2", "pattern3", "pattern4", "pattern5", "pattern6", "pattern7", "pattern8"]
let synthList = ["synth1", "synth2", "synth3", "synth4", "synth5", "synth6", "synth7", "synth8"]
let phaserList = ["chorus1", "chorus2", "chorus3", "chorus4", "chorus5", "chorus6", "chorus7", "chorus8"]
let sFilterList = ["filter1", "filter2", "filter3", "filter4", "filter5", "filter6", "filter7", "filter8"]
let delayList = ["delay1", "delay2", "delay3", "delay4", "delay5", "delay6", "delay7", "delay8"]
let gFilterList = ["filter1", "filter2", "filter3", "filter4", "filter5", "filter6", "filter7", "filter8"]

let delayWet = 0.1;
let delayFeedback = 0.5;
let filterCutoff = 3000;

//CREATE OUR BUFFERS
buffers = new Tone.ToneAudioBuffers({
           urls: bufList,
           baseUrl: baseURL
        });

//CREATE OUR PLAYERS & PROCESSING NODES
for (grainNum in grainList) {
        grainList[grainNum] = new Tone.GrainPlayer(buffers.get(grainNum));
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

for (phaser in phaserList) {
     phaserList[phaser] = new Tone.Phaser ( Math.random() * 2, Math.random() * 3, Math.random() * 1000 + 200 ); //randomized rate, delay time & depth
     phaserList[phaser].wet = 0.5;
    }

for (filt in sFilterList) {
      let cutoff = randomMIDIpitch(800, 2400);
      let octaves = randomMIDIpitch(1, 3);
      sFilterList[filt] = new Tone.AutoFilter(Math.random(), cutoff, octaves); //oscillation rate up to 1 Hz
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
synthList[2] = new Tone.DuoSynth(); synthList[2].harmonicity.value = 0.5; synthList[2].volume.value = -24;
synthList[3] = new Tone.Synth();
synthList[4] = new Tone.AMSynth(); synthList[4].modulation = "triangle";
synthList[5] = new Tone.FMSynth(); synthList[5].modulationIndex = 5; synthList[5].harmonicity = 2;
synthList[6] = new Tone.DuoSynth(); synthList[6].volume.value = -24;
synthList[7] = new Tone.Synth(); synthList[7].oscillator = "sine8";

for (synth in synthList) {
     synthList[synth].set({
	      envelope: {
		        attack: Math.random() * 0.1,
            decay: Math.random() * 0.1,
            sustain: Math.random() * 0.3 + 0.7,
            release: Math.random() * 0.3,
	         }
         })
     synthList[synth].sync();
     if (synth == 0 || synth == 1 || synth ==  4 || synth ==  5) { //AM & FM Synths
       synthList[synth].set({
         modulationEnvelope : {
            attack : Math.random() * 0.1,
            decay : 0,
            sustain : 1,
            release : Math.random() * 0.3,
            }
          })
        }
}
//CREATE SYNTH DRONE IN BACKGROUND
const autoFilter = new Tone.AutoFilter(0.1).start();
let synthDrone = new Tone.PolySynth();
sVolumeList[8].volume.value = -48;

//VARIABLES FOR AI GENERATION SEEDS - USED TO RANDOMIZE SYNTH DRONE AS WELL
let randomSeed = randomMIDIpitch(45, 76); //A2 - E5 for initial seed
let randomInterval1 = randomMIDIpitch(3, 5); //these two intervals determine the extent to which this is a tonal instrument
let randomInterval2 = randomMIDIpitch(3, 5);
let seedChordMIDI = [randomSeed, randomSeed + randomInterval1, randomSeed + randomInterval1 + randomInterval2]
let seedChordFreq = [Tone.Frequency(seedChordMIDI[0], "midi"), Tone.Frequency(seedChordMIDI[1], "midi"), Tone.Frequency(seedChordMIDI[2], "midi")];
let rhythmSeed = [randomMIDIpitch(1, 2), randomMIDIpitch(1, 2),randomMIDIpitch(1, 2)]
console.log(seedChordMIDI, rhythmSeed)

//CONNECT EVERYTHING UP
const grainBusGain = new Tone.Gain(1).toDestination();
const synthBusGain = new Tone.Gain(1).toDestination();
const verbGain = new Tone.Gain(1).toDestination();
grainBusGain.connect(recDest); //connect these independent of verb to avoid muddying output record
synthBusGain.connect(recDest);
synthDrone.chain(sVolumeList[8], autoFilter, synthBusGain, verb, verbGain);
synthDrone.chain(sVolumeList[8], autoFilter, synthBusGain);

for (let i = 0; i < grainList.length; i++) { //handle grain and synth routing together
    grainList[i].chain(pitchShiftList[i], delayList[i], gFilterList[i], gVolumeList[i], grainBusGain);
    grainList[i].chain(pitchShiftList[i], delayList[i], gFilterList[i], gVolumeList[i], grainBusGain, verb, verbGain);
    grainList[i].sync();
    synthList[i].chain(phaserList[i], sFilterList[i], sVolumeList[i], synthBusGain);
    synthList[i].chain(phaserList[i], sFilterList[i], sVolumeList[i], synthBusGain,  verb, verbGain);
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
    sketch.textFont("Garamond");
    sketch.textSize(20);
    sketch.textAlign(sketch.CENTER, sketch.CENTER);
  };

  sketch.draw = () => {
      if (newBuf == false) {}
      else {
        bufData = grainList[grainSelect].buffer.getChannelData(); //moved this here from drawbuffer, so it wouldn't need to be called as often
        drawLoop();
        newBuf = false;
      }
  };
};
let p = new p5(s, document.getElementById('sketch-holder'));

let bufData;
function drawBuffer() {
  p.clear();
  p.background(220);
  p.stroke("#11249c");
  p.strokeWeight(1);
  p.fill("#11249c");
  p.text(bufOrder[grainSelect], cnvWidth/2, 20);
  p.strokeWeight(2);
  p.fill('rgba(220,220,220, 0)');
  p.rect(0, 0, cnvWidth, cnvHeight);
  const bandSize = cnvWidth / bufData.length;
  p.stroke("#11249c");
  p.beginShape();
  for (let i = 0; i < bufData.length; i += 4) { // a bit less detail
    p.curveVertex(bandSize * i, p.map(bufData[i], -1, 1, cnvHeight, 0));
  }
  p.endShape();
}
function drawLoop() { //redrawing buffer on every call slows down audio when redrawing loop using position dial.
                      //What's the solution without multiple threads? I've tried slightly slowing frame rate, but don't want drawing to look laggy
                      //Even a 1fps rate doesn't solve problem w/r/t audio. Not drawing buffer as often helps, but setting the loop needs to feel responsive.
  drawBuffer();
  loopStart = (grainList[grainSelect].loopStart / grainList[grainSelect].buffer.duration) * cnvWidth;
  loopEnd = (grainList[grainSelect].loopEnd / grainList[grainSelect].buffer.duration) * cnvWidth;
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
  slicedur = grainList[grainSelect].buffer.duration;
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

async function recordToBuf (blob) {
    userAudio = await new Tone.ToneAudioBuffer(blob); //works with both recorded output and input
    bufList[bufListLength] = "User Sound " + (bufListLength - 7); //add to dropdown list
    userBufs.push(userAudio); //keep track of user buffers
    dropdown.defineOptions(Object.values(bufList)); //reorder dropdown list
    dropdown.selectedIndex = bufListLength; //triggers newGrainBuf
    bufListLength++;
    document.getElementById("audioshow").style.display = "block";
  }

async function newGrainBuf(userAudioIndex) { //set buffer
    Tone.Transport.schedule((time) => { //double-check to draw buffer, since it's failing ~20% of the time
      newBuf = true}, Tone.now() + 0.1);
    grainList[grainSelect].buffer = await userBufs[userAudioIndex];
    console.log(grainList[grainSelect]);
    //save location of grainselect with where buffer is in buflist
    bufOrder[grainSelect] = bufList[userAudioIndex+8];
    newBuf = true; //draw new buffer
  }

// function pitchDetector () //TO DO: TRIGGERED AT BEGINNING OF GENERATE MELODY. WILL SET SEED PITCH
// TRIED USING CREPE PORT TO ML5JS. HOWEVER, THE MODEL IS TRAINED AT 16KHZ SAMPLES, AND THE CLASS IS
// CONSTRICTED TO ONLY WORK WITH MIC INPUT STREAM. WOULD NEED TO WRITE NEW CLASS - WILL USE FFT FOR NOW
//TRY USING PITCHFINDER JS INSTEAD

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
  let steps = randomMIDIpitch(28, 60);
  let temperature = 0.9;
  let result = await melodyRnn.continueSequence(seed, steps, temperature);
  let combined = core.sequences.concatenate([seed, result]);
  start_note = combined.notes[0].pitch;
  // console.log("start note: " +  start_note);
  patternArray = []; startArray = []; //clear arrays
  for (let note of combined.notes) {
  patternArray.push(note.pitch); //STRAIGHTFORWARD NOTE GENERATION
  startArray.push(note.quantizedStartStep / 6); //reasonable speed - could do with transport instead
  }
  zip = startArray.map(function(e,i){return [e,patternArray[i]];}); //no zip function in js!
  //SET NEW SEED
  synthDrone.triggerRelease(seedChordFreq);
  seedChordMIDI = patternArray.slice((patternArray.length - 3), patternArray.length);
  for (let i = 0; i < 3; i++) {
    seedChordFreq[i] = Tone.Frequency(seedChordMIDI[i], "midi");
  }
  rhythmSeed = [randomMIDIpitch(1, 2), randomMIDIpitch(1, 2),randomMIDIpitch(1, 2)]
  synthDrone.triggerAttack(seedChordFreq);
  console.log(zip);
}
//UI Elements
let startButton = new Nexus.TextButton('#start',{
  'size': [80, 80], //manually set below
  'state': false,
  'text': 'Start',
  'alternateText': 'Stop'
});
//startButton.element.style.class = "circle";  //make this circular
startButton.textElement.style.cssText = 'padding: 30px 5px 30px 5px; text-align: center; font-family: Garamond; font-size: 22px; font-style: normal; font-weight: 400; line-height: 12px; '
startButton.colorize("accent", "#12161c");


let recordButton = new Nexus.TextButton('#record', {
    'size': [150,50],
    'state': false,
    'text': 'Overdub',
    'alternateText': 'Stop Recording'
})
recordButton.textElement.style.cssText = 'padding: 15px 0px 15px 0px; text-align: center; font-family: Garamond; font-size: 16px; font-style: normal; font-weight: 400; line-height: 12px; '
recordButton.colorize("accent", "#12161c")

let grainLoop = new Nexus.TextButton('#loopGrain', {
    'size': [150,50],
    'state': false,
    'text': 'Stop Looping Sounds',
    'alternateText': 'Start Looping Sounds'
})
grainLoop.colorize("accent", "#12161c")
grainLoop.textElement.style.cssText = 'padding: 15px 0px 15px 0px; text-align: center; font-family: Garamond; font-size: 16px; font-style: normal; font-variant: normal; font-weight: 400; line-height: 12px; '

let recordMic = new Nexus.TextButton('#recordmic', {
    'size': [150,50],
    'state': false,
    'text': 'Record Input',
    'alternateText': 'Stop Recording'
})
recordMic.textElement.style.cssText = 'padding: 15px 0px 15px 0px; text-align: center; font-family: Garamond; font-size: 16px; font-style: normal; font-variant: normal; font-weight: 400; line-height: 12px; '
recordMic.colorize("accent", "#12161c");

let autoplay = new Nexus.TextButton('#autoplay', {
    'size': [80,40],
    'state': false,
    'text': 'Autoplay'
})
autoplay.textElement.style.cssText = 'padding: 5px 5px 5px 5px; text-align: center; font-family: Garamond; font-size: 12px; font-style: normal; font-weight: 400; line-height: 12px; '
autoplay.colorize("accent", "#12161c");


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
  'options': Object.values(bufList)
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
grainsControl.graincontrol2.minY = -1200;
grainsControl.graincontrol2.maxY = 1200;
grainsControl.graincontrol2.minX = 0.1;
grainsControl.graincontrol2.maxX = 10;
//GRAIN SIZE & OVERLAP
grainsControl2.graincontrol3.colorize("fill","#DCDCDC");
grainsControl2.graincontrol3.colorize("accent", "#11249c");
grainsControl2.graincontrol3.x = 0.2;
grainsControl2.graincontrol3.maxX = 2.0;
grainsControl2.graincontrol3.stepX = 0.001;
grainsControl2.graincontrol3.stepY = 0.001;
grainsControl2.graincontrol3.y = 0.1;
grainsControl2.graincontrol3.minY = 0.01;
grainsControl2.graincontrol3.minX = 0.01;
grainsControl2.graincontrol3.maxY = 2.0;
//FILTER CONTROL
grainsControl2.graincontrol4.colorize("fill","#DCDCDC");
grainsControl2.graincontrol4.colorize("accent", "#11249c");
grainsControl2.graincontrol4.stepX = 10;
grainsControl2.graincontrol4.stepY = 0.01;
grainsControl2.graincontrol4.y = 0.1;
grainsControl2.graincontrol4.x = 3000; //not sure why this control appears all the way to the left
grainsControl2.graincontrol4.minX = 1000;
grainsControl2.graincontrol4.maxX = 16000;

let grainsControlRecall = ["recall1", "recall2", "recall3", "recall4", "recall5", "recall6", "recall7", "recall8"]
for (recall in grainsControlRecall) { //maybe there is a cleaner control structure to maintain recalls for pads for all 8 grain select buttons!
  grainsControlRecall[recall] = [[grainsControl.graincontrol1.x, 0.001], [grainsControl.graincontrol2.x, grainsControl.graincontrol2.y],
                              [grainsControl2.graincontrol3.x, grainsControl2.graincontrol3.y], [grainsControl2.graincontrol4.x, grainsControl2.graincontrol4.y]]
}

//VOLUME SLIDERS
let volumes = new Nexus.Rack("#volumes");
let minVol = -80; let maxVol = 24; let defVol = 0; let sDefVol = -12; let sMaxVol = 12;
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
volumes.verbVol.min = 0.0;
volumes.verbVol.max = 2.0;
volumes.verbVol.value = 1;
volumes.verbVol.step = 0.01;
volumes.verbVol.colorize("fill", "#DCDCDC");
volumes.verbVol.colorize("accent", "#12161c");
volumes.verbVol.resize(200, 20);

volumes.melLengthSlider.min = 15;
volumes.melLengthSlider.max = 90;
volumes.melLengthSlider.value = 30;
volumes.melLengthSlider.step = 1;
volumes.melLengthSlider.colorize("fill", "#DCDCDC");
volumes.melLengthSlider.colorize("accent", "#12161c");
volumes.melLengthSlider.resize(200, 20);
//LINK NUMBER TO MELODY LENGTH SLIDER
var numLen = new Nexus.Number('#numLen');
numLen.element.style.cssText = 'width: 20px; height: 15px; text-align: center; font-family: Garamond; font-size: 14px; font-style: bold; font-variant: normal; font-weight: 400; line-height: 14px; background-color: transparent;'
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
  synthDrone.triggerAttack(seedChordFreq, 0);
  grainSelectButton.select(grainSelect);
  }
else {
  Tone.Transport.stop();
  synthDrone.triggerRelease(seedChordFreq);
  for (grain in grainList) {
    if (grainList[grain].state == "started") {	grainList[grain].stop(); grainList[grain].state = "stopped";}
  }
  if (recorder.state == "active") {recorder.stop();}
}
})
//RECORD COMPUTER OUTPUT INTO BUFFER
recordButton.on('change',async function(v) {
  await Tone.start();
  if (v == true) {
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
    grainList[grainSelect].loop = true;
    grainList[grainSelect].start();
  //  if (grainList[grainSelect].state == "stopped") {grainList[grainSelect].start()};
  } else {
    for (grain in grainList) {grainList[grain].loop = false; grainList[grain].stop();}
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

// function pitchDetector () //TO DO: TRIGGERED AT BEGINNING OF GENERATE MELODY. WILL SET SEED PITCH
// TRIED USING CREPE PORT TO ML5JS. HOWEVER, THE MODEL IS TRAINED AT 16KHZ SAMPLES, AND THE CLASS IS
// CONSTRICTED TO ONLY WORK WITH MIC INPUT STREAM. ADDITIONALLY, CURRENTLY USES DEPRECATED CREATESCRIPTPROCESSOR.
//WOULD LIKE TO DEVELOP / CONTRIBUTE TO ML5JS TO MODERNIZE THIS CLASS AND INCLUDE FUNCTIONALITY FOR BUFFERS

//CREATE AI PARTS WITH SYNTHESIS RADIOBUTTON
generateParts.on('change', async function(v) {
  if (v > -1) {
  await Tone.start();
  if (Tone.Transport.state = "stopped" || "paused") {Tone.Transport.start();}
    console.log(" grain " + v + " started!");
    generateMelody().then((e)=> { //create AI Melody for set amount of time
      //console.log("melody generated!")
      grainSelectButton.select(v);
      patternList[v] = new Tone.Part(((time, note) => {
        pitchShiftList[v].pitch = (note - start_note);
        let randomlength = randomMIDIpitch(0, 3); //reusing array of lengths below
        synthList[v].triggerAttackRelease(Tone.Frequency(note, "midi"), delayLengths[randomlength], time);
        // grainList[v].start();
    }), zip).start(Tone.now());
      patternList[v].loop = true;
      patternList[v].loopEnd = startArray[startArray.length-1];
      volumesUI[v].colorize("accent","#12161c"); //Indicate relevant volume sliders
      volumesUI[v+8].colorize("accent","#12161c");
      //End melody automatically after time to record
      Tone.Transport.schedule((time) => {
  	  patternList[v].stop();
      patternList[v].dispose();
      console.log("patttern " + v + " ended!");
      if (grainLooping == false) {volumesUI[v].colorize("accent","#DCDCDC"); //Recolor volume to off position
      grainList[v].stop();} //leave grains going unless looping is off
      volumesUI[v+8].colorize("accent","#DCDCDC");
   }, Tone.now() + melLength);
      statesArray.push(v); //Tracker for which melodies are playing
    })
  }
  else if (v==-1){ //Turn off melody earlier manually
    let lastPlayed = statesArray[statesArray.length-1];
    patternList[lastPlayed].stop();  //patternList[pattern].clear();
    grainList[lastPlayed].stop();
    console.log("stop " + patternList[lastPlayed]);
    volumesUI[lastPlayed].colorize("accent","#DCDCDC");
    volumesUI[lastPlayed+8].colorize("accent","#DCDCDC");
    statesArray.pop();
    }
})

grainSelectButton.on('change', function(v) {
  if (v > -1) { //would prefer an always on reaction like bang in max/msp
  grainSelect = v;
  newBuf = true;
  spectrogram.connect(gVolumeList[v]);
  oscilloscope.connect(gVolumeList[v]);
  volumesUI[grainSelect].colorize("accent","#12161c");
    if (grainLooping == true) {
      grainList[grainSelect].loop = true;
    };
    if (grainList[grainSelect].state == "stopped") {grainList[grainSelect].start();}
    //check that X/Y pads correspond to current part
      grainsControl.graincontrol1.x = grainsControlRecall[grainSelect][0][0];
      grainsControl.graincontrol1.y = grainsControlRecall[grainSelect][0][1];
      grainsControl.graincontrol2.x = grainsControlRecall[grainSelect][1][0];
      grainsControl.graincontrol2.y = grainsControlRecall[grainSelect][1][1];
      grainsControl2.graincontrol3.x =grainsControlRecall[grainSelect][2][0];
      grainsControl2.graincontrol3.y =grainsControlRecall[grainSelect][2][1];
      grainsControl2.graincontrol4.x = grainsControlRecall[grainSelect][3][0];
      grainsControl2.graincontrol4.y = grainsControlRecall[grainSelect][3][1];
  }
  else {
    grainList[grainSelect].loop = false;
    volumesUI[grainSelect].colorize("accent","#DCDCDC");
  }
})

dropdown.on('change',async function(v) {
  await Tone.start();
  let keys = Object.keys(bufList);
  if (v.index >= 8) {
    newGrainBuf(v.index-8);
  }
  if (v.index < 8) {
  grainList[grainSelect].buffer = buffers.get(keys[v.index]);
  bufOrder[grainSelect] = bufList[v.index];
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
volumes.verbVol.on('change', function(v){verbGain.gain.rampTo(v, 0.1)});
volumes.melLengthSlider.on('change', function(v){melLength = v; console.log(melLength)});

grainsControl.graincontrol1.on('change', function(v)
        {let startend = loopsize(v.x, v.y); grainList[grainSelect].loopStart = startend[0]; grainList[grainSelect].loopEnd = startend[1];
         if (startend[0] > startend[1]) {grainList[grainSelect].reverse = true;} else {grainList[grainSelect].reverse = false;}
         let oldX = v.x; //smoothing attempt so that audio won't glitch constantly
         let oldY = v.y; //while redrawing buffer & loop constraints. This is better, but still not smooth.
         Tone.Transport.schedule((time) => {
         if (oldX == v.x && oldY == v.y) {
              newBuf = true; //redraw
              grainsControlRecall[grainSelect][0][0] = v.x; //set recall values
              grainsControlRecall[grainSelect][0][1] = v.y;
           }
         }, Tone.now() + 0.1);
     });
grainsControl.graincontrol2.on('change', function(v)
        {grainList[grainSelect].playbackRate = v.x; grainList[grainSelect].detune = v.y;
          let oldX = v.x; //sets the recall when the player stops moving the control
          let oldY = v.y;
          Tone.Transport.schedule((time) => {
          if (oldX == v.x && oldY == v.y) {
               grainsControlRecall[grainSelect][1][0] = v.x; //set recall values
               grainsControlRecall[grainSelect][1][1] = v.y;
            }
          }, Tone.now() + 0.1);
         });
grainsControl2.graincontrol3.on('change', function(v)
        {	grainList[grainSelect].grainSize = v.x; grainList[grainSelect].overlap = v.y;
          let oldX = v.x; //sets the recall when the player stops moving the control
          let oldY = v.y;
          Tone.Transport.schedule((time) => {
          if (oldX == v.x && oldY == v.y) {
               grainsControlRecall[grainSelect][2][0] = v.x; //set recall values
               grainsControlRecall[grainSelect][2][1] = v.y;
            }
          }, Tone.now() + 0.1);
        });
grainsControl2.graincontrol4.on('change', function(v) //Filter and Delay Controls
        {filterCutoff = v.x;  gFilterList[grainSelect].frequency.value = filterCutoff;
          //use Y coordinates to set delay wet level up to a point, and then add additional feedback
          if (v.y >= 0.8) {delayWet = 1; delayFeedback = (v.y - 0.1);}
          if (v.y < 0.8) {delayWet = v.y * 1.25;}
          delayList[grainSelect].wet.value = delayWet; delayList[grainSelect].feedback.value = delayFeedback;
          let oldX = v.x; //sets the recall when the player stops moving the control
          let oldY = v.y;
          Tone.Transport.schedule((time) => {
          if (oldX == v.x && oldY == v.y) {
               grainsControlRecall[grainSelect][3][0] = v.x; //set recall values
               grainsControlRecall[grainSelect][3][1] = v.y;
            }
          }, Tone.now() + 0.1);
        });
        //LOADS SOUND
load.onchange = function() {
          var sound = document.getElementById("sound");
          var reader = new FileReader();
          reader.onloadend = function(e) {
            actx.decodeAudioData(this.result).then(function(buffer) {
            userAudio = new Tone.ToneAudioBuffer(buffer); //Create new buffer
            bufList[bufListLength] = "User Sound " + (bufListLength - 7); //add to dropdown list
            userBufs.push(userAudio); //keep track of user buffers
            dropdown.defineOptions(Object.values(bufList)); //reorder dropdown list
            dropdown.selectedIndex = bufListLength; //triggers newGrainBuf
            bufListLength++;
          });
          };
          reader.readAsArrayBuffer(this.files[0]);
        };

//AUTO PLAY FUNCTION
let drunkparts = ["drunk1", "drunk2", "drunk3", "drunk4", "drunk5", "drunk6", "drunk7", "drunk8"];
for (drunk in drunkparts) {
  drunkparts[drunk] = new Nexus.Drunk(-0.5,0.5, 0, 0.01);
}

autoplay.on('change', function(v) { //changes grain settings
  if (v == true) {
  let parts = new Tone.Loop(function(time){
  grainsControl.graincontrol1.x = Math.abs(grainsControl.graincontrol1.x+drunkparts[0].next()) % 1.0;
  grainsControl.graincontrol1.y = Math.abs(grainsControl.graincontrol1.y + drunkparts[1].next()) % 1.0;
  grainsControl.graincontrol2.x = Math.abs(grainsControl.graincontrol2.x + drunkparts[2].next()) % 1.0;
  grainsControl.graincontrol2.y = Math.abs(grainsControl.graincontrol2.y + drunkparts[3].next()) % 1.0;
  grainsControl2.graincontrol3.x = Math.abs(grainsControl2.graincontrol3.x + drunkparts[4].next()) % 1.0;
  grainsControl2.graincontrol3.y = Math.abs( grainsControl2.graincontrol3.y + drunkparts[5].next()) % 1.0;
  grainsControl2.graincontrol4.x = Math.abs(grainsControl2.graincontrol4.x + drunkparts[6].next()) % 1.0;
  grainsControl2.graincontrol4.y = Math.abs(grainsControl2.graincontrol4.y + drunkparts[7].next()) % 1.0;
}, 1).start(0);
  controls = new Tone.Loop(function(time){
  let randomChoice = randomMIDIpitch(0, 7);
  while (patternList[randomChoice].state == "started") {randomChoice = randomMIDIpitch(0, 7);} //make sure it's starting a new part
  generateParts.select(randomChoice);
  melLength += (Math.random() * 5 - 2.5);
}, 10).start(0);
}
})
