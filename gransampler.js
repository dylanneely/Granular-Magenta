let sampler = new Tone.Sampler({
  urls: {
    C3: "Vessel1.wav",
},
baseUrl: "https://storage.googleapis.com/audioassets/"
}).toDestination();


document.getElementById("play").onclick = async () => {
  await Tone.start();
  sampler.triggerAttackRelease(["C1", "C2", "C3"], 0.5);
  // Tone.Transport.start();
}
