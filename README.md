![Tesla Companion Screenshot](assets/CameraViewSelector.png)
![Tesla Companion Screenshot](assets/ChargeTimeEstimator.png)
![Tesla Companion Screenshot](assets/PhantomDrainEstimator.png)
![Tesla Companion Screenshot](assetsCamViewer_Single.png)
![Tesla Companion Screenshot](assets/CamViewer_Grid.png)

Tesla Companion
===============

Your all-in-one web-based toolkit for viewing TeslaCam clips, estimating charging time, calculating phantom drain, and more. This app is a single, self-contained HTML file that runs entirely in your browser.

✨ Features
----------

*   **Multi-Camera Viewer:** Simultaneously view clips from all cameras (Front, Back, Left/Right Repeaters, Left/Right Pillars) in a synchronized grid.
    
*   **Event-Based Grouping:** Automatically groups 1-minute video files into a single, continuous event timeline.
    
*   **Interactive Playback:** Full playback controls including play/pause, a master scrubber, 5-second skips, and variable playback speed.
    
*   **Single-View Zoom:** Double-click any camera feed to expand it to full view. Double-click again to return to the grid layout.
    
*   **Jump to Event:** If a Sentry or Dashcam event is detected, a button appears to jump directly to the moment of the trigger.
    
*   **Enhanced Screenshots:** Capture a high-quality composite image of all visible camera feeds with a single click.
    
*   **Charging Time Estimator:** Calculate how long a charging session will take based on battery capacity, SoC, and charger type (including custom inputs).
    
*   **Phantom Drain Estimator:** Estimate how long your battery will last while parked, based on active features like Sentry Mode and outside temperature.
    
*   **Light & Dark Modes:** A sleek, modern interface with theme toggling.
    
*   **Fully Responsive:** Works beautifully on desktop, tablet, and mobile browsers.
    
*   **Privacy Focused:** No data ever leaves your computer. Everything is processed locally in your browser.
    

🚀 Live Demo
------------

You can try a live version of the Tesla Companion hosted on GitHub Pages:

[**https://jleshnick.github.io/TeslaCompanion/**](https://jleshnick.github.io/TeslaCompanion/)

_(Note: To set this up for your own repository, go to Settings > Pages, and under "Build and deployment," select Deploy from a branch and choose the main branch with the /root folder.)_

💻 How to Use
-------------

1.  **View Sentry/Dashcam Clips:** Plug your Tesla's USB drive into your computer.
    
2.  **Launch the App:** Open the index.html file in a modern web browser like Chrome, Firefox, or Edge.
    
3.  **Load Clips:**
    
    *   Navigate to the **Camera Viewer** tab.
        
    *   Click the **"Select Directory"** button.
        
    *   Choose either the main **TeslaCam** folder from your USB drive or a specific event folder (e.g., 2024-06-27\_17-19-01). The app works with either selection.
        
4.  **View Events:** The app will load all events. Use the dropdown menu or the next/previous buttons to navigate between them.
    

🛠️ Technologies Used
---------------------

*   **HTML5:** For the core structure of the application.
    
*   **CSS3:** For modern styling, animations, and responsive design (using variables for easy theming).
    
*   **Vanilla JavaScript (ES6+):** For all application logic, including video processing, calculations, and DOM manipulation. No frameworks needed!
    
*   **Google Fonts:** For the "Inter" font family.
    
*   **Feather Icons:** For clean and simple UI icons.
    

🙏 Acknowledgements
-------------------

*   The core camera viewer functionality was originally created and inspired by **Lythinari's TeslaCamViewer**. This project builds upon that foundation with a redesigned UI and additional features.
    
*   This enhanced version was developed by **Joshua Leshnick**.
    

📄 License
----------

This project is licensed under the MIT License. See the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.


🖼️ Gallery
Full Camera Grid

Expanded Single-Camera View

<img src="assets/CamViewer_Grid.png" alt="Full six-camera grid view" style="border-radius: 16px;">

<img src="assets/CamViewer_Single.png" alt="Expanded view of a single camera" style="border-radius: 16px;">

Charging Time Estimator

Phantom Drain Estimator

<img src="assets/ChargeTimeEstimator.png" alt="Charging Time Estimator Tool" style="border-radius: 16px;">

<img src="assets/PhantomDrainEstimator.png" alt="Phantom Drain Estimator Tool" style="border-radius: 16px;">

Camera Angle Selector



<img src="assets/CameraViewSelector.png" alt="Toggles to select which cameras to display" style="border-radius: 16px;">