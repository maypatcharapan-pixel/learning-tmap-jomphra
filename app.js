document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  // =====================================================
  // LEARNING T-MAP จอมพระ
  // APP.JS
  // =====================================================

  if (typeof L === "undefined") {
    console.error("Leaflet is not loaded.");
    return;
  }

  // -----------------------------------------------------
  // ELEMENTS
  // -----------------------------------------------------

  const q = document.querySelector("#q");
  const district = document.querySelector("#district");
  const category = document.querySelector("#category");
  const clearBtn = document.querySelector("#clear");

  const cards = document.querySelector("#cards");
  const resultCount = document.querySelector("#resultCount");
  const panelCount = document.querySelector("#panelCount");

  const statPlaces = document.querySelector("#statPlaces");
  const statDistricts = document.querySelector("#statDistricts");
  const statCategories = document.querySelector("#statCategories");
  const statMap = document.querySelector("#statMap");

  const mapElement = document.querySelector("#map");

  if (!mapElement) {
    console.error("ไม่พบ #map");
    return;
  }

  // -----------------------------------------------------
  // MAP
  // -----------------------------------------------------

  const map = L.map("map", {
    zoomControl: true
  }).setView([15.01, 103.62], 11);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);

  const markers = L.layerGroup().addTo(map);

  // -----------------------------------------------------
  // DATA
  // -----------------------------------------------------

  let allPlaces = [];
  let currentPlaces = [];

  // -----------------------------------------------------
  // HELPERS
  // -----------------------------------------------------

  function escapeHTML(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .trim();
  }

  // -----------------------------------------------------
  // PLACE URL
  // -----------------------------------------------------

  function placeUrl(id) {
    return (
      window.location.origin +
      "/?id=" +
      encodeURIComponent(id)
    );
  }

  // -----------------------------------------------------
  // GOOGLE MAPS
  // -----------------------------------------------------

  function mapsUrl(place) {

    if (place.mapsUrl) {
      return place.mapsUrl;
    }

    if (
      place.lat !== undefined &&
      place.lng !== undefined
    ) {
      return (
        "https://www.google.com/maps?q=" +
        encodeURIComponent(
          String(place.lat) +
          "," +
          String(place.lng)
        )
      );
    }

    return "";
  }

  // -----------------------------------------------------
  // QR LIBRARY
  // -----------------------------------------------------

  function loadQRCodeLibrary() {

    return new Promise(function (resolve) {

      if (window.QRCode) {
        resolve();
        return;
      }

      const script =
        document.createElement("script");

      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

      script.onload = function () {
        resolve();
      };

      script.onerror = function () {
        console.error(
          "ไม่สามารถโหลด QR Code Library"
        );

        resolve();
      };

      document.head.appendChild(script);

    });

  }

  // -----------------------------------------------------
  // QR MODAL
  // -----------------------------------------------------

  function createQRModal() {

    if (document.querySelector("#qrModal")) {
      return;
    }

    const modal =
      document.createElement("div");

    modal.id = "qrModal";

    modal.innerHTML = `
      <div class="qr-modal-overlay"></div>

      <div class="qr-modal-box">

        <button
          type="button"
          class="qr-modal-close"
          aria-label="ปิด"
        >
          ×
        </button>

        <div class="qr-modal-header">
          <div class="qr-modal-icon">▣</div>

          <div>
            <h3>QR Code</h3>
            <p>สแกนเพื่อดูแหล่งเรียนรู้</p>
          </div>
        </div>

        <div id="qrCodeContainer"></div>

        <div
          id="qrPlaceName"
          class="qr-place-name"
        ></div>

        <div
          id="qrUrl"
          class="qr-url"
        ></div>

        <div class="qr-modal-actions">

          <button
            type="button"
            id="downloadQR"
            class="qr-download-btn"
          >
            ดาวน์โหลด QR Code
          </button>

          <button
            type="button"
            id="copyQRLink"
            class="qr-copy-btn"
          >
            คัดลอกลิงก์
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn =
      modal.querySelector(
        ".qr-modal-close"
      );

    const overlay =
      modal.querySelector(
        ".qr-modal-overlay"
      );

    closeBtn.addEventListener(
      "click",
      closeQRModal
    );

    overlay.addEventListener(
      "click",
      closeQRModal
    );

    document.addEventListener(
      "keydown",
      function (event) {

        if (
          event.key === "Escape" &&
          modal.classList.contains("show")
        ) {
          closeQRModal();
        }

      }
    );

    const copyBtn =
      modal.querySelector(
        "#copyQRLink"
      );

    copyBtn.addEventListener(
      "click",
      async function () {

        const url =
          modal.dataset.url || "";

        if (!url) {
          return;
        }

        try {

          await navigator.clipboard.writeText(
            url
          );

          copyBtn.textContent =
            "✓ คัดลอกแล้ว";

          setTimeout(
            function () {

              copyBtn.textContent =
                "คัดลอกลิงก์";

            },
            1500
          );

        } catch (error) {

          window.prompt(
            "คัดลอกลิงก์นี้",
            url
          );

        }

      }
    );

    const downloadBtn =
      modal.querySelector(
        "#downloadQR"
      );

    downloadBtn.addEventListener(
      "click",
      downloadCurrentQR
    );

  }

  // -----------------------------------------------------
  // SHOW QR
  // -----------------------------------------------------

  async function showQRCode(place) {

    createQRModal();

    const modal =
      document.querySelector(
        "#qrModal"
      );

    const container =
      document.querySelector(
        "#qrCodeContainer"
      );

    const placeName =
      document.querySelector(
        "#qrPlaceName"
      );

    const urlElement =
      document.querySelector(
        "#qrUrl"
      );

    const url =
      placeUrl(place.id);

    modal.dataset.url = url;

    placeName.textContent =
      place.name || "แหล่งเรียนรู้";

    urlElement.textContent =
      url;

    container.innerHTML = "";

    modal.classList.add("show");

    await loadQRCodeLibrary();

    if (
      typeof QRCode === "undefined"
    ) {

      container.innerHTML =
        `
        <div class="qr-error">
          ไม่สามารถสร้าง QR Code ได้
        </div>
        `;

      return;

    }

    new QRCode(
      container,
      {
        text: url,
        width: 240,
        height: 240,
        correctLevel:
          QRCode.CorrectLevel.H
      }
    );

  }

  // -----------------------------------------------------
  // CLOSE QR
  // -----------------------------------------------------

  function closeQRModal() {

    const modal =
      document.querySelector(
        "#qrModal"
      );

    if (modal) {
      modal.classList.remove(
        "show"
      );
    }

  }

  // -----------------------------------------------------
  // DOWNLOAD QR
  // -----------------------------------------------------

  function downloadCurrentQR() {

    const canvas =
      document.querySelector(
        "#qrCodeContainer canvas"
      );

    const image =
      document.querySelector(
        "#qrCodeContainer img"
      );

    let source = "";

    if (canvas) {
      source =
        canvas.toDataURL(
          "image/png"
        );
    } else if (image) {
      source =
        image.src;
    }

    if (!source) {

      alert(
        "ยังไม่มี QR Code สำหรับดาวน์โหลด"
      );

      return;

    }

    const link =
      document.createElement(
        "a"
      );

    link.href = source;

    link.download =
      "learning-tmap-qr-code.png";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

  }

  // -----------------------------------------------------
  // LOAD META
  // -----------------------------------------------------

  async function loadMeta() {

    try {

      const response =
        await fetch(
          "/api/meta",
          {
            cache: "no-store"
          }
        );

      if (!response.ok) {
        throw new Error(
          "Meta API Error " +
          response.status
        );
      }

      const data =
        await response.json();

      // DISTRICT

      if (district) {

        district.innerHTML =
          '<option value="">ทุกตำบล</option>';

        const districts =
          Array.isArray(
            data.districts
          )
            ? data.districts
            : [];

        districts.forEach(
          function (item) {

            const option =
              document.createElement(
                "option"
              );

            option.value = item;
            option.textContent = item;

            district.appendChild(
              option
            );

          }
        );

      }

      // CATEGORY

      if (category) {

        category.innerHTML =
          '<option value="">ทุกประเภท</option>';

        const categories =
          Array.isArray(
            data.categories
          )
            ? data.categories
            : [];

        categories.forEach(
          function (item) {

            const option =
              document.createElement(
                "option"
              );

            option.value = item;
            option.textContent = item;

            category.appendChild(
              option
            );

          }
        );

      }

      // STATISTICS

      if (statPlaces) {

        statPlaces.textContent =
          data.count || 0;

      }

      if (statDistricts) {

        statDistricts.textContent =
          Array.isArray(
            data.districts
          )
            ? data.districts.length
            : 0;

      }

      if (statCategories) {

        statCategories.textContent =
          Array.isArray(
            data.categories
          )
            ? data.categories.length
            : 0;

      }

      if (statMap) {

        statMap.textContent =
          "พร้อมใช้งาน";

      }

    } catch (error) {

      console.error(
        "loadMeta:",
        error
      );

    }

  }

  // -----------------------------------------------------
  // LOAD PLACES
  // -----------------------------------------------------

  async function loadPlaces() {

    try {

      const response =
        await fetch(
          "/api/places",
          {
            cache: "no-store"
          }
        );

      if (!response.ok) {

        throw new Error(
          "Places API Error " +
          response.status
        );

      }

      const data =
        await response.json();

      if (Array.isArray(data)) {

        allPlaces = data;

      } else if (
        Array.isArray(
          data.places
        )
      ) {

        allPlaces =
          data.places;

      } else {

        allPlaces = [];

      }

      currentPlaces =
        allPlaces.slice();

      renderMarkers(
        currentPlaces
      );

      renderCards(
        currentPlaces
      );

      updateCount(
        currentPlaces
      );

      openPlaceFromUrl();

    } catch (error) {

      console.error(
        "loadPlaces:",
        error
      );

      if (cards) {

        cards.innerHTML =
          `
          <div class="empty-state">
            ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้
          </div>
          `;

      }

    }

  }

  // -----------------------------------------------------
  // COUNT
  // -----------------------------------------------------

  function updateCount(list) {

    const count =
      Array.isArray(list)
        ? list.length
        : 0;

    if (resultCount) {

      resultCount.textContent =
        "พบ " +
        count +
        " แหล่งเรียนรู้";

    }

    if (panelCount) {

      panelCount.textContent =
        count;

    }

  }

  // -----------------------------------------------------
  // MARKERS
  // -----------------------------------------------------

  function renderMarkers(list) {

    markers.clearLayers();

    const bounds = [];

    list.forEach(
      function (place) {

        const lat =
          Number(place.lat);

        const lng =
          Number(place.lng);

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          return;
        }

        const marker =
          L.marker([
            lat,
            lng
          ]);

        const popup =
          `
          <div class="map-popup">

            <strong>
              ${escapeHTML(
                place.name || ""
              )}
            </strong>

            <br>

            ${escapeHTML(
              place.category || ""
            )}

            <br>

            ${escapeHTML(
              place.village || ""
            )}

            <br><br>

            <button
              type="button"
              class="popup-detail-btn"
              data-popup-id="${escapeHTML(
                place.id
              )}"
            >
              ดูรายละเอียด
            </button>

            <button
              type="button"
              class="popup-qr-btn"
              data-popup-qr-id="${escapeHTML(
                place.id
              )}"
            >
              ▣ QR Code
            </button>

          </div>
          `;

        marker.bindPopup(
          popup
        );

        marker.on(
          "popupopen",
          function () {

            const popupElement =
              document.querySelector(
                `.popup-detail-btn[data-popup-id="${CSS.escape(
                  String(place.id)
                )}"]`
              );

            if (popupElement) {

              popupElement.addEventListener(
                "click",
                function () {

                  showPlace(place);

                }
              );

            }

            const qrButton =
              document.querySelector(
                `.popup-qr-btn[data-popup-qr-id="${CSS.escape(
                  String(place.id)
                )}"]`
              );

            if (qrButton) {

              qrButton.addEventListener(
                "click",
                function () {

                  showQRCode(place);

                }
              );

            }

          }
        );

        marker.on(
          "click",
          function () {

            showPlace(place);

          }
        );

        marker.addTo(
          markers
        );

        bounds.push([
          lat,
          lng
        ]);

      }
    );

    if (bounds.length > 0) {

      try {

        map.fitBounds(
          bounds,
          {
            padding: [
              30,
              30
            ],
            maxZoom: 14
          }
        );

      } catch (error) {

        console.warn(
          "Map bounds error:",
          error
        );

      }

    }

  }

  // -----------------------------------------------------
  // CARDS
  // -----------------------------------------------------

  function renderCards(list) {

    if (!cards) {
      return;
    }

    if (!list.length) {

      cards.innerHTML =
        `
        <div class="empty-state">
          ไม่พบข้อมูลที่ค้นหา
        </div>
        `;

      return;

    }

    cards.innerHTML =
      list.map(
        function (place) {

          const image =
            place.image
              ? `
                <img
                  class="place-card-image"
                  src="${escapeHTML(
                    place.image
                  )}"
                  alt="${escapeHTML(
                    place.name || ""
                  )}"
                  loading="lazy"
                >
              `
              : `
                <div class="place-card-image placeholder-image">
                  <span>Learning T-Map</span>
                </div>
              `;

          const maps =
            mapsUrl(place);

          const mapsButton =
            maps
              ? `
                <a
                  class="place-map-btn"
                  href="${escapeHTML(
                    maps
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📍 Google Maps
                </a>
              `
              : "";

          return `

            <article
              class="place-card"
              data-id="${escapeHTML(
                place.id
              )}"
            >

              <div class="place-card-image-wrap">
                ${image}

                <span class="place-card-badge">
                  ${escapeHTML(
                    place.category ||
                    "ศูนย์การเรียนรู้"
                  )}
                </span>
              </div>

              <div class="place-card-body">

                <div class="place-card-category">
                  ${escapeHTML(
                    place.category ||
                    "ศูนย์การเรียนรู้"
                  )}
                </div>

                <h3>
                  ${escapeHTML(
                    place.name || ""
                  )}
                </h3>

                ${
                  place.district
                    ? `
                      <div class="place-card-meta">
                        📍
                        ${escapeHTML(
                          place.district
                        )}
                      </div>
                    `
                    : ""
                }

                ${
                  place.village
                    ? `
                      <div class="place-card-meta">
                        🏘️
                        ${escapeHTML(
                          place.village
                        )}
                      </div>
                    `
                    : ""
                }

                ${
                  place.description
                    ? `
                      <p>
                        ${escapeHTML(
                          place.description
                        )}
                      </p>
                    `
                    : ""
                }

                <div class="place-card-actions">

                  <button
                    type="button"
                    class="place-detail-btn"
                    data-place-id="${escapeHTML(
                      place.id
                    )}"
                  >
                    ดูรายละเอียด
                  </button>

                  ${mapsButton}

                  <button
                    type="button"
                    class="place-qr-btn"
                    data-qr-id="${escapeHTML(
                      place.id
                    )}"
                  >
                    ▣ QR
                  </button>

                  <button
                    type="button"
                    class="place-share-btn"
                    data-share-id="${escapeHTML(
                      place.id
                    )}"
                  >
                    ↗ แชร์
                  </button>

                </div>

              </div>

            </article>

          `;

        }
      ).join("");

    // ---------------------------------------------------
    // DETAIL BUTTON
    // ---------------------------------------------------

    cards
      .querySelectorAll(
        "[data-place-id]"
      )
      .forEach(
        function (button) {

          button.addEventListener(
            "click",
            function (event) {

              event.preventDefault();

              const id =
                button.getAttribute(
                  "data-place-id"
                );

              const place =
                allPlaces.find(
                  function (item) {

                    return String(
                      item.id
                    ) === String(id);

                  }
                );

              if (place) {

                showPlace(place);

              }

            }
          );

        }
      );

    // ---------------------------------------------------
    // QR BUTTON
    // ---------------------------------------------------

    cards
      .querySelectorAll(
        "[data-qr-id]"
      )
      .forEach(
        function (button) {

          button.addEventListener(
            "click",
            function (event) {

              event.preventDefault();

              const id =
                button.getAttribute(
                  "data-qr-id"
                );

              const place =
                allPlaces.find(
                  function (item) {

                    return String(
                      item.id
                    ) === String(id);

                  }
                );

              if (place) {

                showQRCode(
                  place
                );

              }

            }
          );

        }
      );

  }

  // -----------------------------------------------------
  // FILTER
  // -----------------------------------------------------

  function filterPlaces() {

    const keyword =
      normalize(
        q
          ? q.value
          : ""
      );

    const selectedDistrict =
      normalize(
        district
          ? district.value
          : ""
      );

    const selectedCategory =
      normalize(
        category
          ? category.value
          : ""
      );

    currentPlaces =
      allPlaces.filter(
        function (place) {

          const text =
            normalize(
              [
                place.name,
                place.district,
                place.category,
                place.description,
                place.village,
                place.contactName,
                place.phone
              ].join(" ")
            );

          const matchKeyword =
            !keyword ||
            text.includes(
              keyword
            );

          const matchDistrict =
            !selectedDistrict ||
            normalize(
              place.district
            ) ===
            selectedDistrict;

          const matchCategory =
            !selectedCategory ||
            normalize(
              place.category
            ) ===
            selectedCategory;

          return (
            matchKeyword &&
            matchDistrict &&
            matchCategory
          );

        }
      );

    renderCards(
      currentPlaces
    );

    renderMarkers(
      currentPlaces
    );

    updateCount(
      currentPlaces
    );

  }

  // -----------------------------------------------------
  // SHOW PLACE
  // -----------------------------------------------------

  function showPlace(place) {

    const lat =
      Number(place.lat);

    const lng =
      Number(place.lng);

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {

      map.setView(
        [
          lat,
          lng
        ],
        16
      );

      markers.eachLayer(
        function (marker) {

          const position =
            marker.getLatLng();

          if (
            Math.abs(
              position.lat -
              lat
            ) < 0.000001 &&
            Math.abs(
              position.lng -
              lng
            ) < 0.000001
          ) {

            marker.openPopup();

          }

        }
      );

    }

    window.history.replaceState(
      null,
      "",
      placeUrl(place.id)
    );

    if (cards) {

      const card =
        cards.querySelector(
          '[data-id="' +
          CSS.escape(
            String(place.id)
          ) +
          '"]'
        );

      if (card) {

        card.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

      }

    }

  }

  // -----------------------------------------------------
  // OPEN PLACE FROM URL
  // -----------------------------------------------------

  function openPlaceFromUrl() {

    const params =
      new URLSearchParams(
        window.location.search
      );

    const id =
      params.get("id");

    if (!id) {
      return;
    }

    const place =
      allPlaces.find(
        function (item) {

          return String(
            item.id
          ) === String(id);

        }
      );

    if (place) {

      setTimeout(
        function () {

          showPlace(
            place
          );

        },
        300
      );

    }

  }

  // -----------------------------------------------------
  // SHARE
  // -----------------------------------------------------

  async function sharePlace(place) {

    const url =
      placeUrl(place.id);

    try {

      if (
        navigator.share
      ) {

        await navigator.share({

          title:
            place.name ||
            "Learning T-Map จอมพระ",

          text:
            place.name || "",

          url: url

        });

      } else if (
        navigator.clipboard
      ) {

        await navigator.clipboard.writeText(
          url
        );

        alert(
          "คัดลอกลิงก์แล้ว"
        );

      } else {

        window.prompt(
          "คัดลอกลิงก์นี้",
          url
        );

      }

    } catch (error) {

      console.log(
        "Share cancelled."
      );

    }

  }

  // -----------------------------------------------------
  // SCROLL TO MAP
  // -----------------------------------------------------

  function scrollToMap() {

    const mapSection =
      document.querySelector(
        "#map-section"
      );

    if (mapSection) {

      setTimeout(
        function () {

          mapSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        },
        100
      );

    }

  }

  // -----------------------------------------------------
  // EVENTS
  // -----------------------------------------------------

  function setupEvents() {

    // SEARCH

    if (q) {

      q.addEventListener(
        "input",
        function () {

          filterPlaces();

        }
      );

      q.addEventListener(
        "keydown",
        function (event) {

          if (
            event.key === "Enter"
          ) {

            event.preventDefault();

            filterPlaces();

            scrollToMap();

          }

        }
      );

    }

    // SEARCH BUTTON

    const searchButtons =
      document.querySelectorAll(
        "#searchBtn, #search, .search-btn, [data-action='search']"
      );

    searchButtons.forEach(
      function (button) {

        button.addEventListener(
          "click",
          function (event) {

            event.preventDefault();

            filterPlaces();

            scrollToMap();

          }
        );

      }
    );

    // FORM

    const searchForm =
      document.querySelector(
        "#searchForm, form.search-form"
      );

    if (searchForm) {

      searchForm.addEventListener(
        "submit",
        function (event) {

          event.preventDefault();

          filterPlaces();

          scrollToMap();

        }
      );

    }

    // DISTRICT

    if (district) {

      district.addEventListener(
        "change",
        filterPlaces
      );

    }

    // CATEGORY

    if (category) {

      category.addEventListener(
        "change",
        filterPlaces
      );

    }

    // CLEAR

    if (clearBtn) {

      clearBtn.addEventListener(
        "click",
        function (event) {

          event.preventDefault();

          if (q) {
            q.value = "";
          }

          if (district) {
            district.value = "";
          }

          if (category) {
            category.value = "";
          }

          filterPlaces();

        }
      );

    }

    // CATEGORY CARDS

    const categoryCards =
      document.querySelectorAll(
        ".category-card[data-category]"
      );

    categoryCards.forEach(
      function (button) {

        button.addEventListener(
          "click",
          function (event) {

            event.preventDefault();

            const selectedCategory =
              button.getAttribute(
                "data-category"
              );

            if (category) {

              category.value =
                selectedCategory;

            }

            filterPlaces();

            scrollToMap();

          }
        );

      }
    );

    // SHARE / QR

    document.addEventListener(
      "click",
      function (event) {

        // SHARE

        const shareButton =
          event.target.closest(
            "[data-share-id]"
          );

        if (shareButton) {

          const id =
            shareButton.getAttribute(
              "data-share-id"
            );

          const place =
            allPlaces.find(
              function (item) {

                return String(
                  item.id
                ) === String(id);

              }
            );

          if (place) {

            sharePlace(
              place
            );

          }

          return;

        }

        // QR

        const qrButton =
          event.target.closest(
            "[data-qr-id]"
          );

        if (qrButton) {

          const id =
            qrButton.getAttribute(
              "data-qr-id"
            );

          const place =
            allPlaces.find(
              function (item) {

                return String(
                  item.id
                ) === String(id);

              }
            );

          if (place) {

            showQRCode(
              place
            );

          }

        }

      }
    );

  }

  // -----------------------------------------------------
  // START APP
  // -----------------------------------------------------

  async function startApp() {

    setupEvents();

    createQRModal();

    await loadMeta();

    await loadPlaces();

    setTimeout(
      function () {

        map.invalidateSize();

      },
      300
    );

  }

  // -----------------------------------------------------
  // RUN
  // -----------------------------------------------------

  startApp();

});