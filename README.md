# PA#2 — Tangible interface (Variant 17)

Лабораторна #2 з курсу *Methods of synthesis of virtual reality* (КПІ).
Орієнтація поверхні Сіверта синхронізована з фізичною орієнтацією
смартфона. Використовується software `ROTATION_VECTOR` сенсор Android
(варіант 17 з блогу).

## Архітектура

```
┌──────────────┐                         ┌────────────────────┐
│  Android     │      ws:// (WebSocket)  │  WebGL сторінка    │
│  Sensor      │ ──────────────────────► │  у браузері ПК     │
│  Server APK  │  JSON {values:[qx,qy,   │  (один Wi-Fi)      │
│              │   qz,qw]}               │                    │
└──────────────┘                         └────────────────────┘
```

Кожен фрейм:
1. SensorClient читає JSON-кадр з WebSocket.
2. `quatToMat4(qx,qy,qz,qw)` будує матрицю обертання 4×4 (порт
   `getRotationMatrixFromVector` з Android SourceCode).
3. Ця матриця підставляється у model-view замість матриці
   trackball-rotator'а.

## Як запустити

### Крок 1 — телефон

1. Встанови **Sensor Server** з F-Droid:
   https://f-droid.org/en/packages/github.umer0586.sensorserver/
2. Підʼєднай телефон і ПК до **однієї Wi-Fi мережі**.
3. Відкрий Sensor Server → натисни `Start`. Він покаже IP і порт
   (зазвичай `8080`).
4. У списку «Available Sensors» знайди **TYPE_ROTATION_VECTOR**.
   Натискаючи на нього, ти побачиш URL виду:
   ```
   ws://192.168.1.10:8080/sensor/connect?type=android.sensor.rotation_vector
   ```

### Крок 2 — браузер

1. У папці проекту запусти локальний сервер:
   ```bash
   python3 -m http.server 8000
   ```
2. Відкрий `http://localhost:8000/`.
3. У поле «Sensor Server URL» встав URL з телефона (заміни IP).
4. Натисни **Connect**. Статус має змінитися на «Streaming sensor
   data ✓».
5. Постав галочку **Use phone orientation**.
6. Покрути телефон у руках — поверхня крутиться синхронно.

### Re-center

Кнопка **Re-center** запамʼятовує поточну орієнтацію телефона як
«нульову». Корисно якщо хочеш почати з «телефон лежить на столі = вид
спереду».

## Структура файлів

```
PA2/
├── index.html             — canvas + GUI + поле для Sensor Server URL
├── shader.gpu             — solid-colour GLSL шейдер
├── StereoCamera.js        — off-axis frustum (з PA#1)
├── Model.js               — поверхня Сіверта
├── SensorClient.js        — WebSocket клієнт + quatToMat4
├── main.js                — рендер-цикл, інтеграція сенсора
└── Utils/
    ├── m4.js
    └── trackball-rotator.js
```

## Здача

Гілка `PA2`. У відео показати:
- роботу анагліфного рендеру (від PA#1);
- підключення до Sensor Server, видно потік даних;
- фізичне обертання телефона в руці → синхронне обертання поверхні
  на екрані.
