/* app.js
   Client-side audio visualization:
   - decode uploaded or recorded audio
   - draw waveform, FFT, spectrogram on canvases
   - simple radix-2 FFT implementation included
*/

'use strict';

// UI elements
const fileInput = document.getElementById('fileInput');
const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const fileInfo = document.getElementById('fileInfo');
const waveCanvas = document.getElementById('waveCanvas');
const specCanvas = document.getElementById('specCanvas');
const spectrogramCanvas = document.getElementById('spectrogramCanvas');
const maxDurationInput = document.getElementById('maxDuration');
const specWindowSelect = document.getElementById('specWindow');

let audioCtx = null;
let mediaRecorder = null;
let recordedChunks = [];

// Helper: resize canvases to display pixels
function fitToContainer(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const style = getComputedStyle(canvas);
  const w = parseInt(style.width);
  const h = parseInt(style.height);
  canvas.width = Math.max(1, Math.floor(w * ratio));
  canvas.height = Math.max(1, Math.floor(h * ratio));
}

// Basic Hann window
function hann(N){
  const w = new Float32Array(N);
  for(let i=0;i<N;i++) w[i] = 0.5*(1 - Math.cos((2*Math.PI*i)/(N-1)));
  return w;
}

// Radix-2 Cooley-Tukey FFT (in-place)
// input: real Float32Array of length N (must be power of 2)
// returns: object {re: Float32Array, im: Float32Array}
function fftReal(signal){
  const n = signal.length;
  if((n & (n-1)) !== 0) {
    // pad to next pow2
    const p = 1<<Math.ceil(Math.log2(n));
    const padded = new Float32Array(p);
    padded.set(signal);
    return fftReal(padded);
  }
  // Build complex arrays
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for(let i=0;i<n;i++) re[i] = signal[i];

  // bit reversal
  let j = 0;
  for(let i=1;i<n;i++){
    let bit = n>>1;
    for(; j & bit; bit >>=1) j ^= bit;
    j ^= bit;
    if(i < j){
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }

  // FFT
  for(let len=2; len<=n; len <<= 1){
    const angle = -2*Math.PI/len;
    const wlenRe = Math.cos(angle);
    const wlenIm = Math.sin(angle);
    for(let i=0;i<n;i+=len){
      let wr = 1.0, wi = 0.0;
      for(let j=0;j<len/2;j++){
        const uRe = re[i+j], uIm = im[i+j];
        const vRe = re[i+j+len/2] * wr - im[i+j+len/2] * wi;
        const vIm = re[i+j+len/2] * wi + im[i+j+len/2] * wr;
        re[i+j] = uRe + vRe;
        im[i+j] = uIm + vIm;
        re[i+j+len/2] = uRe - vRe;
        im[i+j+len/2] = uIm - vIm;
        // update wr,wi
        const tmp = wr * wlenRe - wi * wlenIm;
        wi = wr * wlenIm + wi * wlenRe;
        wr = tmp;
      }
    }
  }
  return {re, im};
}

// compute magnitude array from complex result, and frequency bins
function magAndFreq(complex, sampleRate){
  const n = complex.re.length;
  const half = n/2;
  const mags = new Float32Array(half);
  const freqs = new Float32Array(half);
  for(let i=0;i<half;i++){
    mags[i] = Math.sqrt(complex.re[i]*complex.re[i] + complex.im[i]*complex.im[i]);
    freqs[i] = i * sampleRate / n;
  }
  return {mags, freqs};
}

// draw waveform
function drawWaveform(samples, sampleRate){
  fitToContainer(waveCanvas);
  const ctx = waveCanvas.getContext('2d');
  const w = waveCanvas.width, h = waveCanvas.height;
  ctx.clearRect(0,0,w,h);

  // background
  const g = ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0, 'rgba(124,58,237,0.06)');
  g.addColorStop(1, 'rgba(6,182,212,0.02)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,w,h);

  ctx.lineWidth = Math.max(1, Math.floor(w/800));
  ctx.strokeStyle = 'rgba(124,58,237,0.95)';
  ctx.beginPath();

  // downsample for display if too many points
  const step = Math.max(1, Math.floor(samples.length / w));
  const mid = h/2;
  ctx.moveTo(0, mid);
  for(let x=0, i=0; x<w && i<samples.length; x++, i += step){
    const val = samples[i];
    const y = mid - (val * (h/2) * 0.9);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  // axis/time text
  ctx.fillStyle = 'rgba(230,238,248,0.6)';
  ctx.font = `${Math.max(10, Math.floor(h*0.08))}px Inter, sans-serif`;
  const dur = (samples.length / sampleRate).toFixed(2);
  ctx.fillText(`${dur}s`, 10, 20);
}

// draw FFT spectrum
function drawSpectrum(samples, sampleRate){
  // take a segment: choose nearest pow2 <= samples.length, but limit to 2^18 ~ 262k
  let N = 1 << Math.floor(Math.log2(samples.length));
  N = Math.min(N, 1<<18);
  const seg = samples.subarray(0, N);

  // apply window
  const win = hann(N);
  for(let i=0;i<N;i++) seg[i] *= win[i];

  const complex = fftReal(seg);
  const {mags, freqs} = magAndFreq(complex, sampleRate);

  // convert to dB, normalize
  const db = new Float32Array(mags.length);
  let maxv = 1e-12;
  for(let i=0;i<mags.length;i++){
    const v = 20*Math.log10(mags[i] + 1e-12);
    db[i] = v;
    if(v > maxv) maxv = v;
  }
  // scale to canvas
  fitToContainer(specCanvas);
  const ctx = specCanvas.getContext('2d');
  const w = specCanvas.width, h = specCanvas.height;
  ctx.clearRect(0,0,w,h);

  // background
  const g = ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0, 'rgba(6,182,212,0.04)');
  g.addColorStop(1, 'rgba(124,58,237,0.03)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,w,h);

  ctx.beginPath();
  ctx.lineWidth = Math.max(1, Math.floor(w/800));
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  let lastX = 0, lastY = h;
  for(let i=0;i<mags.length;i++){
    const x = Math.floor(i/mags.length * w);
    // normalize db to [0,1]
    const norm = (db[i] - (-120)) / (maxv - (-120));
    const y = h - Math.min(1, Math.max(0, norm)) * h;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    lastX = x; lastY = y;
  }
  ctx.stroke();

  // label x axis (Hz)
  ctx.fillStyle = 'rgba(230,238,248,0.6)';
  ctx.font = `${Math.max(10, Math.floor(h*0.08))}px Inter, sans-serif`;
  ctx.fillText('0 Hz', 8, h-6);
  ctx.fillText(`${Math.round(freqs[freqs.length-1])} Hz`, w-70, h-6);
}

// create a colormap: simple viridis-like mapping for spectrogram
function colormap(val){ // val in [0,1]
  // gradient from dark blue -> teal -> yellow
  const a = Math.max(0, Math.min(1, val));
  const r = Math.round(30 + 225 * Math.pow(a, 2.0));
  const g = Math.round(60 + 180 * Math.sqrt(a));
  const b = Math.round(80 + 120 * (1-a));
  return [r,g,b];
}

// compute spectrogram and draw to canvas
async function drawSpectrogram(samples, sampleRate, winSize=2048, hop=512){
  fitToContainer(spectrogramCanvas);
  const ctx = spectrogramCanvas.getContext('2d');
  const W = spectrogramCanvas.width, H = spectrogramCanvas.height;
  ctx.clearRect(0,0,W,H);

  // convert to mono Float32Array if needed (already mono)
  // create ImageData width = number of frames, height = half FFT
  const N = winSize;
  const half = N/2;
  const frames = Math.floor((samples.length - N) / hop) + 1;
  const maxFrames = Math.max(1, frames);
  // scale frames to canvas width (if many frames, we compress)
  const stepFrame = Math.max(1, Math.floor(frames / W));
  const outW = Math.min(W, frames);
  // prepare image buffer
  const img = ctx.createImageData(outW, H);
  const imgData = img.data;

  // precompute window
  const windowFn = hann(N);

  // find global max for normalization (two-pass)
  let globalMax = 1e-12;
  // temporary buffer for FFT mags
  const magsTmp = new Float32Array(half);
  for(let f = 0, frameIdx=0; f + N <= samples.length; f += hop, frameIdx++){
    // skip frames according to stepFrame when frames > W to reduce work
    if(frameIdx % stepFrame !== 0) continue;
    const start = f;
    // slice and apply window
    const slice = samples.subarray(start, start + N);
    const buff = new Float32Array(N);
    for(let i=0;i<N;i++) buff[i] = slice[i] * windowFn[i];
    const complex = fftReal(buff);
    for(let k=0;k<half;k++){
      magsTmp[k] = Math.sqrt(complex.re[k]*complex.re[k] + complex.im[k]*complex.im[k]);
      if(magsTmp[k] > globalMax) globalMax = magsTmp[k];
    }
  }

  // draw each column left->right
  let col = 0;
  for(let f = 0, frameIdx=0; f + N <= samples.length; f += hop, frameIdx++){
    if(frameIdx % stepFrame !== 0) continue;
    const start = f;
    const slice = samples.subarray(start, start + N);
    const buff = new Float32Array(N);
    for(let i=0;i<N;i++) buff[i] = slice[i] * windowFn[i];
    const complex = fftReal(buff);
    // compute mags and write column
    for(let k=0;k<half;k++){
      const mag = Math.sqrt(complex.re[k]*complex.re[k] + complex.im[k]*complex.im[k]);
      // normalize 0..1 (log scale)
      const v = Math.log10(1 + mag) / Math.log10(1 + globalMax);
      // map k (freq bin) to vertical pixel (flip so low freq at bottom)
      const yFrac = k / half;
      const yPx = Math.floor((1 - yFrac) * (H-1));
      const idx = (yPx * outW + col) * 4;
      const [r,g,b] = colormap(v);
      imgData[idx] = r;
      imgData[idx+1] = g;
      imgData[idx+2] = b;
      imgData[idx+3] = 255;
    }
    col++;
    if(col >= outW) break;
  }

  // scale the image to canvas width and height
  // draw imageData onto an offscreen canvas sized outW x H, then stretch to target canvas
  const off = document.createElement('canvas');
  off.width = outW; off.height = H;
  off.getContext('2d').putImageData(img, 0, 0);
  // clear and draw stretched
  ctx.fillStyle = 'rgba(5,7,12,0.2)';
  ctx.fillRect(0,0,W,H);
  ctx.drawImage(off, 0, 0, W, H);

  // overlay axis labels
  ctx.fillStyle = 'rgba(230,238,248,0.7)';
  ctx.font = `${Math.max(10, Math.floor(H*0.06))}px Inter, sans-serif`;
  ctx.fillText('Time →', 10, H - 6);
  ctx.fillText('Freq ↑', W - 70, 16);
}

// process AudioBuffer (Float32Array mono)
async function processBuffer(float32Samples, sampleRate){
  // limit duration to user specified seconds
  const maxSec = Math.max(1, Math.min(120, parseFloat(maxDurationInput.value) || 30));
  const maxSamples = Math.floor(maxSec * sampleRate);
  let samples = float32Samples;
  if(samples.length > maxSamples) samples = samples.subarray(0, maxSamples);

  fileInfo.textContent = `Loaded audio: ${ (samples.length / sampleRate).toFixed(2) } s · ${sampleRate} Hz · ${samples.length} samples`;

  // draw waveform
  drawWaveform(samples, sampleRate);
  // draw spectrum
  drawSpectrum(samples, sampleRate);

  // spectrogram window
  const winSize = parseInt(specWindowSelect.value, 10) || 2048;
  const hop = Math.floor(winSize / 4);
  await drawSpectrogram(samples, sampleRate, winSize, hop);
}

// handle file uploads
fileInput.addEventListener('change', async (ev) => {
  const f = ev.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const arrayBuffer = e.target.result;
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    try{
      const dec = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      // get first channel mono
      const channelData = dec.numberOfChannels > 1 ? dec.getChannelData(0) : dec.getChannelData(0);
      await processBuffer(channelData, dec.sampleRate);
    } catch(err){
      console.error('decodeAudioData error', err);
      fileInfo.textContent = 'Error decoding audio. The file might be unsupported by the browser.';
    }
  };
  reader.readAsArrayBuffer(f);
});

// Recording handlers
recordBtn.addEventListener('click', async () => {
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    alert('Microphone access not supported in this browser.');
    return;
  }
  try{
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    recordedChunks = [];
    mediaRecorder.ondataavailable = e => { if(e.data.size) recordedChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      try{
        const dec = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        const channelData = dec.numberOfChannels > 1 ? dec.getChannelData(0) : dec.getChannelData(0);
        await processBuffer(channelData, dec.sampleRate);
      } catch(err){
        console.error('decodeAudioData error', err);
        fileInfo.textContent = 'Error decoding recorded audio.';
      }
      // stop tracks
      stream.getTracks().forEach(t => t.stop());
    };
    mediaRecorder.start();
    recordBtn.disabled = true;
    stopBtn.disabled = false;
    recordBtn.textContent = 'Recording...';
  } catch(err){
    console.error('getUserMedia error', err);
    alert('Unable to access microphone. Check permissions.');
  }
});

stopBtn.addEventListener('click', () => {
  if(mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    recordBtn.disabled = false;
    stopBtn.disabled = true;
    recordBtn.textContent = 'Start Recording';
  }
});

// responsive: redraw canvases on resize (keeps them crisp)
window.addEventListener('resize', () => {
  // best-effort: user can re-load or re-process audio for crispness.
  // For performance we skip automatic re-processing here.
});
