# Audio-Visualizer

🎵 Audio Signal Visualization Web App

A modern, responsive web application that allows users to:

✔ Upload their own audio
✔ Record audio directly using the microphone
✔ Automatically generate
    • Waveform
    • Frequency Spectrum (FFT)
    • Spectrogram
✔ View all data visually in a beautiful UI
✔ Runs completely in the browser (no backend required)

🚀 Features
🔊 Audio Input

Upload audio files (.wav, .mp3, .ogg, .opus, etc.)

Record live audio using the browser microphone

📈 Visualizations

Waveform (Time Domain Plot)

FFT Frequency Spectrum

Spectrogram (Time–Frequency Plot)

🖥 Modern UI

Responsive design

Smooth UI layout

Beautiful color palette

Works on desktop and mobile

⚡ Runs 100% in the browser

No server required

Powered by JavaScript, Web Audio API & Canvas

🛠 Technologies Used

HTML5

CSS3 (Responsive & Modern Design)

JavaScript (ES6+)

Web Audio API

Canvas API

Microphone API

FFT Algorithm

📁 Project Structure
/project-folder
│
├── index.html      # Main webpage
├── style.css       # Styles for the UI
└── script.js       # All audio processing & visualization

▶ How to Run the Project
Option 1 — Double Click

Just open index.html in any browser:

Chrome / Edge / Firefox / Safari

Option 2 — Use a Live Server (recommended for mic recording)

If using VS Code:

Install Live Server extension

Right-click index.html

Click "Open with Live Server"

This ensures microphone permissions work properly.

🎤 Recording Audio

The webpage includes a Record button.
When clicked:

Browser asks for microphone permission

You can start/stop recording

The recording will be automatically analyzed

Waveform, FFT & spectrogram will appear instantly

🎧 Uploading Audio

Supported formats:

WAV

MP3

OGG

OPUS

FLAC

AAC

Many others supported by the browser

Once uploaded, the audio is decoded and visualized automatically.

📊 Understanding the Visualizations
1. Waveform

Shows how the audio amplitude changes over time.
Useful for:

Loudness

Peaks

Silence detection

2. FFT (Frequency Spectrum)

Shows what frequencies are present in the audio.
Useful for:

Pitch

Harmonics

Noise detection

3. Spectrogram

Shows frequency over time with color intensity.
Useful for:

Speech patterns

Music analysis

Birds, signals, machine noise

🧠 How It Works (Technical Overview)

The Web Audio API decodes audio files & microphone input.

Audio is passed into an AnalyserNode for FFT analysis.

Time-domain data → Waveform

Frequency-domain data → FFT Spectrum

For the spectrogram:

Repeated FFT slices are drawn vertically

Each slice is painted with color intensity

All graphs are rendered on <canvas> elements.

🎨 Design & Theme

Gradient-based modern UI

Glassmorphism layers

Vibrant highlight colors

Fully responsive

Works on phones, tablets, desktops

Feel free to customize the colors in style.css.

© Credits

Designed & Developed by Amaan Beg

🤝 Contributing

Pull requests are welcome.
If you want new features (filters, ML classification, noise reduction), open an issue.

📄 License

This project is open-source.
You may modify, use, or distribute with credit.
