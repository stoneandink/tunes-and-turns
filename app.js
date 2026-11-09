
const $ = id => document.getElementById(id);

let tunes = [];
let activeTuneToken = 0;
let currentSynthController = null;

// --------------------------------------------------
// General utilities
// --------------------------------------------------

function safeUrl(url) {
  if (typeof url !== "string") return null;
  url = url.trim();

  if (/^https?:\/\//i.test(url)) return url;

  if (/^(abc|sheet-music)\//i.test(url) &&
      !url.split("/").includes("..")) {
    return url;
  }

  return null;
}

function addLink(container, label, url) {
  const validUrl = safeUrl(url);
  if (!validUrl) return;

  const a = document.createElement("a");
  a.href = encodeURI(validUrl);
  a.textContent = label;
  a.target = "_blank";
  a.rel = "noopener noreferrer";

  container.appendChild(a);
}

function unique(key) {
  return [...new Set(
    tunes.map(t => t[key]).filter(Boolean)
  )].sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}

function makeOptions(id, key) {
  unique(key).forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    $(id).appendChild(option);
  });
}

// --------------------------------------------------
// Repertory browser
// --------------------------------------------------

function render() {
  const query = $("search").value.trim().toLowerCase();
  const type = $("type").value;
  const difficulty = $("difficulty").value;
  const status = $("status").value;

  const shown = tunes.filter(t =>
    (!query ||
      [t.title, t.alternate, t.key, t.type]
        .join(" ")
        .toLowerCase()
        .includes(query)
    ) &&
    (!type || t.type === type) &&
    (!difficulty ||
      String(t.difficulty) === difficulty) &&
    (!status || t.status === status)
  );

  $("count").textContent =
    `${shown.length} of ${tunes.length} tunes and songs`;

  $("list").replaceChildren();

  shown.forEach(t => {
    const button = document.createElement("button");
    button.className = "tune";

    const title = document.createElement("strong");
    title.textContent = t.title;
    button.appendChild(title);

    const subtitle = document.createElement("small");
    subtitle.textContent =
      [t.type, t.key].filter(Boolean).join(" · ");
    button.appendChild(subtitle);

    const tags = document.createElement("div");
    tags.className = "tags";

    if (t.difficulty) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent =
        `Difficulty ${t.difficulty}/3`;
      tags.appendChild(tag);
    }

    if (t.status) {
      const tag = document.createElement("span");
      tag.className = "tag status";
      tag.textContent = t.status;
      tags.appendChild(tag);
    }

    button.appendChild(tags);
    button.onclick = () => openTune(t);

    $("list").appendChild(button);
  });
}

// --------------------------------------------------
// MIDI playback
// --------------------------------------------------

function selectedSpeed() {
  return Math.round(
    Number($("practice-speed").value) * 100
  );
}

function stopPlayback() {
  if (currentSynthController) {
    try {
      currentSynthController.pause();
    } catch (e) {}

    try {
      currentSynthController.destroy();
    } catch (e) {}

    currentSynthController = null;
  }

  $("audio-player").replaceChildren();
}

function changePlaybackSpeed() {
  if (!currentSynthController) return;

  try {
    currentSynthController.setWarp(selectedSpeed());
  } catch (error) {
    console.warn("Unable to change playback speed", error);
    $("audio-message").textContent =
      "Unable to adjust playback speed.";
  }
}

async function setupPractice(abc, visual, token) {
  stopPlayback();

  $("audio-message").textContent = "";
  $("midi-download").replaceChildren();
  $("practice-section").hidden = false;

  if (!window.ABCJS?.synth?.SynthController) {
    $("audio-message").textContent =
      "Playback library unavailable. Check your internet connection.";
    return;
  }

  // Generate downloadable MIDI file.
  try {
    const midi = ABCJS.getMidiFile(abc, {
      midiOutputType: "link",
      fileName: "tune.mid"
    });

    if (typeof midi === "string" &&
        midi.includes("href=")) {

      const wrapper = document.createElement("div");
      wrapper.innerHTML = midi;

      const link = wrapper.querySelector("a[href]");

      if (link) {
        link.textContent = "Download MIDI";
        link.className = "midi-link";

        const filename =
          (visual.metaText?.title || "tune")
            .replace(/[^a-z0-9-]/gi, "-");

        link.setAttribute(
          "download",
          `${filename}.mid`
        );

        $("midi-download").appendChild(link);
      }
    }
  } catch (error) {
    console.warn("MIDI export unavailable", error);
  }

  // Create the ABCjs audio player.
  const controller = new ABCJS.synth.SynthController();

  currentSynthController = controller;

  controller.load("#audio-player", null, {
    displayRestart: true,
    displayPlay: true,
    displayProgress: true,
    displayWarp: false
  });

  try {
    // Load the tune at its original notated tempo.
    // Playback speed is controlled separately by setWarp().
    await controller.setTune(visual, false);

    if (token !== activeTuneToken ||
        currentSynthController !== controller) {
      try {
        controller.pause();
        controller.destroy();
      } catch (e) {}
      return;
    }

    // Apply the selected tempo after loading.
    controller.setWarp(selectedSpeed());

    $("audio-message").textContent =
      "Press play to hear the melody. " +
      "Use the playback speed menu to practice " +
      "at your preferred tempo.";

  } catch (error) {
    if (token !== activeTuneToken) return;

    $("audio-message").textContent =
      "Playback is unavailable in this browser " +
      "or for this notation.";

    console.warn("ABCjs playback error", error);
  }
}

// Change tempo without rebuilding the player.
$("practice-speed").addEventListener(
  "change",
  changePlaybackSpeed
);

// --------------------------------------------------
// YouTube embedding
// --------------------------------------------------

function youtubeId(url) {
  if (!url) return null;

  try {
    const u = new URL(url);
    const hostname = u.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    let id = null;

    if (hostname === "youtu.be") {
      id = u.pathname.split("/")[1];

    } else if ([
      "youtube.com",
      "m.youtube.com",
      "youtube-nocookie.com"
    ].includes(hostname)) {

      if (u.pathname === "/watch") {
        id = u.searchParams.get("v");

      } else if (
        /^\/(shorts|embed|live)\//.test(u.pathname)
      ) {
        id = u.pathname.split("/")[2];
      }
    }

    return /^[a-zA-Z0-9_-]{11}$/.test(id || "")
      ? id
      : null;

  } catch (error) {
    return null;
  }
}

function addVideos(t) {
  const area = $("video-players");
  area.replaceChildren();

  let found = 0;

  [t.video1, t.video2].forEach((url, index) => {
    const id = youtubeId(url);
    if (!id) return;

    found++;

    const block = document.createElement("div");
    block.className = "video-card";

    const frame = document.createElement("iframe");

    frame.title =
      `${t.title} — performance ${index + 1}`;

    frame.loading = "lazy";

    frame.allow =
      "accelerometer; autoplay; clipboard-write; " +
      "encrypted-media; gyroscope; " +
      "picture-in-picture; web-share";

    frame.allowFullscreen = true;

    frame.referrerPolicy =
      "strict-origin-when-cross-origin";

    frame.src =
      `https://www.youtube-nocookie.com/embed/${id}?rel=0`;

    block.appendChild(frame);

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent =
      "Watch on YouTube if embedding is unavailable";

    block.appendChild(link);
    area.appendChild(block);
  });

  $("video-section").hidden = !found;
}

// --------------------------------------------------
// Open individual tune
// --------------------------------------------------

async function openTune(t) {
  const token = ++activeTuneToken;

  stopPlayback();

  $("practice-section").hidden = true;
  $("video-section").hidden = true;
  $("audio-message").textContent = "";

  $("detail-type").textContent = t.type || "Tune";
  $("detail-title").textContent = t.title;

  $("detail-meta").textContent = [
    t.key,
    t.difficulty
      ? `Difficulty ${t.difficulty}/3`
      : null,
    t.status
  ].filter(Boolean).join(" · ");

  $("detail-notes").textContent = t.notes || "";

  $("notation").replaceChildren();
  $("notation-fallback").hidden = true;
  $("links").replaceChildren();

  addVideos(t);

  // Load ABC notation.
  if (t.abc) {
    addLink($("links"), "Download ABC", t.abc);

    try {
      const response = await fetch(encodeURI(t.abc));

      if (!response.ok) {
        throw new Error("ABC file not found");
      }

      const abc = await response.text();

      if (token !== activeTuneToken) return;

      $("abc-raw").textContent = abc;

      if (window.ABCJS) {
        const visuals = ABCJS.renderAbc(
          "notation",
          abc,
          {
            responsive: "resize",
            add_classes: true,
            staffwidth: 760,
            wrap: {
              minSpacing: 1.3,
              maxSpacing: 2.4,
              preferredMeasuresPerLine: 4
            }
          }
        );

        if (visuals?.length) {
          setupPractice(abc, visuals[0], token);
        } else {
          $("notation-fallback").hidden = false;
        }

      } else {
        $("notation-fallback").hidden = false;
      }

    } catch (error) {
      if (token !== activeTuneToken) return;

      $("notation-fallback").hidden = false;

      $("abc-raw").textContent =
        "Could not load notation. " +
        "Run this project using Live Server in VS Code. " +
        error.message;
    }

  } else {
    $("notation").textContent =
      "No local ABC file was matched to this entry.";
  }

  // Additional resources.
  addLink($("links"), "Sheet music PDF", t.pdf);

  if (!youtubeId(t.video1)) {
    addLink(
      $("links"),
      "Video 1",
      safeUrl(t.video1)
    );
  }

  if (!youtubeId(t.video2)) {
    addLink(
      $("links"),
      "Video 2",
      safeUrl(t.video2)
    );
  }

  addLink(
    $("links"),
    "Audio",
    safeUrl(t.audio)
  );

  $("tune-dialog").showModal();
}

// --------------------------------------------------
// Close tune
// --------------------------------------------------

function closeTune() {
  $("tune-dialog").close();
  activeTuneToken++;
  stopPlayback();
}

$("close-dialog").onclick = closeTune;

$("tune-dialog").addEventListener("click", event => {
  if (event.target === $("tune-dialog")) {
    closeTune();
  }
});

$("tune-dialog").addEventListener("close", () => {
  activeTuneToken++;
  stopPlayback();
});

// --------------------------------------------------
// Search and filter controls
// --------------------------------------------------

["search", "type", "difficulty", "status"]
  .forEach(id => {
    $(id).addEventListener(
      id === "search" ? "input" : "change",
      render
    );
  });

// --------------------------------------------------
// Load repertory data
// --------------------------------------------------

fetch("repertory.json")
  .then(response => {
    if (!response.ok) {
      throw new Error("Unable to load repertory");
    }

    return response.json();
  })
  .then(data => {
    tunes = data;

    makeOptions("type", "type");
    makeOptions("status", "status");

    render();
  })
  .catch(error => {
    $("count").textContent =
      "Unable to load repertory. " +
      "Please use Live Server in VS Code.";

    console.error(error);
  });
