# Tesla Companion

Your all-in-one web-based toolkit for viewing TeslaCam clips, estimating charging time, calculating phantom drain, and more. This app is a single, self-contained HTML file that runs entirely in your browser.

## ✨ Features

- **Multi-Camera Viewer:** Simultaneously view clips from all cameras (Front, Back, Left/Right Repeaters, Left/Right Pillars) in a synchronized grid.
- **Event-Based Grouping:** Automatically groups 1-minute video files into a single, continuous event timeline.
- **Interactive Playback:** Full playback controls including play/pause, a master scrubber, 5-second skips, and variable playback speed.
- **Single-View Zoom:** Double-click any camera feed to expand it to full view. Double-click again to return to the grid layout.
- **Jump to Event:** If a Sentry or Dashcam event is detected, a button appears to jump directly to the moment of the trigger.
- **In-App Map Viewer:** If an event contains GPS data, click the "Event Map" button to see the location on a map without leaving the page.
- **Enhanced Screenshots:** Capture a high-quality composite image of all visible camera feeds with a single click.
- **Charging Time Estimator:** Calculate how long a charging session will take based on battery capacity, SoC, and charger type (including custom inputs).
- **Phantom Drain Estimator:** Estimate how long your battery will last while parked, based on active features like Sentry Mode and outside temperature.
- **Light & Dark Modes:** A sleek, modern interface with theme toggling.
- **Fully Responsive:** Works beautifully on desktop, tablet, and mobile browsers.
- **Privacy Focused:** No data ever leaves your computer. Everything is processed locally in your browser.

## 🚀 Live Demo

You can try a live version of the Tesla Companion hosted on GitHub Pages:

👉 [**https://jleshnick.github.io/TeslaCompanion/**](https://jleshnick.github.io/TeslaCompanion/)

## 💻 How to Use

1. **View Sentry/Dashcam Clips:** Plug your Tesla's USB drive into your computer.  
2. **Launch the App:** Open the `index.html` file in a modern web browser (Chrome, Firefox, Edge).  
3. **Load Clips:**
   - Navigate to the **Camera Viewer** tab.
   - Click the **"Select Directory"** button.
   - Choose the **TeslaCam** folder or a specific event folder (e.g., `2024-06-27_17-19-01`). Both work.
4. **View Events:** Use the dropdown or navigation buttons to move between events.

# 📚 Reference

## Camera Indexes

The `event.json` file references cameras by a number. Here is the mapping used by this application:

| Index | Camera View     |
|-------|-----------------|
| 0     | Front           |
| 3     | Left Pillar     |
| 4     | Right Pillar    |
| 5     | Left Repeater   |
| 6     | Right Repeater  |
| 7     | Back            |

## Event Reasons

The `reason` field in the event file indicates what triggered the recording. Here are some common reasons:

| Reason Code                          | Description                                                             |
|-------------------------------------|-------------------------------------------------------------------------|
| sentry_aware_object_detection       | Sentry Mode detected an object or movement nearby.                      |
| user_interaction_dashcam_icon_tapped| You manually triggered a Dashcam recording by tapping the icon on the screen. |
| sentry_locked_handle_pulled         | Sentry Mode detected someone pulling on a door handle while the car was locked. |
| user_interaction_honk               | You manually triggered a Dashcam recording by honking the horn.        |


## 🛠️ Technologies Used

- **HTML5** – Core structure  
- **CSS3** – Modern styling with theming support  
- **Vanilla JavaScript (ES6+)** – Logic, video handling, DOM manipulation  
- **Google Fonts** – “Inter” font  
- **Feather Icons** – Simple, clean UI icons  

## 🖼️ Gallery

### 📷 Camera Viewer

**Full Camera Grid**  
![Full six-camera grid view](assets/CamViewer_Grid.png)

**Expanded Single-Camera View**  
![Expanded view of a single camera](assets/CamViewer_Single.png)

**Camera Angle Selector**  
![Toggles to select which cameras to display](assets/CameraViewSelector.png)

### 🔌 Tools

**Charging Time Estimator**  
![Charging Time Estimator Tool](assets/ChargeTimeEstimator.png)

**Phantom Drain Estimator**  
![Phantom Drain Estimator Tool](assets/PhantomDrainEstimator.png)

## 🙏 Acknowledgements

- Core camera viewer functionality based on **Lythinari's TeslaCamViewer**
- Enhanced UI and features developed by **Joshua Leshnick**

## 📄 License

This project is licensed under the **MIT License**.  
See the [LICENSE](LICENSE) file for full details.
