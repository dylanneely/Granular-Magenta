
//TO DO: PLAY WITH playbackRate, detune, filters, generally try to make it sound better
//Add visual confirmation - meters for parts, waveform for buffer
//Create autoplay to generate new melodies every 30 seconds & vary grains without user input
//VARY SYNTHESIZER OPTIONS - MetalSynth, PluckSynth

// let clock = new Tone.Clock(function(time){ //auto do something every 30 seconds
// 	console.log(time);
//   // if (Math.floor(time) % 30 == 29) {
//   //   generateMelody();
//   // }
// }, 1).start(0);



//const slice = new Tone.ToneBufferSource(buffers.get("C2")); alternate method to grainplayer


//these functions should be compressed into one, but I ran into various issues
//with the callback functionality when I attempted to do this.


// function record() {
// 	Tone.Offline(function(){
// 	//only nodes created in this callback will be recorded
// 	generateMelody()
// }, 20);
