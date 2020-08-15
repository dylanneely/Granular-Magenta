let state = 0;
let patternStarted = false;
let sampler;
let buffers;
let slicedur;

let verb;
let userAudio;
let startArray;
let zip;

const audio = document.querySelector('audio');
const actx  = Tone.context;
const dest  = actx.createMediaStreamDestination();
const recorder = new MediaRecorder(dest.stream);

const baseURL = "https://storage.googleapis.com/audioassets/";
let buf_list = {0: "Vessel1.wav", 1: "Bowl1.wav", 2: "Bowl2.wav", 3: "BattabangBell.wav", 4: "DianBell.wav", 5: "Frogs.wav", 6: "SolarSounder1.wav", 7: "WindWaves.wav"};
let grain_list = ["grain1", "grain2", "grain3", "grain4", "grain5", "grain6", "grain7", "grain8"];
let pitchShiftList = ["pitchShift1", "pitchShift2", "pitchShift3", "pitchShift4", "pitchShift5", "pitchShift6", "pitchShift7", "pitchShift8"];
let volumeList = ["volume1","volume2","volume3","volume4","volume5","volume6","volume7","volume8"]


//
sampler = new Tone.Sampler({
          urls: {
            C2: "Vessel1.wav",
            C3: "Bowl1.wav",
        },
          baseUrl: baseURL
        });
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
      volumeList[volume] = new Tone.Volume(0);
    }

verb = new Tone.Reverb(4);
const pingPong = new Tone.PingPongDelay("4n", 0.5).toDestination();

for (let i = 0; i < grain_list.length; i++) {
    grain_list[i].chain(pitchShiftList[i], volumeList[i], pingPong, verb);
    grain_list[i].loop = true;
  }



sampler.connect(verb);
verb.toDestination();
verb.connect(dest);


  //TO DO: Add IR Reverb / convolution
  //const convolver = new Tone.Convolver("./path/to/ir.wav").toDestination();


function setup() {
  // let cnv = createCanvas(100, 100);
  // background(220);
  // textAlign(CENTER, CENTER);

}


//HELPER FUNCTIONS
function loopsize(x, y) {
  slicedur = buffers.get(0).duration;
	let start = slicedur  * x;
	let end = (start + (slicedur * (1-y)+0.001)) % slicedur;
  return [start, end];
}

function randomMIDIpitch() { //random MIDI in acceptable range
  let randompitch = Math.floor(Math.random() * 60 + 36);
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
      {pitch: randomMIDIpitch(), quantizedStartStep: 0, quantizedEndStep: 1}, {pitch: randomMIDIpitch(), quantizedStartStep: 1, quantizedEndStep: 2},
    ],
    totalQuantizedSteps: 2,
    quantizationInfo: { stepsPerQuarter: 4}
  };
  let steps = Math.floor(Math.random() * 36 + 12);
  let temperature = 1.2;

  let result = await melodyRnn.continueSequence(seed, steps, temperature);

  let combined = core.sequences.concatenate([seed, result]);
  //console.log(combined.notes);
  grain1detuneArray = []
  patternArray = []
  startArray = []
  let start_note = combined.notes[0].pitch;
  console.log("start note: " +  start_note);
  for (let note of combined.notes) {
  grain1detuneArray.push(note.pitch*0.1);
//  patternArray.push(note.pitch); //STRAIGHTFORWARD NOTE GENERATION
  patternArray.push(note.pitch - start_note); //OFFSET for pitchshifting
  startArray.push(note.quantizedStartStep / 4); //find a good or logical divisor
  }
  zip = startArray.map(function(e,i){return [e,patternArray[i]];}); //no zip function in js!
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
  sampler.triggerAttackRelease(["C1, C3"], 1, 2);
  Tone.Transport.start();
}
else {
  Tone.Transport.stop();
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

// }
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
    userAudio = new Tone.ToneAudioBuffer(buffer);
    dropdown.selectedIndex = 8;
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
volumes.volume1.resize(150, 25);
volumes.volume1.min = -60;
volumes.volume1.max = 12;
volumes.volume1.value = 0;

volumes.volume2.resize(150, 25);
volumes.volume2.min = -60;
volumes.volume2.max = 12;
volumes.volume2.value = 0;

volumes.volume3.resize(150, 25);
volumes.volume3.min = -60;
volumes.volume3.max = 12;
volumes.volume3.value = 0;

volumes.volume4.resize(150, 25);
volumes.volume4.min = -60;
volumes.volume4.max = 12;
volumes.volume4.value = 0;

volumes.volume5.resize(150, 25);
volumes.volume5.min = -60;
volumes.volume5.max = 12;
volumes.volume5.value = 0;

volumes.volume6.resize(150, 25);
volumes.volume6.min = -60;
volumes.volume6.max = 12;
volumes.volume6.value = 0;

volumes.volume7.resize(150, 25);
volumes.volume7.min = -60;
volumes.volume7.max = 12;
volumes.volume7.value = 0;

volumes.volume8.resize(150, 25);
volumes.volume8.min = -60;
volumes.volume8.max = 12;
volumes.volume8.value = 0;

let radiobutton = new Nexus.RadioButton('#radiobutton',{
  'size': [200,50],
  'mode': 'relative',
  'numberOfButtons': 8,
  'active': -1
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
      console.log(grain_list[key])
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

let states_array = [];
let patternList = ["pattern1", "pattern2", "pattern3", "pattern4", "pattern5", "pattern6", "pattern7", "pattern8"]
grainsControl.grain1control.on('change', function(v) //AS ABOVE - MANUALLY SETTING FOR EACH BECAUSE OF NEXUS ASSIGNMENT ISSUE
        {let startend = loopsize(v.x, v.y); grain_list[0].loopStart = startend[0]; grain_list[0].loopEnd = startend[1];});
grainsControl.grain2control.on('change', function(v)
        {let startend = loopsize(v.x, v.y); grain_list[1].loopStart = startend[0]; grain_list[1].loopEnd = startend[1];});
grainsControl.grain3control.on('change', function(v)
        {let startend = loopsize(v.x, v.y); grain_list[2].loopStart = startend[0]; grain_list[2].loopEnd = startend[1];});
grainsControl.grain4control.on('change', function(v)
        {let startend = loopsize(v.x, v.y); grain_list[3].loopStart = startend[0]; grain_list[3].loopEnd = startend[1];});
grainsControl2.grain5control.on('change', function(v) //AS ABOVE - MANUALLY SETTING FOR EACH BECAUSE OF NEXUS ASSIGNMENT ISSUE
       {let startend = loopsize(v.x, v.y); grain_list[4].loopStart = startend[0]; grain_list[0].loopEnd = startend[1];});
grainsControl2.grain6control.on('change', function(v)
       {let startend = loopsize(v.x, v.y); grain_list[5].loopStart = startend[0]; grain_list[1].loopEnd = startend[1];});
grainsControl2.grain7control.on('change', function(v)
       {let startend = loopsize(v.x, v.y); grain_list[6].loopStart = startend[0]; grain_list[2].loopEnd = startend[1];});
grainsControl2.grain8control.on('change', function(v)
       {let startend = loopsize(v.x, v.y); grain_list[7].loopStart = startend[0]; grain_list[3].loopEnd = startend[1];});


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
grainsControlSize2.grain2bcontrol.on('change', function(v)
        {	grain_list[5].grainSize = v.x; grain_list[5].overlap = v.y;});
grainsControlSize2.grain3bcontrol.on('change', function(v)
        {	grain_list[6].grainSize = v.x; grain_list[6].overlap = v.y;});
grainsControlSize2.grain4bcontrol.on('change', function(v)
        {	grain_list[7].grainSize = v.x; grain_list[7].overlap = v.y;});

// for (let index = 0; index < volumeList.length; index++) { NOT WORKING WITH ASSIGNMENT TO NEXUSUI
//   console.log(volumeList[index]);
//   volumes.volumeList[index].on('change', function(v) {grain_list[index].volume.value = v;});
// }
volumes.volume1.on('change', function(v) {grain_list[0].volume.rampTo(v,.1)});
volumes.volume2.on('change', function(v) {grain_list[1].volume.rampTo(v,.1)});
volumes.volume3.on('change', function(v) {grain_list[2].volume.rampTo(v,.1)});
volumes.volume4.on('change', function(v) {grain_list[3].volume.rampTo(v,.1)});
volumes.volume5.on('change', function(v) {grain_list[4].volume.rampTo(v,.1)});
volumes.volume6.on('change', function(v) {grain_list[5].volume.rampTo(v,.1)});
volumes.volume7.on('change', function(v) {grain_list[6].volume.rampTo(v,.1)});
volumes.volume8.on('change', function(v) {grain_list[7].volume.rampTo(v,.1)});

radiobutton.on('change',async function(v) { //TO DO: ORGANIZE WITH PATTERN LIST - EXPAND TO 8
  await Tone.start();
  Tone.Transport.start();
  for (pattern in patternsList)
  if (v == 0 && states_array.includes(0)) {
    console.log("stop pattern 1");
    pattern1.stop(); grain_list[0].stop();
    const index = states_array.indexOf(v);
    states_array.splice(index, 1);
  } else if (v == 0) {
    states_array.push(v);
    console.log(states_array + " grain 1 started!" + console.log(grain_list[0]));

    generateMelody().then((e)=> {
    pattern1 = new Tone.Part(((time, note) => {
        pitchShiftList[0].pitch = note;
        grain_list[0].start();
        console.log(pitchShiftList[0]);
    }), zip);
    pattern1.loopStart = 0;
    pattern1.loopEnd = start[start.length - 1];
    pattern1.loop = true;
    pattern1.start();
    console.log(pattern1);
  })
  }
  else if (v == 1 && states_array.includes(1)) {
    console.log("stop pattern 2");
    pattern2.stop();         grain_list[1].stop();
    const index = states_array.indexOf(v);
    states_array.splice(index, 1);
  } else if (v == 1) {
    states_array.push(v);
    console.log(states_array);
    generateMelody().then((e)=> {
    pattern2 = new Tone.Part(((time, note) => {
        pitchShiftList[1].pitch = note;
        grain_list[1].start();
        console.log(note);
    }), zip);
    pattern2.loopStart = 0;
    pattern2.loopEnd = startArray[startArray.length - 1];
    pattern2.loop = true;
    pattern2.start();
    console.log(pattern2);
  })
  }
else if (v == 2 && states_array.includes(2)) {
  console.log("stop pattern 3");
  pattern3.stop(); grain_list[2].stop();
  const index = states_array.indexOf(v);
  states_array.splice(index, 1);
} else if (v == 2) {
  states_array.push(v);
  console.log(states_array);
  generateMelody().then((e)=> {
  pattern3 = new Tone.Part(((time, note) => {
    pitchShiftList[2].pitch = note;
    grain_list[2].start();
  //  console.log(note);
  }), zip);
  pattern3.loopStart = 0;
  pattern3.loopEnd = startArray[startArray.length - 1];
  pattern3.loop = true;
  pattern3.start();
  console.log(pattern3);
})
}
else if (v == 3 && states_array.includes(3)) {
  console.log("stop pattern 4");
  pattern4.stop(); grain_list[3].stop();
  const index = states_array.indexOf(v);
  states_array.splice(index, 1);
} else if (v == 3) {
  states_array.push(v);
  console.log(states_array);
  generateMelody().then((e)=> {
  pattern4 = new Tone.Part(((time, note) => {
    pitchShiftList[3].pitch = note;
    grain_list[3].start();
  //  console.log(note);
  }), zip);
  pattern4.loopStart = 0;
  pattern4.loopEnd = startArray[startArray.length - 1];
  pattern4.loop = true;
  pattern4.start();
  console.log(pattern4);
})
}
})
