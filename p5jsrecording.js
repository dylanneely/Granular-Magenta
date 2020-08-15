let buffers;
let slicedur;

let verb;
let userAudio;
let startArray = [];
let synthTimeArray = [];
let zip = [];
let patternArray = [];
let patternArrayOffset = [];
let start_note = 60;

const audio = document.querySelector('audio');
const actx  = Tone.context;
const dest  = actx.createMediaStreamDestination();
const recorder = new MediaRecorder(dest.stream);

const baseURL = "https://storage.googleapis.com/audioassets/";
let buf_list = {0: "Vessel1.wav", 1: "Bowl1.wav", 2: "Bowl2.wav", 3: "BattabangBell.wav", 4: "DianBell.wav", 5: "Frogs.wav", 6: "SolarSounder1.wav", 7: "WindWaves.wav"};
let grain_list = ["grain1", "grain2", "grain3", "grain4", "grain5", "grain6", "grain7", "grain8"];
let pitchShiftList = ["pitchShift1", "pitchShift2", "pitchShift3", "pitchShift4", "pitchShift5", "pitchShift6", "pitchShift7", "pitchShift8"];
let volumeList = ["volume1","volume2","volume3","volume4","volume5","volume6","volume7","volume8"]

let states_array = [];
let patternList = ["pattern1", "pattern2", "pattern3", "pattern4", "pattern5", "pattern6", "pattern7", "pattern8"]
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

for (volume in volumeList) {
      volumeList[volume] = new Tone.Volume(-6);
    }

for (pattern in patternList) {
      patternList[pattern] = new Tone.Part();
    }

let randomSeed = randomMIDIpitch(24, 36); //range, offset
let randomInterval1 = randomMIDIpitch(3, 7);
let randomInterval2 = randomMIDIpitch(3, 7);
let seedChordMIDI = [randomSeed, randomSeed + randomInterval1, randomSeed + randomInterval1 + randomInterval2]
let seedChordFreq = [Tone.Frequency(seedChordMIDI[0], "midi"), Tone.Frequency(seedChordMIDI[1], "midi"), Tone.Frequency(seedChordMIDI[2], "midi")];

verb = new Tone.Reverb(4);
const pingPong = new Tone.PingPongDelay("4n", 0.5);

const filter = new Tone.Filter(1500, "lowpass");

for (let i = 0; i < grain_list.length; i++) {
    grain_list[i].chain(pitchShiftList[i], volumeList[i], pingPong, filter, verb);
    grain_list[i].sync();
    //grain_list[i].loop = true;
  }

let synth = new Tone.AMSynth();
synth.sync();
let synth_drone = new Tone.PolySynth();
const autoFilter = new Tone.AutoFilter(0.1).start();

verb.toDestination();
verb.connect(dest);

synth.connect(verb);
synth_drone.chain(autoFilter, verb);
synth_drone.volume.value = -12;
synth.connect(dest);

  //TO DO: Add IR Reverb / convolution
  //const convolver = new Tone.Convolver("./path/to/ir.wav").toDestination();

function setup() {
  // let cnv = createCanvas(100, 100);
  // background(220);
  // textAlign(CENTER, CENTER);

}

//HELPER FUNCTIONS
function loopsize(x, y, num) {
  slicedur = buffers.get(num).duration;
	let start = slicedur  * x;
	let end = (start + (slicedur * (1-y)+0.001)) % slicedur;
  return [start, end];
}

function randomMIDIpitch(range, offset) { //random MIDI in acceptable range
  let randompitch = Math.floor(Math.random() * range + offset);
  return randompitch;
}

function record() {
  const chunks = [];
  recorder.start();
  recorder.ondataavailable = evt => chunks.push(evt.data);
  recorder.onstop = evt => {
  let blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
  audio.src = URL.createObjectURL(blob);
}
}

//AI
let melodyRnn = new music_rnn.MusicRNN( 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn');
let melodyRnnLoaded = melodyRnn.initialize();

async function generateMelody() {
  //randomized seed. TO DO: create logical seed based on grains

  let seed = {
    notes: [
      {pitch: seedChordMIDI[0], quantizedStartStep: 0, quantizedEndStep: 1}, {pitch: seedChordMIDI[1], quantizedStartStep: 1, quantizedEndStep: 3},
      {pitch: seedChordMIDI[2], quantizedStartStep: 3, quantizedEndStep: 5},
    ],
    totalQuantizedSteps: 4,
    quantizationInfo: { stepsPerQuarter: 4}
  };
  let steps = randomMIDIpitch(36, 12);
  let temperature = 1.2;

  let result = await melodyRnn.continueSequence(seed, steps, temperature);

  let combined = core.sequences.concatenate([seed, result]);
  //console.log(combined.notes);
  start_note = combined.notes[0].pitch;
  console.log("start note: " +  start_note);
  for (let note of combined.notes) {
  patternArray.push(note.pitch); //STRAIGHTFORWARD NOTE GENERATION
  startArray.push(note.quantizedStartStep / 4); //find a good or logical divisor
  }
  zip = startArray.map(function(e,i){return [e,patternArray[i]];}); //no zip function in js!

  //SET NEW SEED
  synth_drone.triggerRelease(seedChordFreq);
  seedChordMIDI = patternArray.slice((patternArray.length - 3), patternArray.length);
  for (let i = 0; i < 3; i++) {
    seedChordFreq[i] = Tone.Frequency(seedChordMIDI[i], "midi");
  }
  synth_drone.triggerAttack(seedChordFreq);
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
  console.log(v);
  Tone.Transport.start();
  synth_drone.triggerAttack(seedChordFreq, 0);
}
else {
  Tone.Transport.stop();
  console.log("stopped");
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
    record();
  } else {
    recorder.stop();
  }
})

let recordMic = new Nexus.TextButton('#recordmic', {
    'size': [150,50],
    'state': false,
    'text': 'Record Input',
    'alternateText': 'Stop Recording'
})

recordMic.on('change',async function(v) {
  if (v == true) {
    await Tone.start();

    const meter = new Tone.Meter();
    const mic = new Tone.UserMedia().connect(meter);
    mic.open().then(() => {
    	// promise resolves when input is available
    console.log("mic open");
    	// print the incoming mic levels in decibels
    setInterval(() => console.log(meter.getValue()), 100);
    }).catch(e => {
    	// promise is rejected when the user doesn't have or allow mic access
    alert("mic not available - please try accessing from https connection");
    });
    record();
  } else {
    recorder.stop();
  }
})

//LOADS SOUND

load.onchange = function() {
  var sound = document.getElementById("sound");
  var reader = new FileReader();
  reader.onloadend = function(e) {
    actx.decodeAudioData(this.result).then(function(buffer) {
    console.log(buffer);
    buf_list[8] = "User Sound"; //should grab file name
    //buffers.get("[object HTMLAudioElement]").key = "8";
    dropdown.defineOptions(Object.values(buf_list));
    userAudio = new Tone.ToneAudioBuffer(buffer); //Created new buffer, because
    dropdown.selectedIndex = 8;               //accessing the added buffer to buffers
  //buffers.get("[object HTMLAudioElement]").key = "8";  //by dictionary was tricky
  });

  };
  reader.readAsArrayBuffer(this.files[0]);
  console.log(buffers);
  };
let grainsControl = new Nexus.Rack("#grains");
let grainsControl2 = new Nexus.Rack("#grains2");

//TO DO: CREATE ARRAY FOR GRAIN CONTROLS - FIRST ATTEMT DIDN'T WORK WITH NEXUS, SO CLUNKY RIGHT NOW
grainsControl.grain1control.colorize("fill","#333")
grainsControl.grain1control.resize(150,150);
grainsControl.grain1control.stepX = 0.0001;
grainsControl.grain1control.stepY = 0.0001;
grainsControl.grain1control.y = 0.0;
grainsControl.grain1control.x = 0.0;

grainsControl.grain2control.colorize("fill","#666")
grainsControl.grain2control.resize(150,150);
grainsControl.grain2control.stepX = 0.0001;
grainsControl.grain2control.stepY = 0.0001;
grainsControl.grain2control.y = 0.0;
grainsControl.grain2control.x = 0.0;

grainsControl.grain3control.colorize("fill","#333")
grainsControl.grain3control.resize(150,150);
grainsControl.grain3control.stepX = 0.0001;
grainsControl.grain3control.stepY = 0.0001;
grainsControl.grain3control.y = 0.0;
grainsControl.grain3control.x = 0.0;

grainsControl.grain4control.colorize("fill","#666")
grainsControl.grain4control.resize(150,150);
grainsControl.grain4control.stepX = 0.0001;
grainsControl.grain4control.stepY = 0.0001;
grainsControl.grain4control.y = 0.0;
grainsControl.grain4control.x = 0.0;

grainsControl2.grain5control.colorize("fill","#333")
grainsControl2.grain5control.resize(150,150);
grainsControl2.grain5control.stepX = 0.0001;
grainsControl2.grain5control.stepY = 0.0001;
grainsControl2.grain5control.y = 0.0;
grainsControl2.grain5control.x = 0.0;

grainsControl2.grain6control.colorize("fill","#333")
grainsControl2.grain6control.resize(150,150);
grainsControl2.grain6control.stepX = 0.0001;
grainsControl2.grain6control.stepY = 0.0001;
grainsControl2.grain6control.y = 0.0;
grainsControl2.grain6control.x = 0.0;

grainsControl2.grain7control.colorize("fill","#333")
grainsControl2.grain7control.resize(150,150);
grainsControl2.grain7control.stepX = 0.0001;
grainsControl2.grain7control.stepY = 0.0001;
grainsControl2.grain7control.y = 0.0;
grainsControl2.grain7control.x = 0.0;

grainsControl2.grain8control.colorize("fill","#333")
grainsControl2.grain8control.resize(150,150);
grainsControl2.grain8control.stepX = 0.0001;
grainsControl2.grain8control.stepY = 0.0001;
grainsControl2.grain8control.y = 0.0;
grainsControl2.grain8control.x = 0.0;

let grainsControlSize = new Nexus.Rack("#grainsSize");
let grainsControlSize2 = new Nexus.Rack("#grainsSize2");

grainsControlSize.grain1bcontrol.colorize("fill","#333")
grainsControlSize.grain1bcontrol.resize(150,150);
grainsControlSize.grain1bcontrol.x = 0.2;
grainsControlSize.grain1bcontrol.maxX = 0.4;
grainsControlSize.grain1bcontrol.stepX = 0.0001;
grainsControlSize.grain1bcontrol.stepY = 0.0001;
grainsControlSize.grain1bcontrol.y = 0.1;
grainsControlSize.grain1bcontrol.minY = 0.0001;
grainsControlSize.grain1bcontrol.minX = 0.0001;
grainsControlSize.grain1bcontrol.maxY = 0.4;

grainsControlSize.grain2bcontrol.colorize("fill","#666")
grainsControlSize.grain2bcontrol.resize(150,150);
grainsControlSize.grain2bcontrol.x = 0.2;
grainsControlSize.grain2bcontrol.maxX = 0.4;
grainsControlSize.grain2bcontrol.stepX = 0.0001;
grainsControlSize.grain2bcontrol.stepY = 0.0001;
grainsControlSize.grain2bcontrol.y = 0.1;
grainsControlSize.grain2bcontrol.minY = 0.0001;
grainsControlSize.grain2bcontrol.minX = 0.0001;
grainsControlSize.grain2bcontrol.maxY = 0.4;

grainsControlSize.grain3bcontrol.colorize("fill","#333")
grainsControlSize.grain3bcontrol.resize(150,150);
grainsControlSize.grain3bcontrol.x = 0.2;
grainsControlSize.grain3bcontrol.maxX = 0.4;
grainsControlSize.grain3bcontrol.stepX = 0.0001;
grainsControlSize.grain3bcontrol.stepY = 0.0001;
grainsControlSize.grain3bcontrol.y = 0.1;
grainsControlSize.grain3bcontrol.minY = 0.0001;
grainsControlSize.grain3bcontrol.minX = 0.0001;
grainsControlSize.grain3bcontrol.maxY = 0.4;

grainsControlSize.grain4bcontrol.colorize("fill","#666")
grainsControlSize.grain4bcontrol.resize(150,150);
grainsControlSize.grain4bcontrol.x = 0.2;
grainsControlSize.grain4bcontrol.minX = 0.0001;
grainsControlSize.grain4bcontrol.maxX = 0.4;
grainsControlSize.grain4bcontrol.stepX = 0.0001;
grainsControlSize.grain4bcontrol.stepY = 0.0001;
grainsControlSize.grain4bcontrol.y = 0.1;
grainsControlSize.grain4bcontrol.minY = 0.0001;
grainsControlSize.grain4bcontrol.minX = 0.0001;
grainsControlSize.grain4bcontrol.maxY = 0.4;

grainsControlSize2.grain5bcontrol.colorize("fill","#333")
grainsControlSize2.grain5bcontrol.resize(150,150);
grainsControlSize2.grain5bcontrol.x = 0.2;
grainsControlSize2.grain5bcontrol.maxX = 0.4;
grainsControlSize2.grain5bcontrol.stepX = 0.0001;
grainsControlSize2.grain5bcontrol.stepY = 0.0001;
grainsControlSize2.grain5bcontrol.y = 0.1;
grainsControlSize2.grain5bcontrol.minY = 0.0001;
grainsControlSize2.grain5bcontrol.minX = 0.0001;
grainsControlSize2.grain5bcontrol.maxY = 0.4;

grainsControlSize2.grain6bcontrol.colorize("fill","#333")
grainsControlSize2.grain6bcontrol.resize(150,150);
grainsControlSize2.grain6bcontrol.x = 0.2;
grainsControlSize2.grain6bcontrol.maxX = 0.4;
grainsControlSize2.grain6bcontrol.stepX = 0.0001;
grainsControlSize2.grain6bcontrol.stepY = 0.0001;
grainsControlSize2.grain6bcontrol.y = 0.1;
grainsControlSize2.grain6bcontrol.minY = 0.0001;
grainsControlSize2.grain6bcontrol.minX = 0.0001;
grainsControlSize2.grain6bcontrol.maxY = 0.4;

grainsControlSize2.grain7bcontrol.colorize("fill","#333")
grainsControlSize2.grain7bcontrol.resize(150,150);
grainsControlSize2.grain7bcontrol.x = 0.2;
grainsControlSize2.grain7bcontrol.maxX = 0.4;
grainsControlSize2.grain7bcontrol.stepX = 0.0001;
grainsControlSize2.grain7bcontrol.stepY = 0.0001;
grainsControlSize2.grain7bcontrol.y = 0.1;
grainsControlSize2.grain7bcontrol.minY = 0.0001;
grainsControlSize2.grain7bcontrol.minX = 0.0001;
grainsControlSize2.grain7bcontrol.maxY = 0.4;

grainsControlSize2.grain8bcontrol.colorize("fill","#333")
grainsControlSize2.grain8bcontrol.resize(150,150);
grainsControlSize2.grain8bcontrol.x = 0.2;
grainsControlSize2.grain8bcontrol.maxX = 0.4;
grainsControlSize2.grain8bcontrol.stepX = 0.0001;
grainsControlSize2.grain8bcontrol.stepY = 0.0001;
grainsControlSize2.grain8bcontrol.y = 0.1;
grainsControlSize2.grain8bcontrol.minY = 0.0001;
grainsControlSize2.grain8bcontrol.minX = 0.0001;
grainsControlSize2.grain8bcontrol.maxY = 0.4;

let volumes = new Nexus.Rack("#volumes"); //REORIENT VERTICAL

//for (volume in volumeList) { //AUTOMATIC ASSIGNMENT DOESN'T WORK WITH NEXUSUI

let minVol = -120; let maxVol = 12; let defVol = -6;
volumes.volume1.resize(150, 25);
volumes.volume1.min = minVol;
volumes.volume1.max = maxVol;
volumes.volume1.value = defVol;

volumes.volume2.resize(150, 25);
volumes.volume2.min = minVol;
volumes.volume2.max = maxVol;
volumes.volume2.value = defVol;

volumes.volume3.resize(150, 25);
volumes.volume3.min = minVol;
volumes.volume3.max = maxVol;
volumes.volume3.value = defVol;

volumes.volume4.resize(150, 25);
volumes.volume4.min = minVol;
volumes.volume4.max = maxVol;
volumes.volume4.value = defVol;

volumes.volume5.resize(150, 25);
volumes.volume5.min = minVol;
volumes.volume5.max = maxVol;
volumes.volume5.value = defVol;

volumes.volume6.resize(150, 25);
volumes.volume6.min = minVol;
volumes.volume6.max = maxVol;
volumes.volume6.value = defVol;

volumes.volume7.resize(150, 25);
volumes.volume7.min =  minVol;
volumes.volume7.max = maxVol;
volumes.volume7.value = defVol;

volumes.volume8.resize(150, 25);
volumes.volume8.min = minVol;
volumes.volume8.max = maxVol;
volumes.volume8.value = defVol;

let radiobutton = new Nexus.RadioButton('#radiobutton',{
  'size': [200,50],
  'mode': 'toggle',
  'numberOfButtons': 8,
})

let dropdown = new Nexus.Select('#dropdown',{
  'size': [150,35],
  'options': Object.values(buf_list)
});

dropdown.on('change',async function(v) {
  await Tone.start();
  if (v.index == 8) { // clunky manual override if user loads sound
    if (states_array.length == 0) {
      grain_list[0].buffer = userAudio;
      grain_list[0].start();
      console.log(grain_list[0])
    }
    else  {
      let curState = states_array[states_array.length-1]
      grain_list[curState].buffer = userAudio;
      grain_list[curState].start();
      console.log(grain_list[curState])
    }
  }
  else { for (key in buf_list) {
    if (v.index == key)
    {
      if (states_array.length == 0) {
        grain_list[0].buffer = buffers.get(key);
        grain_list[0].start();
        console.log(grain_list[0])
      }
      else  {
        let curState = states_array[states_array.length-1]
        grain_list[curState].buffer = buffers.get(key);
        grain_list[curState].start();
        console.log(grain_list[curState])
      }
    }
  }
}
});

grainsControl.grain1control.on('change', function(v) //AS ABOVE - MANUALLY SETTING FOR EACH BECAUSE OF NEXUS ASSIGNMENT ISSUE
        {let startend = loopsize(v.x, v.y, 0); grain_list[0].loopStart = startend[0]; grain_list[0].loopEnd = startend[1];});
grainsControl.grain2control.on('change', function(v)
        {let startend = loopsize(v.x, v.y, 1); grain_list[1].loopStart = startend[0]; grain_list[1].loopEnd = startend[1];});
grainsControl.grain3control.on('change', function(v)
        {let startend = loopsize(v.x, v.y, 2); grain_list[2].loopStart = startend[0]; grain_list[2].loopEnd = startend[1];});
grainsControl.grain4control.on('change', function(v)
        {let startend = loopsize(v.x, v.y, 3); grain_list[3].loopStart = startend[0]; grain_list[3].loopEnd = startend[1];});
grainsControl2.grain5control.on('change', function(v) //AS ABOVE - MANUALLY SETTING FOR EACH BECAUSE OF NEXUS ASSIGNMENT ISSUE
       {let startend = loopsize(v.x, v.y, 4); grain_list[4].loopStart = startend[0]; grain_list[4].loopEnd = startend[1];});
grainsControl2.grain6control.on('change', function(v)
       {let startend = loopsize(v.x, v.y, 5); grain_list[5].loopStart = startend[0]; grain_list[5].loopEnd = startend[1];});
grainsControl2.grain7control.on('change', function(v)
       {let startend = loopsize(v.x, v.y, 6); grain_list[6].loopStart = startend[0]; grain_list[6].loopEnd = startend[1];});
grainsControl2.grain8control.on('change', function(v)
       {let startend = loopsize(v.x, v.y, 7); grain_list[7].loopStart = startend[0]; grain_list[7].loopEnd = startend[1];});

grainsControlSize.grain1bcontrol.on('change', function(v)
        {	grain_list[0].grainSize = v.x; grain_list[0].overlap = v.y;});
grainsControlSize.grain2bcontrol.on('change', function(v)
        {	grain_list[1].grainSize = v.x; grain_list[1].overlap = v.y;});
grainsControlSize.grain3bcontrol.on('change', function(v)
        {	grain_list[2].grainSize = v.x; grain_list[2].overlap = v.y;});
grainsControlSize.grain4bcontrol.on('change', function(v)
        {	grain_list[3].grainSize = v.x; grain_list[3].overlap = v.y;});
grainsControlSize2.grain5bcontrol.on('change', function(v)
        {	grain_list[4].grainSize = v.x; grain_list[4].overlap = v.y;});
grainsControlSize2.grain6bcontrol.on('change', function(v)
        {	grain_list[5].grainSize = v.x; grain_list[5].overlap = v.y;});
grainsControlSize2.grain7bcontrol.on('change', function(v)
        {	grain_list[6].grainSize = v.x; grain_list[6].overlap = v.y;});
grainsControlSize2.grain8bcontrol.on('change', function(v)
        {	grain_list[7].grainSize = v.x; grain_list[7].overlap = v.y;});

// for (let index = 0; index < volumeList.length; index++) { NOT WORKING WITH ASSIGNMENT TO NEXUSUI

// }
volumes.volume1.on('change', function(v) {volumeList[0].volume.rampTo(v,.1)});
volumes.volume2.on('change', function(v) {volumeList[1].volume.rampTo(v,.1)});
volumes.volume3.on('change', function(v) {volumeList[2].volume.rampTo(v,.1)});
volumes.volume4.on('change', function(v) {volumeList[3].volume.rampTo(v,.1)});
volumes.volume5.on('change', function(v) {volumeList[4].volume.rampTo(v,.1)});
volumes.volume6.on('change', function(v) {volumeList[5].volume.rampTo(v,.1)});
volumes.volume7.on('change', function(v) {volumeList[6].volume.rampTo(v,.1)});
volumes.volume8.on('change', function(v) {volumeList[7].volume.rampTo(v,.1)});


radiobutton.on('change', async function(v) {
  if (v > -1) {
  await Tone.start();
  if (Tone.Transport.state = "stopped" || "paused") {Tone.Transport.start();};
  for (pattern in patternList)
  if (v == pattern && states_array.includes(v))
  {
    console.log("stop " + patternList[pattern]);
    patternList[pattern].stop(); //patternList[pattern].clear();
    grain_list[pattern].stop();
    states_array.splice(states_array.indexOf(v), 1);
  } else if (v == pattern) {
    console.log(" grain " + v + " started!");
    generateMelody().then((e)=> {
    //  const lfo = new Tone.LFO(3, 0.5, 3).start();
      patternList[pattern] = new Tone.Part(((time, note) => {
        pitchShiftList[v].pitch = (note - start_note);
        synth.triggerAttackRelease(Tone.Frequency(note, "midi"), "1n", time);
        grain_list[v].start(time);
        //lfo.connect(synth.harmonicity);
    }), zip);
      patternList[pattern].loopStart = 0;
      patternList[pattern].loopEnd = start[start.length - 1];
      patternList[pattern].loop = true;
      patternList[pattern].start();
      console.log(patternList[pattern]);
      synth.playbackRate = 0.5;
      states_array.push(v);
    })
  }
}
  else if (v==-1){
    let curPattern = states_array[states_array.length-1];
    patternList[pattern].stop();  //patternList[pattern].clear();
    grain_list[curPattern].stop();
    states_array.splice(states_array.indexOf(curPattern), 1);
    console.log("stop " + patternList[pattern]);
    }
})
