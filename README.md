# CGW — Spatial Audio (Variant 17)

Розрахунково-графічна робота з курсу *Methods of synthesis of virtual reality* (КПІ).
Просторовий звук через Web Audio API. Варіант 17 — **смуговий фільтр (bandpass)**.

## Що реалізовано

1. **Reuse PA#2 (з вебкамерою)**: анагліфний стерео-рендер, off-axis frustum,
   поверхня Сіверта, вебкамера на zero-parallax площині, підключення до
   Sensor Server через WebSocket.
2. **Sound source orbits the surface**: поверхня **нерухома**, навколо неї
   обертається маленька сфера-джерело звуку. Орбіта керується через
   tangible interface — фізичне обертання смартфона.
3. **Web Audio граф**: `<audio>` → `MediaElementSource` → `BiquadFilter (bandpass)`
   → `PannerNode (HRTF)` → `GainNode` → `destination`. `PannerNode` отримує
   3D-координати сфери щокадра, тому звук просторово рухається синхронно.
4. **Bandpass фільтр** з повзунками frequency і Q + чекбокс enable/disable.
5. **Власний mp3/ogg** обирається через `<input type="file">`.

## Архітектура

```
Phone                  Browser
─────                  ───────
SensorServer ──ws──► SensorClient ──► rotation matrix
                                          │
                                          ▼
                              compute sphere position
                                          │
                          ┌───────────────┼───────────────┐
                          ▼                               ▼
                  WebGL renders sphere            PannerNode.setPosition
                  at that 3D point                at that same 3D point
                                                          │
                                                          ▼
                                              Spatial HRTF audio output
```

## Як запустити

1. Локальний сервер: `python3 -m http.server 8000`
2. Відкрий `http://localhost:8000/`.
3. На телефоні запусти Sensor Server, у браузері встав WebSocket URL, Connect.
4. Постав галочку **Use phone to orbit the sound source**.
5. Натисни **Choose file** і обери mp3.
6. **Play**, надінь навушники.
7. Крути телефон — сфера летить навколо поверхні, звук просторово
   переміщається відповідно до її позиції.
8. (опційно) Натисни **Start webcam** — на zero-parallax площині з'явиться
   твоє відео з вебкамери (як у PA#1).

## Структура файлів

```
CGW/
├── index.html             — GUI: камера + sensor + audio + filter + webcam
├── shader.gpu             — solid + textured шейдери
├── StereoCamera.js        — off-axis frustum
├── Model.js               — Sievert surface + UV sphere + Quad
├── SensorClient.js        — WebSocket + quatToMat4
├── Audio.js               — SpatialAudio: bandpass + HRTF panner
├── main.js                — рендер-цикл, інтеграція всіх компонентів
└── Utils/
    ├── m4.js
    └── trackball-rotator.js
```

## Bandpass filter parameters (variant 17)

- **Frequency** (центральна частота смуги): 100–8000 Hz, default 1000 Hz.
- **Q** (резонанс / вузькість смуги): 0.1–30, default 5.
  Більше Q → вужча смуга → звучить «вузько», як крізь трубу.

## Здача

Гілка `CGW`. У репозиторії має бути PDF-звіт згідно з вимогами:
title page, task (1c), theory (2c), implementation (2c), user
instruction with screenshots (2c), source code sample (2c).
